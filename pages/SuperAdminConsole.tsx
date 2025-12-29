import React, { useState, useEffect } from 'react';
import { useMockData } from '../hooks/useMockData';
import { useNavigate } from 'react-router-dom';
import SuperAdminNav from '../components/SuperAdminNav';

const SuperAdminConsole: React.FC = () => {
  const { currentUser } = useMockData();
  const navigate = useNavigate();
  const [activeTab, setActiveTab] = useState('overview');
  const [stats, setStats] = useState<any>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState('');

  useEffect(() => {
    const isSuperAdmin = currentUser && (String(currentUser.role || '').toLowerCase() === 'super-admin' || String(currentUser.role || '').toLowerCase() === 'super_admin');
    if (!isSuperAdmin) {
      navigate('/login');
      return;
    }

    loadStats();
  }, [currentUser, navigate]);

  const loadStats = async () => {
    try {
      setLoading(true);
      const response = await fetch('/api/super-admin/stats');
      if (!response.ok) throw new Error('Failed to load stats');
      const data = await response.json();
      setStats(data);
      setError('');
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Failed to load statistics');
      console.error('Load stats error:', err);
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
        title="Super Admin Console" 
        subtitle="Manage businesses, users, and system settings"
      />

      {/* Note: activeTab state is no longer used since navigation is handled by routes.
          Keeping it for backwards compatibility if needed. */}

      {/* Content */}
      <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-8">
        {error && (
          <div className="mb-4 p-4 bg-red-100 border border-red-400 text-red-700 rounded">
            {error}
          </div>
        )}

        {activeTab === 'overview' && (
          <OverviewTab stats={stats} loading={loading} />
        )}

        {activeTab === 'businesses' && (
          <BusinessesTab />
        )}

        {activeTab === 'users' && (
          <UserManagementTab />
        )}

        {activeTab === 'landing-page' && (
          <LandingPageConfigTab />
        )}

        {activeTab === 'feedback' && (
          <FeedbackTab />
        )}
      </div>
    </div>
  );
};

/**
 * Overview Tab - Dashboard statistics
 */
const OverviewTab: React.FC<{ stats: any; loading: boolean }> = ({ stats, loading }) => {
  if (loading) {
    return (
      <div className="flex items-center justify-center h-64">
        <div className="text-center">
          <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-blue-500 mx-auto mb-4"></div>
          <p>Loading statistics...</p>
        </div>
      </div>
    );
  }

  const cards = [
    {
      label: 'Total Businesses',
      value: stats?.totalBusinesses || 0,
      icon: '🏢',
      color: 'bg-blue-50 border-blue-200'
    },
    {
      label: 'Total Users',
      value: stats?.totalUsers || 0,
      icon: '👥',
      color: 'bg-green-50 border-green-200'
    },
    {
      label: 'Active Users (30 days)',
      value: stats?.activeUsers || 0,
      icon: '✅',
      color: 'bg-purple-50 border-purple-200'
    },
    {
      label: 'Pending Approvals',
      value: stats?.pendingApprovals || 0,
      icon: '⏳',
      color: 'bg-yellow-50 border-yellow-200'
    },
    {
      label: 'New Feedback',
      value: stats?.newFeedback || 0,
      icon: '💬',
      color: 'bg-orange-50 border-orange-200'
    },
  ];

  return (
    <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-5 gap-4">
      {cards.map((card, idx) => (
        <div key={idx} className={`p-6 bg-white rounded-lg border ${card.color} shadow-sm`}>
          <div className="text-3xl mb-2">{card.icon}</div>
          <p className="text-gray-600 text-sm font-medium">{card.label}</p>
          <p className="text-3xl font-bold text-gray-900 mt-2">{card.value}</p>
        </div>
      ))}
    </div>
  );
};

/**
 * Businesses Tab - Manage businesses
 */
const BusinessesTab: React.FC = () => {
  const [businesses, setBusinesses] = useState<any[]>([]);
  const [loading, setLoading] = useState(true);
  const [showForm, setShowForm] = useState(false);
  const [editingBusiness, setEditingBusiness] = useState<any>(null);

  useEffect(() => {
    loadBusinesses();
  }, []);

  const loadBusinesses = async () => {
    try {
      setLoading(true);
      const response = await fetch('/api/super-admin/businesses');
      if (!response.ok) throw new Error('Failed to load businesses');
      const data = await response.json();
      setBusinesses(data.businesses);
    } catch (err) {
      console.error('Load businesses error:', err);
    } finally {
      setLoading(false);
    }
  };

  const handleEditBusiness = (business: any) => {
    setEditingBusiness(business);
    setShowForm(true);
  };

  const handleCloseForm = () => {
    setShowForm(false);
    setEditingBusiness(null);
  };

  return (
    <div>
      <div className="flex justify-between items-center mb-6">
        <h2 className="text-2xl font-bold">Manage Businesses</h2>
        <button
          onClick={() => { setEditingBusiness(null); setShowForm(!showForm); }}
          className="bg-blue-600 text-white px-4 py-2 rounded-lg hover:bg-blue-700"
        >
          + New Business
        </button>
      </div>

      {showForm && <BusinessForm business={editingBusiness} onSuccess={() => { handleCloseForm(); loadBusinesses(); }} />}

      {loading ? (
        <div className="text-center py-8">Loading...</div>
      ) : (
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
          {businesses.map(business => (
            <div key={business.id} className="bg-white rounded-lg shadow p-6 border border-gray-200">
              <h3 className="text-xl font-bold mb-2">{business.name}</h3>
              <p className="text-sm text-gray-600 mb-2">{business.email}</p>
              <p className="text-sm text-gray-500 mb-4">{business.address}</p>
              <div className="flex justify-between">
                <span className={`px-3 py-1 rounded text-sm font-medium ${
                  business.status === 'Active' ? 'bg-green-100 text-green-800' : 'bg-gray-100 text-gray-800'
                }`}>
                  {business.status}
                </span>
                <button onClick={() => handleEditBusiness(business)} className="text-blue-600 hover:underline">Edit</button>
              </div>
            </div>
          ))}
        </div>
      )}
    </div>
  );
};

/**
 * Business Form Component
 */
const BusinessForm: React.FC<{ business?: any; onSuccess: () => void }> = ({ business, onSuccess }) => {
  const [formData, setFormData] = useState(business || {
    name: '',
    phone: '',
    email: '',
    address: '',
    website: ''
  });
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState('');

  const handleChange = (e: React.ChangeEvent<HTMLInputElement | HTMLTextAreaElement>) => {
    setFormData({
      ...formData,
      [e.target.name]: e.target.value
    });
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    try {
      setLoading(true);
      setError('');
      const method = business ? 'PUT' : 'POST';
      const url = business ? `/api/super-admin/businesses/${business.id}` : '/api/super-admin/businesses';
      const response = await fetch(url, {
        method,
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(formData)
      });
      if (!response.ok) throw new Error(`Failed to ${business ? 'update' : 'create'} business`);
      onSuccess();
    } catch (err) {
      setError(err instanceof Error ? err.message : `Failed to ${business ? 'update' : 'create'} business`);
    } finally {
      setLoading(false);
    }
  };

  return (
    <form onSubmit={handleSubmit} className="bg-white p-6 rounded-lg border border-gray-200 mb-6">
      <h3 className="text-lg font-bold mb-4">{business ? 'Edit Business' : 'New Business'}</h3>
      {error && <div className="text-red-600 text-sm mb-4">{error}</div>}
      
      <div className="grid grid-cols-1 md:grid-cols-2 gap-4 mb-4">
        <input
          type="text"
          name="name"
          placeholder="Business Name"
          value={formData.name}
          onChange={handleChange}
          required
          className="w-full px-4 py-2 border border-gray-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-blue-500"
        />
        <input
          type="email"
          name="email"
          placeholder="Business Email"
          value={formData.email}
          onChange={handleChange}
          className="w-full px-4 py-2 border border-gray-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-blue-500"
        />
        <input
          type="tel"
          name="phone"
          placeholder="Phone"
          value={formData.phone}
          onChange={handleChange}
          className="w-full px-4 py-2 border border-gray-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-blue-500"
        />
        <input
          type="url"
          name="website"
          placeholder="Website"
          value={formData.website}
          onChange={handleChange}
          className="w-full px-4 py-2 border border-gray-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-blue-500"
        />
      </div>
      
      <textarea
        name="address"
        placeholder="Address"
        value={formData.address}
        onChange={handleChange}
        rows={3}
        className="w-full px-4 py-2 border border-gray-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-blue-500 mb-4"
      />

      <div className="flex gap-2">
        <button
          type="submit"
          disabled={loading}
          className="bg-blue-600 text-white px-6 py-2 rounded-lg hover:bg-blue-700 disabled:opacity-50"
        >
          {loading ? (business ? 'Updating...' : 'Creating...') : (business ? 'Update Business' : 'Create Business')}
        </button>
      </div>
    </form>
  );
};

/**
 * User Management Tab
 */
const UserManagementTab: React.FC = () => {
  const navigate = useNavigate();
  const [users, setUsers] = useState<any[]>([]);
  const [pendingApprovals, setPendingApprovals] = useState<any[]>([]);
  const [loading, setLoading] = useState(false);
  const [activeTab, setActiveTab] = useState('all-users');

  useEffect(() => {
    loadData();
  }, []);

  const loadData = async () => {
    try {
      setLoading(true);
      const [usersRes, approvalsRes] = await Promise.all([
        fetch('/api/super-admin/users'),
        fetch('/api/super-admin/pending-approvals')
      ]);
      if (usersRes.ok) {
        const data = await usersRes.json();
        setUsers(data.users || []);
      }
      if (approvalsRes.ok) {
        const data = await approvalsRes.json();
        setPendingApprovals(data.pendingApprovals || []);
      }
    } catch (err) {
      console.error('Load data error:', err);
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="bg-white rounded-lg shadow p-6">
      <h2 className="text-2xl font-bold mb-4">User Management</h2>
      <p className="text-gray-600 mb-6">Manage users, approve accounts, and assign roles</p>
      
      <div className="flex gap-4 mb-6 border-b border-gray-200">
        <button
          onClick={() => setActiveTab('all-users')}
          className={`py-2 px-4 font-medium border-b-2 ${
            activeTab === 'all-users'
              ? 'border-blue-600 text-blue-600'
              : 'border-transparent text-gray-600 hover:text-gray-800'
          }`}
        >
          View All Users ({users.length})
        </button>
        <button
          onClick={() => setActiveTab('pending')}
          className={`py-2 px-4 font-medium border-b-2 ${
            activeTab === 'pending'
              ? 'border-green-600 text-green-600'
              : 'border-transparent text-gray-600 hover:text-gray-800'
          }`}
        >
          Pending Approvals ({pendingApprovals.length})
        </button>
      </div>

      {loading ? (
        <div className="text-center py-8">Loading...</div>
      ) : activeTab === 'all-users' ? (
        <div className="overflow-x-auto">
          {users.length === 0 ? (
            <p className="text-gray-500 text-center py-8">No users found</p>
          ) : (
            <table className="w-full text-sm">
              <thead className="bg-gray-50 border-b border-gray-200">
                <tr>
                  <th className="px-4 py-3 text-left font-semibold">Name</th>
                  <th className="px-4 py-3 text-left font-semibold">Email</th>
                  <th className="px-4 py-3 text-left font-semibold">Business</th>
                  <th className="px-4 py-3 text-left font-semibold">Role</th>
                  <th className="px-4 py-3 text-left font-semibold">Status</th>
                </tr>
              </thead>
              <tbody>
                {users.map((user: any) => (
                  <tr key={user.id} className="border-b border-gray-200 hover:bg-gray-50">
                    <td className="px-4 py-3">{user.full_name || 'N/A'}</td>
                    <td className="px-4 py-3">{user.email}</td>
                    <td className="px-4 py-3">{user.business_name || 'N/A'}</td>
                    <td className="px-4 py-3">{user.role || 'User'}</td>
                    <td className="px-4 py-3">
                      <span className={`px-2 py-1 rounded text-xs font-medium ${
                        user.status === 'Active' ? 'bg-green-100 text-green-800' : 'bg-gray-100 text-gray-800'
                      }`}>
                        {user.status || 'Active'}
                      </span>
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          )}
        </div>
      ) : (
        <div className="space-y-4">
          {pendingApprovals.length === 0 ? (
            <p className="text-gray-500 text-center py-8">No pending approvals</p>
          ) : (
            pendingApprovals.map((approval: any) => (
              <div key={approval.id} className="bg-yellow-50 border border-yellow-200 rounded-lg p-4">
                <div className="flex justify-between items-start">
                  <div>
                    <h3 className="font-semibold">{approval.user_name}</h3>
                    <p className="text-sm text-gray-600">{approval.user_email}</p>
                    <p className="text-sm text-gray-500 mt-1">Business: {approval.business_name || 'N/A'}</p>
                  </div>
                  <button className="bg-green-600 text-white px-4 py-2 rounded-lg hover:bg-green-700 text-sm">
                    Approve
                  </button>
                </div>
              </div>
            ))
          )}
        </div>
      )}
    </div>
  );
};

/**
 * Landing Page Configuration Tab
 */
const LandingPageConfigTab: React.FC = () => {
  const navigate = useNavigate();
  const [configs, setConfigs] = useState<any[]>([]);
  const [loading, setLoading] = useState(true);
  const [previewConfig, setPreviewConfig] = useState<any>(null);

  useEffect(() => {
    loadConfigs();
  }, []);

  const loadConfigs = async () => {
    try {
      setLoading(true);
      const response = await fetch('/api/super-admin/landing-page-configs');
      if (response.ok) {
        const data = await response.json();
        setConfigs(data.configs || []);
      }
    } catch (err) {
      console.error('Load configs error:', err);
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="bg-white rounded-lg shadow p-6">
      <h2 className="text-2xl font-bold mb-4">Landing Page Configuration</h2>
      <p className="text-gray-600 mb-6">Customize the public landing page for each business</p>
      
      {loading ? (
        <div className="text-center py-8">Loading...</div>
      ) : (
        <div>
          <div className="mb-6">
            <button onClick={() => navigate('/super-admin-landing-page-config')} className="bg-blue-600 text-white px-6 py-2 rounded-lg hover:bg-blue-700">
              Configure Landing Page
            </button>
          </div>

          <div className="mt-8">
            <h3 className="text-lg font-bold mb-4">Landing Page Previews</h3>
            {configs.length === 0 ? (
              <p className="text-gray-500">No landing page configurations yet</p>
            ) : (
              <div className="space-y-4">
                {configs.map((config: any) => (
                  <div key={config.id} className="bg-gray-50 rounded-lg p-4 border border-gray-200">
                    <div className="flex justify-between items-start">
                      <div>
                        <h4 className="font-semibold">{config.business_name}</h4>
                        <p className="text-sm text-gray-600 mt-1">{config.headline || 'No headline'}</p>
                      </div>
                      <button
                        onClick={() => setPreviewConfig(config)}
                        className="bg-gray-600 text-white px-4 py-2 rounded-lg hover:bg-gray-700 text-sm"
                      >
                        Preview
                      </button>
                    </div>
                  </div>
                ))}
              </div>
            )}
          </div>
        </div>
      )}

      {previewConfig && (
        <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center p-4 z-50">
          <div className="bg-white rounded-lg shadow-xl max-w-4xl w-full max-h-96 overflow-y-auto">
            <div className="sticky top-0 bg-gray-100 border-b border-gray-300 p-4 flex justify-between items-center">
              <h3 className="text-lg font-bold">{previewConfig.business_name} - Preview</h3>
              <button
                onClick={() => setPreviewConfig(null)}
                className="text-gray-600 hover:text-gray-900 text-2xl font-bold"
              >
                ×
              </button>
            </div>
            <div className="p-6">
              <h2 className="text-2xl font-bold mb-2">{previewConfig.headline}</h2>
              <p className="text-gray-600 mb-4">{previewConfig.subheadline}</p>
              <div className="bg-gray-100 rounded p-4 text-sm text-gray-600">
                {previewConfig.content || 'No content'}
              </div>
            </div>
          </div>
        </div>
      )}
    </div>
  );
};

/**
 * Feedback Tab
 */
const FeedbackTab: React.FC = () => {
  const [feedback, setFeedback] = useState<any[]>([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    loadFeedback();
  }, []);

  const loadFeedback = async () => {
    try {
      setLoading(true);
      const response = await fetch('/api/super-admin/feedback');
      if (!response.ok) throw new Error('Failed to load feedback');
      const data = await response.json();
      setFeedback(data.messages);
    } catch (err) {
      console.error('Load feedback error:', err);
    } finally {
      setLoading(false);
    }
  };

  return (
    <div>
      <h2 className="text-2xl font-bold mb-6">Feedback & Contact Messages</h2>
      
      {loading ? (
        <div className="text-center py-8">Loading...</div>
      ) : feedback.length === 0 ? (
        <div className="bg-white rounded-lg shadow p-12 text-center text-gray-500">
          No feedback messages yet
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
                <span className={`px-3 py-1 rounded text-sm font-medium ${
                  msg.status === 'New' ? 'bg-red-100 text-red-800' : 'bg-green-100 text-green-800'
                }`}>
                  {msg.status}
                </span>
              </div>
              <p className="text-gray-700 mb-3">{msg.message}</p>
              <button className="text-blue-600 hover:underline text-sm">View Details</button>
            </div>
          ))}
        </div>
      )}
    </div>
  );
};

export default SuperAdminConsole;
