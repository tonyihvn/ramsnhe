import React, { useState, useEffect } from 'react';
import { useMockData } from '../hooks/useMockData';
import { useNavigate } from 'react-router-dom';
import SuperAdminNav from '../components/SuperAdminNav';

const SuperAdminUserManagement: React.FC = () => {
  const { currentUser } = useMockData();
  const navigate = useNavigate();
  const [users, setUsers] = useState<any[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState('');
  const [selectedUser, setSelectedUser] = useState<any>(null);
  const [showForm, setShowForm] = useState(false);
  const [activeTab, setActiveTab] = useState('all'); // all, pending, active, inactive

  useEffect(() => {
    const isSuperAdminOrAdmin = currentUser && (String(currentUser.role || '').toLowerCase() === 'super-admin' || String(currentUser.role || '').toLowerCase() === 'super_admin' || String(currentUser.role || '').toLowerCase() === 'admin');
    if (!isSuperAdminOrAdmin) {
      navigate('/login');
      return;
    }

    loadUsers();
  }, [currentUser, navigate, activeTab]);

  const loadUsers = async () => {
    try {
      setLoading(true);
      const response = await fetch('/api/super-admin/users', {
        credentials: 'include'
      });
      if (!response.ok) throw new Error('Failed to load users');
      const data = await response.json();
      setUsers(data.users);
      setError('');
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Failed to load users');
      console.error('Load users error:', err);
    } finally {
      setLoading(false);
    }
  };

  const handleActivateUser = async (userId: number) => {
    try {
      const response = await fetch(`/api/super-admin/users/${userId}/activate`, {
        method: 'PUT',
        headers: { 'Content-Type': 'application/json' },
        credentials: 'include'
      });
      if (!response.ok) throw new Error('Failed to activate user');
      loadUsers();
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Failed to activate user');
    }
  };

  const handleDeactivateUser = async (userId: number) => {
    try {
      const response = await fetch(`/api/super-admin/users/${userId}/deactivate`, {
        method: 'PUT',
        headers: { 'Content-Type': 'application/json' },
        credentials: 'include'
      });
      if (!response.ok) throw new Error('Failed to deactivate user');
      loadUsers();
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Failed to deactivate user');
    }
  };

  const filteredUsers = users.filter(u => {
    if (activeTab === 'pending') return u.status === 'Pending';
    if (activeTab === 'active') return u.status === 'Active';
    if (activeTab === 'inactive') return u.status === 'Inactive';
    if (activeTab === 'demo') return u.is_demo_account;
    return true;
  });

  const isSuperAdminOrAdmin = currentUser && (String(currentUser.role || '').toLowerCase() === 'super-admin' || String(currentUser.role || '').toLowerCase() === 'super_admin' || String(currentUser.role || '').toLowerCase() === 'admin');
  if (!isSuperAdminOrAdmin) {
    return (
      <div className="flex items-center justify-center h-screen bg-red-50">
        <div className="text-center">
          <h1 className="text-3xl font-bold text-red-600 mb-4">Access Denied</h1>
          <p>This page is only accessible to administrators.</p>
        </div>
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-gray-50">
      <SuperAdminNav
        title="User Account Management"
        subtitle="Manage, approve, activate, and deactivate user accounts"
      />

      {/* Main Content */}
      <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-8">
        {error && (
          <div className="mb-6 p-4 bg-red-100 border border-red-400 text-red-700 rounded">
            {error}
          </div>
        )}

        {/* Toolbar */}
        <div className="bg-white rounded-lg shadow-sm p-4 mb-6 flex justify-between items-center">
          <h2 className="text-2xl font-bold">Accounts</h2>
          <button
            onClick={() => setShowForm(!showForm)}
            className="bg-purple-600 text-white px-4 py-2 rounded-lg hover:bg-purple-700"
          >
            + Add New User
          </button>
        </div>

        {/* New User Form */}
        {showForm && (
          <CreateUserForm
            onSuccess={() => {
              setShowForm(false);
              loadUsers();
            }}
            onCancel={() => setShowForm(false)}
          />
        )}

        {/* Tabs */}
        <div className="bg-white rounded-lg shadow-sm border-b mb-6">
          <div className="flex space-x-4 p-4">
            {[
              { id: 'all', label: 'All Users', count: users.length },
              { id: 'active', label: 'Active', count: users.filter(u => u.status === 'Active').length },
              { id: 'pending', label: 'Pending', count: users.filter(u => u.status === 'Pending').length },
              { id: 'inactive', label: 'Inactive', count: users.filter(u => u.status === 'Inactive').length },
            ].map(tab => (
              <button
                key={tab.id}
                onClick={() => setActiveTab(tab.id)}
                className={`px-4 py-2 rounded font-medium ${activeTab === tab.id
                    ? 'bg-purple-100 text-purple-700'
                    : 'text-gray-600 hover:bg-gray-100'
                  }`}
              >
                {tab.label} <span className="ml-2 font-bold">({tab.count})</span>
              </button>
            ))}
          </div>
        </div>

        {/* Users Table */}
        {loading ? (
          <div className="flex items-center justify-center h-64 bg-white rounded-lg">
            <div className="text-center">
              <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-purple-500 mx-auto mb-4"></div>
              <p>Loading users...</p>
            </div>
          </div>
        ) : filteredUsers.length === 0 ? (
          <div className="bg-white rounded-lg shadow p-12 text-center text-gray-500">
            No users found
          </div>
        ) : (
          <div className="bg-white rounded-lg shadow overflow-hidden">
            <div className="overflow-x-auto">
              <table className="w-full">
                <thead className="bg-gray-50 border-b">
                  <tr>
                    <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                      Name
                    </th>
                    <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                      Email
                    </th>
                    <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                      Role
                    </th>
                    <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                      Status
                    </th>
                    <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                      Created
                    </th>
                    <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                      Last Login
                    </th>
                    <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                      Actions
                    </th>
                  </tr>
                </thead>
                <tbody className="divide-y">
                  {filteredUsers.map(user => (
                    <tr key={user.id} className="hover:bg-gray-50">
                      <td className="px-6 py-4 whitespace-nowrap">
                        <div className="flex items-center">
                          <div className="w-10 h-10 rounded-full bg-gradient-to-br from-purple-400 to-blue-500 flex items-center justify-center text-white font-bold">
                            {user.first_name?.charAt(0) || 'U'}
                          </div>
                          <div className="ml-3">
                            <p className="font-medium">
                              {user.first_name} {user.last_name}
                            </p>
                            {user.is_demo_account && (
                              <span className="text-xs bg-blue-100 text-blue-700 px-2 py-1 rounded">Demo</span>
                            )}
                          </div>
                        </div>
                      </td>
                      <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-600">
                        {user.email}
                      </td>
                      <td className="px-6 py-4 whitespace-nowrap">
                        <span className="px-3 py-1 rounded-full text-xs font-medium bg-blue-100 text-blue-800">
                          {user.role}
                        </span>
                      </td>
                      <td className="px-6 py-4 whitespace-nowrap">
                        <span
                          className={`px-3 py-1 rounded-full text-xs font-medium ${user.status === 'Active'
                              ? 'bg-green-100 text-green-800'
                              : user.status === 'Pending'
                                ? 'bg-yellow-100 text-yellow-800'
                                : 'bg-gray-100 text-gray-800'
                            }`}
                        >
                          {user.status}
                        </span>
                      </td>
                      <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-600">
                        {new Date(user.created_at).toLocaleDateString()}
                      </td>
                      <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-600">
                        {user.last_login_at
                          ? new Date(user.last_login_at).toLocaleDateString()
                          : 'Never'}
                      </td>
                      <td className="px-6 py-4 whitespace-nowrap text-sm space-x-2">
                        {user.status !== 'Active' && (
                          <button
                            onClick={() => handleActivateUser(user.id)}
                            className="text-green-600 hover:underline font-medium"
                          >
                            Activate
                          </button>
                        )}
                        {user.status === 'Active' && (
                          <button
                            onClick={() => handleDeactivateUser(user.id)}
                            className="text-red-600 hover:underline font-medium"
                          >
                            Deactivate
                          </button>
                        )}
                        <button
                          onClick={() => setSelectedUser(user)}
                          className="text-purple-600 hover:underline font-medium"
                        >
                          View
                        </button>
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          </div>
        )}
      </div>

      {/* User Details Modal */}
      {selectedUser && (
        <UserDetailsModal
          user={selectedUser}
          onClose={() => setSelectedUser(null)}
          onUpdate={loadUsers}
        />
      )}
    </div>
  );
};

/**
 * Create User Form Component
 */
const CreateUserForm: React.FC<{ onSuccess: () => void; onCancel: () => void }> = ({ onSuccess, onCancel }) => {
  const [formData, setFormData] = useState({
    firstName: '',
    lastName: '',
    email: '',
    role: 'user',
    businessId: ''
  });
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState('');

  const handleChange = (e: React.ChangeEvent<HTMLInputElement | HTMLSelectElement>) => {
    const { name, value, type } = e.target as any;
    setFormData({
      ...formData,
      [name]: type === 'checkbox' ? (e.target as HTMLInputElement).checked : value
    });
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    try {
      setLoading(true);
      setError('');
      const response = await fetch('/api/super-admin/users', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        credentials: 'include',
        body: JSON.stringify(formData)
      });
      if (!response.ok) throw new Error('Failed to create user');
      onSuccess();
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Failed to create user');
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="bg-white rounded-lg shadow p-6 mb-6 border border-gray-200">
      <h3 className="text-lg font-bold mb-4">Create New User</h3>
      {error && <div className="text-red-600 text-sm mb-4">{error}</div>}

      <form onSubmit={handleSubmit}>
        <div className="grid grid-cols-1 md:grid-cols-2 gap-4 mb-4">
          <input
            type="text"
            name="firstName"
            placeholder="First Name"
            value={formData.firstName}
            onChange={handleChange}
            required
            className="px-4 py-2 border border-gray-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-purple-500"
          />
          <input
            type="text"
            name="lastName"
            placeholder="Last Name"
            value={formData.lastName}
            onChange={handleChange}
            required
            className="px-4 py-2 border border-gray-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-purple-500"
          />
          <input
            type="email"
            name="email"
            placeholder="Email"
            value={formData.email}
            onChange={handleChange}
            required
            className="px-4 py-2 border border-gray-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-purple-500"
          />
          <select
            name="role"
            value={formData.role}
            onChange={handleChange}
            className="px-4 py-2 border border-gray-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-purple-500"
          >
            <option value="User">User</option>
            <option value="Admin">Admin</option>
            <option value="Form Builder">Form Builder</option>
            <option value="Data Collector">Data Collector</option>
            <option value="Viewer">Viewer</option>
          </select>
        </div>

        <p className="text-gray-600 text-sm mb-4 bg-blue-50 p-3 rounded border border-blue-200">
          <strong>Note:</strong> A welcome email with login credentials will automatically be sent to the user.
        </p>

        <div className="flex gap-2">
          <button
            type="submit"
            disabled={loading}
            className="bg-purple-600 text-white px-6 py-2 rounded-lg hover:bg-purple-700 disabled:opacity-50"
          >
            {loading ? 'Creating...' : 'Create User'}
          </button>
          <button
            type="button"
            onClick={onCancel}
            className="bg-gray-300 text-gray-700 px-6 py-2 rounded-lg hover:bg-gray-400"
          >
            Cancel
          </button>
        </div>
      </form>
    </div>
  );
};

/**
 * User Details Modal
 */
const UserDetailsModal: React.FC<{ user: any; onClose: () => void; onUpdate: () => void }> = ({ user, onClose, onUpdate }) => {
  const [editRole, setEditRole] = useState(user.role);
  const [loading, setLoading] = useState(false);

  const handleUpdateRole = async () => {
    try {
      setLoading(true);
      const response = await fetch(`/api/super-admin/users/${user.id}/role`, {
        method: 'PUT',
        headers: { 'Content-Type': 'application/json' },
        credentials: 'include',
        body: JSON.stringify({ role: editRole })
      });
      if (!response.ok) throw new Error('Failed to update role');
      onUpdate();
      onClose();
    } catch (err) {
      console.error('Update role error:', err);
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center p-4 z-50">
      <div className="bg-white rounded-lg shadow-lg max-w-md w-full p-6">
        <h3 className="text-lg font-bold mb-4">User Details</h3>

        <div className="space-y-4 mb-6">
          <div>
            <label className="text-sm text-gray-600">Name</label>
            <p className="font-medium">{user.first_name} {user.last_name}</p>
          </div>
          <div>
            <label className="text-sm text-gray-600">Email</label>
            <p className="font-medium">{user.email}</p>
          </div>
          <div>
            <label className="text-sm text-gray-600">Status</label>
            <p className="font-medium">{user.status}</p>
          </div>
          <div>
            <label className="text-sm text-gray-600 block mb-2">Role</label>
            <select
              value={editRole}
              onChange={(e) => setEditRole(e.target.value)}
              className="w-full px-4 py-2 border border-gray-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-purple-500"
            >
              <option value="User">User</option>
              <option value="Admin">Admin</option>
              <option value="Form Builder">Form Builder</option>
              <option value="Data Collector">Data Collector</option>
              <option value="Viewer">Viewer</option>
            </select>
          </div>
        </div>

        <div className="flex gap-2">
          <button
            onClick={handleUpdateRole}
            disabled={loading || editRole === user.role}
            className="flex-1 bg-purple-600 text-white px-4 py-2 rounded-lg hover:bg-purple-700 disabled:opacity-50"
          >
            {loading ? 'Updating...' : 'Update'}
          </button>
          <button
            onClick={onClose}
            className="flex-1 bg-gray-300 text-gray-700 px-4 py-2 rounded-lg hover:bg-gray-400"
          >
            Close
          </button>
        </div>
      </div>
    </div>
  );
};

export default SuperAdminUserManagement;
