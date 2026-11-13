import React, { useState, useEffect } from 'react';
import Card from './ui/Card';
import Button from './ui/Button';
import { success as swalSuccess, error as swalError, info as swalInfo } from './ui/swal';

interface TrainingRecord {
    id: number;
    training_type: string;
    title: string;
    content: string;
    created_at: string;
    updated_at: string;
    created_by: string;
    is_active: boolean;
}

interface AIContextActivity {
    id: number;
    activity_type: string;
    question: string;
    response: string;
    feedback_score?: number;
    context_tags?: string[];
    created_at: string;
}

interface TrainingRecordsManagerProps {
    businessId: number;
    provider: 'vanna' | 'vercel';
}

const TrainingRecordsManager: React.FC<TrainingRecordsManagerProps> = ({ businessId, provider }) => {
    const [records, setRecords] = useState<TrainingRecord[]>([]);
    const [selectedRecords, setSelectedRecords] = useState<Set<number>>(new Set());
    const [loading, setLoading] = useState(false);
    const [showForm, setShowForm] = useState(false);
    const [editingRecord, setEditingRecord] = useState<TrainingRecord | null>(null);
    const [formData, setFormData] = useState({
        trainingType: 'DDL',
        title: '',
        content: '',
        metadata: {}
    });

    useEffect(() => {
        loadRecords();
    }, [businessId, provider]);

    const loadRecords = async () => {
        try {
            setLoading(true);
            const res = await fetch(`/api/training-records/${provider}?businessId=${businessId}`, {
                credentials: 'include'
            });
            if (res.ok) {
                const data = await res.json();
                setRecords(data);
            } else {
                swalError('Error', 'Failed to load training records');
            }
        } catch (err) {
            console.error('Error loading records:', err);
            swalError('Error', 'Failed to load training records');
        } finally {
            setLoading(false);
        }
    };

    const handleAddRecord = async () => {
        try {
            if (!formData.title || !formData.content) {
                swalError('Validation', 'Title and content are required');
                return;
            }

            setLoading(true);

            if (editingRecord) {
                // Update
                const res = await fetch(`/api/training-records/${provider}/${editingRecord.id}`, {
                    method: 'PUT',
                    headers: { 'Content-Type': 'application/json' },
                    credentials: 'include',
                    body: JSON.stringify({
                        ...formData,
                        businessId
                    })
                });

                if (res.ok) {
                    swalSuccess('Success', 'Training record updated');
                    setEditingRecord(null);
                    setFormData({ trainingType: 'DDL', title: '', content: '', metadata: {} });
                    await loadRecords();
                } else {
                    swalError('Error', 'Failed to update record');
                }
            } else {
                // Create
                const res = await fetch(`/api/training-records/${provider}`, {
                    method: 'POST',
                    headers: { 'Content-Type': 'application/json' },
                    credentials: 'include',
                    body: JSON.stringify({
                        ...formData,
                        businessId
                    })
                });

                if (res.ok) {
                    swalSuccess('Success', 'Training record created');
                    setFormData({ trainingType: 'DDL', title: '', content: '', metadata: {} });
                    await loadRecords();
                } else {
                    swalError('Error', 'Failed to create record');
                }
            }
        } catch (err) {
            console.error('Error saving record:', err);
            swalError('Error', 'Failed to save record');
        } finally {
            setLoading(false);
            setShowForm(false);
        }
    };

    const handleEdit = (record: TrainingRecord) => {
        setEditingRecord(record);
        setFormData({
            trainingType: record.training_type,
            title: record.title,
            content: record.content,
            metadata: {}
        });
        setShowForm(true);
    };

    const handleDelete = async (id: number) => {
        try {
            const res = await fetch(`/api/training-records/${provider}/${id}`, {
                method: 'DELETE',
                credentials: 'include'
            });

            if (res.ok) {
                swalSuccess('Success', 'Training record deleted');
                await loadRecords();
            } else {
                swalError('Error', 'Failed to delete record');
            }
        } catch (err) {
            console.error('Error deleting record:', err);
            swalError('Error', 'Failed to delete record');
        }
    };

    const handleToggleSelect = (id: number) => {
        const newSelected = new Set(selectedRecords);
        if (newSelected.has(id)) {
            newSelected.delete(id);
        } else {
            newSelected.add(id);
        }
        setSelectedRecords(newSelected);
    };

    const handleRetrain = async () => {
        try {
            if (selectedRecords.size === 0) {
                swalError('Selection', 'Please select at least one record for retraining');
                return;
            }

            setLoading(true);

            const res = await fetch(`/api/training-records/${provider}/retrain`, {
                method: 'POST',
                headers: { 'Content-Type': 'application/json' },
                credentials: 'include',
                body: JSON.stringify({
                    businessId,
                    recordIds: Array.from(selectedRecords)
                })
            });

            if (res.ok) {
                const data = await res.json();
                swalSuccess('Success', `Retraining initiated with ${data.recordsUsed} records`);
                setSelectedRecords(new Set());
                await loadRecords();
            } else {
                swalError('Error', 'Failed to initiate retraining');
            }
        } catch (err) {
            console.error('Error retraining:', err);
            swalError('Error', 'Failed to initiate retraining');
        } finally {
            setLoading(false);
        }
    };

    return (
        <div className="space-y-4">
            <div className="flex gap-2 justify-between">
                <div className="flex gap-2">
                    <Button onClick={() => setShowForm(true)} disabled={loading}>
                        ➕ Add {provider === 'vanna' ? 'DDL' : 'Context'}
                    </Button>
                    {selectedRecords.size > 0 && (
                        <Button onClick={handleRetrain} disabled={loading} variant="secondary">
                            🔄 Retrain ({selectedRecords.size} selected)
                        </Button>
                    )}
                </div>
                <Button onClick={loadRecords} disabled={loading} variant="secondary">
                    🔄 Refresh
                </Button>
            </div>

            {showForm && (
                <Card className="bg-blue-50">
                    <h3 className="text-lg font-medium mb-4">
                        {editingRecord ? 'Edit' : 'Add New'} {provider === 'vanna' ? 'Vanna' : 'Vercel'} Training Record
                    </h3>
                    <div className="space-y-3">
                        <div>
                            <label className="block text-sm font-medium mb-1">Training Type</label>
                            <select
                                value={formData.trainingType}
                                onChange={(e) => setFormData({ ...formData, trainingType: e.target.value })}
                                className="w-full p-2 border rounded"
                            >
                                {provider === 'vanna' ? (
                                    <>
                                        <option value="DDL">DDL (Database Schema)</option>
                                        <option value="DOCUMENTATION">Documentation</option>
                                        <option value="QUESTION_ANSWER">Question & Answer</option>
                                    </>
                                ) : (
                                    <>
                                        <option value="PROMPT_CONTEXT">Prompt Context</option>
                                        <option value="EXAMPLE_QUERY">Example Query</option>
                                        <option value="SYSTEM_MESSAGE">System Message</option>
                                    </>
                                )}
                            </select>
                        </div>

                        <div>
                            <label className="block text-sm font-medium mb-1">Title</label>
                            <input
                                type="text"
                                value={formData.title}
                                onChange={(e) => setFormData({ ...formData, title: e.target.value })}
                                placeholder="e.g., Facilities Table Schema"
                                className="w-full p-2 border rounded"
                            />
                        </div>

                        <div>
                            <label className="block text-sm font-medium mb-1">Content</label>
                            <textarea
                                value={formData.content}
                                onChange={(e) => setFormData({ ...formData, content: e.target.value })}
                                placeholder={provider === 'vanna' ? 'Paste your DDL or documentation...' : 'Paste your prompt context...'}
                                rows={8}
                                className="w-full p-2 border rounded font-mono text-sm"
                            />
                        </div>

                        <div className="flex gap-2 justify-end">
                            <Button
                                onClick={() => {
                                    setShowForm(false);
                                    setEditingRecord(null);
                                    setFormData({ trainingType: 'DDL', title: '', content: '', metadata: {} });
                                }}
                                variant="secondary"
                                disabled={loading}
                            >
                                Cancel
                            </Button>
                            <Button onClick={handleAddRecord} disabled={loading}>
                                {editingRecord ? 'Update' : 'Save'} Record
                            </Button>
                        </div>
                    </div>
                </Card>
            )}

            {loading && <div className="text-center py-4 text-gray-500">Loading...</div>}

            {!loading && records.length === 0 && (
                <Card className="bg-gray-50 text-center py-8">
                    <p className="text-gray-600">No training records yet. Create one to get started!</p>
                </Card>
            )}

            {!loading && records.length > 0 && (
                <div className="space-y-2">
                    <div className="text-sm font-medium text-gray-600">
                        {records.length} record{records.length !== 1 ? 's' : ''}
                    </div>
                    {records.map((record) => (
                        <Card key={record.id} className="hover:shadow-md transition-shadow">
                            <div className="flex items-start gap-3">
                                <input
                                    type="checkbox"
                                    checked={selectedRecords.has(record.id)}
                                    onChange={() => handleToggleSelect(record.id)}
                                    className="mt-1"
                                />
                                <div className="flex-1">
                                    <div className="flex items-center justify-between">
                                        <h4 className="font-medium">{record.title}</h4>
                                        <span className="text-xs bg-blue-100 text-blue-800 px-2 py-1 rounded">
                                            {record.training_type}
                                        </span>
                                    </div>
                                    <p className="text-sm text-gray-600 mt-1 line-clamp-2">{record.content}</p>
                                    <div className="flex items-center gap-4 mt-2 text-xs text-gray-500">
                                        <span>By: {record.created_by || 'System'}</span>
                                        <span>Created: {new Date(record.created_at).toLocaleString()}</span>
                                    </div>
                                </div>
                                <div className="flex gap-1">
                                    <Button
                                        onClick={() => handleEdit(record)}
                                        variant="secondary"
                                        className="text-sm"
                                        disabled={loading}
                                    >
                                        ✏️ Edit
                                    </Button>
                                    <Button
                                        onClick={() => handleDelete(record.id)}
                                        variant="secondary"
                                        className="text-sm text-red-600"
                                        disabled={loading}
                                    >
                                        🗑️ Delete
                                    </Button>
                                </div>
                            </div>
                        </Card>
                    ))}
                </div>
            )}
        </div>
    );
};

export default TrainingRecordsManager;

