import React, { useState, useEffect } from 'react';
import axios from 'axios';
import Button from './ui/Button';
import Card from './ui/Card';
import MInput from './ui/MInput';
import { CheckIcon, TrashIcon, ExclamationIcon } from '@heroicons/react/24/outline';

interface SpeechService {
    id: number;
    provider: string;
    is_active: boolean;
    configuration: Record<string, any>;
    priority_order: number;
    last_tested_at?: string;
    test_status?: string;
}

interface SpeechToTextConfigProps {
    onClose?: () => void;
    onConfigured?: () => void;
}

type Provider = 'openai-whisper' | 'google-cloud-speech' | 'azure-speech' | 'local-whisper';

const PROVIDERS: Record<Provider, { name: string; description: string; configFields: string[] }> = {
    'openai-whisper': {
        name: 'OpenAI Whisper',
        description: 'High accuracy transcription via OpenAI API (~$0.006/min)',
        configFields: ['api_key', 'model']
    },
    'google-cloud-speech': {
        name: 'Google Cloud Speech-to-Text',
        description: 'Google Cloud transcription (~$0.024/15sec)',
        configFields: ['credentials_json', 'language_code']
    },
    'azure-speech': {
        name: 'Azure Speech Services',
        description: 'Microsoft Azure speech recognition',
        configFields: ['subscription_key', 'region', 'language']
    },
    'local-whisper': {
        name: 'Local Whisper (Private)',
        description: 'Self-hosted Whisper - free and private',
        configFields: ['api_url']
    }
};

/**
 * SpeechToTextConfigComponent
 * Manages speech-to-text service configurations
 * Allows adding, editing, testing, and removing transcription services
 */
