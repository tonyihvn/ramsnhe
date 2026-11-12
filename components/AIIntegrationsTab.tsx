import React, { useState, useEffect } from 'react';
import Card from './ui/Card';
import Button from './ui/Button';
import { success as swalSuccess, error as swalError, info as swalInfo } from './ui/swal';

interface AIIntegrationsTabProps {
  businessId: number;
}

const AIIntegrationsTab: React.FC<AIIntegrationsTabProps> = ({ businessId }) => {
  const [activeTab, setActiveTab] = useState(0);
  const [loading, setLoading] = useState(false);
  const [testing, setTesting] = useState<string | null>(null);
  const [saveStatus, setSaveStatus] = useState<{ type: 'success' | 'error', message: string } | null>(null);
  const [settings, setSettings] = useState({
    // Vanna DDL Training
    vannaApiUrl: '',
    vannaApiKey: '',
    vannaModel: 'gpt-4',
    autoTrainDDL: true,
    trainingInterval: 24,
    
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
      } else if (type === 'embedding') {
        endpoint = '/api/embedding/test-connection';
        payload = { ...payload, embeddingModel: settings.embeddingModel, embeddingApiKey: settings.embeddingApiKey };
      } else if (type === 'llm') {
        endpoint = '/api/llm/test-connection';
        payload = { ...payload, llmProvider: settings.llmProvider, llmApiKey: settings.llmApiKey };
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

  const tabs = [
    { id: 0, label: 'Vanna DDL Training', icon: '🗃️' },
    { id: 1, label: 'LanceDB Vector Store', icon: '🗂️' },
    { id: 2, label: 'VectorDB Settings', icon: '📦' },
    { id: 3, label: 'Embedding Model', icon: '🧠' },
    { id: 4, label: 'LLM Model', icon: '🤖' },
    { id: 5, label: 'AI Assistant Features', icon: '✨' },
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
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-2">Vanna API URL</label>
                <input
                  type="text"
                  value={settings.vannaApiUrl}
                  onChange={e => handleChange('vannaApiUrl', e.target.value)}
                  placeholder="https://api.vanna.ai"
                  className="w-full px-3 py-2 border rounded-lg"
                />
                <p className="text-xs text-gray-500 mt-1">Vanna API endpoint URL</p>
              </div>
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-2">Vanna API Key</label>
                <input
                  type="password"
                  value={settings.vannaApiKey}
                  onChange={e => handleChange('vannaApiKey', e.target.value)}
                  placeholder="sk-..."
                  className="w-full px-3 py-2 border rounded-lg"
                />
              </div>
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-2">Vanna Model</label>
                <select
                  value={settings.vannaModel}
                  onChange={e => handleChange('vannaModel', e.target.value)}
                  className="w-full px-3 py-2 border rounded-lg"
                >
                  <option value="gpt-4">GPT-4</option>
                  <option value="gpt-3.5-turbo">GPT-3.5 Turbo</option>
                  <option value="claude-3">Claude 3</option>
                </select>
              </div>
              <label className="flex items-center space-x-2">
                <input
                  type="checkbox"
                  checked={settings.autoTrainDDL}
                  onChange={e => handleChange('autoTrainDDL', e.target.checked)}
                  className="rounded"
                />
                <span className="text-sm font-medium text-gray-700">Auto-train DDL on schedule</span>
              </label>
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-2">Training Interval (hours)</label>
                <input
                  type="number"
                  value={settings.trainingInterval}
                  onChange={e => handleChange('trainingInterval', parseInt(e.target.value))}
                  min="1"
                  className="w-full px-3 py-2 border rounded-lg"
                />
              </div>
              <Button onClick={() => handleTest('vanna')} disabled={testing === 'vanna'} variant="secondary">
                {testing === 'vanna' ? 'Testing...' : 'Test Vanna Connection'}
              </Button>
            </div>
          )}

          {/* LanceDB Tab */}
          {activeTab === 1 && (
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
          {activeTab === 2 && (
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
                </select>
              </div>
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
            </div>
          )}

          {/* Embedding Model Tab */}
          {activeTab === 3 && (
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

          {/* LLM Model Tab */}
          {activeTab === 4 && (
            <div className="space-y-4">
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-2">LLM Provider</label>
                <select
                  value={settings.llmProvider}
                  onChange={e => handleChange('llmProvider', e.target.value)}
                  className="w-full px-3 py-2 border rounded-lg"
                >
                  <option value="openai">OpenAI</option>
                  <option value="anthropic">Claude (Anthropic)</option>
                  <option value="google">Google Gemini</option>
                  <option value="azure">Azure OpenAI</option>
                  <option value="llama">Llama</option>
                </select>
              </div>
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-2">Model</label>
                <input
                  type="text"
                  value={settings.llmModel}
                  onChange={e => handleChange('llmModel', e.target.value)}
                  placeholder="gpt-4"
                  className="w-full px-3 py-2 border rounded-lg"
                />
              </div>
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-2">Temperature (0-1)</label>
                <input
                  type="number"
                  step="0.1"
                  min="0"
                  max="1"
                  value={settings.llmTemperature}
                  onChange={e => handleChange('llmTemperature', parseFloat(e.target.value))}
                  className="w-full px-3 py-2 border rounded-lg"
                />
                <p className="text-xs text-gray-500 mt-1">Lower = more deterministic, Higher = more creative</p>
              </div>
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-2">Max Tokens</label>
                <input
                  type="number"
                  value={settings.llmMaxTokens}
                  onChange={e => handleChange('llmMaxTokens', parseInt(e.target.value))}
                  placeholder="2000"
                  className="w-full px-3 py-2 border rounded-lg"
                />
              </div>
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
              <Button onClick={() => handleTest('llm')} disabled={testing === 'llm'} variant="secondary">
                {testing === 'llm' ? 'Testing...' : 'Test LLM Connection'}
              </Button>
            </div>
          )}

          {/* AI Assistant Features Tab */}
          {activeTab === 5 && (
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
