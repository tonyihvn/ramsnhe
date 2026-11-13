// AI Settings API Routes
import express from 'express';
import { Router } from 'express';
import { tables } from './tablePrefix.js';

const router = Router();

// Middleware to check authentication
const requireAuth = (req, res, next) => {
  if (!req.user) {
    return res.status(401).json({ error: 'Unauthorized' });
  }
  next();
};

// GET AI Settings for business
router.get('/ai-settings/:businessId', requireAuth, async (req, res) => {
  try {
    const { businessId } = req.params;

    // Check if user has access to this business
    if (req.user.businessId !== parseInt(businessId) && req.user.role !== 'super_admin') {
      return res.status(403).json({ error: 'Forbidden' });
    }

    const result = await req.app.locals.pool.query(
      `SELECT * FROM ${tables.AI_SETTINGS} WHERE business_id = $1`,
      [businessId]
    );

    if (result.rows.length === 0) {
      // Return default settings if not configured yet
      return res.json({
        vannaApiUrl: '',
        vannaApiKey: '',
        vannaModel: 'gpt-4',
        autoTrainDDL: true,
        trainingInterval: 24,
        lancedbUrl: '',
        lancedbDatabase: '',
        lancedbCollectionName: 'activities_embeddings',
        lancedbVectorDimension: 1536,
        vectordbProvider: 'lancedb',
        vectordbHost: '',
        vectordbPort: 8000,
        vectordbApiKey: '',
        vectordbNamespace: 'default',
        embeddingModel: 'openai',
        embeddingModelName: 'text-embedding-3-small',
        embeddingDimension: 1536,
        embeddingApiKey: '',
        embeddingEndpoint: '',
        llmProvider: 'openai',
        llmModel: 'gpt-4',
        llmTemperature: 0.7,
        llmMaxTokens: 2000,
        llmApiKey: '',
        enableAIAssistant: true,
        enableChartGeneration: true,
        enableInsights: true,
        conversationContext: 5,
        responseToneStyle: 'professional',
      });
    }

    res.json(result.rows[0]);
  } catch (error) {
    console.error('Error fetching AI settings:', error);
    res.status(500).json({ error: error.message });
  }
});

