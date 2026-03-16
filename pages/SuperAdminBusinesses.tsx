import React, { useState, useEffect } from 'react';
import { useMockData } from '../hooks/useMockData';
import { useNavigate } from 'react-router-dom';
import SuperAdminNav from '../components/SuperAdminNav';

const SuperAdminBusinesses: React.FC = () => {
  const { currentUser } = useMockData();
  const navigate = useNavigate();
  const [businesses, setBusinesses] = useState<any[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState('');
  const [showForm, setShowForm] = useState(false);
  const [editingBusiness, setEditingBusiness] = useState<any>(null);

  useEffect(() => {
    const isSuperAdmin = currentUser && (String(currentUser.role || '').toLowerCase() === 'super-admin' || String(currentUser.role || '').toLowerCase() === 'super_admin');
    if (!isSuperAdmin) {
      navigate('/login');
      return;
    }

    loadBusinesses();
  }, [currentUser, navigate]);

  const loadBusinesses = async () => {
    try {
      setLoading(true);
      const response = await fetch('/api/super-admin/businesses');
      if (!response.ok) throw new Error('Failed to load businesses');
      const data = await response.json();
      setBusinesses(data.businesses);
      setError('');
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Failed to load businesses');
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
        title="Manage Businesses" 
        subtitle="Create, edit, and manage business organizations"
      />

      {/* Main Content */}
      <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-8">
        {error && (
          <div className="mb-4 p-4 bg-red-100 border border-red-400 text-red-700 rounded">
            {error}
          </div>
        )}

        <div className="flex justify-between items-center mb-6">
          <h2 className="text-2xl font-bold">Businesses</h2>
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

      const url = business?.id ? `/api/super-admin/businesses/${business.id}` : '/api/super-admin/businesses';
      const method = business?.id ? 'PUT' : 'POST';

      const response = await fetch(url, {
        method,
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(formData)
      });

      if (!response.ok) throw new Error('Failed to save business');
      onSuccess();
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Failed to save business');
    } finally {
      setLoading(false);
    }
  };

  return (
    <form onSubmit={handleSubmit} className="bg-white rounded-lg shadow p-6 mb-6 border border-gray-200">
      <h3 className="text-lg font-bold mb-4">{business?.id ? 'Edit' : 'Create'} Business</h3>
      
      {error && <div className="mb-4 p-3 bg-red-100 text-red-700 rounded">{error}</div>}

      <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
        <input
          type="text"
          name="name"
          placeholder="Business Name"
          value={formData.name}
          onChange={handleChange}
          required
          className="border border-gray-300 rounded px-3 py-2"
        />
        <input
          type="email"
          name="email"
          placeholder="Email"
          value={formData.email}
          onChange={handleChange}
          className="border border-gray-300 rounded px-3 py-2"
        />
        <input
          type="tel"
          name="phone"
          placeholder="Phone"
          value={formData.phone}
          onChange={handleChange}
          className="border border-gray-300 rounded px-3 py-2"
        />
        <input
          type="url"
          name="website"
          placeholder="Website"
          value={formData.website}
          onChange={handleChange}
          className="border border-gray-300 rounded px-3 py-2"
        />
      </div>

      <textarea
        name="address"
        placeholder="Address"
        value={formData.address}
        onChange={handleChange}
        rows={3}
        className="w-full border border-gray-300 rounded px-3 py-2 mt-4"
      />

      <div className="flex gap-2 mt-4">
        <button
          type="submit"
          disabled={loading}
          className="bg-blue-600 text-white px-4 py-2 rounded-lg hover:bg-blue-700 disabled:opacity-50"
        >
          {loading ? 'Saving...' : 'Save Business'}
        </button>
      </div>
    </form>
  );
};

export default SuperAdminBusinesses;
