import React, { useState, useEffect } from 'react';
import Card from '../components/ui/Card';
import Button from '../components/ui/Button';
import { useData } from '../hooks/useData';
import { useNavigate } from 'react-router-dom';

const AISettingsPage: React.FC = () => {
  const { currentUser } = useData();
  const navigate = useNavigate();
  const [activeTab, setActiveTab] = useState(0);
  const [loading, setLoading] = useState(false);
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
    if (!currentUser || currentUser.role !== 'admin') {
      navigate('/');
      return;
    }
    loadSettings();
  }, [currentUser, navigate]);

  const loadSettings = async () => {
    try {
      setLoading(true);
      const res = await fetch(`/api/ai-settings/${currentUser?.businessId}`, {
        credentials: 'include'
      });
      if (res.ok) {
        const data = await res.json();
        setSettings(prev => ({ ...prev, ...data }));
      }
    } catch (err) {
      console.error('Failed to load settings:', err);
      setSaveStatus({ type: 'error', message: 'Failed to load settings' });
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
      const res = await fetch(`/api/ai-settings/${currentUser?.businessId}`, {
        method: 'PUT',
        headers: { 'Content-Type': 'application/json' },
        credentials: 'include',
        body: JSON.stringify(settings)
      });
      if (res.ok) {
        setSaveStatus({ type: 'success', message: 'Settings saved successfully!' });
        setTimeout(() => setSaveStatus(null), 3000);
      } else {
        throw new Error('Failed to save');
      }
    } catch (err) {
      setSaveStatus({ type: 'error', message: 'Failed to save settings' });
    } finally {
      setLoading(false);
    }
  };

  const handleTest = async (type: string) => {
    try {
      setLoading(true);
      setSaveStatus(null);
      let endpoint = '';
      let payload: any = { businessId: currentUser?.businessId };

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
        setSaveStatus({ type: 'success', message: `${type.toUpperCase()} connection successful!` });
      } else {
        throw new Error('Connection failed');
      }
    } catch (err) {
      setSaveStatus({ type: 'error', message: `${type.toUpperCase()} connection failed` });
    } finally {
      setLoading(false);
    }
  };

  const tabs = [
    { id: 0, label: 'Vanna DDL Training', icon: '🗃️' },
    { id: 1, label: 'LanceDB Vector Store', icon: '🗄️' },
    { id: 2, label: 'VectorDB Settings', icon: '📦' },
    { id: 3, label: 'Embedding Model', icon: '🧵' },
    { id: 4, label: 'LLM Model', icon: '🧠' },
    { id: 5, label: 'AI Assistant', icon: '🤖' },
  ];

  const renderTabContent = () => {
    switch (activeTab) {
      case 0: // Vanna DDL Training
        return (
          <div className="space-y-4">
            <h3 className="text-lg font-semibold">Vanna DDL Training Configuration</h3>
            <div>
              <label className="block text-sm font-medium text-gray-700 mb-1">Vanna API URL</label>
              <input
                type="text"
                value={settings.vannaApiUrl}
                onChange={(e) => handleChange('vannaApiUrl', e.target.value)}
                placeholder="https://api.vanna.ai"
                className="w-full px-3 py-2 border rounded"
              />
              <p className="text-xs text-gray-500 mt-1">Vanna API endpoint URL</p>
            </div>
            <div>
              <label className="block text-sm font-medium text-gray-700 mb-1">Vanna API Key</label>
              <input
                type="password"
                value={settings.vannaApiKey}
                onChange={(e) => handleChange('vannaApiKey', e.target.value)}
                placeholder="sk-..."
                className="w-full px-3 py-2 border rounded"
              />
              <p className="text-xs text-gray-500 mt-1">Your Vanna API key (kept secure)</p>
            </div>
            <div>
              <label className="block text-sm font-medium text-gray-700 mb-1">Vanna Model</label>
              <select
                value={settings.vannaModel}
                onChange={(e) => handleChange('vannaModel', e.target.value)}
                className="w-full px-3 py-2 border rounded"
              >
                <option value="gpt-4">GPT-4</option>
                <option value="gpt-3.5-turbo">GPT-3.5 Turbo</option>
                <option value="claude-3-opus">Claude 3 Opus</option>
                <option value="claude-3-sonnet">Claude 3 Sonnet</option>
              </select>
            </div>
            <div>
              <label className="block text-sm font-medium text-gray-700 mb-1">Training Interval (hours)</label>
              <input
                type="number"
                value={settings.trainingInterval}
                onChange={(e) => handleChange('trainingInterval', parseInt(e.target.value))}
                min="1"
                max="168"
                className="w-full px-3 py-2 border rounded"
              />
            </div>
            <div>
              <label className="flex items-center gap-2 cursor-pointer">
                <input
                  type="checkbox"
                  checked={settings.autoTrainDDL}
                  onChange={(e) => handleChange('autoTrainDDL', e.target.checked)}
                  className="rounded"
                />
                <span className="text-sm font-medium text-gray-700">Auto Train on DDL Changes</span>
              </label>
            </div>
            <Button variant="secondary" onClick={() => handleTest('vanna')} disabled={loading}>
              Test Vanna Connection
            </Button>
          </div>
        );

      case 1: // LanceDB Settings
        return (
          <div className="space-y-4">
            <h3 className="text-lg font-semibold">LanceDB Vector Store Configuration</h3>
            <div>
              <label className="block text-sm font-medium text-gray-700 mb-1">LanceDB URL</label>
              <input
                type="text"
                value={settings.lancedbUrl}
                onChange={(e) => handleChange('lancedbUrl', e.target.value)}
                placeholder="http://localhost:8081"
                className="w-full px-3 py-2 border rounded"
              />
            </div>
            <div>
              <label className="block text-sm font-medium text-gray-700 mb-1">Database Name</label>
              <input
                type="text"
                value={settings.lancedbDatabase}
                onChange={(e) => handleChange('lancedbDatabase', e.target.value)}
                placeholder="activities_db"
                className="w-full px-3 py-2 border rounded"
              />
            </div>
            <div>
              <label className="block text-sm font-medium text-gray-700 mb-1">Collection Name</label>
              <input
                type="text"
                value={settings.lancedbCollectionName}
                onChange={(e) => handleChange('lancedbCollectionName', e.target.value)}
                placeholder="activities_embeddings"
                className="w-full px-3 py-2 border rounded"
              />
            </div>
            <div>
              <label className="block text-sm font-medium text-gray-700 mb-1">Vector Dimension</label>
              <input
                type="number"
                value={settings.lancedbVectorDimension}
                onChange={(e) => handleChange('lancedbVectorDimension', parseInt(e.target.value))}
                min="384"
                max="3072"
                className="w-full px-3 py-2 border rounded"
              />
            </div>
            <Button variant="secondary" onClick={() => handleTest('lancedb')} disabled={loading}>
              Test LanceDB Connection
            </Button>
          </div>
        );

      case 2: // VectorDB Settings
        return (
          <div className="space-y-4">
            <h3 className="text-lg font-semibold">VectorDB Configuration</h3>
            <div>
              <label className="block text-sm font-medium text-gray-700 mb-1">VectorDB Provider</label>
              <select
                value={settings.vectordbProvider}
                onChange={(e) => handleChange('vectordbProvider', e.target.value)}
                className="w-full px-3 py-2 border rounded"
              >
                <option value="lancedb">LanceDB</option>
                <option value="pinecone">Pinecone</option>
                <option value="weaviate">Weaviate</option>
                <option value="milvus">Milvus</option>
                <option value="qdrant">Qdrant</option>
              </select>
            </div>
            <div>
              <label className="block text-sm font-medium text-gray-700 mb-1">VectorDB Host</label>
              <input
                type="text"
                value={settings.vectordbHost}
                onChange={(e) => handleChange('vectordbHost', e.target.value)}
                placeholder="localhost"
                className="w-full px-3 py-2 border rounded"
              />
            </div>
            <div>
              <label className="block text-sm font-medium text-gray-700 mb-1">VectorDB Port</label>
              <input
                type="number"
                value={settings.vectordbPort}
                onChange={(e) => handleChange('vectordbPort', parseInt(e.target.value))}
                className="w-full px-3 py-2 border rounded"
              />
            </div>
            <div>
              <label className="block text-sm font-medium text-gray-700 mb-1">VectorDB API Key</label>
              <input
                type="password"
                value={settings.vectordbApiKey}
                onChange={(e) => handleChange('vectordbApiKey', e.target.value)}
                className="w-full px-3 py-2 border rounded"
              />
            </div>
            <div>
              <label className="block text-sm font-medium text-gray-700 mb-1">Namespace</label>
              <input
                type="text"
                value={settings.vectordbNamespace}
                onChange={(e) => handleChange('vectordbNamespace', e.target.value)}
                placeholder="default"
                className="w-full px-3 py-2 border rounded"
              />
            </div>
          </div>
        );

      case 3: // Embedding Model Settings
        return (
          <div className="space-y-4">
            <h3 className="text-lg font-semibold">Embedding Model Configuration</h3>
            <div>
              <label className="block text-sm font-medium text-gray-700 mb-1">Embedding Provider</label>
              <select
                value={settings.embeddingModel}
                onChange={(e) => handleChange('embeddingModel', e.target.value)}
                className="w-full px-3 py-2 border rounded"
              >
                <option value="openai">OpenAI</option>
                <option value="huggingface">HuggingFace</option>
                <option value="cohere">Cohere</option>
                <option value="azure">Azure OpenAI</option>
              </select>
            </div>
            <div>
              <label className="block text-sm font-medium text-gray-700 mb-1">Model Name</label>
              <input
                type="text"
                value={settings.embeddingModelName}
                onChange={(e) => handleChange('embeddingModelName', e.target.value)}
                placeholder="text-embedding-3-small"
                className="w-full px-3 py-2 border rounded"
              />
            </div>
            <div>
              <label className="block text-sm font-medium text-gray-700 mb-1">Embedding Dimension</label>
              <input
                type="number"
                value={settings.embeddingDimension}
                onChange={(e) => handleChange('embeddingDimension', parseInt(e.target.value))}
                className="w-full px-3 py-2 border rounded"
              />
            </div>
            <div>
              <label className="block text-sm font-medium text-gray-700 mb-1">API Key</label>
              <input
                type="password"
                value={settings.embeddingApiKey}
                onChange={(e) => handleChange('embeddingApiKey', e.target.value)}
                className="w-full px-3 py-2 border rounded"
              />
            </div>
            <div>
              <label className="block text-sm font-medium text-gray-700 mb-1">Endpoint (optional)</label>
              <input
                type="text"
                value={settings.embeddingEndpoint}
                onChange={(e) => handleChange('embeddingEndpoint', e.target.value)}
                className="w-full px-3 py-2 border rounded"
              />
            </div>
            <Button variant="secondary" onClick={() => handleTest('embedding')} disabled={loading}>
              Test Embedding Connection
            </Button>
          </div>
        );

      case 4: // LLM Model Settings
        return (
          <div className="space-y-4">
            <h3 className="text-lg font-semibold">LLM Model Configuration</h3>
            <div>
              <label className="block text-sm font-medium text-gray-700 mb-1">LLM Provider</label>
              <select
                value={settings.llmProvider}
                onChange={(e) => handleChange('llmProvider', e.target.value)}
                className="w-full px-3 py-2 border rounded"
              >
                <option value="openai">OpenAI</option>
                <option value="anthropic">Anthropic (Claude)</option>
                <option value="google">Google (Gemini)</option>
                <option value="azure">Azure OpenAI</option>
                <option value="llama">Llama (Local)</option>
              </select>
            </div>
            <div>
              <label className="block text-sm font-medium text-gray-700 mb-1">Model Name</label>
              <input
                type="text"
                value={settings.llmModel}
                onChange={(e) => handleChange('llmModel', e.target.value)}
                placeholder="gpt-4"
                className="w-full px-3 py-2 border rounded"
              />
            </div>
            <div>
              <label className="block text-sm font-medium text-gray-700 mb-1">Temperature (0-2)</label>
              <input
                type="number"
                value={settings.llmTemperature}
                onChange={(e) => handleChange('llmTemperature', parseFloat(e.target.value))}
                min="0"
                max="2"
                step="0.1"
                className="w-full px-3 py-2 border rounded"
              />
              <p className="text-xs text-gray-500 mt-1">Lower = more deterministic, Higher = more creative</p>
            </div>
            <div>
              <label className="block text-sm font-medium text-gray-700 mb-1">Max Tokens</label>
              <input
                type="number"
                value={settings.llmMaxTokens}
                onChange={(e) => handleChange('llmMaxTokens', parseInt(e.target.value))}
                className="w-full px-3 py-2 border rounded"
              />
            </div>
            <div>
              <label className="block text-sm font-medium text-gray-700 mb-1">API Key</label>
              <input
                type="password"
                value={settings.llmApiKey}
                onChange={(e) => handleChange('llmApiKey', e.target.value)}
                className="w-full px-3 py-2 border rounded"
              />
            </div>
            <Button variant="secondary" onClick={() => handleTest('llm')} disabled={loading}>
              Test LLM Connection
            </Button>
          </div>
        );

      case 5: // AI Assistant Settings
        return (
          <div className="space-y-4">
            <h3 className="text-lg font-semibold">AI Assistant Settings</h3>
            <div>
              <label className="flex items-center gap-2 cursor-pointer mb-4">
                <input
                  type="checkbox"
                  checked={settings.enableAIAssistant}
                  onChange={(e) => handleChange('enableAIAssistant', e.target.checked)}
                  className="rounded"
                />
                <span className="text-sm font-medium text-gray-700">Enable AI Assistant</span>
              </label>
            </div>
            <div>
              <label className="flex items-center gap-2 cursor-pointer mb-4">
                <input
                  type="checkbox"
                  checked={settings.enableChartGeneration}
                  onChange={(e) => handleChange('enableChartGeneration', e.target.checked)}
                  className="rounded"
                />
                <span className="text-sm font-medium text-gray-700">Enable Chart/Visualization Generation</span>
              </label>
            </div>
            <div>
              <label className="flex items-center gap-2 cursor-pointer mb-4">
                <input
                  type="checkbox"
                  checked={settings.enableInsights}
                  onChange={(e) => handleChange('enableInsights', e.target.checked)}
                  className="rounded"
                />
                <span className="text-sm font-medium text-gray-700">Enable Insights & Analysis</span>
              </label>
            </div>
            <div>
              <label className="block text-sm font-medium text-gray-700 mb-1">Conversation Context (messages)</label>
              <input
                type="number"
                value={settings.conversationContext}
                onChange={(e) => handleChange('conversationContext', parseInt(e.target.value))}
                min="1"
                max="20"
                className="w-full px-3 py-2 border rounded"
              />
              <p className="text-xs text-gray-500 mt-1">Number of previous messages to include for context</p>
            </div>
            <div>
              <label className="block text-sm font-medium text-gray-700 mb-1">Response Tone</label>
              <select
                value={settings.responseToneStyle}
                onChange={(e) => handleChange('responseToneStyle', e.target.value)}
                className="w-full px-3 py-2 border rounded"
              >
                <option value="professional">Professional</option>
                <option value="casual">Casual</option>
                <option value="technical">Technical</option>
                <option value="friendly">Friendly</option>
              </select>
            </div>
          </div>
        );

      default:
        return null;
    }
  };

  return (
    <div className="space-y-6 pb-10">
      <div>
        <h1 className="text-2xl font-bold">AI Settings</h1>
        <p className="text-gray-500 text-sm">Configure Vanna.AI, LanceDB, embedding models, and LLM providers</p>
      </div>

      {saveStatus && (
        <Card className={`border ${saveStatus.type === 'success' ? 'border-green-200 bg-green-50' : 'border-red-200 bg-red-50'}`}>
          <p className={`text-sm font-medium ${saveStatus.type === 'success' ? 'text-green-800' : 'text-red-800'}`}>
            {saveStatus.type === 'success' ? '✅' : '❌'} {saveStatus.message}
          </p>
        </Card>
      )}

      <Card>
        {/* Tab Navigation */}
        <div className="flex gap-2 mb-6 border-b overflow-x-auto pb-2">
          {tabs.map(tab => (
            <button
              key={tab.id}
              onClick={() => setActiveTab(tab.id)}
              className={`px-4 py-2 rounded-t font-medium text-sm whitespace-nowrap transition-colors ${
                activeTab === tab.id
                  ? 'bg-primary-100 text-primary-700 border-b-2 border-primary-600'
                  : 'text-gray-600 hover:text-gray-900'
              }`}
            >
              {tab.icon} {tab.label}
            </button>
          ))}
        </div>

        {/* Tab Content */}
        {loading && activeTab === 0 ? (
          <div className="text-center py-6">Loading...</div>
        ) : (
          renderTabContent()
        )}

        {/* Action Buttons */}
        <div className="mt-8 flex gap-2 justify-end border-t pt-4">
          <Button variant="secondary" onClick={loadSettings} disabled={loading}>
            Reset
          </Button>
          <Button variant="primary" onClick={handleSave} disabled={loading}>
            {loading ? 'Saving...' : '💾 Save Settings'}
          </Button>
        </div>
      </Card>
    </div>
  );
};

export default AISettingsPage;
