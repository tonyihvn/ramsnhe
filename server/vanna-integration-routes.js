// Vanna.AI Integration Routes
import express from 'express';
import axios from 'axios';
import { tables } from './tablePrefix.js';

const router = express.Router();

const requireAuth = (req, res, next) => {
  if (!req.user) {
    return res.status(401).json({ error: 'Unauthorized' });
  }
  next();
};

// Generate SQL using Vanna.AI
router.post('/vanna/generate-sql', requireAuth, async (req, res) => {
  try {
    const { businessId, prompt, context } = req.body;
    const pool = req.app.locals.pool;

    // Get AI settings for this business
    const settingsResult = await pool.query(
      `SELECT * FROM ${tables.AI_SETTINGS} WHERE business_id = $1`,
      [businessId]
    );

    if (settingsResult.rows.length === 0) {
      return res.status(400).json({ error: 'AI settings not configured' });
    }

    const settings = settingsResult.rows[0];

    if (!settings.vanna_api_url || !settings.vanna_api_key) {
      return res.status(400).json({ error: 'Vanna API not configured' });
    }

    // Get activity DDL schema for context
    let ddlContext = '';
    if (context?.activityId) {
      const activityResult = await pool.query(
        `SELECT ddl_schema FROM ${tables.ACTIVITIES} WHERE id = $1 AND business_id = $2`,
        [context.activityId, businessId]
      );
      if (activityResult.rows.length > 0) {
        ddlContext = activityResult.rows[0].ddl_schema || '';
      }
    }

    // Call Vanna API to generate SQL
    const vannaResponse = await axios.post(
      `${settings.vanna_api_url}/api/v1/generate/sql`,
      {
        question: prompt,
        context: ddlContext,
        model: settings.vanna_model || 'gpt-4'
      },
      {
        headers: {
          'Authorization': `Bearer ${settings.vanna_api_key}`,
          'Content-Type': 'application/json'
        },
        timeout: 30000
      }
    );

    const generatedSQL = vannaResponse.data.sql;

    // Log the generation for audit
    await pool.query(
      `INSERT INTO ${tables.VANNA_QUERIES} (business_id, activity_id, prompt, generated_sql, status)
       VALUES ($1, $2, $3, $4, $5)`,
      [businessId, context?.activityId || null, prompt, generatedSQL, 'generated']
    );

    res.json({
      success: true,
      sql: generatedSQL,
      model: settings.vanna_model
    });

  } catch (error) {
    console.error('Vanna SQL generation error:', error);
    res.status(500).json({ error: error.message });
  }
});

// Execute SQL query (read-only)
router.post('/execute-sql', requireAuth, async (req, res) => {
  try {
    const { businessId, sql, activityId } = req.body;
    const pool = req.app.locals.pool;

    if (!sql || !sql.trim()) {
      return res.status(400).json({ error: 'SQL query required' });
    }

    // Security: Only allow SELECT queries (read-only)
    const trimmedSQL = sql.trim().toUpperCase();
    if (!trimmedSQL.startsWith('SELECT')) {
      return res.status(403).json({ error: 'Only SELECT queries are allowed' });
    }

    // Execute the query
    const result = await pool.query(sql);

    // Log the execution
    await pool.query(
      `INSERT INTO ${tables.VANNA_QUERIES} (business_id, activity_id, generated_sql, status, query_result)
       VALUES ($1, $2, $3, $4, $5)`,
      [businessId, activityId || null, sql, 'executed', JSON.stringify(result.rows)]
    );

    res.json({
      success: true,
      rows: result.rows,
      rowCount: result.rowCount
    });

  } catch (error) {
    console.error('SQL execution error:', error);
    res.status(500).json({ error: error.message });
  }
});

