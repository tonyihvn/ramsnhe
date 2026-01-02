import React, { useState, useEffect } from 'react';
import { CKEditor } from '@ckeditor/ckeditor5-react';
import ClassicEditor from '@ckeditor/ckeditor5-build-classic';
import { useMockData } from '../hooks/useMockData';
import { useNavigate } from 'react-router-dom';
import SuperAdminNav from '../components/SuperAdminNav';

const SuperAdminLandingPageConfig: React.FC = () => {
  const { currentUser } = useMockData();
  const navigate = useNavigate();
  const [config, setConfig] = useState<any>(null);
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);
  const [error, setError] = useState('');
  const [success, setSuccess] = useState('');
  const [activeTab, setActiveTab] = useState('content');
  const [uploadingFiles, setUploadingFiles] = useState<{[key: string]: boolean}>({});
  const [businesses, setBusinesses] = useState<any[]>([]);

  useEffect(() => {
    const isSuperAdminOrAdmin = currentUser && (String(currentUser.role || '').toLowerCase() === 'super-admin' || String(currentUser.role || '').toLowerCase() === 'super_admin' || String(currentUser.role || '').toLowerCase() === 'admin');
    if (!isSuperAdminOrAdmin) {
      navigate('/login');
      return;
    }

    loadConfig();
  }, [currentUser]);

  const loadConfig = async () => {
    try {
      setLoading(true);
      // Load universal landing page config
      const response = await fetch('/api/landing-page-config');
      if (!response.ok) throw new Error('Failed to load configuration');
      const data = await response.json();
      setConfig(data.config || data || {
        businessId: 'universal',
        heroTitle: 'Welcome to OneApp',
        heroTitleFontSize: '48px',
        heroTitleFontWeight: '700',
        heroSubtitle: 'Transform your data into insights',
        heroSubtitleFontSize: '20px',
        heroSubtitleFontWeight: '400',
        heroVisible: true,
        featuresTitle: 'Our Features',
        featuresTitleFontSize: '36px',
        featuresTitleFontWeight: '700',
        featuresSubtitle: '',
        featuresSubtitleFontSize: '18px',
        featuresSubtitleFontWeight: '400',
        featuresData: [],
        featuresVisible: true,
        carouselTitle: 'What Our Users Say',
        carouselTitleFontSize: '36px',
        carouselTitleFontWeight: '700',
        carouselItems: [],
        carouselVisible: true,
        pricingTitle: 'Simple Pricing',
        pricingTitleFontSize: '36px',
        pricingTitleFontWeight: '700',
        pricingSubtitle: 'Choose the plan that works for you',
        pricingSubtitleFontSize: '18px',
        pricingSubtitleFontWeight: '400',
        pricingCurrency: 'USD',
        pricingItems: [],
        pricingVisible: true,
        ctaTitle: 'Ready to get started?',
        ctaTitleFontSize: '36px',
        ctaTitleFontWeight: '700',
        ctaSubtitle: '',
        ctaSubtitleFontSize: '18px',
        ctaSubtitleFontWeight: '400',
        ctaVisible: true,
        primaryColor: '#2563eb',
        secondaryColor: '#1e40af',
        allowNewRegistrations: true
      });
      // Try to load businesses for locked-organization selection
      try {
        const bresp = await fetch('/api/super-admin/businesses');
        if (bresp.ok) {
          const bj = await bresp.json();
          setBusinesses(bj.businesses || []);
        }
      } catch (e) { /* ignore */ }
      setError('');
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Failed to load configuration');
      // Set default config
      setConfig({
        businessId: 'universal',
        heroTitle: 'Welcome to OneApp',
        heroTitleFontSize: '48px',
        heroTitleFontWeight: '700',
        heroSubtitle: 'Transform your data into insights',
        heroSubtitleFontSize: '20px',
        heroSubtitleFontWeight: '400',
        heroVisible: true,
        featuresTitle: 'Our Features',
        featuresTitleFontSize: '36px',
        featuresTitleFontWeight: '700',
        featuresSubtitle: '',
        featuresSubtitleFontSize: '18px',
        featuresSubtitleFontWeight: '400',
        featuresData: [
          { icon: '📊', title: 'Data Analytics', description: 'Transform your data into actionable insights' },
          { icon: '🔄', title: 'Real-time Sync', description: 'Stay updated with instant synchronization' },
          { icon: '🛡️', title: 'Secure', description: 'Enterprise-grade security for your data' }
        ],
        featuresVisible: true,
        carouselTitle: 'What Our Users Say',
        carouselTitleFontSize: '36px',
        carouselTitleFontWeight: '700',
        carouselItems: [],
        carouselVisible: true,
        pricingTitle: 'Simple Pricing',
        pricingTitleFontSize: '36px',
        pricingTitleFontWeight: '700',
        pricingSubtitle: 'Choose the plan that works for you',
        pricingSubtitleFontSize: '18px',
        pricingSubtitleFontWeight: '400',
        pricingCurrency: 'USD',
        pricingItems: [],
        pricingVisible: true,
        ctaTitle: 'Ready to get started?',
        ctaTitleFontSize: '36px',
        ctaTitleFontWeight: '700',
        ctaSubtitle: '',
        ctaSubtitleFontSize: '18px',
        ctaSubtitleFontWeight: '400',
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

  const handleArrayItemChange = (field: string, index: number, subField: string, value: any) => {
    const arr = [...(config[field] || [])];
    arr[index] = { ...arr[index], [subField]: value };
    setConfig({ ...config, [field]: arr });
  };

  const addArrayItem = (field: string, template: any) => {
    const arr = config[field] || [];
    setConfig({ ...config, [field]: [...arr, template] });
  };

  const removeArrayItem = (field: string, index: number) => {
    const arr = config[field] || [];
    setConfig({ ...config, [field]: arr.filter((_, i) => i !== index) });

  };

  const handleFileUpload = async (field: string, file: File) => {
    if (!file) return;

    setUploadingFiles({...uploadingFiles, [field]: true});

    try {
      const reader = new FileReader();
      reader.onload = async (e) => {
        const base64 = e.target?.result as string;
        const response = await fetch('/api/upload-image', {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({ file: base64, filename: file.name })
        });

        if (!response.ok) throw new Error('Failed to upload image');
        const data = await response.json();
        handleChange(field, data.url);
        setSuccess(`Image uploaded successfully!`);
        setTimeout(() => setSuccess(''), 3000);
      };
      reader.readAsDataURL(file);
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Failed to upload image');
    } finally {
      setUploadingFiles({...uploadingFiles, [field]: false});
    }
  };

  // Upload carousel image and set on specific carousel item
  const uploadCarouselImage = async (index: number, file: File) => {
    if (!file) return;
    setUploadingFiles({...uploadingFiles, [`carousel_${index}`]: true});
    try {
      const reader = new FileReader();
      reader.onload = async (e) => {
        const base64 = e.target?.result as string;
        const response = await fetch('/api/upload-image', {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({ file: base64, filename: file.name })
        });
        if (!response.ok) throw new Error('Failed to upload image');
        const data = await response.json();
        handleArrayItemChange('carouselItems', index, 'imageUrl', data.url);
        setSuccess('Carousel image uploaded');
        setTimeout(() => setSuccess(''), 3000);
      };
      reader.readAsDataURL(file);
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Failed to upload carousel image');
    } finally {
      setUploadingFiles({...uploadingFiles, [`carousel_${index}`]: false});
    }
  };

  // Upload hero featured image
  const uploadHeroFeaturedImage = async (file: File) => {
    if (!file) return;
    setUploadingFiles({...uploadingFiles, heroFeatured: true});
    try {
      const reader = new FileReader();
      reader.onload = async (e) => {
        const base64 = e.target?.result as string;
        const response = await fetch('/api/upload-image', {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({ file: base64, filename: file.name })
        });
        if (!response.ok) throw new Error('Failed to upload image');
        const data = await response.json();
        const arr = config.heroFeaturedImages || [];
        setConfig({...config, heroFeaturedImages: [...arr, data.url]});
        setSuccess('Featured image uploaded');
        setTimeout(() => setSuccess(''), 3000);
      };
      reader.readAsDataURL(file);
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Failed to upload featured image');
    } finally {
      setUploadingFiles({...uploadingFiles, heroFeatured: false});
    }
  };

  const handleSave = async () => {
    try {
      setSaving(true);
      setError('');
      setSuccess('');

      const response = await fetch('/api/landing-page-config', {
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

  return (
    <div className="min-h-screen bg-gray-50">
      <SuperAdminNav 
        title="Landing Page Configuration" 
        subtitle="Customize the public landing page that appears to all users"
      />

      {/* Main Content */}
      <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-8">
        {/* Info Message */}
        <div className="bg-blue-50 border border-blue-200 rounded-lg p-4 mb-6">
          <p className="text-sm text-blue-800">
            <strong>Note:</strong> The landing page is shared across all users. Any changes you make here will be visible to everyone.
          </p>
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
            {/* Tabs */}
            <div className="bg-white rounded-lg shadow mb-6">
              <div className="border-b border-gray-200">
                <nav className="flex space-x-8 px-6 overflow-x-auto" aria-label="Tabs">
                  <button
                    onClick={() => setActiveTab('content')}
                    className={`py-4 px-1 border-b-2 font-medium text-sm whitespace-nowrap ${
                      activeTab === 'content'
                        ? 'border-indigo-500 text-indigo-600'
                        : 'border-transparent text-gray-500 hover:text-gray-700'
                    }`}
                  >
                    📝 Content
                  </button>
                  <button
                    onClick={() => setActiveTab('features')}
                    className={`py-4 px-1 border-b-2 font-medium text-sm whitespace-nowrap ${
                      activeTab === 'features'
                        ? 'border-indigo-500 text-indigo-600'
                        : 'border-transparent text-gray-500 hover:text-gray-700'
                    }`}
                  >
                    ✨ Features
                  </button>
                  <button
                    onClick={() => setActiveTab('carousel')}
                    className={`py-4 px-1 border-b-2 font-medium text-sm whitespace-nowrap ${
                      activeTab === 'carousel'
                        ? 'border-indigo-500 text-indigo-600'
                        : 'border-transparent text-gray-500 hover:text-gray-700'
                    }`}
                  >
                    🎠 Carousel
                  </button>
                  <button
                    onClick={() => setActiveTab('pricing')}
                    className={`py-4 px-1 border-b-2 font-medium text-sm whitespace-nowrap ${
                      activeTab === 'pricing'
                        ? 'border-indigo-500 text-indigo-600'
                        : 'border-transparent text-gray-500 hover:text-gray-700'
                    }`}
                  >
                    💰 Pricing
                  </button>
                  <button
                    onClick={() => setActiveTab('fonts')}
                    className={`py-4 px-1 border-b-2 font-medium text-sm whitespace-nowrap ${
                      activeTab === 'fonts'
                        ? 'border-indigo-500 text-indigo-600'
                        : 'border-transparent text-gray-500 hover:text-gray-700'
                    }`}
                  >
                    🔤 Fonts
                  </button>
                  <button
                    onClick={() => setActiveTab('branding')}
                    className={`py-4 px-1 border-b-2 font-medium text-sm whitespace-nowrap ${
                      activeTab === 'branding'
                        ? 'border-indigo-500 text-indigo-600'
                        : 'border-transparent text-gray-500 hover:text-gray-700'
                    }`}
                  >
                    📱 Branding
                  </button>
                  <button
                    onClick={() => setActiveTab('pages')}
                    className={`py-4 px-1 border-b-2 font-medium text-sm whitespace-nowrap ${
                      activeTab === 'pages'
                        ? 'border-indigo-500 text-indigo-600'
                        : 'border-transparent text-gray-500 hover:text-gray-700'
                    }`}
                  >
                    📄 Pages
                  </button>
                </nav>
              </div>
            </div>

            {/* Configuration Form */}
            <div className="space-y-6">
              {/* Content Tab */}
              {activeTab === 'content' && (
                <>
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

                  {/* Registration Settings */}
                  <ConfigSection title="Registration Settings" icon="🔒">
                    <div className="space-y-4">
                      <label className="flex items-center gap-3 p-4 bg-gray-50 rounded-lg border border-gray-200">
                        <input
                          type="checkbox"
                          checked={config.allowNewRegistrations !== false}
                          onChange={(e) => handleChange('allowNewRegistrations', e.target.checked)}
                          className="w-5 h-5 rounded"
                        />
                        <div>
                          <span className="font-medium text-gray-700">Allow New Organization Registration</span>
                          <p className="text-xs text-gray-600 mt-1">When enabled, new organizations can register on the landing page. When disabled, only existing organizations can add users.</p>
                        </div>
                      </label>
                      <div>
                        <label className="block text-sm font-medium text-gray-700 mb-1">Lock Registration To Organization (optional)</label>
                        <select
                          value={config.lockedOrganizationId || config.locked_organization_id || ''}
                          onChange={(e) => handleChange('lockedOrganizationId', e.target.value ? Number(e.target.value) : null)}
                          className="w-full px-3 py-2 border rounded-lg"
                        >
                          <option value="">None</option>
                          {(businesses || []).map(b => (
                            <option key={b.id} value={b.id}>{b.name || b.id}</option>
                          ))}
                        </select>
                        <p className="text-xs text-gray-500 mt-1">When set, new registrations will be auto-assigned to the selected organization and the organization field will be hidden on the registration form.</p>
                      </div>
                    </div>
                  </ConfigSection>
                </>
              )}

              {/* Features Tab */}
              {activeTab === 'features' && (
                <>
                  <ConfigSection title="Feature Cards" icon="✨">
                    <div className="space-y-4">
                      <div>
                        <label className="block text-sm font-medium text-gray-700 mb-2">Features List</label>
                        {(config.featuresData || []).map((item: any, i: number) => (
                          <div key={i} className="bg-gray-50 p-4 rounded-lg space-y-3 mb-3 border border-gray-200">
                            <input
                              type="text"
                              value={item.icon || ''}
                              onChange={(e) => handleArrayItemChange('featuresData', i, 'icon', e.target.value)}
                              className="w-full px-4 py-2 border rounded-lg"
                              placeholder="Icon (emoji)"
                            />
                            <input
                              type="text"
                              value={item.title || ''}
                              onChange={(e) => handleArrayItemChange('featuresData', i, 'title', e.target.value)}
                              className="w-full px-4 py-2 border rounded-lg"
                              placeholder="Title"
                            />
                            <textarea
                              value={item.description || ''}
                              onChange={(e) => handleArrayItemChange('featuresData', i, 'description', e.target.value)}
                              className="w-full px-4 py-2 border rounded-lg"
                              placeholder="Description"
                              rows={2}
                            />
                            <button
                              onClick={() => removeArrayItem('featuresData', i)}
                              className="w-full bg-red-500 text-white px-4 py-2 rounded-lg hover:bg-red-600"
                            >
                              Remove Feature
                            </button>
                          </div>
                        ))}
                        <button
                          onClick={() => addArrayItem('featuresData', { icon: '⭐', title: 'New Feature', description: '' })}
                          className="w-full bg-indigo-600 text-white px-4 py-2 rounded-lg hover:bg-indigo-700 font-medium"
                        >
                          + Add Feature
                        </button>
                      </div>
                    </div>
                  </ConfigSection>
                </>
              )}

              {/* Carousel Tab */}
              {activeTab === 'carousel' && (
                <>
                  <ConfigSection title="Testimonials" icon="🎠">
                    <div className="space-y-4">
                      <div className="mb-4">
                        <label className="block text-sm font-medium text-gray-700 mb-1">Carousel Title</label>
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
                      <div className="mt-6">
                        <label className="block text-sm font-medium text-gray-700 mb-2">Testimonial Items</label>
                        {(config.carouselItems || []).map((item: any, i: number) => (
                          <div key={i} className="bg-gray-50 p-4 rounded-lg space-y-3 mb-3 border border-gray-200">
                            <input
                              type="text"
                              value={item.name || ''}
                              onChange={(e) => handleArrayItemChange('carouselItems', i, 'name', e.target.value)}
                              className="w-full px-4 py-2 border rounded-lg"
                              placeholder="Name"
                            />
                            <input
                              type="text"
                              value={item.role || ''}
                              onChange={(e) => handleArrayItemChange('carouselItems', i, 'role', e.target.value)}
                              className="w-full px-4 py-2 border rounded-lg"
                              placeholder="Role/Title"
                            />
                            <textarea
                              value={item.feedback || ''}
                              onChange={(e) => handleArrayItemChange('carouselItems', i, 'feedback', e.target.value)}
                              className="w-full px-4 py-2 border rounded-lg"
                              placeholder="Testimonial/Feedback"
                              rows={3}
                            />
                            <div>
                              <label className="text-xs text-gray-600">Image</label>
                              <input
                                type="file"
                                accept="image/*"
                                onChange={(e) => {
                                  const file = e.target.files?.[0];
                                  if (file) {
                                    uploadCarouselImage(i, file);
                                  }
                                }}
                                className="w-full px-4 py-2 border rounded-lg"
                              />
                              {uploadingFiles[`carousel_${i}`] && <p className="text-sm text-indigo-600">Uploading...</p>}
                              {item.imageUrl && (
                                <div className="mt-2">
                                  <img src={item.imageUrl} alt={item.name} className="w-full h-32 object-cover rounded" />
                                  <button
                                    onClick={() => handleArrayItemChange('carouselItems', i, 'imageUrl', '')}
                                    className="mt-2 w-full bg-red-500 text-white px-3 py-2 rounded-lg hover:bg-red-600"
                                  >
                                    Remove Image
                                  </button>
                                </div>
                              )}
                            </div>
                            <button
                              onClick={() => removeArrayItem('carouselItems', i)}
                              className="w-full bg-red-500 text-white px-4 py-2 rounded-lg hover:bg-red-600"
                            >
                              Remove Testimonial
                            </button>
                          </div>
                        ))}
                        <button
                          onClick={() => addArrayItem('carouselItems', { name: '', role: '', feedback: '', imageUrl: '' })}
                          className="w-full bg-indigo-600 text-white px-4 py-2 rounded-lg hover:bg-indigo-700 font-medium"
                        >
                          + Add Testimonial
                        </button>
                      </div>
                    </div>
                  </ConfigSection>
                </>
              )}

              {/* Pricing Tab */}
              {activeTab === 'pricing' && (
                <>
                  <ConfigSection title="Pricing Section" icon="💰">
                    <div className="space-y-4">
                      <div>
                        <label className="block text-sm font-medium text-gray-700 mb-1">Title</label>
                        <input
                          type="text"
                          value={config.pricingTitle || ''}
                          onChange={(e) => handleChange('pricingTitle', e.target.value)}
                          className="w-full px-4 py-2 border border-gray-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-indigo-500"
                          placeholder="Simple Pricing"
                        />
                      </div>
                      <div>
                        <label className="block text-sm font-medium text-gray-700 mb-1">Subtitle</label>
                        <input
                          type="text"
                          value={config.pricingSubtitle || ''}
                          onChange={(e) => handleChange('pricingSubtitle', e.target.value)}
                          className="w-full px-4 py-2 border border-gray-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-indigo-500"
                          placeholder="Choose the plan that works for you"
                        />
                      </div>
                      <div>
                        <label className="block text-sm font-medium text-gray-700 mb-1">Currency</label>
                        <input
                          type="text"
                          value={config.pricingCurrency || 'USD'}
                          onChange={(e) => handleChange('pricingCurrency', e.target.value)}
                          className="w-full px-4 py-2 border border-gray-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-indigo-500"
                          placeholder="USD, EUR, GBP, INR, etc."
                        />
                      </div>
                      <label className="flex items-center">
                        <input
                          type="checkbox"
                          checked={config.pricingVisible}
                          onChange={(e) => handleChange('pricingVisible', e.target.checked)}
                          className="mr-2"
                        />
                        <span className="text-sm font-medium text-gray-700">Visible</span>
                      </label>
                      <div className="mt-6">
                        <label className="block text-sm font-medium text-gray-700 mb-2">Pricing Plans</label>
                        {(config.pricingItems || []).map((item: any, i: number) => (
                          <div key={i} className="bg-gray-50 p-4 rounded-lg space-y-3 mb-3 border border-gray-200">
                            <input
                              type="text"
                              value={item.name || ''}
                              onChange={(e) => handleArrayItemChange('pricingItems', i, 'name', e.target.value)}
                              className="w-full px-4 py-2 border rounded-lg"
                              placeholder="Plan Name (e.g., Basic, Pro, Enterprise)"
                            />
                            <input
                              type="number"
                              value={item.price || ''}
                              onChange={(e) => handleArrayItemChange('pricingItems', i, 'price', e.target.value)}
                              className="w-full px-4 py-2 border rounded-lg"
                              placeholder="Price"
                            />
                            <input
                              type="text"
                              value={item.description || ''}
                              onChange={(e) => handleArrayItemChange('pricingItems', i, 'description', e.target.value)}
                              className="w-full px-4 py-2 border rounded-lg"
                              placeholder="Price description (e.g., per month, per year)"
                            />
                            <textarea
                              value={item.features || ''}
                              onChange={(e) => handleArrayItemChange('pricingItems', i, 'features', e.target.value)}
                              className="w-full px-4 py-2 border rounded-lg"
                              placeholder="Features (one per line)"
                              rows={4}
                            />
                            <label className="flex items-center gap-2">
                              <input
                                type="checkbox"
                                checked={item.popular || false}
                                onChange={(e) => handleArrayItemChange('pricingItems', i, 'popular', e.target.checked)}
                              />
                              <span className="text-sm font-medium text-gray-700">Mark as Popular</span>
                            </label>
                            <button
                              onClick={() => removeArrayItem('pricingItems', i)}
                              className="w-full bg-red-500 text-white px-4 py-2 rounded-lg hover:bg-red-600"
                            >
                              Remove Plan
                            </button>
                          </div>
                        ))}
                        <button
                          onClick={() => addArrayItem('pricingItems', { name: '', price: '', description: '', features: '', popular: false })}
                          className="w-full bg-indigo-600 text-white px-4 py-2 rounded-lg hover:bg-indigo-700 font-medium"
                        >
                          + Add Pricing Plan
                        </button>
                      </div>
                    </div>
                  </ConfigSection>
                </>
              )}

              {/* Fonts & Styling Tab */}
              {activeTab === 'fonts' && (
                <>
                  <ConfigSection title="Hero Title Styling" icon="🔤">
                    <div className="grid grid-cols-2 gap-4">
                      <div>
                        <label className="block text-sm font-medium text-gray-700 mb-1">Font Size</label>
                        <input
                          type="text"
                          value={config.heroTitleFontSize || '48px'}
                          onChange={(e) => handleChange('heroTitleFontSize', e.target.value)}
                          className="w-full px-4 py-2 border border-gray-300 rounded-lg"
                          placeholder="48px"
                        />
                      </div>
                      <div>
                        <label className="block text-sm font-medium text-gray-700 mb-1">Font Weight</label>
                        <select
                          value={config.heroTitleFontWeight || '700'}
                          onChange={(e) => handleChange('heroTitleFontWeight', e.target.value)}
                          className="w-full px-4 py-2 border border-gray-300 rounded-lg"
                        >
                          <option value="400">Normal (400)</option>
                          <option value="500">Medium (500)</option>
                          <option value="600">Semibold (600)</option>
                          <option value="700">Bold (700)</option>
                          <option value="800">Extrabold (800)</option>
                          <option value="900">Black (900)</option>
                        </select>
                      </div>
                    </div>
                  </ConfigSection>

                  <ConfigSection title="Hero Subtitle Styling" icon="🔤">
                    <div className="grid grid-cols-2 gap-4">
                      <div>
                        <label className="block text-sm font-medium text-gray-700 mb-1">Font Size</label>
                        <input
                          type="text"
                          value={config.heroSubtitleFontSize || '20px'}
                          onChange={(e) => handleChange('heroSubtitleFontSize', e.target.value)}
                          className="w-full px-4 py-2 border border-gray-300 rounded-lg"
                          placeholder="20px"
                        />
                      </div>
                      <div>
                        <label className="block text-sm font-medium text-gray-700 mb-1">Font Weight</label>
                        <select
                          value={config.heroSubtitleFontWeight || '400'}
                          onChange={(e) => handleChange('heroSubtitleFontWeight', e.target.value)}
                          className="w-full px-4 py-2 border border-gray-300 rounded-lg"
                        >
                          <option value="400">Normal (400)</option>
                          <option value="500">Medium (500)</option>
                          <option value="600">Semibold (600)</option>
                          <option value="700">Bold (700)</option>
                          <option value="800">Extrabold (800)</option>
                          <option value="900">Black (900)</option>
                        </select>
                      </div>
                    </div>
                  </ConfigSection>

                  <ConfigSection title="Features Title Styling" icon="🔤">
                    <div className="grid grid-cols-2 gap-4">
                      <div>
                        <label className="block text-sm font-medium text-gray-700 mb-1">Font Size</label>
                        <input
                          type="text"
                          value={config.featuresTitleFontSize || '36px'}
                          onChange={(e) => handleChange('featuresTitleFontSize', e.target.value)}
                          className="w-full px-4 py-2 border border-gray-300 rounded-lg"
                          placeholder="36px"
                        />
                      </div>
                      <div>
                        <label className="block text-sm font-medium text-gray-700 mb-1">Font Weight</label>
                        <select
                          value={config.featuresTitleFontWeight || '700'}
                          onChange={(e) => handleChange('featuresTitleFontWeight', e.target.value)}
                          className="w-full px-4 py-2 border border-gray-300 rounded-lg"
                        >
                          <option value="400">Normal (400)</option>
                          <option value="500">Medium (500)</option>
                          <option value="600">Semibold (600)</option>
                          <option value="700">Bold (700)</option>
                          <option value="800">Extrabold (800)</option>
                          <option value="900">Black (900)</option>
                        </select>
                      </div>
                    </div>
                  </ConfigSection>

                  <ConfigSection title="Features Subtitle Styling" icon="🔤">
                    <div className="grid grid-cols-2 gap-4">
                      <div>
                        <label className="block text-sm font-medium text-gray-700 mb-1">Font Size</label>
                        <input
                          type="text"
                          value={config.featuresSubtitleFontSize || '18px'}
                          onChange={(e) => handleChange('featuresSubtitleFontSize', e.target.value)}
                          className="w-full px-4 py-2 border border-gray-300 rounded-lg"
                          placeholder="18px"
                        />
                      </div>
                      <div>
                        <label className="block text-sm font-medium text-gray-700 mb-1">Font Weight</label>
                        <select
                          value={config.featuresSubtitleFontWeight || '400'}
                          onChange={(e) => handleChange('featuresSubtitleFontWeight', e.target.value)}
                          className="w-full px-4 py-2 border border-gray-300 rounded-lg"
                        >
                          <option value="400">Normal (400)</option>
                          <option value="500">Medium (500)</option>
                          <option value="600">Semibold (600)</option>
                          <option value="700">Bold (700)</option>
                          <option value="800">Extrabold (800)</option>
                          <option value="900">Black (900)</option>
                        </select>
                      </div>
                    </div>
                  </ConfigSection>

                  <ConfigSection title="Carousel Title Styling" icon="🔤">
                    <div className="grid grid-cols-2 gap-4">
                      <div>
                        <label className="block text-sm font-medium text-gray-700 mb-1">Font Size</label>
                        <input
                          type="text"
                          value={config.carouselTitleFontSize || '36px'}
                          onChange={(e) => handleChange('carouselTitleFontSize', e.target.value)}
                          className="w-full px-4 py-2 border border-gray-300 rounded-lg"
                          placeholder="36px"
                        />
                      </div>
                      <div>
                        <label className="block text-sm font-medium text-gray-700 mb-1">Font Weight</label>
                        <select
                          value={config.carouselTitleFontWeight || '700'}
                          onChange={(e) => handleChange('carouselTitleFontWeight', e.target.value)}
                          className="w-full px-4 py-2 border border-gray-300 rounded-lg"
                        >
                          <option value="400">Normal (400)</option>
                          <option value="500">Medium (500)</option>
                          <option value="600">Semibold (600)</option>
                          <option value="700">Bold (700)</option>
                          <option value="800">Extrabold (800)</option>
                          <option value="900">Black (900)</option>
                        </select>
                      </div>
                    </div>
                  </ConfigSection>

                  <ConfigSection title="CTA Title Styling" icon="🔤">
                    <div className="grid grid-cols-2 gap-4">
                      <div>
                        <label className="block text-sm font-medium text-gray-700 mb-1">Font Size</label>
                        <input
                          type="text"
                          value={config.ctaTitleFontSize || '36px'}
                          onChange={(e) => handleChange('ctaTitleFontSize', e.target.value)}
                          className="w-full px-4 py-2 border border-gray-300 rounded-lg"
                          placeholder="36px"
                        />
                      </div>
                      <div>
                        <label className="block text-sm font-medium text-gray-700 mb-1">Font Weight</label>
                        <select
                          value={config.ctaTitleFontWeight || '700'}
                          onChange={(e) => handleChange('ctaTitleFontWeight', e.target.value)}
                          className="w-full px-4 py-2 border border-gray-300 rounded-lg"
                        >
                          <option value="400">Normal (400)</option>
                          <option value="500">Medium (500)</option>
                          <option value="600">Semibold (600)</option>
                          <option value="700">Bold (700)</option>
                          <option value="800">Extrabold (800)</option>
                          <option value="900">Black (900)</option>
                        </select>
                      </div>
                    </div>
                  </ConfigSection>

                  <ConfigSection title="CTA Subtitle Styling" icon="🔤">
                    <div className="grid grid-cols-2 gap-4">
                      <div>
                        <label className="block text-sm font-medium text-gray-700 mb-1">Font Size</label>
                        <input
                          type="text"
                          value={config.ctaSubtitleFontSize || '18px'}
                          onChange={(e) => handleChange('ctaSubtitleFontSize', e.target.value)}
                          className="w-full px-4 py-2 border border-gray-300 rounded-lg"
                          placeholder="18px"
                        />
                      </div>
                      <div>
                        <label className="block text-sm font-medium text-gray-700 mb-1">Font Weight</label>
                        <select
                          value={config.ctaSubtitleFontWeight || '400'}
                          onChange={(e) => handleChange('ctaSubtitleFontWeight', e.target.value)}
                          className="w-full px-4 py-2 border border-gray-300 rounded-lg"
                        >
                          <option value="400">Normal (400)</option>
                          <option value="500">Medium (500)</option>
                          <option value="600">Semibold (600)</option>
                          <option value="700">Bold (700)</option>
                          <option value="800">Extrabold (800)</option>
                          <option value="900">Black (900)</option>
                        </select>
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
                </>
              )}

              {/* Navigation & Branding */}
              {activeTab === 'branding' && (
                <>
                  <ConfigSection title="App Name" icon="🏢">
                    <div className="space-y-4">
                      <div>
                        <label className="block text-sm font-medium text-gray-700 mb-1">Application Name</label>
                        <input
                          type="text"
                          value={config.appName || 'OneApp'}
                          onChange={(e) => handleChange('appName', e.target.value)}
                          className="w-full px-4 py-2 border border-gray-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-indigo-500"
                          placeholder="OneApp"
                        />
                        <p className="text-xs text-gray-600 mt-1">This name will appear in the header and footer</p>
                      </div>
                    </div>
                  </ConfigSection>

                  <ConfigSection title="Navigation Bar" icon="🔗">
                    <div className="space-y-4">
                      <div>
                        <label className="block text-sm font-medium text-gray-700 mb-1">Nav Background Color</label>
                        <div className="flex gap-2">
                          <input
                            type="color"
                            value={config.navBackgroundColor || '#ffffff'}
                            onChange={(e) => handleChange('navBackgroundColor', e.target.value)}
                            className="w-16 h-10 rounded border border-gray-300"
                          />
                          <input
                            type="text"
                            value={config.navBackgroundColor || '#ffffff'}
                            onChange={(e) => handleChange('navBackgroundColor', e.target.value)}
                            className="flex-1 px-4 py-2 border border-gray-300 rounded-lg"
                            placeholder="#ffffff"
                          />
                        </div>
                      </div>
                      <div>
                        <label className="block text-sm font-medium text-gray-700 mb-1">Nav Text Color</label>
                        <div className="flex gap-2">
                          <input
                            type="color"
                            value={config.navTextColor || '#374151'}
                            onChange={(e) => handleChange('navTextColor', e.target.value)}
                            className="w-16 h-10 rounded border border-gray-300"
                          />
                          <input
                            type="text"
                            value={config.navTextColor || '#374151'}
                            onChange={(e) => handleChange('navTextColor', e.target.value)}
                            className="flex-1 px-4 py-2 border border-gray-300 rounded-lg"
                            placeholder="#374151"
                          />
                        </div>
                      </div>
                    </div>
                  </ConfigSection>

                  <ConfigSection title="Logo & Favicon" icon="📱">
                    <div className="space-y-4">
                      <FileUploadField
                        label="Logo"
                        field="logoUrl"
                        value={config.logoUrl || ''}
                        onUpload={(file) => handleFileUpload('logoUrl', file)}
                        uploading={uploadingFiles['logoUrl'] || false}
                        onChange={(e) => handleChange('logoUrl', e.target.value)}
                      />
                      <FileUploadField
                        label="Favicon"
                        field="faviconUrl"
                        value={config.faviconUrl || ''}
                        onUpload={(file) => handleFileUpload('faviconUrl', file)}
                        uploading={uploadingFiles['faviconUrl'] || false}
                        onChange={(e) => handleChange('faviconUrl', e.target.value)}
                      />
                    </div>
                  </ConfigSection>

                  <ConfigSection title="Hero Background Image" icon="🖼️">
                    <FileUploadField
                      label="Hero Image"
                      field="heroImageUrl"
                      value={config.heroImageUrl || ''}
                      onUpload={(file) => handleFileUpload('heroImageUrl', file)}
                      uploading={uploadingFiles['heroImageUrl'] || false}
                      onChange={(e) => handleChange('heroImageUrl', e.target.value)}
                    />
                  </ConfigSection>

                  <ConfigSection title="Hero Featured Images" icon="🖼️">
                    <div className="space-y-4">
                      <div>
                        <label className="block text-sm font-medium text-gray-700 mb-1">Featured Images (hero slider)</label>
                        <input
                          type="file"
                          accept="image/*"
                          multiple
                          onChange={(e) => {
                            const files = e.target.files;
                            if (!files) return;
                            for (let i = 0; i < files.length; i++) {
                              const f = files[i];
                              if (f) uploadHeroFeaturedImage(f);
                            }
                          }}
                          className="w-full px-4 py-2 border rounded-lg"
                        />
                        {uploadingFiles.heroFeatured && <p className="text-sm text-indigo-600">Uploading...</p>}
                      </div>
                      <div className="grid grid-cols-2 gap-4">
                        {(config.heroFeaturedImages || []).map((img: string, idx: number) => (
                          <div key={idx} className="relative">
                            <img src={img} alt={`featured-${idx}`} className="w-full h-32 object-cover rounded-lg" />
                            <button
                              onClick={() => {
                                const arr = [...(config.heroFeaturedImages || [])];
                                arr.splice(idx, 1);
                                setConfig({...config, heroFeaturedImages: arr});
                              }}
                              className="absolute top-2 right-2 bg-red-500 text-white px-2 py-1 rounded"
                            >
                              Remove
                            </button>
                          </div>
                        ))}
                      </div>
                    </div>
                  </ConfigSection>

                  <ConfigSection title="Preview" icon="👁️">
                    <div className="space-y-4">
                      {config.logoUrl && (
                        <div>
                          <label className="block text-sm font-medium text-gray-700 mb-2">Logo Preview</label>
                          <div className="border border-gray-300 rounded-lg p-4 bg-gray-50">
                            <img src={config.logoUrl} alt="Logo" className="h-16 object-contain" />
                          </div>
                        </div>
                      )}
                      {config.heroImageUrl && (
                        <div>
                          <label className="block text-sm font-medium text-gray-700 mb-2">Hero Image Preview</label>
                          <div className="border border-gray-300 rounded-lg overflow-hidden bg-gray-50">
                            <img src={config.heroImageUrl} alt="Hero" className="w-full h-48 object-cover" />
                          </div>
                        </div>
                      )}
                    </div>
                  </ConfigSection>

                  <ConfigSection title="Custom Pages" icon="📄">
                    <div className="space-y-4">
                      <div>
                        <label className="block text-sm font-medium text-gray-700 mb-2">Create New Page</label>
                        <div className="space-y-3">
                          {(config.customPages || []).map((page: any, i: number) => (
                            <div key={i} className="bg-gray-50 p-4 rounded-lg border border-gray-200 space-y-3">
                              <input
                                type="text"
                                value={page.title || ''}
                                onChange={(e) => handleArrayItemChange('customPages', i, 'title', e.target.value)}
                                className="w-full px-4 py-2 border rounded-lg"
                                placeholder="Page Title"
                              />
                              <input
                                type="text"
                                value={page.slug || ''}
                                onChange={(e) => handleArrayItemChange('customPages', i, 'slug', e.target.value)}
                                className="w-full px-4 py-2 border rounded-lg"
                                placeholder="URL Slug (e.g., about-us)"
                              />
                              <div>
                                <CKEditor
                                  editor={ClassicEditor}
                                  data={page.content || ''}
                                  onChange={(event: any, editor: any) => {
                                    const data = editor.getData();
                                    handleArrayItemChange('customPages', i, 'content', data);
                                  }}
                                />
                              </div>
                              <label className="flex items-center gap-2">
                                <input
                                  type="checkbox"
                                  checked={page.displayOnNav || false}
                                  onChange={(e) => handleArrayItemChange('customPages', i, 'displayOnNav', e.target.checked)}
                                />
                                <span className="text-sm font-medium text-gray-700">Display in Navigation</span>
                              </label>
                              <button
                                onClick={() => removeArrayItem('customPages', i)}
                                className="w-full bg-red-500 text-white px-4 py-2 rounded-lg hover:bg-red-600"
                              >
                                Remove Page
                              </button>
                            </div>
                          ))}
                          <button
                            onClick={() => addArrayItem('customPages', { title: '', slug: '', content: '', displayOnNav: false })}
                            className="w-full bg-indigo-600 text-white px-4 py-2 rounded-lg hover:bg-indigo-700 font-medium"
                          >
                            + Add Custom Page
                          </button>
                        </div>
                      </div>
                    </div>
                  </ConfigSection>
                </>
              )}

              {/* Pages Tab */}
              {activeTab === 'pages' && (
                <>
                  <ConfigSection title="Custom Pages" icon="📄">
                    <div className="space-y-4">
                      <p className="text-sm text-gray-600 mb-4">Create custom pages that appear on your landing page for guests to view.</p>
                      {(config.customPages || []).map((page: any, i: number) => (
                        <div key={i} className="bg-gray-50 p-4 rounded-lg border border-gray-200 space-y-3">
                          <input
                            type="text"
                            value={page.title || ''}
                            onChange={(e) => handleArrayItemChange('customPages', i, 'title', e.target.value)}
                            className="w-full px-4 py-2 border rounded-lg font-medium"
                            placeholder="Page Title"
                          />
                          <input
                            type="text"
                            value={page.slug || ''}
                            onChange={(e) => handleArrayItemChange('customPages', i, 'slug', e.target.value)}
                            className="w-full px-4 py-2 border rounded-lg text-sm"
                            placeholder="URL Slug (e.g., about-us)"
                          />
                          <div>
                            <CKEditor
                              editor={ClassicEditor}
                              data={page.content || ''}
                              onChange={(event: any, editor: any) => {
                                const data = editor.getData();
                                handleArrayItemChange('customPages', i, 'content', data);
                              }}
                            />
                          </div>
                          <label className="flex items-center gap-2 p-2 bg-white rounded">
                            <input
                              type="checkbox"
                              checked={page.displayOnNav || false}
                              onChange={(e) => handleArrayItemChange('customPages', i, 'displayOnNav', e.target.checked)}
                            />
                            <span className="text-sm font-medium text-gray-700">Display in Navigation Menu</span>
                          </label>
                          <button
                            onClick={() => removeArrayItem('customPages', i)}
                            className="w-full bg-red-500 text-white px-4 py-2 rounded-lg hover:bg-red-600 font-medium"
                          >
                            🗑️ Remove Page
                          </button>
                        </div>
                      ))}
                      <button
                        onClick={() => addArrayItem('customPages', { title: 'New Page', slug: 'new-page', content: '<h1>New Page</h1><p>Edit this content</p>', displayOnNav: true })}
                        className="w-full bg-indigo-600 text-white px-4 py-2 rounded-lg hover:bg-indigo-700 font-medium"
                      >
                        + Add Custom Page
                      </button>
                    </div>
                  </ConfigSection>
                </>
              )}
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

/**
 * File Upload Field Component
 */
const FileUploadField: React.FC<{
  label: string;
  field: string;
  value: string;
  onUpload: (file: File) => void;
  uploading: boolean;
  onChange: (e: React.ChangeEvent<HTMLInputElement>) => void;
}> = ({ label, field, value, onUpload, uploading, onChange }) => {
  return (
    <div>
      <label className="block text-sm font-medium text-gray-700 mb-2">{label}</label>
      <div className="space-y-2">
        <div className="flex gap-2">
          <div className="flex-1 relative">
            <input
              type="file"
              accept="image/*"
              onChange={(e) => {
                const file = e.target.files?.[0];
                if (file) onUpload(file);
              }}
              disabled={uploading}
              className="block w-full text-sm text-gray-500 file:mr-4 file:py-2 file:px-4 file:rounded-lg file:border-0 file:text-sm file:font-semibold file:bg-indigo-50 file:text-indigo-700 hover:file:bg-indigo-100 disabled:opacity-50"
            />
          </div>
        </div>
        <div>
          <label className="text-xs text-gray-500 mb-1 block">Or paste URL directly:</label>
          <input
            type="url"
            value={value}
            onChange={onChange}
            className="w-full px-4 py-2 border border-gray-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-indigo-500"
            placeholder={`https://example.com/${field}.png`}
          />
          {value && (
            <div className="mt-2">
              <button
                type="button"
                onClick={() => onChange({ target: { value: '' } } as unknown as React.ChangeEvent<HTMLInputElement>)}
                className="px-3 py-1 bg-red-500 text-white rounded-lg hover:bg-red-600"
              >
                Remove
              </button>
            </div>
          )}
        </div>
        {uploading && <p className="text-sm text-indigo-600">Uploading...</p>}
      </div>
    </div>
  );
};

export default SuperAdminLandingPageConfig;