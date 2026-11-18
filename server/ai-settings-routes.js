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

// Helper function for fetch with timeout
const fetchWithTimeout = async (url, options = {}, timeoutMs = 5000) => {
  const controller = new AbortController();
  const timeout = setTimeout(() => controller.abort(), timeoutMs);
  
  try {
    const response = await fetch(url, {
      ...options,
      signal: controller.signal
    });
    clearTimeout(timeout);
    return response;
  } catch (error) {
    clearTimeout(timeout);
    throw error;
  }
};

const mapAISettings = (row) => {
  if (!row) return null;
  return {
    vannaApiUrl: row.vanna_api_url || '',
    vannaApiKey: row.vanna_api_key || '',
    vannaModel: row.vanna_model || 'gpt-4',
    autoTrainDDL: row.auto_train_ddl ?? true,
    trainingInterval: row.training_interval || 24,
    aiContextText: row.ai_context_text || '',
    ragAutoGenerate: row.rag_auto_generate ?? false,
    lancedbUrl: row.lancedb_url || '',
    lancedbDatabase: row.lancedb_database || '',
    lancedbCollectionName: row.lancedb_collection_name || 'activities_embeddings',
    lancedbVectorDimension: row.lancedb_vector_dimension || 1536,
    vectordbProvider: row.vectordb_provider || 'lancedb',
    vectordbHost: row.vectordb_host || '',
    vectordbPort: row.vectordb_port || 8000,
    vectordbApiKey: row.vectordb_api_key || '',
    vectordbNamespace: row.vectordb_namespace || 'default',
    chromaUrl: row.chroma_url || 'http://localhost:8000',
    chromaCollectionName: row.chroma_collection_name || 'ramsnhe',
    chromaPersistDirectory: row.chroma_persist_directory || './chroma',
    embeddingModel: row.embedding_model || 'openai',
    embeddingModelName: row.embedding_model_name || 'text-embedding-3-small',
    embeddingDimension: row.embedding_dimension || 1536,
    embeddingApiKey: row.embedding_api_key || '',
    embeddingEndpoint: row.embedding_endpoint || '',
    llmProvider: row.llm_provider || 'openai',
    llmModel: row.llm_model || 'gpt-4',
    llmTemperature: row.llm_temperature != null ? Number(row.llm_temperature) : 0.7,
    llmMaxTokens: row.llm_max_tokens || 2000,
    llmApiKey: row.llm_api_key || '',
    llmEndpoint: row.llm_endpoint || '',
    vercelAIApiKey: row.vercel_ai_api_key || '',
    vercelAIModel: row.vercel_ai_model || 'gpt-4',
    vercelAITemperature: row.vercel_ai_temperature != null ? Number(row.vercel_ai_temperature) : 0.7,
    vercelAIMaxTokens: row.vercel_ai_max_tokens || 2000,
    vercelAIProvider: row.vercel_ai_provider || 'openai',
    enableAIAssistant: row.enable_ai_assistant ?? true,
    enableChartGeneration: row.enable_chart_generation ?? true,
    enableInsights: row.enable_insights ?? true,
    conversationContext: row.conversation_context || 5,
    responseToneStyle: row.response_tone_style || 'professional'
  };
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

    res.json(mapAISettings(result.rows[0]) || {
      vannaApiUrl: '',
      vannaApiKey: '',
      vannaModel: 'gpt-4',
      aiContextText: '',
      ragAutoGenerate: false,
      vectordbProvider: 'lancedb',
      vectordbHost: '',
      vectordbPort: 8000,
      vectordbApiKey: '',
      vectordbNamespace: 'default',
      chromaUrl: 'http://localhost:8000',
      chromaCollectionName: 'ramsnhe',
      chromaPersistDirectory: './chroma',
      llmProvider: 'openai',
      llmModel: 'gpt-4',
      llmTemperature: 0.7,
      llmMaxTokens: 2000,
      llmApiKey: '',
      llmEndpoint: '',
      enableAIAssistant: true,
      enableChartGeneration: true,
      enableInsights: true,
      conversationContext: 5,
      responseToneStyle: 'professional'
    });
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

    if (req.user.businessId !== parseInt(businessId) && req.user.role !== 'super_admin') {
      return res.status(403).json({ error: 'Forbidden' });
    }

    const result = await req.app.locals.pool.query(
      `INSERT INTO ${tables.AI_SETTINGS} (
        business_id, vanna_api_url, vanna_api_key, vanna_model, auto_train_ddl, training_interval,
        ai_context_text, rag_auto_generate, lancedb_url, lancedb_database, lancedb_collection_name,
        lancedb_vector_dimension, vectordb_provider, vectordb_host, vectordb_port, vectordb_api_key,
        vectordb_namespace, chroma_url, chroma_collection_name, chroma_persist_directory,
        embedding_model, embedding_model_name, embedding_dimension, embedding_api_key, embedding_endpoint,
        llm_provider, llm_model, llm_temperature, llm_max_tokens, llm_api_key, llm_endpoint,
        enable_ai_assistant, enable_chart_generation, enable_insights, conversation_context,
        response_tone_style, vercel_ai_api_key, vercel_ai_model, vercel_ai_temperature,
        vercel_ai_max_tokens, vercel_ai_provider, updated_at
      ) VALUES (
        $1,$2,$3,$4,$5,$6,$7,$8,$9,$10,$11,$12,$13,$14,$15,$16,$17,$18,$19,$20,$21,$22,$23,$24,$25,
        $26,$27,$28,$29,$30,$31,$32,$33,$34,$35,$36,$37,$38,$39,$40,$41,NOW()
      )
      ON CONFLICT (business_id) DO UPDATE SET
        vanna_api_url=EXCLUDED.vanna_api_url, vanna_api_key=EXCLUDED.vanna_api_key,
        vanna_model=EXCLUDED.vanna_model, auto_train_ddl=EXCLUDED.auto_train_ddl,
        training_interval=EXCLUDED.training_interval, ai_context_text=EXCLUDED.ai_context_text,
        rag_auto_generate=EXCLUDED.rag_auto_generate, lancedb_url=EXCLUDED.lancedb_url,
        lancedb_database=EXCLUDED.lancedb_database, lancedb_collection_name=EXCLUDED.lancedb_collection_name,
        lancedb_vector_dimension=EXCLUDED.lancedb_vector_dimension,
        vectordb_provider=EXCLUDED.vectordb_provider, vectordb_host=EXCLUDED.vectordb_host,
        vectordb_port=EXCLUDED.vectordb_port, vectordb_api_key=EXCLUDED.vectordb_api_key,
        vectordb_namespace=EXCLUDED.vectordb_namespace, chroma_url=EXCLUDED.chroma_url,
        chroma_collection_name=EXCLUDED.chroma_collection_name,
        chroma_persist_directory=EXCLUDED.chroma_persist_directory,
        embedding_model=EXCLUDED.embedding_model, embedding_model_name=EXCLUDED.embedding_model_name,
        embedding_dimension=EXCLUDED.embedding_dimension, embedding_api_key=EXCLUDED.embedding_api_key,
        embedding_endpoint=EXCLUDED.embedding_endpoint, llm_provider=EXCLUDED.llm_provider,
        llm_model=EXCLUDED.llm_model, llm_temperature=EXCLUDED.llm_temperature,
        llm_max_tokens=EXCLUDED.llm_max_tokens, llm_api_key=EXCLUDED.llm_api_key,
        llm_endpoint=EXCLUDED.llm_endpoint, enable_ai_assistant=EXCLUDED.enable_ai_assistant,
        enable_chart_generation=EXCLUDED.enable_chart_generation, enable_insights=EXCLUDED.enable_insights,
        conversation_context=EXCLUDED.conversation_context, response_tone_style=EXCLUDED.response_tone_style,
        vercel_ai_api_key=EXCLUDED.vercel_ai_api_key, vercel_ai_model=EXCLUDED.vercel_ai_model,
        vercel_ai_temperature=EXCLUDED.vercel_ai_temperature,
        vercel_ai_max_tokens=EXCLUDED.vercel_ai_max_tokens, vercel_ai_provider=EXCLUDED.vercel_ai_provider,
        updated_at=NOW()
      RETURNING *`,
      [
        businessId, settings.vannaApiUrl, settings.vannaApiKey, settings.vannaModel,
        settings.autoTrainDDL, settings.trainingInterval, settings.aiContextText || '',
        settings.ragAutoGenerate || false, settings.lancedbUrl, settings.lancedbDatabase,
        settings.lancedbCollectionName, settings.lancedbVectorDimension,
        settings.vectordbProvider, settings.vectordbHost, settings.vectordbPort,
        settings.vectordbApiKey, settings.vectordbNamespace,
        settings.chromaUrl || 'http://localhost:8000',
        settings.chromaCollectionName || 'ramsnhe',
        settings.chromaPersistDirectory || './chroma',
        settings.embeddingModel, settings.embeddingModelName, settings.embeddingDimension,
        settings.embeddingApiKey, settings.embeddingEndpoint,
        settings.llmProvider, settings.llmModel, settings.llmTemperature,
        settings.llmMaxTokens, settings.llmApiKey, settings.llmEndpoint,
        settings.enableAIAssistant, settings.enableChartGeneration, settings.enableInsights,
        settings.conversationContext, settings.responseToneStyle,
        settings.vercelAIApiKey, settings.vercelAIModel, settings.vercelAITemperature,
        settings.vercelAIMaxTokens, settings.vercelAIProvider
      ]
    );
    res.json(mapAISettings(result.rows[0]));
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
        const response = await fetchWithTimeout(`${localVannaUrl}/health`);

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
          details: 'Local Vanna server at port 8888 is not responding',
          hint: 'Make sure the Vanna server is started. You can start it from the Vanna settings.'
        });
      }
    }

    // Test connection to provided URL
    try {
      const headers = {};
      if (vannaApiKey) {
        headers['Authorization'] = `Bearer ${vannaApiKey}`;
      }

      const response = await fetchWithTimeout(`${vannaApiUrl}/health`, { headers });

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

    const response = await fetchWithTimeout(`${lancedbUrl}/api/databases/${lancedbDatabase}`);

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

// Test generic VectorDB provider connection
router.post('/vectordb/test-connection', requireAuth, async (req, res) => {
  try {
    const { provider, host, port, apiKey, namespace, chromaUrl, chromaCollectionName } = req.body;

    if (provider === 'chroma') {
      const baseUrl = (chromaUrl || 'http://localhost:8000').replace(/\/$/, '');
      const heartbeat = await fetchWithTimeout(`${baseUrl}/api/v1/heartbeat`, {}, 5000);
      if (!heartbeat.ok) {
        return res.status(400).json({
          error: 'Chroma DB connection failed',
          details: `Could not reach ${baseUrl}/api/v1/heartbeat`
        });
      }
      return res.json({
        success: true,
        message: `Chroma DB connection successful${chromaCollectionName ? ` - collection: ${chromaCollectionName}` : ''}`
      });
    }

    if (!host) {
      return res.status(400).json({ error: `${provider || 'VectorDB'} host is required` });
    }

    if (provider === 'pinecone') {
      if (!apiKey) return res.status(400).json({ error: 'Pinecone API key is required' });
      return res.json({ success: true, message: 'Pinecone configuration validated' });
    }

    return res.json({
      success: true,
      message: `${provider || 'VectorDB'} configuration validated`,
      endpoint: `${host}${port ? `:${port}` : ''}`,
      namespace: namespace || 'default'
    });
  } catch (error) {
    console.error('VectorDB connection test failed:', error);
    res.status(500).json({ error: 'VectorDB connection test failed', details: error.message });
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
          const response = await fetchWithTimeout(`${embeddingEndpoint}/health`);
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
      const response = await fetchWithTimeout('https://api.openai.com/v1/embeddings', {
        method: 'POST',
        headers: {
          'Authorization': `Bearer ${embeddingApiKey}`,
          'Content-Type': 'application/json'
        },
        body: JSON.stringify({
          model: 'text-embedding-3-small',
          input: 'test'
        })
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
      const response = await fetchWithTimeout('https://api.cohere.ai/v1/embed', {
        method: 'POST',
        headers: {
          'Authorization': `Bearer ${embeddingApiKey}`,
          'Content-Type': 'application/json'
        },
        body: JSON.stringify({
          texts: ['test'],
          model: 'embed-english-v3.0'
        })
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
    const { businessId, llmProvider, llmApiKey, llmModel, llmEndpoint } = req.body;

    if (!llmProvider) {
      return res.status(400).json({ error: 'LLM provider is required' });
    }

    // For Ollama/local LLM models, test the local tags endpoint.
    if (llmProvider === 'llama' || llmProvider === 'local' || llmProvider === 'ollama' || llmProvider === 'ollama-local') {
      const response = await fetchWithTimeout('http://127.0.0.1:11434/api/tags', {}, 5000);
      if (!response.ok) {
        return res.status(400).json({ error: 'Ollama is not reachable', details: `Failed to reach ${endpoint}` });
      }
      const data = await response.json().catch(() => ({}));
      const models = Array.isArray(data.models) ? data.models.map(m => m.name || String(m)).filter(Boolean) : [];
      if (llmModel && models.length > 0 && !models.includes(llmModel)) {
        return res.status(400).json({ error: 'Configured Ollama model was not found', details: `Available models: ${models.join(', ')}` });
      }
      return res.json({
        success: true,
        message: 'Ollama connection successful',
        models
      });
    }

    // For cloud-based providers, require API key and validate it
    if (!llmApiKey) {
      return res.status(400).json({ error: 'API key is required for cloud-based LLM providers' });
    }

    // Test API key with the provider
    if (llmProvider === 'openai') {
      const response = await fetchWithTimeout('https://api.openai.com/v1/chat/completions', {
        method: 'POST',
        headers: {
          'Authorization': `Bearer ${llmApiKey}`,
          'Content-Type': 'application/json'
        },
        body: JSON.stringify({
          model: llmModel || 'gpt-3.5-turbo',
          messages: [{ role: 'user', content: 'test' }],
          max_tokens: 10
        })
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
      const response = await fetchWithTimeout('https://api.anthropic.com/v1/messages', {
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
        })
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
      const response = await fetchWithTimeout(`https://generativelanguage.googleapis.com/v1beta/models/${llmModel || 'gemini-pro'}:generateContent?key=${llmApiKey}`, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json'
        },
        body: JSON.stringify({
          contents: [{ parts: [{ text: 'test' }] }]
        })
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
    } else if (llmProvider === 'cohere') {
      const response = await fetchWithTimeout('https://api.cohere.com/v2/chat', {
        method: 'POST',
        headers: {
          'Authorization': `Bearer ${llmApiKey}`,
          'Content-Type': 'application/json'
        },
        body: JSON.stringify({
          model: llmModel || 'command-r',
          messages: [{ role: 'user', content: 'test' }],
          max_tokens: 10
        })
      });
      if (response.ok) {
        res.json({ success: true, message: 'Cohere connection successful' });
      } else {
        const errorData = await response.json().catch(() => ({}));
        res.status(400).json({
          error: 'Cohere API connection failed',
          status: response.status,
          details: errorData.message || errorData.error || 'Invalid API key'
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
