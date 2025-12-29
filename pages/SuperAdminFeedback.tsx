import React, { useState, useEffect } from 'react';
import { useMockData } from '../hooks/useMockData';
import { useNavigate } from 'react-router-dom';
import SuperAdminNav from '../components/SuperAdminNav';

const SuperAdminFeedback: React.FC = () => {
  const { currentUser } = useMockData();
  const navigate = useNavigate();
  const [feedback, setFeedback] = useState<any[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState('');

  useEffect(() => {
    const isSuperAdmin = currentUser && (String(currentUser.role || '').toLowerCase() === 'super-admin' || String(currentUser.role || '').toLowerCase() === 'super_admin');
    if (!isSuperAdmin) {
      navigate('/login');
      return;
    }

    loadFeedback();
  }, [currentUser, navigate]);

  const loadFeedback = async () => {
    try {
      setLoading(true);
      const response = await fetch('/api/super-admin/feedback', {
        credentials: 'include'
      });
      if (!response.ok) throw new Error('Failed to load feedback');
      const data = await response.json();
      setFeedback(data.messages || []);
      setError('');
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Failed to load feedback');
      console.error('Load feedback error:', err);
    } finally {
      setLoading(false);
    }
  };

  const isSuperAdmin = currentUser && (String(currentUser.role || '').toLowerCase() === 'super-admin' || String(currentUser.role || '').toLowerCase() === 'super_admin');
  if (!isSuperAdmin) {
    return (
      <div className="flex items-center justify-center h-screen bg-red-50">
        <div className="text-center">
          <h1 className="text-3xl font-bold text-red-600 mb-4">Access Denied</h1>
          <p>This page is only accessible to super administrators.</p>
        </div>
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-gray-50">
      <SuperAdminNav 
        title="Feedback & Messages" 
        subtitle="View and manage feedback from users"
      />

      {/* Main Content */}
      <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-8">
        {error && (
          <div className="mb-4 p-4 bg-red-100 border border-red-400 text-red-700 rounded">
            {error}
          </div>
        )}

        <h2 className="text-2xl font-bold mb-6">Feedback & Contact Messages</h2>
        
        {loading ? (
          <div className="flex items-center justify-center h-64">
            <div className="text-center">
              <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-blue-500 mx-auto mb-4"></div>
              <p>Loading feedback...</p>
            </div>
          </div>
        ) : feedback.length === 0 ? (
          <div className="bg-white rounded-lg shadow p-12 text-center text-gray-500">
            <p className="text-lg">No feedback messages yet</p>
            <p className="text-sm">Feedback from users will appear here</p>
          </div>
        ) : (
          <div className="space-y-4">
            {feedback.map(msg => (
              <div key={msg.id} className="bg-white rounded-lg shadow p-6 border-l-4 border-blue-500">
                <div className="flex justify-between items-start mb-3">
                  <div>
                    <h3 className="font-bold text-lg">{msg.subject}</h3>
                    <p className="text-sm text-gray-600">{msg.sender_name} &lt;{msg.sender_email}&gt;</p>
                  </div>
                  <span className={`px-3 py-1 rounded text-sm font-medium whitespace-nowrap ${
                    msg.status === 'New' ? 'bg-red-100 text-red-800' : 'bg-green-100 text-green-800'
                  }`}>
                    {msg.status}
                  </span>
                </div>
                <p className="text-gray-700 mb-3">{msg.message}</p>
                <div className="text-xs text-gray-500">
                  {msg.created_at && new Date(msg.created_at).toLocaleString()}
                </div>
              </div>
            ))}
          </div>
        )}
      </div>
    </div>
  );
};

export default SuperAdminFeedback;
