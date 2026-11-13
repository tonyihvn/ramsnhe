import React, { useState, useEffect } from 'react';
import Card from './ui/Card';
import Button from './ui/Button';
import { success as swalSuccess, error as swalError } from './ui/swal';

interface AIContextActivity {
    id: number;
    activity_type: string;
    question: string;
    response: string;
    feedback_score?: number;
    feedback_text?: string;
    context_tags?: string[];
    created_at: string;
    created_by: string;
}

interface AIContextManagerProps {
    businessId: number;
}

const AIContextManager: React.FC<AIContextManagerProps> = ({ businessId }) => {
    const [activities, setActivities] = useState<AIContextActivity[]>([]);
    const [loading, setLoading] = useState(false);
    const [showForm, setShowForm] = useState(false);
    const [editingActivity, setEditingActivity] = useState<AIContextActivity | null>(null);
    const [formData, setFormData] = useState({
        activityType: 'QUESTION_RESPONSE',
        question: '',
        response: '',
        feedbackScore: 5,
        feedbackText: '',
        contextTags: ''
    });

    useEffect(() => {
        loadActivities();
    }, [businessId]);

    const loadActivities = async () => {
        try {
            setLoading(true);
            const res = await fetch(`/api/training-records/ai-context?businessId=${businessId}`, {
                credentials: 'include'
            });
            if (res.ok) {
                const data = await res.json();
                setActivities(data);
            }
        } catch (err) {
            console.error('Error loading activities:', err);
            swalError('Error', 'Failed to load AI Context activities');
        } finally {
            setLoading(false);
        }
    };

    const handleSaveActivity = async () => {
        try {
            if (!formData.question || !formData.response) {
                swalError('Validation', 'Question and response are required');
                return;
            }

            setLoading(true);

            const payload = {
                businessId,
                activityType: formData.activityType,
                question: formData.question,
                response: formData.response,
                feedbackScore: formData.feedbackScore,
                feedbackText: formData.feedbackText,
                contextTags: formData.contextTags ? formData.contextTags.split(',').map(t => t.trim()) : []
            };

            if (editingActivity) {
                const res = await fetch(`/api/training-records/ai-context/${editingActivity.id}`, {
                    method: 'PUT',
                    headers: { 'Content-Type': 'application/json' },
                    credentials: 'include',
                    body: JSON.stringify(payload)
                });

                if (res.ok) {
                    swalSuccess('Success', 'Activity updated');
                    setEditingActivity(null);
                    resetForm();
                    await loadActivities();
                } else {
                    swalError('Error', 'Failed to update activity');
                }
            } else {
                const res = await fetch('/api/training-records/ai-context', {
                    method: 'POST',
                    headers: { 'Content-Type': 'application/json' },
                    credentials: 'include',
                    body: JSON.stringify(payload)
                });

                if (res.ok) {
                    swalSuccess('Success', 'Activity added');
                    resetForm();
                    await loadActivities();
                } else {
                    swalError('Error', 'Failed to create activity');
                }
            }
        } catch (err) {
            console.error('Error saving activity:', err);
            swalError('Error', 'Failed to save activity');
        } finally {
            setLoading(false);
            setShowForm(false);
        }
    };

    const handleEdit = (activity: AIContextActivity) => {
        setEditingActivity(activity);
        setFormData({
            activityType: activity.activity_type,
            question: activity.question,
            response: activity.response,
            feedbackScore: activity.feedback_score || 5,
            feedbackText: activity.feedback_text || '',
            contextTags: activity.context_tags ? activity.context_tags.join(', ') : ''
        });
        setShowForm(true);
    };

    const handleDelete = async (id: number) => {
        try {
            const res = await fetch(`/api/training-records/ai-context/${id}`, {
                method: 'DELETE',
                credentials: 'include'
            });

            if (res.ok) {
                swalSuccess('Success', 'Activity deleted');
                await loadActivities();
            } else {
                swalError('Error', 'Failed to delete activity');
            }
        } catch (err) {
            console.error('Error deleting activity:', err);
            swalError('Error', 'Failed to delete activity');
        }
    };

    const resetForm = () => {
        setFormData({
            activityType: 'QUESTION_RESPONSE',
            question: '',
            response: '',
            feedbackScore: 5,
            feedbackText: '',
            contextTags: ''
        });
    };

    return (
        <div className="space-y-4">
            <div className="flex gap-2 justify-between">
                <Button onClick={() => setShowForm(true)} disabled={loading}>
                    ➕ Add Activity
                </Button>
                <Button onClick={loadActivities} disabled={loading} variant="secondary">
                    🔄 Refresh
                </Button>
            </div>

            {showForm && (
                <Card className="bg-green-50">
                    <h3 className="text-lg font-medium mb-4">
                        {editingActivity ? 'Edit' : 'Add'} AI Context Activity
                    </h3>
                    <div className="space-y-3">
                        <div>
                            <label className="block text-sm font-medium mb-1">Activity Type</label>
                            <select
                                value={formData.activityType}
                                onChange={(e) => setFormData({ ...formData, activityType: e.target.value })}
                                className="w-full p-2 border rounded"
                            >
                                <option value="QUESTION_RESPONSE">Question & Response</option>
                                <option value="FEEDBACK">Feedback</option>
                                <option value="CORRECTION">Correction</option>
                            </select>
                        </div>

                        <div>
                            <label className="block text-sm font-medium mb-1">Question</label>
                            <input
                                type="text"
                                value={formData.question}
                                onChange={(e) => setFormData({ ...formData, question: e.target.value })}
                                placeholder="e.g., How many facilities are in Lagos?"
                                className="w-full p-2 border rounded"
                            />
                        </div>

                        <div>
                            <label className="block text-sm font-medium mb-1">Response</label>
                            <textarea
                                value={formData.response}
                                onChange={(e) => setFormData({ ...formData, response: e.target.value })}
                                placeholder="What the AI should learn to respond..."
                                rows={4}
                                className="w-full p-2 border rounded"
                            />
                        </div>

                        <div className="grid grid-cols-2 gap-3">
                            <div>
                                <label className="block text-sm font-medium mb-1">Feedback Score (1-5)</label>
                                <input
                                    type="number"
                                    min="1"
                                    max="5"
                                    value={formData.feedbackScore}
                                    onChange={(e) => setFormData({ ...formData, feedbackScore: parseInt(e.target.value) })}
                                    className="w-full p-2 border rounded"
                                />
                            </div>
                            <div>
                                <label className="block text-sm font-medium mb-1">Context Tags (comma-separated)</label>
                                <input
                                    type="text"
                                    value={formData.contextTags}
                                    onChange={(e) => setFormData({ ...formData, contextTags: e.target.value })}
                                    placeholder="e.g., facilities, locations"
                                    className="w-full p-2 border rounded"
                                />
                            </div>
                        </div>

                        <div>
                            <label className="block text-sm font-medium mb-1">Feedback Text</label>
                            <textarea
                                value={formData.feedbackText}
                                onChange={(e) => setFormData({ ...formData, feedbackText: e.target.value })}
                                placeholder="Optional: Additional feedback or notes"
                                rows={2}
                                className="w-full p-2 border rounded"
                            />
                        </div>

                        <div className="flex gap-2 justify-end">
                            <Button
                                onClick={() => {
                                    setShowForm(false);
                                    setEditingActivity(null);
                                    resetForm();
                                }}
                                variant="secondary"
                                disabled={loading}
                            >
                                Cancel
                            </Button>
                            <Button onClick={handleSaveActivity} disabled={loading}>
                                {editingActivity ? 'Update' : 'Save'} Activity
                            </Button>
                        </div>
                    </div>
                </Card>
            )}

            {loading && <div className="text-center py-4 text-gray-500">Loading...</div>}

            {!loading && activities.length === 0 && (
                <Card className="bg-gray-50 text-center py-8">
                    <p className="text-gray-600">No activities yet. Add one to start training the AI context!</p>
                </Card>
            )}

            {!loading && activities.length > 0 && (
                <div className="space-y-2">
                    <div className="text-sm font-medium text-gray-600">
                        {activities.length} activit{activities.length !== 1 ? 'ies' : 'y'}
                    </div>
                    {activities.map((activity) => (
                        <Card key={activity.id} className="hover:shadow-md transition-shadow">
                            <div className="space-y-2">
                                <div className="flex items-start justify-between">
                                    <div className="flex-1">
                                        <h4 className="font-medium">Q: {activity.question}</h4>
                                        <p className="text-sm text-gray-700 mt-2">A: {activity.response}</p>
                                    </div>
                                    <div className="flex gap-1 flex-shrink-0">
                                        {activity.feedback_score && (
                                            <span className="text-xs bg-green-100 text-green-800 px-2 py-1 rounded">
                                                ⭐ {activity.feedback_score}/5
                                            </span>
                                        )}
                                        <span className="text-xs bg-blue-100 text-blue-800 px-2 py-1 rounded">
                                            {activity.activity_type}
                                        </span>
                                    </div>
                                </div>

                                {activity.context_tags && activity.context_tags.length > 0 && (
                                    <div className="flex gap-1 flex-wrap">
                                        {activity.context_tags.map((tag, idx) => (
                                            <span key={idx} className="text-xs bg-purple-100 text-purple-800 px-2 py-1 rounded">
                                                #{tag}
                                            </span>
                                        ))}
                                    </div>
                                )}

                                <div className="flex items-center justify-between text-xs text-gray-500 pt-2 border-t">
                                    <span>By: {activity.created_by || 'System'} • {new Date(activity.created_at).toLocaleString()}</span>
                                    <div className="flex gap-1">
                                        <Button
                                            onClick={() => handleEdit(activity)}
                                            variant="secondary"
                                            className="text-sm"
                                            disabled={loading}
                                        >
                                            ✏️ Edit
                                        </Button>
                                        <Button
                                            onClick={() => handleDelete(activity.id)}
                                            variant="secondary"
                                            className="text-sm text-red-600"
                                            disabled={loading}
                                        >
                                            🗑️ Delete
                                        </Button>
                                    </div>
                                </div>
                            </div>
                        </Card>
                    ))}
                </div>
            )}
        </div>
    );
};

export default AIContextManager;