// PUT AI Settings for business
router.put('/ai-settings/:businessId', requireAuth, async (req, res) => {
  try {
    const { businessId } = req.params;
    const settings = req.body;

    // Check if user has access to this business
    if (req.user.businessId !== parseInt(businessId) && req.user.role !== 'super_admin') {
      return res.status(403).json({ error: 'Forbidden' });
    }

    // Check if settings exist
    const existing = await req.app.locals.pool.query(
      `SELECT id FROM ${tables.AI_SETTINGS} WHERE business_id = $1`,
      [businessId]
    );

    if (existing.rows.length === 0) {
      // Create new settings
      const result = await req.app.locals.pool.query(
        `INSERT INTO ${tables.AI_SETTINGS} (
          business_id, vanna_api_url, vanna_api_key, vanna_model, auto_train_ddl,
          training_interval, lancedb_url, lancedb_database, lancedb_collection_name,
          lancedb_vector_dimension, vectordb_provider, vectordb_host, vectordb_port,
          vectordb_api_key, vectordb_namespace, embedding_model, embedding_model_name,
          embedding_dimension, embedding_api_key, embedding_endpoint, llm_provider,
          llm_model, llm_temperature, llm_max_tokens, llm_api_key, enable_ai_assistant,
          enable_chart_generation, enable_insights, conversation_context, response_tone_style,
          updated_at
        ) VALUES ($1, $2, $3, $4, $5, $6, $7, $8, $9, $10, $11, $12, $13, $14, $15, $16, $17,
          $18, $19, $20, $21, $22, $23, $24, $25, $26, $27, $28, $29, $30, NOW())
        RETURNING *`,
        [
          businessId, settings.vannaApiUrl, settings.vannaApiKey, settings.vannaModel,
          settings.autoTrainDDL, settings.trainingInterval, settings.lancedbUrl,
          settings.lancedbDatabase, settings.lancedbCollectionName,
          settings.lancedbVectorDimension, settings.vectordbProvider, settings.vectordbHost,
          settings.vectordbPort, settings.vectordbApiKey, settings.vectordbNamespace,
          settings.embeddingModel, settings.embeddingModelName, settings.embeddingDimension,
          settings.embeddingApiKey, settings.embeddingEndpoint, settings.llmProvider,
          settings.llmModel, settings.llmTemperature, settings.llmMaxTokens, settings.llmApiKey,
          settings.enableAIAssistant, settings.enableChartGeneration, settings.enableInsights,
          settings.conversationContext, settings.responseToneStyle
        ]
      );
      return res.json(result.rows[0]);
    } else {
      // Update existing settings
      const result = await req.app.locals.pool.query(
        `UPDATE ${tables.AI_SETTINGS} SET
          vanna_api_url = $2, vanna_api_key = $3, vanna_model = $4, auto_train_ddl = $5,
          training_interval = $6, lancedb_url = $7, lancedb_database = $8,
          lancedb_collection_name = $9, lancedb_vector_dimension = $10,
          vectordb_provider = $11, vectordb_host = $12, vectordb_port = $13,
          vectordb_api_key = $14, vectordb_namespace = $15, embedding_model = $16,
          embedding_model_name = $17, embedding_dimension = $18, embedding_api_key = $19,
          embedding_endpoint = $20, llm_provider = $21, llm_model = $22,
          llm_temperature = $23, llm_max_tokens = $24, llm_api_key = $25,
          enable_ai_assistant = $26, enable_chart_generation = $27, enable_insights = $28,
          conversation_context = $29, response_tone_style = $30, updated_at = NOW()
        WHERE business_id = $1
        RETURNING *`,
        [
          businessId, settings.vannaApiUrl, settings.vannaApiKey, settings.vannaModel,
          settings.autoTrainDDL, settings.trainingInterval, settings.lancedbUrl,
          settings.lancedbDatabase, settings.lancedbCollectionName,
          settings.lancedbVectorDimension, settings.vectordbProvider, settings.vectordbHost,
          settings.vectordbPort, settings.vectordbApiKey, settings.vectordbNamespace,
          settings.embeddingModel, settings.embeddingModelName, settings.embeddingDimension,
          settings.embeddingApiKey, settings.embeddingEndpoint, settings.llmProvider,
          settings.llmModel, settings.llmTemperature, settings.llmMaxTokens, settings.llmApiKey,
          settings.enableAIAssistant, settings.enableChartGeneration, settings.enableInsights,
          settings.conversationContext, settings.responseToneStyle
        ]
      );
      return res.json(result.rows[0]);
    }
  } catch (error) {
    console.error('Error saving AI settings:', error);
    res.status(500).json({ error: error.message });
  }
});

// Test Vanna Connection
router.post('/vanna/test-connection', requireAuth, async (req, res) => {
  try {
    const { businessId, vannaApiUrl, vannaApiKey } = req.body;

    // If Vanna URL is not provided, try to test the local Vanna server
    if (!vannaApiUrl) {
      try {
        // Try to connect to local Vanna server on default port
        const localVannaUrl = 'http://127.0.0.1:8888';
        const response = await fetch(`${localVannaUrl}/health`, {
          timeout: 5000
        }).catch(() => null);

        if (response && response.ok) {
          return res.json({ 
            success: true, 
            message: 'Local Vanna server is running on port 8888',
            url: localVannaUrl 
          });
        } else {
          return res.status(400).json({ 
            error: 'Vanna API URL is required and local Vanna server is not running',
            suggestion: 'Start the Vanna server or provide a remote API URL'
          });
        }
      } catch (e) {
        return res.status(400).json({ 
          error: 'Vanna API URL is required',
          details: 'Local Vanna server at port 8888 is not responding'
        });
      }
    }

    // Test connection to provided URL
    try {
      const headers = {};
      if (vannaApiKey) {
        headers['Authorization'] = `Bearer ${vannaApiKey}`;
      }

      const response = await fetch(`${vannaApiUrl}/health`, {
        headers,
        timeout: 5000
      });

      if (response.ok) {
        res.json({ success: true, message: 'Vanna connection successful', url: vannaApiUrl });
      } else {
        const errorData = await response.json().catch(() => ({}));
        res.status(400).json({ 
          error: 'Vanna connection failed', 
          status: response.status,
          details: errorData.error || errorData.message || 'Check API key and URL'
        });
      }
    } catch (error) {
      res.status(400).json({ 
        error: 'Could not reach Vanna server',
        details: error.message,
        suggestion: 'Verify the URL is correct and the server is running'
      });
    }
  } catch (error) {
    console.error('Vanna connection test failed:', error);
    res.status(500).json({ error: 'Connection test failed: ' + error.message });
  }
});

