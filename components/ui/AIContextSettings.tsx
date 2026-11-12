import React, { useState, useEffect } from 'react';
import axios from 'axios';
import Swal from 'sweetalert2';

export function AIContextSettings() {
    const [contexts, setContexts] = useState([]);
    const [trainingSession, setTrainingSession] = useState(null);
    const [ddlInput, setDdlInput] = useState('');
    const [isTraining, setIsTraining] = useState(false);
    const [trainingProgress, setTrainingProgress] = useState(null);
    const [llmSettings, setLLMSettings] = useState(null);
    const [showLLMForm, setShowLLMForm] = useState(false);
    const [formData, setFormData] = useState({
        provider: 'openai',
        modelName: 'gpt-4',
        apiKey: '',
        temperature: 0.7,
        maxTokens: 2000
    });

    // Load contexts on mount
    useEffect(() => {
        fetchContexts();
        fetchTrainingSessions();
        fetchLLMSettings();
    }, []);

    const fetchContexts = async () => {
        try {
            const response = await axios.get('/api/vanna/prompt-contexts');
            setContexts(response.data);
        } catch (error) {
            console.error('Failed to load contexts:', error);
        }
    };

    const fetchTrainingSessions = async () => {
        try {
            const response = await axios.get('/api/vanna/training-sessions');
            if (response.data && response.data.length > 0) {
                setTrainingSession(response.data[0]);
            }
        } catch (error) {
            console.error('Failed to load training sessions:', error);
        }
    };

    const fetchLLMSettings = async () => {
        try {
            const response = await axios.get('/api/vanna/llm-settings');
            setLLMSettings(response.data);
            if (response.data) {
                setFormData({
                    ...formData,
                    provider: response.data.provider,
                    modelName: response.data.model_name,
                    temperature: response.data.temperature,
                    maxTokens: response.data.max_tokens
                });
            }
        } catch (error) {
            console.error('Failed to load LLM settings:', error);
        }
    };

    const handleAddContext = async () => {
        const { value: formValues } = await Swal.fire({
            title: 'Add Prompt Context',
            html: `
                <div style="text-align: left;">
                    <label>Context Name:</label>
                    <input id="contextName" class="swal2-input" placeholder="e.g., Healthcare Data">
                    <label>Description:</label>
                    <textarea id="contextDesc" class="swal2-textarea" placeholder="Optional description"></textarea>
                    <label>Context Text (RAG):</label>
                    <textarea id="contextText" class="swal2-textarea" placeholder="Enter context information..." style="height: 150px;"></textarea>
                </div>
            `,
            focusConfirm: false,
            showCancelButton: true,
            confirmButtonText: 'Save Context',
            preConfirm: () => {
                return {
                    name: document.getElementById('contextName').value,
                    description: document.getElementById('contextDesc').value,
                    contextText: document.getElementById('contextText').value
                };
            }
        });

        if (formValues && formValues.name && formValues.contextText) {
            try {
                await axios.post('/api/vanna/prompt-contexts', {
                    name: formValues.name,
                    description: formValues.description,
                    contextText: formValues.contextText
                });
                
                Swal.fire('Success', 'Prompt context created', 'success');
                fetchContexts();
            } catch (error) {
                Swal.fire('Error', 'Failed to create context: ' + error.message, 'error');
            }
        }
    };

    const handleTrainVanna = async () => {
        if (!ddlInput.trim()) {
            Swal.fire('Error', 'Please paste the database DDL', 'error');
            return;
        }

        setIsTraining(true);
        setTrainingProgress('Uploading DDL...');

        try {
            const response = await axios.post('/api/vanna/train', {
                sessionName: `Training Session ${new Date().toLocaleString()}`,
                ddlSql: ddlInput
            });

            setTrainingProgress('Training completed!');
            setDdlInput('');
            
            setTimeout(() => {
                fetchTrainingSessions();
                setTrainingProgress(null);
                Swal.fire('Success', 'Vanna.AI training completed', 'success');
            }, 2000);
        } catch (error) {
            Swal.fire('Error', 'Training failed: ' + error.message, 'error');
            setTrainingProgress(null);
        } finally {
            setIsTraining(false);
        }
    };

    const handleSaveLLMSettings = async () => {
        try {
            await axios.post('/api/vanna/llm-settings', formData);
            Swal.fire('Success', 'LLM settings saved', 'success');
            setShowLLMForm(false);
            fetchLLMSettings();
        } catch (error) {
            Swal.fire('Error', 'Failed to save settings: ' + error.message, 'error');
        }
    };

    return (
        <div className="space-y-6">
            {/* LLM Settings Section */}
            <div className="bg-white p-6 rounded-lg border border-gray-200">
                <div className="flex justify-between items-center mb-4">
                    <h3 className="text-lg font-semibold text-gray-900">LLM Configuration</h3>
                    <button
                        onClick={() => setShowLLMForm(!showLLMForm)}
                        className="px-3 py-1 bg-blue-600 text-white text-sm rounded hover:bg-blue-700"
                    >
                        {showLLMForm ? 'Cancel' : 'Configure'}
                    </button>
                </div>

                {llmSettings && !showLLMForm && (
                    <div className="text-sm text-gray-600">
                        <p><strong>Provider:</strong> {llmSettings.provider}</p>
                        <p><strong>Model:</strong> {llmSettings.model_name}</p>
                        <p className="text-xs text-gray-500 mt-2">✅ Configured and active</p>
                    </div>
                )}

                {showLLMForm && (
                    <div className="space-y-4">
                        <select
                            value={formData.provider}
                            onChange={(e) => setFormData({ ...formData, provider: e.target.value })}
                            className="w-full p-2 border border-gray-300 rounded"
                        >
                            <option value="openai">OpenAI</option>
                            <option value="anthropic">Anthropic (Claude)</option>
                            <option value="cohere">Cohere</option>
                        </select>

                        <input
                            type="text"
                            placeholder="Model name (e.g., gpt-4, claude-3-sonnet)"
                            value={formData.modelName}
                            onChange={(e) => setFormData({ ...formData, modelName: e.target.value })}
                            className="w-full p-2 border border-gray-300 rounded"
                        />

                        <input
                            type="password"
                            placeholder="API Key"
                            value={formData.apiKey}
                            onChange={(e) => setFormData({ ...formData, apiKey: e.target.value })}
                            className="w-full p-2 border border-gray-300 rounded"
                        />

                        <div className="grid grid-cols-2 gap-4">
                            <div>
                                <label className="text-sm text-gray-600">Temperature</label>
                                <input
                                    type="number"
                                    min="0"
                                    max="1"
                                    step="0.1"
                                    value={formData.temperature}
                                    onChange={(e) => setFormData({ ...formData, temperature: parseFloat(e.target.value) })}
                                    className="w-full p-2 border border-gray-300 rounded"
                                />
                            </div>
                            <div>
                                <label className="text-sm text-gray-600">Max Tokens</label>
                                <input
                                    type="number"
                                    value={formData.maxTokens}
                                    onChange={(e) => setFormData({ ...formData, maxTokens: parseInt(e.target.value) })}
                                    className="w-full p-2 border border-gray-300 rounded"
                                />
                            </div>
                        </div>

                        <button
                            onClick={handleSaveLLMSettings}
                            className="w-full px-4 py-2 bg-green-600 text-white rounded hover:bg-green-700"
                        >
                            Save LLM Settings
                        </button>
                    </div>
                )}
            </div>

            {/* Vanna Training Section */}
            <div className="bg-white p-6 rounded-lg border border-gray-200">
                <h3 className="text-lg font-semibold text-gray-900 mb-4">Vanna.AI Training</h3>

                {trainingSession && (
                    <div className="mb-4 p-4 bg-green-50 border border-green-200 rounded">
                        <p className="text-sm text-green-800">
                            <strong>Last Training:</strong> {new Date(trainingSession.created_at).toLocaleString()}
                        </p>
                        <p className="text-sm text-green-800">
                            <strong>Status:</strong> <span className="font-semibold">{trainingSession.status}</span>
                        </p>
                        <p className="text-sm text-green-800">
                            <strong>Tables:</strong> {trainingSession.trained_on_tables ? JSON.parse(trainingSession.trained_on_tables).length : 0}
                        </p>
                    </div>
                )}

                <textarea
                    value={ddlInput}
                    onChange={(e) => setDdlInput(e.target.value)}
                    placeholder="Paste your database DDL (CREATE TABLE statements) here..."
                    className="w-full p-3 border border-gray-300 rounded mb-4"
                    rows={8}
                    disabled={isTraining}
                />

                {trainingProgress && (
                    <p className="text-sm text-blue-600 mb-2">🔄 {trainingProgress}</p>
                )}

                <button
                    onClick={handleTrainVanna}
                    disabled={isTraining || !ddlInput.trim()}
                    className="w-full px-4 py-2 bg-indigo-600 text-white rounded hover:bg-indigo-700 disabled:bg-gray-400"
                >
                    {isTraining ? 'Training...' : 'Train Vanna on DDL'}
                </button>
            </div>

            {/* Prompt Contexts Section */}
            <div className="bg-white p-6 rounded-lg border border-gray-200">
                <div className="flex justify-between items-center mb-4">
                    <h3 className="text-lg font-semibold text-gray-900">Prompt Contexts (RAG)</h3>
                    <button
                        onClick={handleAddContext}
                        className="px-4 py-2 bg-green-600 text-white text-sm rounded hover:bg-green-700"
                    >
                        + Add Context
                    </button>
                </div>

                {contexts.length === 0 ? (
                    <p className="text-gray-500 text-sm">No prompt contexts added yet</p>
                ) : (
                    <div className="space-y-3">
                        {contexts.map(context => (
                            <div key={context.id} className="p-3 border border-gray-200 rounded bg-gray-50">
                                <p className="font-semibold text-gray-900">{context.name}</p>
                                {context.description && (
                                    <p className="text-sm text-gray-600 mt-1">{context.description}</p>
                                )}
                                <p className="text-xs text-gray-500 mt-2">
                                    {context.context_text.substring(0, 100)}...
                                </p>
                                <p className="text-xs text-gray-400 mt-2">
                                    Created: {new Date(context.created_at).toLocaleString()}
                                </p>
                            </div>
                        ))}
                    </div>
                )}
            </div>

            {/* Info Section */}
            <div className="bg-blue-50 p-4 rounded-lg border border-blue-200">
                <h4 className="font-semibold text-blue-900 mb-2">ℹ️ How it works</h4>
                <ol className="text-sm text-blue-800 space-y-1 list-decimal list-inside">
                    <li>Configure your LLM provider (OpenAI, Anthropic, etc.)</li>
                    <li>Train Vanna.AI on your database schema (paste DDL)</li>
                    <li>Add prompt contexts to enhance AI responses</li>
                    <li>Use the AI chat on activity dashboards to query and analyze data</li>
                </ol>
            </div>
        </div>
    );
}

export default AIContextSettings;
