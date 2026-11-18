import React, { useState, useEffect } from 'react';
import Card from './ui/Card';
import Button from './ui/Button';
import { success as swalSuccess, error as swalError, info as swalInfo } from './ui/swal';

interface AIIntegrationsTabProps {
  businessId: number;
}

const AIIntegrationsTab: React.FC<AIIntegrationsTabProps> = ({ businessId }) => {
  const [activeTab, setActiveTab] = useState(0);
  const [activeSubTab, setActiveSubTab] = useState<string | null>('1a');
  const [loading, setLoading] = useState(false);
  const [testing, setTesting] = useState<string | null>(null);
  const [saveStatus, setSaveStatus] = useState<{ type: 'success' | 'error', message: string } | null>(null);
  const [vannaServerStatus, setVannaServerStatus] = useState<'stopped' | 'starting' | 'running' | 'error'>('stopped');
  const [ollamaModels, setOllamaModels] = useState<string[]>([]);
  const [detectingOllama, setDetectingOllama] = useState(false);
  const [settings, setSettings] = useState({
    // Vanna DDL Training
    vannaApiUrl: '',
    vannaApiKey: '',
    vannaModel: 'gpt-4',
    autoTrainDDL: true,
    trainingInterval: 24,
    
    // AI Context
    aiContextText: '',
    
    // RAG Settings
    ragAutoGenerate: false,
    
    // Vercel AI SDK Settings
    vercelAIApiKey: '',
    vercelAIModel: 'gpt-4',
    vercelAITemperature: 0.7,
    vercelAIMaxTokens: 2000,
    vercelAIProvider: 'openai',
    
    // LanceDB Settings
    lancedbUrl: '',
    lancedbDatabase: '',
    lancedbCollectionName: 'activities_embeddings',
    lancedbVectorDimension: 1536,
    
    // VectorDB Settings
    vectordbProvider: 'lancedb',
    vectordbHost: '',
    vectordbPort: 8000,
    vectordbApiKey: '',
    vectordbNamespace: 'default',
    chromaUrl: 'http://localhost:8000',
    chromaCollectionName: 'ramsnhe',
    chromaPersistDirectory: './chroma',
    
    // Embedding Model Settings
    embeddingModel: 'openai',
    embeddingModelName: 'text-embedding-3-small',
    embeddingDimension: 1536,
    embeddingApiKey: '',
    embeddingEndpoint: '',
    
    // LLM Model Settings
    llmProvider: 'openai',
    llmModel: 'gpt-4',
    llmTemperature: 0.7,
    llmMaxTokens: 2000,
    llmApiKey: '',
    llmEndpoint: '/api/ollama',
    
    // AI Assistant Settings
    enableAIAssistant: true,
    enableChartGeneration: true,
    enableInsights: true,
    conversationContext: 5,
    responseToneStyle: 'professional',
  });

  useEffect(() => {
    loadSettings();
  }, [businessId]);

  const loadSettings = async () => {
    try {
      setLoading(true);
      const res = await fetch(`/api/ai-settings/${businessId}`, {
        credentials: 'include'
      });
      if (res.ok) {
        const data = await res.json();
        setSettings(prev => ({ ...prev, ...data }));
      }
    } catch (err) {
      console.error('Failed to load settings:', err);
      swalError('Failed', 'Failed to load AI settings');
    } finally {
      setLoading(false);
    }
  };

  const handleChange = (key: string, value: any) => {
    setSettings(prev => ({ ...prev, [key]: value }));
  };

  const handleSave = async () => {
    try {
      setLoading(true);
      setSaveStatus(null);
      const res = await fetch(`/api/ai-settings/${businessId}`, {
        method: 'PUT',
        headers: { 'Content-Type': 'application/json' },
        credentials: 'include',
        body: JSON.stringify(settings)
      });
      if (res.ok) {
        swalSuccess('Success', 'AI settings saved successfully!');
        setSaveStatus({ type: 'success', message: 'Settings saved successfully!' });
        setTimeout(() => setSaveStatus(null), 3000);
      } else {
        throw new Error('Failed to save');
      }
    } catch (err) {
      swalError('Failed', 'Failed to save AI settings');
      setSaveStatus({ type: 'error', message: 'Failed to save settings' });
    } finally {
      setLoading(false);
    }
  };

  const handleTest = async (type: string) => {
    try {
      setTesting(type);
      setSaveStatus(null);
      let endpoint = '';
      let payload: any = { businessId };

      if (type === 'vanna') {
        endpoint = '/api/vanna/test-connection';
        payload = { ...payload, vannaApiUrl: settings.vannaApiUrl, vannaApiKey: settings.vannaApiKey };
      } else if (type === 'lancedb') {
        endpoint = '/api/lancedb/test-connection';
        payload = { ...payload, lancedbUrl: settings.lancedbUrl, lancedbDatabase: settings.lancedbDatabase };
      } else if (type === 'vectordb') {
        endpoint = '/api/vectordb/test-connection';
        payload = {
          ...payload,
          provider: settings.vectordbProvider,
          host: settings.vectordbHost,
          port: settings.vectordbPort,
          apiKey: settings.vectordbApiKey,
          namespace: settings.vectordbNamespace,
          chromaUrl: settings.chromaUrl,
          chromaCollectionName: settings.chromaCollectionName,
          chromaPersistDirectory: settings.chromaPersistDirectory
        };
      } else if (type === 'embedding') {
        endpoint = '/api/embedding/test-connection';
        payload = { ...payload, embeddingModel: settings.embeddingModel, embeddingApiKey: settings.embeddingApiKey };
      } else if (type === 'llm') {
        endpoint = '/api/llm/test-connection';
        payload = {
          ...payload,
          llmProvider: settings.llmProvider,
          llmApiKey: settings.llmApiKey,
          llmModel: settings.llmModel,
          llmEndpoint: settings.llmEndpoint
        };
      } else if (type === 'vercel-ai') {
        endpoint = '/api/vercel-ai/test-connection';
        payload = { ...payload, vercelAIProvider: settings.vercelAIProvider, vercelAIApiKey: settings.vercelAIApiKey, vercelAIModel: settings.vercelAIModel };
      }

      const res = await fetch(endpoint, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        credentials: 'include',
        body: JSON.stringify(payload)
      });

      if (res.ok) {
        swalSuccess('Success', `${type.toUpperCase()} connection successful!`);
        setSaveStatus({ type: 'success', message: `${type.toUpperCase()} connection successful!` });
      } else {
        const errData = await res.json();
        swalError('Failed', errData.message || `${type.toUpperCase()} connection failed`);
        setSaveStatus({ type: 'error', message: `${type.toUpperCase()} connection failed` });
      }
    } catch (err) {
      swalError('Error', `${type.toUpperCase()} connection error`);
      setSaveStatus({ type: 'error', message: `${type.toUpperCase()} connection failed` });
    } finally {
      setTesting(null);
    }
  };

  const handleVannaServerControl = async (action: 'start' | 'stop' | 'restart') => {
    try {
      setVannaServerStatus(action === 'start' ? 'starting' : action === 'stop' ? 'stopped' : 'starting');
      const res = await fetch(`/api/vanna-server/${action}`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        credentials: 'include',
        body: JSON.stringify({ businessId })
      });

      if (res.ok) {
        const data = await res.json();
        setVannaServerStatus(data.status === 'running' ? 'running' : 'stopped');
        swalSuccess('Success', `Vanna server ${action}ed successfully!`);
      } else {
        setVannaServerStatus('error');
        swalError('Failed', `Failed to ${action} Vanna server`);
      }
    } catch (err) {
      setVannaServerStatus('error');
      swalError('Error', `Error while attempting to ${action} server`);
    }
  };

  const checkVannaServerStatus = async () => {
    try {
      const res = await fetch('/api/vanna-server/status', { credentials: 'include' });
      if (res.ok) {
        const data = await res.json();
        const status = data?.data?.status || data?.status;
        setVannaServerStatus(status === 'running' ? 'running' : status === 'starting' ? 'starting' : status === 'error' ? 'error' : 'stopped');
      } else {
        setVannaServerStatus('stopped');
      }
    } catch (err) {
      setVannaServerStatus('stopped');
    }
  };

  const detectOllamaModels = async () => {
    try {
      setDetectingOllama(true);
      let res = await fetch('/api/admin/detect-ollama', { credentials: 'include' });
      if (res.status === 401 || res.status === 403) {
        res = await fetch('/api/detect-ollama', { credentials: 'include' });
      }
      if (res.ok) {
        const data = await res.json();
        if (data.models && Array.isArray(data.models)) {
          const modelNames = data.models.map((m: any) => m.name || String(m));
          setOllamaModels(modelNames);
          swalSuccess('Success', `Found ${modelNames.length} Ollama model(s)`);
          return modelNames;
        } else {
          swalInfo('No Models', 'Ollama detected but no models installed. Install a model first.');
          setOllamaModels([]);
        }
      } else {
        swalError('Error', 'Ollama not running. Make sure Ollama is installed and started.');
        setOllamaModels([]);
      }
    } catch (err) {
      swalError('Error', 'Could not connect to the server-side Ollama detector');
      setOllamaModels([]);
    } finally {
      setDetectingOllama(false);
    }
  };

  useEffect(() => {
    checkVannaServerStatus();
    const interval = setInterval(checkVannaServerStatus, 5000); // Check every 5 seconds
    return () => clearInterval(interval);
  }, []);

  const tabs = [
    { id: 0, label: 'Vanna DDL Training', icon: '🗃️' },
    { id: 1, label: 'AI Integrations', icon: '⚙️', subtabs: [
      { id: '1a', label: 'AI Context', icon: '🧠' },
      { id: '1b', label: 'LLM', icon: '🤖' },
      { id: '1c', label: 'RAG', icon: '📚' },
    ]},
    { id: 2, label: 'Vercel AI SDK', icon: '⚡' },
    { id: 3, label: 'LanceDB Vector Store', icon: '🗂️' },
    { id: 4, label: 'VectorDB Settings', icon: '📦' },
    { id: 5, label: 'Embedding Model', icon: '🧵' },
    { id: 6, label: 'AI Assistant Features', icon: '✨' },
  ];

  return (
    <div className="space-y-4">
      <Card>
        <h3 className="text-lg font-medium mb-4">AI Integrations for Organization #{businessId}</h3>
        
        {/* Status Messages */}
        {saveStatus && (
          <div className={`mb-4 p-3 rounded ${saveStatus.type === 'success' ? 'bg-green-50 border border-green-200 text-green-800' : 'bg-red-50 border border-red-200 text-red-800'}`}>
            {saveStatus.message}
          </div>
        )}

        {loading && !settings.vannaApiUrl && <div className="text-sm text-gray-500">Loading settings...</div>}

        {/* Tab Navigation */}
        <div className="flex space-x-2 mb-6 border-b overflow-x-auto pb-2">
          {tabs.map(tab => (
            <button
              key={tab.id}
              onClick={() => setActiveTab(tab.id)}
              className={`px-4 py-2 rounded whitespace-nowrap text-sm font-medium transition-colors ${
                activeTab === tab.id
                  ? 'bg-blue-100 text-blue-700 border-b-2 border-blue-700'
                  : 'text-gray-600 hover:text-gray-900'
              }`}
            >
              {tab.icon} {tab.label}
            </button>
          ))}
        </div>

        {/* Tab Content */}
        <div className="space-y-4">
          {/* Vanna DDL Training Tab */}
          {activeTab === 0 && (
            <div className="space-y-4">
              <div className="p-3 bg-blue-50 border border-blue-200 rounded-lg">
                <p className="text-sm text-blue-900">
                  <strong>ℹ️ Auto-Managed Vanna Server:</strong> The Vanna server runs automatically on port 8888 and uses your database connection from Settings→Database.
                </p>
              </div>

              {/* Server Status & Controls */}
              <div className="p-4 border rounded-lg bg-gray-50">
                <div className="flex items-center justify-between mb-4">
                  <div>
                    <h4 className="text-sm font-medium text-gray-900">Server Status</h4>
                    <p className="text-xs text-gray-600 mt-1">
                      <span className={`inline-block w-2 h-2 rounded-full mr-2 ${vannaServerStatus === 'running' ? 'bg-green-500' : vannaServerStatus === 'error' ? 'bg-red-500' : 'bg-gray-400'}`} />
                      {vannaServerStatus === 'running' ? '✓ Running on port 8888' : vannaServerStatus === 'error' ? '✗ Error' : '○ Stopped'}
                    </p>
                  </div>
                  <div className="space-x-2">
                    <Button 
                      onClick={() => handleVannaServerControl('start')} 
                      disabled={vannaServerStatus === 'running' || vannaServerStatus === 'starting'}
                      variant={vannaServerStatus === 'running' ? 'secondary' : 'primary'}
                      className="text-xs"
                    >
                      Start
                    </Button>
                    <Button 
                      onClick={() => handleVannaServerControl('stop')} 
                      disabled={vannaServerStatus !== 'running'}
                      variant="secondary"
                      className="text-xs"
                    >
                      Stop
                    </Button>
                    <Button 
                      onClick={() => handleVannaServerControl('restart')} 
                      disabled={vannaServerStatus === 'stopped'}
                      variant="secondary"
                      className="text-xs"
                    >
                      Restart
                    </Button>
                  </div>
                </div>
              </div>

              {/* Database Configuration (Read-only) */}
              <div className="p-4 border rounded-lg bg-amber-50">
                <h4 className="text-sm font-medium text-gray-900 mb-3">📊 Configured Database (Auto-Connected)</h4>
                <p className="text-xs text-gray-600 mb-3">The Vanna server automatically uses the database credentials configured in Settings→Database. No manual configuration needed.</p>
                <div className="space-y-2 text-xs">
                  <p><strong>Note:</strong> Update your database settings in Settings→Database tab, then restart the Vanna server for changes to take effect.</p>
                </div>
              </div>

              {/* Vanna Server Endpoint */}
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-2">Vanna Server Endpoint</label>
                <input
                  type="text"
                  value="Managed through the application server"
                  disabled
                  className="w-full px-3 py-2 border rounded-lg bg-gray-100 text-gray-600"
                />
                <p className="text-xs text-gray-500 mt-1">Managed server-side on port 8888; no browser loopback access is required.</p>
              </div>

              <label className="flex items-center space-x-2">
                <input
                  type="checkbox"
                  checked={settings.autoTrainDDL}
                  onChange={e => handleChange('autoTrainDDL', e.target.checked)}
                  className="rounded"
                />
                <span className="text-sm font-medium text-gray-700">Auto-train on DDL changes</span>
              </label>

              <div>
                <label className="block text-sm font-medium text-gray-700 mb-2">Training Check Interval (hours)</label>
                <input
                  type="number"
                  value={settings.trainingInterval}
                  onChange={e => handleChange('trainingInterval', parseInt(e.target.value))}
                  min="1"
                  max="168"
                  className="w-full px-3 py-2 border rounded-lg"
                />
                <p className="text-xs text-gray-500 mt-1">How often to check for DDL changes and retrain</p>
              </div>

              <Button onClick={() => handleTest('vanna')} disabled={testing === 'vanna'} variant="secondary">
                {testing === 'vanna' ? 'Testing...' : 'Test Vanna Connection'}
              </Button>

              <div className="p-3 bg-green-50 border border-green-200 rounded-lg text-xs text-green-700">
                <strong>✓ Setup is Automatic:</strong>
                <ul className="list-disc pl-5 mt-2 space-y-1">
                  <li>Vanna server starts automatically when the application starts</li>
                  <li>Runs on port 8888 (configurable in environment)</li>
                  <li>Uses database credentials from Settings→Database</li>
                  <li>No Docker or manual setup required</li>
                  <li>Use the Start/Stop buttons above to manage the server</li>
                </ul>
              </div>
            </div>
          )}

          {/* AI Integrations Group (AI Context, LLM, RAG) */}
          {activeTab === 1 && (
            <div className="space-y-4">
              {/* Sub-tab Navigation */}
              <div className="flex space-x-2 mb-4 border-b">
                {[
                  { id: '1a', label: 'AI Context', icon: '🧠' },
                  { id: '1b', label: 'LLM', icon: '🤖' },
                  { id: '1c', label: 'RAG', icon: '📚' },
                ].map(subtab => (
                  <button
                    key={subtab.id}
                    onClick={() => setActiveSubTab(subtab.id)}
                    className={`px-3 py-2 text-sm font-medium rounded transition-colors ${
                      activeSubTab === subtab.id
                        ? 'bg-blue-100 text-blue-700'
                        : 'text-gray-600 hover:text-gray-900'
                    }`}
                  >
                    {subtab.icon} {subtab.label}
                  </button>
                ))}
              </div>

              {/* AI Context Sub-tab */}
              {activeSubTab === '1a' && (
                <div className="space-y-4">
                  <h4 className="text-md font-medium text-gray-900">AI Context Settings</h4>
                  <div>
                    <label className="block text-sm font-medium text-gray-700 mb-2">System Context for RAG Responses</label>
                    <p className="text-sm text-gray-600 mb-3">Enter context information that will be used to help shape RAG responses. This text provides background knowledge and instructions to improve the quality and relevance of AI-generated answers.</p>
                    <textarea
                      value={(settings as any).aiContextText || ''}
                      onChange={e => handleChange('aiContextText', e.target.value)}
                      className="w-full p-3 border border-gray-300 rounded-md font-mono text-sm"
                      rows={12}
                      placeholder="Example: You are an expert data analyst. Focus on accuracy and completeness. Always provide context for your recommendations. Consider both quantitative and qualitative factors..."
                    />
                  </div>

                  <div className="bg-blue-50 border border-blue-200 rounded-md p-4">
                    <h4 className="font-medium text-sm text-blue-900 mb-2">ℹ️ Usage Guidelines</h4>
                    <ul className="text-sm text-blue-800 space-y-1 list-disc list-inside">
                      <li>This context will be included with every RAG query to influence responses</li>
                      <li>Be specific about expertise, tone, and approach</li>
                      <li>Include relevant domain knowledge and business rules</li>
                      <li>Avoid extremely long contexts for better performance</li>
                      <li>Update context when business requirements change</li>
                    </ul>
                  </div>

                  <div className="bg-gray-50 border border-gray-200 rounded-md p-4">
                    <h4 className="font-medium text-sm text-gray-900 mb-2">📊 Character Count</h4>
                    <p className="text-sm text-gray-700">Current: <strong>{((settings as any).aiContextText || '').length}</strong> characters</p>
                  </div>
                </div>
              )}

              {/* LLM Sub-tab */}
              {activeSubTab === '1b' && (
                <div className="space-y-4">
                  <h4 className="text-md font-medium text-gray-900">LLM Settings</h4>
                  <p className="text-sm text-gray-500">Configure available LLMs and their priority for generation calls (local or cloud providers).</p>
                  
                  <div className="space-y-3">
                    <label className="block text-sm font-medium text-gray-700">LLM Provider</label>
                    <select
                      value={settings.llmProvider}
                      onChange={e => {
                        handleChange('llmProvider', e.target.value);
                        if (e.target.value === 'ollama-local') {
                          detectOllamaModels();
                        }
                      }}
                      className="w-full px-3 py-2 border rounded-lg"
                    >
                      <option value="openai">OpenAI</option>
                      <option value="anthropic">Anthropic Claude</option>
                      <option value="cohere">Cohere</option>
                      <option value="ollama-local">Ollama (Local)</option>
                      <option value="custom">Custom API</option>
                    </select>
                  </div>

                  {/* Ollama Model Selection */}
                  {settings.llmProvider === 'ollama-local' && (
                    <div className="p-3 border border-amber-200 bg-amber-50 rounded-lg">
                      <div className="flex items-center justify-between mb-3">
                        <label className="text-sm font-medium text-gray-700">Available Ollama Models</label>
                        <Button
                          onClick={detectOllamaModels}
                          disabled={detectingOllama}
                          variant="secondary"
                          className="text-xs"
                        >
                          {detectingOllama ? 'Detecting...' : 'Detect Models'}
                        </Button>
                      </div>

                      {ollamaModels.length > 0 ? (
                        <select
                          value={settings.llmModel}
                          onChange={e => handleChange('llmModel', e.target.value)}
                          className="w-full px-3 py-2 border rounded-lg text-sm"
                        >
                          <option value="">Select a model...</option>
                          {ollamaModels.map(model => (
                            <option key={model} value={model}>{model}</option>
                          ))}
                        </select>
                      ) : (
                        <p className="text-sm text-amber-700">No models detected. Click "Detect Models" to scan for installed Ollama models.</p>
                      )}
                      <p className="text-xs text-gray-600 mt-2">Make sure Ollama is installed and running on your local machine.</p>
                    </div>
                  )}

                  {/* Non-Ollama Model Input */}
                  {settings.llmProvider !== 'ollama-local' && (
                    <div>
                      <label className="block text-sm font-medium text-gray-700 mb-2">Model Name</label>
                      <input
                        type="text"
                        value={settings.llmModel}
                        onChange={e => handleChange('llmModel', e.target.value)}
                        placeholder="gpt-4 or claude-3-opus or command-light"
                        className="w-full px-3 py-2 border rounded-lg"
                      />
                    </div>
                  )}

                  {settings.llmProvider !== 'ollama-local' && (
                    <div>
                      <label className="block text-sm font-medium text-gray-700 mb-2">API Key</label>
                      <input
                        type="password"
                        value={settings.llmApiKey}
                        onChange={e => handleChange('llmApiKey', e.target.value)}
                        placeholder="sk-..."
                        className="w-full px-3 py-2 border rounded-lg"
                      />
                    </div>
                  )}

                  <div className="grid grid-cols-2 gap-4">
                    <div>
                      <label className="block text-sm font-medium text-gray-700 mb-2">Temperature</label>
                      <input
                        type="number"
                        value={settings.llmTemperature}
                        onChange={e => handleChange('llmTemperature', parseFloat(e.target.value))}
                        min="0"
                        max="2"
                        step="0.1"
                        className="w-full px-3 py-2 border rounded-lg"
                      />
                      <p className="text-xs text-gray-500 mt-1">Lower = more deterministic</p>
                    </div>
                    <div>
                      <label className="block text-sm font-medium text-gray-700 mb-2">Max Tokens</label>
                      <input
                        type="number"
                        value={settings.llmMaxTokens}
                        onChange={e => handleChange('llmMaxTokens', parseInt(e.target.value))}
                        min="100"
                        max="4000"
                        className="w-full px-3 py-2 border rounded-lg"
                      />
                    </div>
                  </div>

                  <Button onClick={() => handleTest('llm')} disabled={testing === 'llm'} variant="secondary">
                    {testing === 'llm' ? 'Testing...' : 'Test LLM Connection'}
                  </Button>
                </div>
              )}

              {/* RAG Sub-tab */}
              {activeSubTab === '1c' && (
                <div className="space-y-4">
                  <h4 className="text-md font-medium text-gray-900">RAG Settings</h4>
                  <label className="block text-sm font-medium text-gray-700">Schema & Business Rule Generation</label>
                  <div className="text-sm text-gray-500">When enabled, the RAG engine will analyze sample data to construct contextual schemas and suggested business rules to improve query relevance.</div>
                  <div className="mt-2">
                    <label className="inline-flex items-center">
                      <input
                        type="checkbox"
                        checked={(settings as any).ragAutoGenerate || false}
                        onChange={e => handleChange('ragAutoGenerate', e.target.checked)}
                        className="mr-2"
                      />
                      <span className="text-sm font-medium text-gray-700">Enable automatic schema generation</span>
                    </label>
                  </div>
                  <p className="text-sm text-gray-500 mt-4">RAG records are managed separately with specific Business Rules for each table. Please access the RAG Records management interface for detailed configuration.</p>
                </div>
              )}
            </div>
          )}

          {/* Old AI Context Tab - Removed, now under AI Integrations */}
          {activeTab === 1.5 && null}

          {/* Old LLM Tab - Removed, now under AI Integrations */}
          {activeTab === 2.5 && null}

          {/* Old RAG Tab - Removed, now under AI Integrations */}
          {activeTab === 3.5 && null}

          {/* Vercel AI SDK Tab */}
          {activeTab === 2 && (
            <div className="space-y-4">
              <h4 className="text-md font-medium text-gray-900">Vercel AI SDK Settings</h4>
              <div className="p-3 bg-blue-50 border border-blue-200 rounded-lg">
                <p className="text-sm text-blue-900">
                  <strong>ℹ️ Vercel AI SDK:</strong> Use the Vercel AI SDK for unified LLM interaction across multiple providers (OpenAI, Anthropic, Cohere, etc).
                </p>
              </div>

              <div>
                <label className="block text-sm font-medium text-gray-700 mb-2">Provider</label>
                <select
                  value={settings.vercelAIProvider}
                  onChange={e => handleChange('vercelAIProvider', e.target.value)}
                  className="w-full px-3 py-2 border rounded-lg"
                >
                  <option value="openai">OpenAI</option>
                  <option value="anthropic">Anthropic</option>
                  <option value="cohere">Cohere</option>
                  <option value="huggingface">Hugging Face</option>
                  <option value="custom">Custom</option>
                </select>
              </div>

              <div>
                <label className="block text-sm font-medium text-gray-700 mb-2">API Key</label>
                <input
                  type="password"
                  value={settings.vercelAIApiKey}
                  onChange={e => handleChange('vercelAIApiKey', e.target.value)}
                  placeholder="sk-..."
                  className="w-full px-3 py-2 border rounded-lg"
                />
                <p className="text-xs text-gray-500 mt-1">Your API key for the selected provider</p>
              </div>

              <div>
                <label className="block text-sm font-medium text-gray-700 mb-2">Model Name</label>
                <input
                  type="text"
                  value={settings.vercelAIModel}
                  onChange={e => handleChange('vercelAIModel', e.target.value)}
                  placeholder="gpt-4 or claude-3-opus"
                  className="w-full px-3 py-2 border rounded-lg"
                />
                <p className="text-xs text-gray-500 mt-1">e.g., gpt-4, gpt-3.5-turbo, claude-3-opus, command-light</p>
              </div>

              <div className="grid grid-cols-2 gap-4">
                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-2">Temperature</label>
                  <input
                    type="number"
                    value={settings.vercelAITemperature}
                    onChange={e => handleChange('vercelAITemperature', parseFloat(e.target.value))}
                    min="0"
                    max="2"
                    step="0.1"
                    className="w-full px-3 py-2 border rounded-lg"
                  />
                  <p className="text-xs text-gray-500 mt-1">Lower = more deterministic</p>
                </div>
                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-2">Max Tokens</label>
                  <input
                    type="number"
                    value={settings.vercelAIMaxTokens}
                    onChange={e => handleChange('vercelAIMaxTokens', parseInt(e.target.value))}
                    min="100"
                    max="4000"
                    className="w-full px-3 py-2 border rounded-lg"
                  />
                </div>
              </div>

              <Button onClick={() => handleTest('vercel-ai')} disabled={testing === 'vercel-ai'} variant="secondary">
                {testing === 'vercel-ai' ? 'Testing...' : 'Test Vercel AI Connection'}
              </Button>

              <div className="p-3 bg-gray-50 border border-gray-200 rounded-lg text-xs text-gray-600">
                <strong>Setup Instructions:</strong>
                <ul className="list-disc pl-5 mt-2 space-y-1">
                  <li>Get your API key from the chosen provider (OpenAI, Anthropic, etc.)</li>
                  <li>Select the provider from the dropdown</li>
                  <li>Enter your API key securely</li>
                  <li>Specify the model name you want to use</li>
                  <li>Click "Test Vercel AI Connection" to verify</li>
                </ul>
              </div>
            </div>
          )}

          {/* LanceDB Tab */}
          {activeTab === 3 && (
            <div className="space-y-4">
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-2">LanceDB URL</label>
                <input
                  type="text"
                  value={settings.lancedbUrl}
                  onChange={e => handleChange('lancedbUrl', e.target.value)}
                  placeholder="http://localhost:8000"
                  className="w-full px-3 py-2 border rounded-lg"
                />
              </div>
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-2">Database Name</label>
                <input
                  type="text"
                  value={settings.lancedbDatabase}
                  onChange={e => handleChange('lancedbDatabase', e.target.value)}
                  placeholder="activities_db"
                  className="w-full px-3 py-2 border rounded-lg"
                />
              </div>
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-2">Collection Name</label>
                <input
                  type="text"
                  value={settings.lancedbCollectionName}
                  onChange={e => handleChange('lancedbCollectionName', e.target.value)}
                  placeholder="activities_embeddings"
                  className="w-full px-3 py-2 border rounded-lg"
                />
              </div>
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-2">Vector Dimension</label>
                <input
                  type="number"
                  value={settings.lancedbVectorDimension}
                  onChange={e => handleChange('lancedbVectorDimension', parseInt(e.target.value))}
                  placeholder="1536"
                  className="w-full px-3 py-2 border rounded-lg"
                />
              </div>
              <Button onClick={() => handleTest('lancedb')} disabled={testing === 'lancedb'} variant="secondary">
                {testing === 'lancedb' ? 'Testing...' : 'Test LanceDB Connection'}
              </Button>
            </div>
          )}

          {/* VectorDB Settings Tab */}
          {activeTab === 4 && (
            <div className="space-y-4">
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-2">VectorDB Provider</label>
                <select
                  value={settings.vectordbProvider}
                  onChange={e => handleChange('vectordbProvider', e.target.value)}
                  className="w-full px-3 py-2 border rounded-lg"
                >
                  <option value="lancedb">LanceDB</option>
                  <option value="pinecone">Pinecone</option>
                  <option value="weaviate">Weaviate</option>
                  <option value="milvus">Milvus</option>
                  <option value="chroma">Chroma DB</option>
                </select>
              </div>
              {settings.vectordbProvider === 'chroma' ? (
                <>
                  <div>
                    <label className="block text-sm font-medium text-gray-700 mb-2">Chroma Server URL</label>
                    <input
                      type="text"
                      value={settings.chromaUrl}
                      onChange={e => handleChange('chromaUrl', e.target.value)}
                      placeholder="http://localhost:8000"
                      className="w-full px-3 py-2 border rounded-lg"
                    />
                  </div>
                  <div>
                    <label className="block text-sm font-medium text-gray-700 mb-2">Collection Name</label>
                    <input
                      type="text"
                      value={settings.chromaCollectionName}
                      onChange={e => handleChange('chromaCollectionName', e.target.value)}
                      placeholder="ramsnhe"
                      className="w-full px-3 py-2 border rounded-lg"
                    />
                  </div>
                  <div>
                    <label className="block text-sm font-medium text-gray-700 mb-2">Persist Directory</label>
                    <input
                      type="text"
                      value={settings.chromaPersistDirectory}
                      onChange={e => handleChange('chromaPersistDirectory', e.target.value)}
                      placeholder="./chroma"
                      className="w-full px-3 py-2 border rounded-lg"
                    />
                  </div>
                </>
              ) : (
                <>
                  <div>
                    <label className="block text-sm font-medium text-gray-700 mb-2">Host</label>
                    <input
                      type="text"
                      value={settings.vectordbHost}
                      onChange={e => handleChange('vectordbHost', e.target.value)}
                      placeholder="localhost"
                      className="w-full px-3 py-2 border rounded-lg"
                    />
                  </div>
                  <div>
                    <label className="block text-sm font-medium text-gray-700 mb-2">Port</label>
                    <input
                      type="number"
                      value={settings.vectordbPort}
                      onChange={e => handleChange('vectordbPort', parseInt(e.target.value))}
                      placeholder="8000"
                      className="w-full px-3 py-2 border rounded-lg"
                    />
                  </div>
                </>
              )}
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-2">API Key (if required)</label>
                <input
                  type="password"
                  value={settings.vectordbApiKey}
                  onChange={e => handleChange('vectordbApiKey', e.target.value)}
                  placeholder="sk-..."
                  className="w-full px-3 py-2 border rounded-lg"
                />
              </div>
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-2">Namespace</label>
                <input
                  type="text"
                  value={settings.vectordbNamespace}
                  onChange={e => handleChange('vectordbNamespace', e.target.value)}
                  placeholder="default"
                  className="w-full px-3 py-2 border rounded-lg"
                />
              </div>
              <Button onClick={() => handleTest('vectordb')} disabled={testing === 'vectordb'} variant="secondary">
                {testing === 'vectordb' ? 'Testing...' : `Test ${settings.vectordbProvider === 'chroma' ? 'Chroma DB' : 'VectorDB'} Connection`}
              </Button>
            </div>
          )}

          {/* Embedding Model Tab */}
          {activeTab === 5 && (
            <div className="space-y-4">
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-2">Embedding Provider</label>
                <select
                  value={settings.embeddingModel}
                  onChange={e => handleChange('embeddingModel', e.target.value)}
                  className="w-full px-3 py-2 border rounded-lg"
                >
                  <option value="openai">OpenAI</option>
                  <option value="huggingface">HuggingFace</option>
                  <option value="cohere">Cohere</option>
                  <option value="azure">Azure OpenAI</option>
                </select>
              </div>
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-2">Model Name</label>
                <input
                  type="text"
                  value={settings.embeddingModelName}
                  onChange={e => handleChange('embeddingModelName', e.target.value)}
                  placeholder="text-embedding-3-small"
                  className="w-full px-3 py-2 border rounded-lg"
                />
              </div>
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-2">Vector Dimension</label>
                <input
                  type="number"
                  value={settings.embeddingDimension}
                  onChange={e => handleChange('embeddingDimension', parseInt(e.target.value))}
                  placeholder="1536"
                  className="w-full px-3 py-2 border rounded-lg"
                />
              </div>
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-2">API Key</label>
                <input
                  type="password"
                  value={settings.embeddingApiKey}
                  onChange={e => handleChange('embeddingApiKey', e.target.value)}
                  placeholder="sk-..."
                  className="w-full px-3 py-2 border rounded-lg"
                />
              </div>
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-2">Endpoint (if custom)</label>
                <input
                  type="text"
                  value={settings.embeddingEndpoint}
                  onChange={e => handleChange('embeddingEndpoint', e.target.value)}
                  placeholder="https://api.openai.com/v1/embeddings"
                  className="w-full px-3 py-2 border rounded-lg"
                />
              </div>
              <Button onClick={() => handleTest('embedding')} disabled={testing === 'embedding'} variant="secondary">
                {testing === 'embedding' ? 'Testing...' : 'Test Embedding Connection'}
              </Button>
            </div>
          )}

          {/* AI Assistant Features Tab */}
          {activeTab === 6 && (
            <div className="space-y-4">
              <label className="flex items-center space-x-2">
                <input
                  type="checkbox"
                  checked={settings.enableAIAssistant}
                  onChange={e => handleChange('enableAIAssistant', e.target.checked)}
                  className="rounded"
                />
                <span className="text-sm font-medium text-gray-700">Enable AI Assistant</span>
              </label>
              <label className="flex items-center space-x-2">
                <input
                  type="checkbox"
                  checked={settings.enableChartGeneration}
                  onChange={e => handleChange('enableChartGeneration', e.target.checked)}
                  className="rounded"
                />
                <span className="text-sm font-medium text-gray-700">Enable Chart Generation</span>
              </label>
              <label className="flex items-center space-x-2">
                <input
                  type="checkbox"
                  checked={settings.enableInsights}
                  onChange={e => handleChange('enableInsights', e.target.checked)}
                  className="rounded"
                />
                <span className="text-sm font-medium text-gray-700">Enable Insights & Recommendations</span>
              </label>
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-2">Conversation Context (messages)</label>
                <input
                  type="number"
                  value={settings.conversationContext}
                  onChange={e => handleChange('conversationContext', parseInt(e.target.value))}
                  min="1"
                  max="20"
                  className="w-full px-3 py-2 border rounded-lg"
                />
                <p className="text-xs text-gray-500 mt-1">Number of previous messages to include in context</p>
              </div>
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-2">Response Tone</label>
                <select
                  value={settings.responseToneStyle}
                  onChange={e => handleChange('responseToneStyle', e.target.value)}
                  className="w-full px-3 py-2 border rounded-lg"
                >
                  <option value="professional">Professional</option>
                  <option value="casual">Casual</option>
                  <option value="technical">Technical</option>
                  <option value="friendly">Friendly</option>
                </select>
              </div>
            </div>
          )}
        </div>

        {/* Save Button */}
        <div className="mt-6 flex gap-2">
          <Button onClick={handleSave} disabled={loading}>
            {loading ? 'Saving...' : 'Save All Settings'}
          </Button>
          <Button variant="secondary" onClick={loadSettings}>
            Reload
          </Button>
        </div>
      </Card>
    </div>
  );
};

export default AIIntegrationsTab;