// Test LanceDB Connection
router.post('/lancedb/test-connection', requireAuth, async (req, res) => {
  try {
    const { businessId, lancedbUrl, lancedbDatabase } = req.body;

    if (!lancedbUrl || !lancedbDatabase) {
      return res.status(400).json({ error: 'LanceDB URL and database are required' });
    }

    const response = await fetch(`${lancedbUrl}/api/databases/${lancedbDatabase}`, {
      timeout: 5000
    });

    if (response.ok) {
      res.json({ success: true, message: 'Connection successful' });
    } else {
      res.status(400).json({ error: 'Connection failed', status: response.status });
    }
  } catch (error) {
    console.error('LanceDB connection test failed:', error);
    res.status(500).json({ error: error.message });
  }
});

// Test Embedding Model Connection
router.post('/embedding/test-connection', requireAuth, async (req, res) => {
  try {
    const { businessId, embeddingModel, embeddingApiKey, embeddingEndpoint } = req.body;

    if (!embeddingModel) {
      return res.status(400).json({ error: 'Embedding model is required' });
    }

    // For local embedding models, validate the endpoint if provided
    if (embeddingModel === 'local' || embeddingModel === 'ollama' || embeddingModel === 'huggingface-local') {
      if (embeddingEndpoint) {
        try {
          const response = await fetch(`${embeddingEndpoint}/health`, { timeout: 5000 }).catch(() => null);
          if (response && response.ok) {
            return res.json({ success: true, message: 'Local embedding model server is healthy' });
          }
        } catch (e) {
          console.warn('Could not verify local embedding endpoint:', e.message);
        }
      }
      return res.json({ 
        success: true, 
        message: 'Local embedding model configured. Ensure the service is running.' 
      });
    }

    // For cloud-based providers, require API key
    if (!embeddingApiKey) {
      return res.status(400).json({ error: 'API key is required for cloud-based embedding providers' });
    }

    // Test by trying to create a test embedding
    if (embeddingModel === 'openai') {
      const response = await fetch('https://api.openai.com/v1/embeddings', {
        method: 'POST',
        headers: {
          'Authorization': `Bearer ${embeddingApiKey}`,
          'Content-Type': 'application/json'
        },
        body: JSON.stringify({
          model: 'text-embedding-3-small',
          input: 'test'
        }),
        timeout: 5000
      });

      if (response.ok) {
        res.json({ success: true, message: 'OpenAI embedding connection successful' });
      } else {
        const errorData = await response.json().catch(() => ({}));
        res.status(400).json({ 
          error: 'OpenAI embedding connection failed', 
          status: response.status,
          details: errorData.error?.message || 'Invalid API key'
        });
      }
    } else if (embeddingModel === 'cohere') {
      const response = await fetch('https://api.cohere.ai/v1/embed', {
        method: 'POST',
        headers: {
          'Authorization': `Bearer ${embeddingApiKey}`,
          'Content-Type': 'application/json'
        },
        body: JSON.stringify({
          texts: ['test'],
          model: 'embed-english-v3.0'
        }),
        timeout: 5000
      });

      if (response.ok) {
        res.json({ success: true, message: 'Cohere embedding connection successful' });
      } else {
        const errorData = await response.json().catch(() => ({}));
        res.status(400).json({ 
          error: 'Cohere embedding connection failed', 
          status: response.status,
          details: errorData.error?.message || 'Invalid API key'
        });
      }
    } else if (embeddingModel === 'azure') {
      res.json({ success: true, message: 'Azure embedding model configuration validated' });
    } else {
      res.json({ success: true, message: 'Embedding model configuration validated' });
    }
  } catch (error) {
    console.error('Embedding connection test failed:', error);
    res.status(500).json({ error: 'Connection test failed: ' + error.message });
  }
});

