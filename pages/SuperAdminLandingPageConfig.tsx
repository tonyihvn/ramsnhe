import React, { useState, useEffect } from 'react';
import { useMockData } from '../hooks/useMockData';
import { useNavigate } from 'react-router-dom';
import SuperAdminNav from '../components/SuperAdminNav';

const SuperAdminLandingPageConfig: React.FC = () => {
  const { currentUser } = useMockData();
  const navigate = useNavigate();
  const [businesses, setBusinesses] = useState<any[]>([]);
  const [selectedBusiness, setSelectedBusiness] = useState<string>('');
  const [config, setConfig] = useState<any>(null);
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);
  const [error, setError] = useState('');
  const [success, setSuccess] = useState('');

  useEffect(() => {
    const isSuperAdminOrAdmin = currentUser && (String(currentUser.role || '').toLowerCase() === 'super-admin' || String(currentUser.role || '').toLowerCase() === 'super_admin' || String(currentUser.role || '').toLowerCase() === 'admin');
    if (!isSuperAdminOrAdmin) {
      navigate('/login');
      return;
    }

    loadBusinesses();
  }, [currentUser, navigate]);

  const loadBusinesses = async () => {
    try {
      const response = await fetch('/api/super-admin/businesses');
      if (!response.ok) throw new Error('Failed to load businesses');
      const data = await response.json();
      setBusinesses(data.businesses);
      if (data.businesses.length > 0) {
        setSelectedBusiness(data.businesses[0].id);
      }
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Failed to load businesses');
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    if (selectedBusiness) {
      loadConfig();
    }
  }, [selectedBusiness]);

  const loadConfig = async () => {
    try {
      setLoading(true);
      const response = await fetch(`/api/landing-page-config/${selectedBusiness}`);
      if (!response.ok) throw new Error('Failed to load configuration');
      const data = await response.json();
      setConfig(data.config);
      setError('');
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Failed to load configuration');
      // Set default config
      setConfig({
        businessId: selectedBusiness,
        heroTitle: 'Welcome to OneApp',
        heroSubtitle: 'Transform your data into insights',
        heroVisible: true,
        featuresTitle: 'Our Features',
        featuresData: [],
        featuresVisible: true,
        carouselTitle: 'What Our Users Say',
        carouselItems: [],
        carouselVisible: true,
        ctaTitle: 'Ready to get started?',
        ctaVisible: true,
        primaryColor: '#2563eb',
        secondaryColor: '#1e40af'
      });
    } finally {
      setLoading(false);
    }
  };

  const handleChange = (field: string, value: any) => {
    setConfig({
      ...config,
      [field]: value
    });
  };

  const handleSave = async () => {
    try {
      setSaving(true);
      setError('');
      setSuccess('');

      const response = await fetch(`/api/super-admin/landing-page-config/${selectedBusiness}`, {
        method: 'PUT',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(config)
      });

      if (!response.ok) throw new Error('Failed to save configuration');
      setSuccess('Configuration saved successfully!');
      setTimeout(() => setSuccess(''), 3000);
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Failed to save configuration');
    } finally {
      setSaving(false);
    }
  };

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
        title="Landing Page Configuration" 
        subtitle="Customize the public landing page for each business"
      />

      {/* Main Content */}
      <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-8">
        {/* Business Selector */}
        <div className="bg-white rounded-lg shadow p-6 mb-6">
          <label className="block text-sm font-medium text-gray-700 mb-3">Select Business</label>
          <select
            value={selectedBusiness}
            onChange={(e) => setSelectedBusiness(e.target.value)}
            className="w-full px-4 py-2 border border-gray-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-indigo-500"
          >
            <option value="">-- Choose a business --</option>
            {businesses.map(b => (
              <option key={b.id} value={b.id}>
                {b.name}
              </option>
            ))}
          </select>
        </div>

        {/* Alerts */}
        {error && (
          <div className="mb-6 p-4 bg-red-100 border border-red-400 text-red-700 rounded">
            {error}
          </div>
        )}
        {success && (
          <div className="mb-6 p-4 bg-green-100 border border-green-400 text-green-700 rounded">
            {success}
          </div>
        )}

        {loading ? (
          <div className="flex items-center justify-center h-64 bg-white rounded-lg">
            <div className="text-center">
              <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-indigo-500 mx-auto mb-4"></div>
              <p>Loading configuration...</p>
            </div>
          </div>
        ) : config ? (
          <>
            {/* Configuration Form */}
            <div className="space-y-6">
              {/* Hero Section */}
              <ConfigSection title="Hero Section" icon="🎯">
                <div className="space-y-4">
                  <div>
                    <label className="block text-sm font-medium text-gray-700 mb-1">Title</label>
                    <input
                      type="text"
                      value={config.heroTitle || ''}
                      onChange={(e) => handleChange('heroTitle', e.target.value)}
                      className="w-full px-4 py-2 border border-gray-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-indigo-500"
                      placeholder="Welcome to OneApp"
                    />
                  </div>
                  <div>
                    <label className="block text-sm font-medium text-gray-700 mb-1">Subtitle</label>
                    <input
                      type="text"
                      value={config.heroSubtitle || ''}
                      onChange={(e) => handleChange('heroSubtitle', e.target.value)}
                      className="w-full px-4 py-2 border border-gray-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-indigo-500"
                      placeholder="Transform your data into insights"
                    />
                  </div>
                  <div>
                    <label className="block text-sm font-medium text-gray-700 mb-1">Hero Image URL</label>
                    <input
                      type="url"
                      value={config.heroImageUrl || ''}
                      onChange={(e) => handleChange('heroImageUrl', e.target.value)}
                      className="w-full px-4 py-2 border border-gray-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-indigo-500"
                      placeholder="https://example.com/hero.jpg"
                    />
                  </div>
                  <div className="grid grid-cols-2 gap-4">
                    <div>
                      <label className="block text-sm font-medium text-gray-700 mb-1">Button Text</label>
                      <input
                        type="text"
                        value={config.heroButtonText || ''}
                        onChange={(e) => handleChange('heroButtonText', e.target.value)}
                        className="w-full px-4 py-2 border border-gray-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-indigo-500"
                        placeholder="Get Started"
                      />
                    </div>
                    <div>
                      <label className="block text-sm font-medium text-gray-700 mb-1">Button Link</label>
                      <input
                        type="url"
                        value={config.heroButtonLink || ''}
                        onChange={(e) => handleChange('heroButtonLink', e.target.value)}
                        className="w-full px-4 py-2 border border-gray-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-indigo-500"
                        placeholder="/signup"
                      />
                    </div>
                  </div>
                  <label className="flex items-center">
                    <input
                      type="checkbox"
                      checked={config.heroVisible}
                      onChange={(e) => handleChange('heroVisible', e.target.checked)}
                      className="mr-2"
                    />
                    <span className="text-sm font-medium text-gray-700">Visible</span>
                  </label>
                </div>
              </ConfigSection>

              {/* Features Section */}
              <ConfigSection title="Features Section" icon="✨">
                <div className="space-y-4">
                  <div>
                    <label className="block text-sm font-medium text-gray-700 mb-1">Title</label>
                    <input
                      type="text"
                      value={config.featuresTitle || ''}
                      onChange={(e) => handleChange('featuresTitle', e.target.value)}
                      className="w-full px-4 py-2 border border-gray-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-indigo-500"
                      placeholder="Our Features"
                    />
                  </div>
                  <div>
                    <label className="block text-sm font-medium text-gray-700 mb-1">Subtitle</label>
                    <input
                      type="text"
                      value={config.featuresSubtitle || ''}
                      onChange={(e) => handleChange('featuresSubtitle', e.target.value)}
                      className="w-full px-4 py-2 border border-gray-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-indigo-500"
                      placeholder="Explore what we offer"
                    />
                  </div>
                  <label className="flex items-center">
                    <input
                      type="checkbox"
                      checked={config.featuresVisible}
                      onChange={(e) => handleChange('featuresVisible', e.target.checked)}
                      className="mr-2"
                    />
                    <span className="text-sm font-medium text-gray-700">Visible</span>
                  </label>
                </div>
              </ConfigSection>

              {/* Carousel Section */}
              <ConfigSection title="Carousel/Testimonials" icon="🎠">
                <div className="space-y-4">
                  <div>
                    <label className="block text-sm font-medium text-gray-700 mb-1">Title</label>
                    <input
                      type="text"
                      value={config.carouselTitle || ''}
                      onChange={(e) => handleChange('carouselTitle', e.target.value)}
                      className="w-full px-4 py-2 border border-gray-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-indigo-500"
                      placeholder="What Our Users Say"
                    />
                  </div>
                  <label className="flex items-center">
                    <input
                      type="checkbox"
                      checked={config.carouselVisible}
                      onChange={(e) => handleChange('carouselVisible', e.target.checked)}
                      className="mr-2"
                    />
                    <span className="text-sm font-medium text-gray-700">Visible</span>
                  </label>
                </div>
              </ConfigSection>

              {/* CTA Section */}
              <ConfigSection title="Call to Action" icon="📢">
                <div className="space-y-4">
                  <div>
                    <label className="block text-sm font-medium text-gray-700 mb-1">Title</label>
                    <input
                      type="text"
                      value={config.ctaTitle || ''}
                      onChange={(e) => handleChange('ctaTitle', e.target.value)}
                      className="w-full px-4 py-2 border border-gray-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-indigo-500"
                      placeholder="Ready to get started?"
                    />
                  </div>
                  <div>
                    <label className="block text-sm font-medium text-gray-700 mb-1">Subtitle</label>
                    <input
                      type="text"
                      value={config.ctaSubtitle || ''}
                      onChange={(e) => handleChange('ctaSubtitle', e.target.value)}
                      className="w-full px-4 py-2 border border-gray-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-indigo-500"
                      placeholder="Join thousands of organizations"
                    />
                  </div>
                  <div className="grid grid-cols-2 gap-4">
                    <div>
                      <label className="block text-sm font-medium text-gray-700 mb-1">Button Text</label>
                      <input
                        type="text"
                        value={config.ctaButtonText || ''}
                        onChange={(e) => handleChange('ctaButtonText', e.target.value)}
                        className="w-full px-4 py-2 border border-gray-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-indigo-500"
                        placeholder="Start Free Trial"
                      />
                    </div>
                    <div>
                      <label className="block text-sm font-medium text-gray-700 mb-1">Button Link</label>
                      <input
                        type="url"
                        value={config.ctaButtonLink || ''}
                        onChange={(e) => handleChange('ctaButtonLink', e.target.value)}
                        className="w-full px-4 py-2 border border-gray-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-indigo-500"
                        placeholder="/signup"
                      />
                    </div>
                  </div>
                  <label className="flex items-center">
                    <input
                      type="checkbox"
                      checked={config.ctaVisible}
                      onChange={(e) => handleChange('ctaVisible', e.target.checked)}
                      className="mr-2"
                    />
                    <span className="text-sm font-medium text-gray-700">Visible</span>
                  </label>
                </div>
              </ConfigSection>

              {/* Demo & Links */}
              <ConfigSection title="Demo & Links" icon="🔗">
                <div className="space-y-4">
                  <div>
                    <label className="block text-sm font-medium text-gray-700 mb-1">Demo Link</label>
                    <input
                      type="url"
                      value={config.demoLink || ''}
                      onChange={(e) => handleChange('demoLink', e.target.value)}
                      className="w-full px-4 py-2 border border-gray-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-indigo-500"
                      placeholder="/api/auth/demo-login"
                    />
                  </div>
                  <div>
                    <label className="block text-sm font-medium text-gray-700 mb-1">Demo Label</label>
                    <input
                      type="text"
                      value={config.demoLabel || ''}
                      onChange={(e) => handleChange('demoLabel', e.target.value)}
                      className="w-full px-4 py-2 border border-gray-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-indigo-500"
                      placeholder="Try Demo"
                    />
                  </div>
                </div>
              </ConfigSection>

              {/* Colors */}
              <ConfigSection title="Colors" icon="🎨">
                <div className="grid grid-cols-2 gap-4">
                  <div>
                    <label className="block text-sm font-medium text-gray-700 mb-1">Primary Color</label>
                    <div className="flex gap-2">
                      <input
                        type="color"
                        value={config.primaryColor || '#2563eb'}
                        onChange={(e) => handleChange('primaryColor', e.target.value)}
                        className="w-16 h-10 rounded border border-gray-300"
                      />
                      <input
                        type="text"
                        value={config.primaryColor || '#2563eb'}
                        onChange={(e) => handleChange('primaryColor', e.target.value)}
                        className="flex-1 px-4 py-2 border border-gray-300 rounded-lg"
                        placeholder="#2563eb"
                      />
                    </div>
                  </div>
                  <div>
                    <label className="block text-sm font-medium text-gray-700 mb-1">Secondary Color</label>
                    <div className="flex gap-2">
                      <input
                        type="color"
                        value={config.secondaryColor || '#1e40af'}
                        onChange={(e) => handleChange('secondaryColor', e.target.value)}
                        className="w-16 h-10 rounded border border-gray-300"
                      />
                      <input
                        type="text"
                        value={config.secondaryColor || '#1e40af'}
                        onChange={(e) => handleChange('secondaryColor', e.target.value)}
                        className="flex-1 px-4 py-2 border border-gray-300 rounded-lg"
                        placeholder="#1e40af"
                      />
                    </div>
                  </div>
                </div>
              </ConfigSection>

              {/* Logo & Branding */}
              <ConfigSection title="Branding" icon="📱">
                <div className="space-y-4">
                  <div>
                    <label className="block text-sm font-medium text-gray-700 mb-1">Logo URL</label>
                    <input
                      type="url"
                      value={config.logoUrl || ''}
                      onChange={(e) => handleChange('logoUrl', e.target.value)}
                      className="w-full px-4 py-2 border border-gray-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-indigo-500"
                      placeholder="https://example.com/logo.png"
                    />
                  </div>
                  <div>
                    <label className="block text-sm font-medium text-gray-700 mb-1">Favicon URL</label>
                    <input
                      type="url"
                      value={config.faviconUrl || ''}
                      onChange={(e) => handleChange('faviconUrl', e.target.value)}
                      className="w-full px-4 py-2 border border-gray-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-indigo-500"
                      placeholder="https://example.com/favicon.ico"
                    />
                  </div>
                </div>
              </ConfigSection>
            </div>

            {/* Save Button */}
            <div className="mt-8 flex gap-2 sticky bottom-0 bg-white p-4 shadow-lg rounded-lg">
              <button
                onClick={handleSave}
                disabled={saving}
                className="bg-indigo-600 text-white px-6 py-3 rounded-lg hover:bg-indigo-700 disabled:opacity-50 font-medium"
              >
                {saving ? 'Saving...' : 'Save Configuration'}
              </button>
              <button
                onClick={() => loadConfig()}
                disabled={saving}
                className="bg-gray-300 text-gray-700 px-6 py-3 rounded-lg hover:bg-gray-400 disabled:opacity-50 font-medium"
              >
                Reset
              </button>
            </div>
          </>
        ) : null}
      </div>
    </div>
  );
};

/**
 * Config Section Component
 */
const ConfigSection: React.FC<{ title: string; icon: string; children: React.ReactNode }> = ({ title, icon, children }) => {
  return (
    <div className="bg-white rounded-lg shadow p-6 border-l-4 border-indigo-500">
      <h2 className="text-xl font-bold mb-4 flex items-center gap-2">
        <span className="text-2xl">{icon}</span>
        {title}
      </h2>
      {children}
    </div>
  );
};

export default SuperAdminLandingPageConfig;