// Send query result to LLM for analysis
router.post('/llm/analyze', requireAuth, async (req, res) => {
  try {
    const {
      businessId,
      prompt,
      queryResult,
      llmModel,
      llmProvider,
      tone,
      requestChart
    } = req.body;
    const pool = req.app.locals.pool;

    // Get AI settings
    const settingsResult = await pool.query(
      `SELECT * FROM ${tables.AI_SETTINGS} WHERE business_id = $1`,
      [businessId]
    );

    if (settingsResult.rows.length === 0) {
      return res.status(400).json({ error: 'AI settings not configured' });
    }

    const settings = settingsResult.rows[0];

    if (!settings.llm_api_key || !settings.llm_provider) {
      return res.status(400).json({ error: 'LLM not configured' });
    }

    // Prepare the analysis prompt
    const analysisPrompt = `You are a data analyst assistant. The user asked: "${prompt}"
    
Here's the query result data:
${JSON.stringify(queryResult, null, 2)}

Please provide:
1. A clear interpretation of the data
2. Key insights and patterns
3. Any important observations
${requestChart ? '4. Suggestions for visualization/charting' : ''}

Respond in a ${tone} tone. Be concise but informative.`;

    let analysisResponse;

    if (settings.llm_provider === 'openai') {
      const openaiResponse = await axios.post(
        'https://api.openai.com/v1/chat/completions',
        {
          model: settings.llm_model || 'gpt-4',
          messages: [
            { role: 'system', content: 'You are a helpful data analyst.' },
            { role: 'user', content: analysisPrompt }
          ],
          temperature: settings.llm_temperature || 0.7,
          max_tokens: settings.llm_max_tokens || 2000
        },
        {
          headers: {
            'Authorization': `Bearer ${settings.llm_api_key}`,
            'Content-Type': 'application/json'
          },
          timeout: 30000
        }
      );

      analysisResponse = openaiResponse.data.choices[0].message.content;

    } else if (settings.llm_provider === 'anthropic') {
      const anthropicResponse = await axios.post(
        'https://api.anthropic.com/v1/messages',
        {
          model: settings.llm_model || 'claude-3-opus-20240229',
          max_tokens: settings.llm_max_tokens || 2000,
          messages: [
            { role: 'user', content: analysisPrompt }
          ]
        },
        {
          headers: {
            'x-api-key': settings.llm_api_key,
            'Content-Type': 'application/json',
            'anthropic-version': '2023-06-01'
          },
          timeout: 30000
        }
      );

      analysisResponse = anthropicResponse.data.content[0].text;

    } else {
      return res.status(400).json({ error: 'Unsupported LLM provider' });
    }

    // Generate chart data if requested
    let chartData = null;
    if (requestChart && settings.enable_chart_generation && queryResult.rows && queryResult.rows.length > 0) {
      chartData = generateChartData(queryResult.rows, prompt);
    }

    // Log the analysis
    await pool.query(
      `INSERT INTO ${tables.VANNA_ANALYSES} (business_id, prompt, query_result, analysis_response, model_used)
       VALUES ($1, $2, $3, $4, $5)`,
      [businessId, prompt, JSON.stringify(queryResult), analysisResponse, settings.llm_model]
    );

    res.json({
      success: true,
      interpretation: analysisResponse,
      chartData: chartData
    });

  } catch (error) {
    console.error('LLM analysis error:', error);
    res.status(500).json({ error: error.message });
  }
});

// Helper function to generate chart data from query results
function generateChartData(rows, prompt) {
  if (!rows || rows.length === 0) return null;

  // Try to infer chart type from prompt
  const isTimeSeriesQuery = prompt.toLowerCase().includes('trend') || 
                           prompt.toLowerCase().includes('over time') ||
                           prompt.toLowerCase().includes('date') ||
                           prompt.toLowerCase().includes('month') ||
                           prompt.toLowerCase().includes('week');

  const isComparisonQuery = prompt.toLowerCase().includes('compare') ||
                           prompt.toLowerCase().includes('by facility') ||
                           prompt.toLowerCase().includes('by region') ||
                           prompt.toLowerCase().includes('distribution');

  // Extract first two numeric columns
  const firstRow = rows[0];
  const keys = Object.keys(firstRow);
  let labelKey = keys[0];
  let valueKey = keys[1];

  // Try to find better keys
  const numericKeys = keys.filter(k => typeof firstRow[k] === 'number');
  const stringKeys = keys.filter(k => typeof firstRow[k] === 'string');

  if (stringKeys.length > 0) labelKey = stringKeys[0];
  if (numericKeys.length > 0) valueKey = numericKeys[0];

  return {
    type: isTimeSeriesQuery ? 'line' : isComparisonQuery ? 'bar' : 'bar',
    labels: rows.map(r => String(r[labelKey])),
    datasets: [
      {
        label: valueKey,
        data: rows.map(r => Number(r[valueKey]) || 0),
        backgroundColor: 'rgba(75, 192, 192, 0.5)',
        borderColor: 'rgba(75, 192, 192, 1)',
        borderWidth: 2
      }
    ],
    options: {
      responsive: true,
      plugins: {
        legend: {
          position: 'top'
        },
        title: {
          display: true,
          text: 'Analysis Visualization'
        }
      }
    }
  };
}

// Train Vanna on activity DDL
router.post('/vanna/train-ddl', requireAuth, async (req, res) => {
  try {
    const { businessId, activityId, ddlSql } = req.body;
    const pool = req.app.locals.pool;

    // Get AI settings
    const settingsResult = await pool.query(
      `SELECT * FROM ${tables.AI_SETTINGS} WHERE business_id = $1`,
      [businessId]
    );

    if (settingsResult.rows.length === 0) {
      return res.status(400).json({ error: 'AI settings not configured' });
    }

    const settings = settingsResult.rows[0];

    if (!settings.vanna_api_url || !settings.vanna_api_key) {
      return res.status(400).json({ error: 'Vanna API not configured' });
    }

    // Call Vanna API to train on DDL
    const vannaResponse = await axios.post(
      `${settings.vanna_api_url}/api/v1/train/ddl`,
      { ddl: ddlSql },
      {
        headers: {
          'Authorization': `Bearer ${settings.vanna_api_key}`,
          'Content-Type': 'application/json'
        },
        timeout: 30000
      }
    );

    // Log training session
    const trainResult = await pool.query(
      `INSERT INTO ${tables.VANNA_TRAINING_SESSIONS} 
       (business_id, activity_id, session_name, database_type, ddl_sql, status, completed_at)
       VALUES ($1, $2, $3, $4, $5, $6, NOW())
       RETURNING *`,
      [businessId, activityId, `Activity ${activityId} Training`, 'postgresql', ddlSql, 'completed']
    );

    res.json({
      success: true,
      message: 'DDL training completed',
      sessionId: trainResult.rows[0].id
    });

  } catch (error) {
    console.error('Vanna DDL training error:', error);
    res.status(500).json({ error: error.message });
  }
});

export default router;