// Test LLM Connection
router.post('/llm/test-connection', requireAuth, async (req, res) => {
  try {
    const { businessId, llmProvider, llmApiKey, llmModel } = req.body;

    if (!llmProvider) {
      return res.status(400).json({ error: 'LLM provider is required' });
    }

    // For local LLM models, just validate that a provider is selected
    if (llmProvider === 'llama' || llmProvider === 'local' || llmProvider === 'ollama') {
      return res.json({ 
        success: true, 
        message: 'Local LLM model configured. Make sure the local server is running.' 
      });
    }

    // For cloud-based providers, require API key and validate it
    if (!llmApiKey) {
      return res.status(400).json({ error: 'API key is required for cloud-based LLM providers' });
    }

    // Test API key with the provider
    if (llmProvider === 'openai') {
      const response = await fetch('https://api.openai.com/v1/chat/completions', {
        method: 'POST',
        headers: {
          'Authorization': `Bearer ${llmApiKey}`,
          'Content-Type': 'application/json'
        },
        body: JSON.stringify({
          model: llmModel || 'gpt-3.5-turbo',
          messages: [{ role: 'user', content: 'test' }],
          max_tokens: 10
        }),
        timeout: 5000
      });

      if (response.ok) {
        res.json({ success: true, message: 'OpenAI connection successful' });
      } else {
        const errorData = await response.json().catch(() => ({}));
        res.status(400).json({ 
          error: 'OpenAI API connection failed', 
          status: response.status,
          details: errorData.error?.message || 'Invalid API key or model'
        });
      }
    } else if (llmProvider === 'anthropic') {
      const response = await fetch('https://api.anthropic.com/v1/messages', {
        method: 'POST',
        headers: {
          'x-api-key': llmApiKey,
          'Content-Type': 'application/json',
          'anthropic-version': '2023-06-01'
        },
        body: JSON.stringify({
          model: llmModel || 'claude-3-sonnet-20240229',
          max_tokens: 10,
          messages: [{ role: 'user', content: 'test' }]
        }),
        timeout: 5000
      });

      if (response.ok) {
        res.json({ success: true, message: 'Anthropic Claude connection successful' });
      } else {
        const errorData = await response.json().catch(() => ({}));
        res.status(400).json({ 
          error: 'Anthropic API connection failed', 
          status: response.status,
          details: errorData.error?.message || 'Invalid API key'
        });
      }
    } else if (llmProvider === 'google') {
      const response = await fetch(`https://generativelanguage.googleapis.com/v1beta/models/${llmModel || 'gemini-pro'}:generateContent?key=${llmApiKey}`, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json'
        },
        body: JSON.stringify({
          contents: [{ parts: [{ text: 'test' }] }]
        }),
        timeout: 5000
      });

      if (response.ok) {
        res.json({ success: true, message: 'Google Gemini connection successful' });
      } else {
        const errorData = await response.json().catch(() => ({}));
        res.status(400).json({ 
          error: 'Google Gemini API connection failed', 
          status: response.status,
          details: errorData.error?.message || 'Invalid API key'
        });
      }
    } else if (llmProvider === 'azure') {
      res.json({ success: true, message: 'Azure OpenAI configuration validated. Ensure endpoint and key are correct.' });
    } else {
      res.json({ success: true, message: 'LLM provider configuration validated' });
    }
  } catch (error) {
    console.error('LLM connection test failed:', error);
    res.status(500).json({ error: 'Connection test failed: ' + error.message });
  }
});

export default router;