export const SpeechToTextConfig: React.FC<SpeechToTextConfigProps> = ({ onClose, onConfigured }) => {
    const [services, setServices] = useState<SpeechService[]>([]);
    const [loading, setLoading] = useState(true);
    const [error, setError] = useState<string | null>(null);
    const [showAddForm, setShowAddForm] = useState(false);

    const [selectedProvider, setSelectedProvider] = useState<Provider>('openai-whisper');
    const [config, setConfig] = useState<Record<string, any>>({});
    const [testingServiceId, setTestingServiceId] = useState<number | null>(null);
    const [testResult, setTestResult] = useState<{ success: boolean; message: string } | null>(null);

    // Load services on mount
    useEffect(() => {
        loadServices();
    }, []);

    const loadServices = async () => {
        setLoading(true);
        try {
            const response = await axios.get('/api/voice-capture/speech-services');
            setServices(response.data.services || []);
            setError(null);
        } catch (err) {
            const message = err instanceof Error ? err.message : 'Failed to load services';
            setError(message);
        } finally {
            setLoading(false);
        }
    };

    const handleAddService = async () => {
        if (!selectedProvider || Object.keys(config).length === 0) {
            setError('Please select a provider and fill in all required fields');
            return;
        }

        setLoading(true);
        try {
            const response = await axios.post('/api/voice-capture/speech-services/configure', {
                provider: selectedProvider,
                configuration: config,
                is_active: true
            });

            if (response.data.success) {
                setShowAddForm(false);
                setConfig({});
                await loadServices();
                onConfigured?.();
            }
        } catch (err) {
            const message = err instanceof Error ? err.message : 'Failed to add service';
            setError(message);
        } finally {
            setLoading(false);
        }
    };

    const handleTestService = async (serviceId: number) => {
        setTestingServiceId(serviceId);
        setTestResult(null);

        try {
            const response = await axios.post(`/api/voice-capture/speech-services/${serviceId}/test`);
            setTestResult({
                success: response.data.success,
                message: response.data.message || (response.data.success ? 'Connection successful!' : 'Connection failed')
            });
        } catch (err) {
            setTestResult({
                success: false,
                message: err instanceof Error ? err.message : 'Test failed'
            });
        } finally {
            setTestingServiceId(null);
        }
    };

    const handleToggleActive = async (serviceId: number, isActive: boolean) => {
        setLoading(true);
        try {
            await axios.put(`/api/voice-capture/speech-services/${serviceId}`, {
                is_active: !isActive
            });
            await loadServices();
        } catch (err) {
            setError(err instanceof Error ? err.message : 'Failed to update service');
        } finally {
            setLoading(false);
        }
    };

    const handleDeleteService = async (serviceId: number) => {
        if (!window.confirm('Are you sure you want to delete this service configuration?')) {
            return;
        }

        setLoading(true);
        try {
            await axios.delete(`/api/voice-capture/speech-services/${serviceId}`);
            await loadServices();
        } catch (err) {
            setError(err instanceof Error ? err.message : 'Failed to delete service');
        } finally {
            setLoading(false);
        }
    };

    const handleChangePriority = async (serviceId: number, newPriority: number) => {
        try {
            await axios.put(`/api/voice-capture/speech-services/${serviceId}`, {
                priority_order: newPriority
            });
            await loadServices();
        } catch (err) {
            setError(err instanceof Error ? err.message : 'Failed to update priority');
        }
    };

    if (loading && services.length === 0) {
        return (
            <Card className="max-w-2xl text-center py-8">
                <p className="text-gray-600">Loading speech services...</p>
            </Card>
        );
    }

    return (
        <Card title="🎙️ Speech-to-Text Services" className="max-w-3xl">
            <div className="space-y-6">
                {/* Error Display */}
                {error && (
                    <div className="bg-red-50 border-l-4 border-red-500 p-4 rounded">
                        <p className="text-red-900 text-sm">{error}</p>
                    </div>
                )}

                {/* Info Box */}
                <div className="bg-blue-50 border-l-4 border-blue-500 p-4 rounded">
                    <p className="text-sm text-blue-900 font-semibold mb-2">🎯 How it works:</p>
                    <ul className="text-xs text-blue-900 space-y-1 list-disc list-inside">
                        <li>Configure one or more speech-to-text services</li>
                        <li>The highest priority active service will be used for transcription</li>
                        <li>Each service can be tested to verify the configuration is correct</li>
                        <li>Fallback to next service if the active one fails</li>
                    </ul>
                </div>

                {/* Existing Services */}
                {services.length > 0 && (
                    <div className="space-y-3">
                        <h3 className="font-semibold text-gray-900">Configured Services</h3>
                        {services.map((service, idx) => (
                            <div key={service.id} className="border rounded-lg p-4 space-y-3">
                                {/* Service Info */}
                                <div className="flex items-start justify-between">
                                    <div>
                                        <h4 className="font-semibold text-gray-900">
                                            {PROVIDERS[service.provider as Provider]?.name || service.provider}
                                        </h4>
                                        <p className="text-xs text-gray-600 mt-1">
                                            {PROVIDERS[service.provider as Provider]?.description}
                                        </p>
                                    </div>
                                    <div className="flex items-center gap-2">
                                        <input
                                            type="checkbox"
                                            checked={service.is_active}
                                            onChange={() => handleToggleActive(service.id, service.is_active)}
                                            className="w-4 h-4"
                                            title="Toggle service active/inactive"
                                        />
                                        <span className="text-xs font-semibold text-gray-600">
                                            {service.is_active ? '✓ Active' : '○ Inactive'}
                                        </span>
                                    </div>
                                </div>

                                {/* Test Status */}
                                {service.last_tested_at && (
                                    <div className="flex items-center gap-2 text-xs">
                                        {service.test_status === 'success' ? (
                                            <>
                                                <CheckIcon className="h-4 w-4 text-green-600" />
                                                <span className="text-green-700">Last tested: {new Date(service.last_tested_at).toLocaleString()}</span>
                                            </>
                                        ) : (
                                            <>
                                                <ExclamationIcon className="h-4 w-4 text-red-600" />
                                                <span className="text-red-700">Test failed: {new Date(service.last_tested_at).toLocaleString()}</span>
                                            </>
                                        )}
                                    </div>
                                )}

                                {/* Configuration Display */}
                                <div className="bg-gray-50 rounded p-2 text-xs font-mono text-gray-700 overflow-x-auto">
                                    {Object.entries(service.configuration).map(([key, value]) => (
                                        <div key={key}>
                                            {key}: {typeof value === 'string' && value.length > 30
                                                ? value.substring(0, 30) + '...'
                                                : String(value)}
                                        </div>
                                    ))}
                                </div>

                                {/* Control Buttons */}
                                <div className="flex gap-2 justify-end">
                                    <Button
                                        variant="secondary"
                                        size="sm"
                                        onClick={() => handleTestService(service.id)}
                                        disabled={testingServiceId === service.id}
                                    >
                                        {testingServiceId === service.id ? 'Testing...' : 'Test Connection'}
                                    </Button>
                                    <Button
                                        variant="danger"
                                        size="sm"
                                        onClick={() => handleDeleteService(service.id)}
                                    >
                                        <TrashIcon className="h-4 w-4" />
                                    </Button>
                                </div>

                                {/* Test Result */}
                                {testingServiceId === service.id && testResult && (
                                    <div className={`p-2 rounded text-xs ${
                                        testResult.success
                                            ? 'bg-green-50 text-green-900 border-l-4 border-green-500'
                                            : 'bg-red-50 text-red-900 border-l-4 border-red-500'
                                    }`}>
                                        {testResult.message}
                                    </div>
                                )}
                            </div>
                        ))}
                    </div>
                )}

                {/* Add Service Form */}
                {!showAddForm && (
                    <Button onClick={() => setShowAddForm(true)} className="w-full">
                        + Add New Service
                    </Button>
                )}

                {showAddForm && (
                    <div className="border rounded-lg p-4 space-y-4 bg-gray-50">
                        <h3 className="font-semibold text-gray-900">Add New Service</h3>

                        {/* Provider Selection */}
                        <div>
                            <label className="block text-sm font-medium text-gray-700 mb-2">Provider</label>
                            <select
                                value={selectedProvider}
                                onChange={(e) => {
                                    setSelectedProvider(e.target.value as Provider);
                                    setConfig({});
                                }}
                                className="w-full border rounded px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-primary-500"
                            >
                                {Object.entries(PROVIDERS).map(([key, value]) => (
                                    <option key={key} value={key}>
                                        {value.name}
                                    </option>
                                ))}
                            </select>
                        </div>

                        {/* Configuration Fields */}
                        {selectedProvider && (
                            <div className="space-y-3">
                                {PROVIDERS[selectedProvider].configFields.map(field => (
                                    <input
                                        key={field}
                                        type={field.includes('password') || field.includes('key') ? 'password' : 'text'}
                                        placeholder={field.replace(/_/g, ' ').charAt(0).toUpperCase() + field.replace(/_/g, ' ').slice(1)}
                                        value={config[field] || ''}
                                        onChange={(e) => setConfig(prev => ({
                                            ...prev,
                                            [field]: e.target.value
                                        }))}
                                        className="w-full border rounded px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-primary-500"
                                    />
                                ))}
                            </div>
                        )}

                        {/* Action Buttons */}
                        <div className="flex gap-2 justify-end">
                            <Button
                                variant="secondary"
                                onClick={() => {
                                    setShowAddForm(false);
                                    setConfig({});
                                }}
                            >
                                Cancel
                            </Button>
                            <Button onClick={handleAddService} disabled={loading}>
                                Add Service
                            </Button>
                        </div>
                    </div>
                )}

                {/* Close Button */}
                {onClose && (
                    <div className="flex justify-end pt-4 border-t">
                        <Button variant="secondary" onClick={onClose}>
                            Close
                        </Button>
                    </div>
                )}
            </div>
        </Card>
    );
};

export default SpeechToTextConfig;

