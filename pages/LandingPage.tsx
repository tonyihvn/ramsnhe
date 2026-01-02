import React, { useState, useEffect } from 'react';
import { Link } from 'react-router-dom';
import Button from '../components/ui/Button';

interface LandingConfig {
  appName?: string;
  heroTitle?: string;
  heroTitleFontSize?: string;
  heroTitleFontWeight?: string;
  heroSubtitle?: string;
  heroSubtitleFontSize?: string;
  heroSubtitleFontWeight?: string;
  heroImageUrl?: string;
  heroButtonText?: string;
  heroButtonLink?: string;
  heroVisible?: boolean;
  featuresTitle?: string;
  featuresTitleFontSize?: string;
  featuresTitleFontWeight?: string;
  featuresSubtitle?: string;
  featuresSubtitleFontSize?: string;
  featuresSubtitleFontWeight?: string;
  featuresData?: any[];
  featuresVisible?: boolean;
  carouselTitle?: string;
  carouselTitleFontSize?: string;
  carouselTitleFontWeight?: string;
  carouselItems?: any[];
  carouselVisible?: boolean;
  pricingItems?: any[];
  pricingVisible?: boolean;
  ctaTitle?: string;
  ctaTitleFontSize?: string;
  ctaTitleFontWeight?: string;
  ctaSubtitle?: string;
  ctaSubtitleFontSize?: string;
  ctaSubtitleFontWeight?: string;
  ctaButtonText?: string;
  ctaButtonLink?: string;
  ctaVisible?: boolean;
  demoLink?: string;
  demoLabel?: string;
  logoUrl?: string;
  faviconUrl?: string;
  primaryColor?: string;
  secondaryColor?: string;
  navBackgroundColor?: string;
  navTextColor?: string;
  footerLinks?: any[];
  customPages?: any[];
}

const LandingPage: React.FC = () => {
  const [config, setConfig] = useState<LandingConfig | null>(null);
  const [carouselIndex, setCarouselIndex] = useState(0);
  const [heroImageIndex, setHeroImageIndex] = useState(0);
  const [feedbackFormOpen, setFeedbackFormOpen] = useState(false);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    loadConfig();
  }, []);

  useEffect(() => {
    if ((config?.heroFeaturedImages || []).length > 1) {
      const id = setInterval(() => setHeroImageIndex(i => i + 1), 4500);
      return () => clearInterval(id);
    }
    return;
  }, [config?.heroFeaturedImages]);

  const loadConfig = async () => {
    try {
      // Load universal landing page config
      const response = await fetch('/api/landing-page-config');
      if (response.ok) {
        const data = await response.json();
        setConfig(data.config || data);
      } else {
        setConfig({});
      }
    } catch (err) {
      console.error('Failed to load landing page config:', err);
      setConfig({});
    } finally {
      setLoading(false);
    }
  };

  if (loading) {
    return (
      <div className="min-h-screen flex items-center justify-center bg-gray-50">
        <div className="text-center">
          <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-blue-500 mx-auto mb-4"></div>
          <p>Loading...</p>
        </div>
      </div>
    );
  }

  const heroTitle = config?.heroTitle || 'Welcome to OneApp';
  const heroSubtitle = config?.heroSubtitle || 'Transform your data into insights';
  const primaryColor = config?.primaryColor || '#2563eb';
  const secondaryColor = config?.secondaryColor || '#1e40af';
  const navBackgroundColor = config?.navBackgroundColor || '#ffffff';
  const navTextColor = config?.navTextColor || '#374151';
  const appName = config?.appName || 'OneApp';
  const carouselItems = config?.carouselItems || [];
  const heroFeaturedImages = config?.heroFeaturedImages || [];
  const customPages = config?.customPages || [];
  
  // Font styling defaults
  const heroTitleFontSize = config?.heroTitleFontSize || '48px';
  const heroTitleFontWeight = config?.heroTitleFontWeight || '700';
  const heroSubtitleFontSize = config?.heroSubtitleFontSize || '20px';
  const heroSubtitleFontWeight = config?.heroSubtitleFontWeight || '400';
  const featuresTitleFontSize = config?.featuresTitleFontSize || '36px';
  const featuresTitleFontWeight = config?.featuresTitleFontWeight || '700';
  const featuresSubtitleFontSize = config?.featuresSubtitleFontSize || '18px';
  const featuresSubtitleFontWeight = config?.featuresSubtitleFontWeight || '400';
  const carouselTitleFontSize = config?.carouselTitleFontSize || '36px';
  const carouselTitleFontWeight = config?.carouselTitleFontWeight || '700';
  const ctaTitleFontSize = config?.ctaTitleFontSize || '36px';
  const ctaTitleFontWeight = config?.ctaTitleFontWeight || '700';
  const ctaSubtitleFontSize = config?.ctaSubtitleFontSize || '18px';
  const ctaSubtitleFontWeight = config?.ctaSubtitleFontWeight || '400';

  return (
    <div className="min-h-screen bg-white">
      {/* Navigation */}
      <nav className="sticky top-0 shadow-sm" style={{ backgroundColor: navBackgroundColor, zIndex: 1000, position: 'sticky' as any, backdropFilter: 'none' }}>
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
          <div className="flex justify-between items-center h-16">
            <div className="flex items-center">
              <div className="flex items-center">
                <Link to="/" className="flex items-center">
                  {config?.logoUrl ? (
                    <img src={config.logoUrl} alt="Logo" className="h-10" />
                  ) : (
                    <span className="text-2xl font-bold" style={{ color: primaryColor }}>
                      {appName}
                    </span>
                  )}
                </Link>
              </div>
            </div>
            <div className="flex gap-4 items-center ml-auto">
              <div className="hidden md:flex gap-6 items-center">
                {customPages.filter((p: any) => p.displayOnNav).map((page: any, idx: number) => (
                  <Link
                    key={idx}
                    to={`/page/${page.slug}`}
                    className="font-medium hover:opacity-70 transition"
                    style={{ color: navTextColor }}
                  >
                    {page.title}
                  </Link>
                ))}
              </div>
              <Link to="/login" className="px-4 py-2 font-medium hover:opacity-70 transition" style={{ color: navTextColor }}>
                Sign In
              </Link>
              {config?.demoLink && (
                <a
                  href={config.demoLink}
                  className="px-4 py-2 rounded text-white font-medium hover:opacity-90 transition"
                  style={{ backgroundColor: primaryColor }}
                >
                  {config.demoLabel || 'Try Demo'}
                </a>
              )}
            </div>
          </div>
        </div>
      </nav>

      {/* Hero Section */}
      {config?.heroVisible !== false && (
        <section
          className="relative py-20 px-4 overflow-hidden"
          style={{
            backgroundImage: heroFeaturedImages.length > 0
              ? `url('${heroFeaturedImages[heroImageIndex % heroFeaturedImages.length]}')`
              : (config?.heroImageUrl ? `linear-gradient(135deg, rgba(${parseInt(primaryColor.slice(1,3), 16)}, ${parseInt(primaryColor.slice(3,5), 16)}, ${parseInt(primaryColor.slice(5,7), 16)}, 0.8), rgba(${parseInt(secondaryColor.slice(1,3), 16)}, ${parseInt(secondaryColor.slice(3,5), 16)}, ${parseInt(secondaryColor.slice(5,7), 16)}, 0.8)), url('${config.heroImageUrl}')` : `linear-gradient(135deg, ${primaryColor} 0%, ${secondaryColor} 100%)`),
            backgroundSize: 'cover',
            backgroundPosition: 'center',
            backgroundAttachment: 'fixed'
          }}
        >
          <div className="max-w-7xl mx-auto grid grid-cols-1 md:grid-cols-2 gap-12 items-center">
            <div className="text-white">
              <h1 
                className="mb-4 font-bold leading-tight"
                style={{ 
                  fontSize: heroTitleFontSize,
                  fontWeight: heroTitleFontWeight as any
                }}
              >
                {heroTitle}
              </h1>
              <p 
                className="mb-8 text-blue-100"
                style={{ 
                  fontSize: heroSubtitleFontSize,
                  fontWeight: heroSubtitleFontWeight as any
                }}
              >
                {heroSubtitle}
              </p>
              <div className="flex gap-4">
                {config?.allowNewRegistrations !== false && (
                  <Link to="/login">
                    <button className="bg-white text-blue-600 px-8 py-3 rounded-lg font-bold hover:bg-gray-100 transition">
                      {config?.heroButtonText || 'Get Started'}
                    </button>
                  </Link>
                )}
                {config?.demoLink && (
                  <a
                    href={config.demoLink}
                    className="border-2 border-white text-white px-8 py-3 rounded-lg font-bold hover:bg-white hover:text-blue-600 transition"
                  >
                    {config?.demoLabel || 'Try Demo'}
                  </a>
                )}
              </div>
            </div>
            {config?.heroImageUrl && (
              <div className="hidden md:block">
                <img src={config.heroImageUrl} alt="Hero" className="w-full rounded-lg shadow-xl" />
              </div>
            )}
          </div>
        </section>
      )}

      {/* Features Section */}
      {config?.featuresVisible !== false && (
        <section className="py-20 px-4 bg-gray-50">
          <div className="max-w-7xl mx-auto">
            <h2 
              className="text-center mb-4 font-bold"
              style={{ 
                fontSize: featuresTitleFontSize,
                fontWeight: featuresTitleFontWeight as any
              }}
            >
              {config?.featuresTitle || 'Our Features'}
            </h2>
            {config?.featuresSubtitle && (
              <p 
                className="text-center text-gray-600 mb-12"
                style={{ 
                  fontSize: featuresSubtitleFontSize,
                  fontWeight: featuresSubtitleFontWeight as any
                }}
              >
                {config.featuresSubtitle}
              </p>
            )}
            <div className="grid grid-cols-1 md:grid-cols-3 gap-8">
              {(config?.featuresData || []).length > 0 ? (
                config.featuresData.map((feature: any, idx: number) => (
                  <div key={idx} className="bg-white p-8 rounded-lg shadow hover:shadow-lg transition">
                    <div className="text-4xl mb-4">{feature.icon}</div>
                    <h3 className="text-xl font-bold mb-3">{feature.title}</h3>
                    <p className="text-gray-600">{feature.description}</p>
                  </div>
                ))
              ) : (
                <>
                  <FeatureCard icon="📊" title="Data Analytics" description="Transform your data into actionable insights" />
                  <FeatureCard icon="🔄" title="Real-time Sync" description="Stay updated with instant synchronization" />
                  <FeatureCard icon="🛡️" title="Secure" description="Enterprise-grade security for your data" />
                </>
              )}
            </div>
          </div>
        </section>
      )}

      {/* Carousel Section */}
      {config?.carouselVisible !== false && carouselItems.length > 0 && (
        <section className="py-20 px-4 bg-white">
          <div className="max-w-4xl mx-auto">
            <h2 
              className="text-center mb-12 font-bold"
              style={{ 
                fontSize: carouselTitleFontSize,
                fontWeight: carouselTitleFontWeight as any
              }}
            >
              {config?.carouselTitle || 'What Our Users Say'}
            </h2>
            
            <div className="relative bg-gray-50 rounded-lg p-12 shadow-lg">
              {/* Carousel Items */}
              {carouselItems.map((item: any, idx: number) => (
                <div key={idx} className={`transition-opacity duration-500 ${idx === carouselIndex ? 'opacity-100' : 'opacity-0 hidden'}`}>
                  {item.imageUrl && (
                    <div className="mb-6 flex justify-center">
                      <img src={item.imageUrl} alt="Testimonial" className="w-32 h-32 rounded-full object-cover" />
                    </div>
                  )}
                  <p className="text-center text-xl italic text-gray-700 mb-4">"{item.feedback}"</p>
                  <p className="text-center font-bold" style={{ color: primaryColor }}>
                    {item.name} {item.role && `- ${item.role}`}
                  </p>
                </div>
              ))}

              {/* Navigation */}
              <div className="flex justify-center gap-2 mt-8">
                {carouselItems.map((_: any, idx: number) => (
                  <button
                    key={idx}
                    onClick={() => setCarouselIndex(idx)}
                    className={`w-3 h-3 rounded-full transition ${
                      idx === carouselIndex ? 'bg-blue-600' : 'bg-gray-300'
                    }`}
                  />
                ))}
              </div>
            </div>
          </div>
        </section>
      )}

      {/* Pricing Section */}
      {config?.pricingVisible !== false && (config?.pricingItems || []).length > 0 && (
        <section className="py-20 px-4 bg-gray-50">
          <div className="max-w-6xl mx-auto">
            <h2 className="text-center text-4xl font-bold mb-12">{config?.pricingTitle || 'Simple Pricing'}</h2>
            <div className="grid grid-cols-1 md:grid-cols-3 gap-8">
              {config.pricingItems.map((plan: any, idx: number) => (
                <div
                  key={idx}
                  className={`bg-white rounded-lg p-8 shadow-lg transition transform hover:scale-105 ${
                    plan.popular ? 'ring-2' : ''
                  }`}
                  style={plan.popular ? { ringColor: primaryColor } : {}}
                >
                  {plan.popular && (
                    <div
                      className="px-4 py-1 rounded-full text-white text-sm font-bold mb-4 w-fit"
                      style={{ backgroundColor: primaryColor }}
                    >
                      Popular
                    </div>
                  )}
                  <h3 className="text-2xl font-bold mb-2">{plan.name}</h3>
                  <div className="mb-4">
                    <span className="text-4xl font-bold" style={{ color: primaryColor }}>
                      {config?.pricingCurrency || 'USD'} {plan.price}
                    </span>
                    {plan.description && <p className="text-gray-600 text-sm">{plan.description}</p>}
                  </div>
                  <ul className="space-y-3 mb-8">
                    {(plan.features || '').split('\n').map((feature: string, fi: number) => (
                      <li key={fi} className="flex items-start gap-2">
                        <span style={{ color: primaryColor }}>✓</span>
                        <span>{feature}</span>
                      </li>
                    ))}
                  </ul>
                  <button
                    onClick={() => window.location.href = '/login'}
                    className="w-full py-3 rounded-lg font-bold transition"
                    style={{ backgroundColor: primaryColor, color: 'white' }}
                  >
                    Get Started
                  </button>
                </div>
              ))}
            </div>
          </div>
        </section>
      )}

      {/* Custom pages no longer render inline; they are dedicated pages at /#/page/:slug */}
      {config?.ctaVisible !== false && (
        <section
          className="py-20 px-4"
          style={{
            background: `linear-gradient(135deg, ${primaryColor} 0%, ${secondaryColor} 100%)`
          }}
        >
          <div className="max-w-4xl mx-auto text-center text-white">
            <h2 
              className="mb-4 font-bold"
              style={{ 
                fontSize: ctaTitleFontSize,
                fontWeight: ctaTitleFontWeight as any
              }}
            >
              {config?.ctaTitle || 'Ready to get started?'}
            </h2>
            <p 
              className="mb-8 text-blue-100"
              style={{ 
                fontSize: ctaSubtitleFontSize,
                fontWeight: ctaSubtitleFontWeight as any
              }}
            >
              {config?.ctaSubtitle || 'Join thousands of organizations using OneApp'}
            </p>
            <Link to="/login">
              <button className="bg-white text-blue-600 px-8 py-3 rounded-lg font-bold hover:bg-gray-100 transition text-lg">
                {config?.ctaButtonText || 'Start Free Trial'}
              </button>
            </Link>
          </div>
        </section>
      )}

      {/* Feedback Section */}
      <section className="py-20 px-4 bg-gray-50">
        <div className="max-w-4xl mx-auto">
          <div className="text-center mb-12">
            <h2 className="text-4xl font-bold mb-4">Share Your Feedback</h2>
            <p className="text-gray-600 text-lg">Help us improve by sharing your thoughts and suggestions</p>
          </div>

          {feedbackFormOpen ? (
            <FeedbackForm onClose={() => setFeedbackFormOpen(false)} />
          ) : (
            <button
              onClick={() => setFeedbackFormOpen(true)}
              className="w-full max-w-md mx-auto block px-8 py-3 rounded-lg font-bold transition"
              style={{ backgroundColor: primaryColor, color: 'white' }}
            >
              💬 Send Feedback
            </button>
          )}
        </div>
      </section>

      {/* Footer */}
      <footer className="bg-gray-900 text-white py-12 px-4">
        <div className="max-w-7xl mx-auto grid grid-cols-1 md:grid-cols-4 gap-8">
          <div>
            {config?.logoUrl ? (
              <img src={config.logoUrl} alt="Logo" className="h-8 mb-4" />
            ) : (
              <span className="text-xl font-bold">{appName}</span>
            )}
            <p className="text-gray-400 mt-4">{config?.heroSubtitle || 'Transform your data into insights'}</p>
          </div>
          {config?.footerLinks && config.footerLinks.map((link: any, idx: number) => (
            <div key={idx}>
              <h3 className="font-bold mb-4">{link.title}</h3>
              <ul className="space-y-2 text-gray-400">
                {link.items?.map((item: any, i: number) => (
                  <li key={i}><a href={item.link} className="hover:text-white">{item.label}</a></li>
                ))}
              </ul>
            </div>
          ))}
        </div>
        <div className="border-t border-gray-800 mt-8 pt-8 text-center text-gray-400">
          <p>&copy; 2024 {appName}. All rights reserved.</p>
        </div>
      </footer>
    </div>
  );
};

/**
 * Feature Card Component
 */
const FeatureCard: React.FC<{ icon: string; title: string; description: string }> = ({ icon, title, description }) => {
  return (
    <div className="bg-white p-8 rounded-lg shadow hover:shadow-lg transition">
      <div className="text-4xl mb-4">{icon}</div>
      <h3 className="text-xl font-bold mb-3">{title}</h3>
      <p className="text-gray-600">{description}</p>
    </div>
  );
};

/**
 * Feedback Form Component
 */
const FeedbackForm: React.FC<{ onClose: () => void }> = ({ onClose }) => {
  const [formData, setFormData] = useState({
    senderName: '',
    senderEmail: '',
    senderPhone: '',
    subject: '',
    message: ''
  });
  const [loading, setLoading] = useState(false);
  const [submitted, setSubmitted] = useState(false);
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
      const response = await fetch('/api/feedback', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(formData)
      });
      if (!response.ok) throw new Error('Failed to submit feedback');
      setSubmitted(true);
      setTimeout(() => onClose(), 2000);
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Failed to submit feedback');
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="max-w-2xl mx-auto bg-white rounded-lg shadow-lg p-8">
      {submitted ? (
        <div className="text-center py-12">
          <div className="text-5xl mb-4">✅</div>
          <h3 className="text-2xl font-bold mb-2">Thank you for your feedback!</h3>
          <p className="text-gray-600">We appreciate your input and will review it shortly.</p>
        </div>
      ) : (
        <form onSubmit={handleSubmit} className="space-y-4">
          {error && <div className="text-red-600 text-sm">{error}</div>}
          
          <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
            <input
              type="text"
              name="senderName"
              placeholder="Your Name"
              value={formData.senderName}
              onChange={handleChange}
              required
              className="px-4 py-2 border border-gray-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-blue-500"
            />
            <input
              type="email"
              name="senderEmail"
              placeholder="Your Email"
              value={formData.senderEmail}
              onChange={handleChange}
              required
              className="px-4 py-2 border border-gray-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-blue-500"
            />
          </div>

          <input
            type="tel"
            name="senderPhone"
            placeholder="Phone (optional)"
            value={formData.senderPhone}
            onChange={handleChange}
            className="w-full px-4 py-2 border border-gray-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-blue-500"
          />

          <input
            type="text"
            name="subject"
            placeholder="Subject"
            value={formData.subject}
            onChange={handleChange}
            className="w-full px-4 py-2 border border-gray-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-blue-500"
          />

          <textarea
            name="message"
            placeholder="Your message..."
            value={formData.message}
            onChange={handleChange}
            required
            rows={6}
            className="w-full px-4 py-2 border border-gray-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-blue-500"
          />

          <div className="flex gap-2">
            <button
              type="submit"
              disabled={loading}
              className="flex-1 bg-blue-600 text-white px-6 py-2 rounded-lg hover:bg-blue-700 disabled:opacity-50 font-medium"
            >
              {loading ? 'Sending...' : 'Send Feedback'}
            </button>
            <button
              type="button"
              onClick={onClose}
              className="px-6 py-2 border border-gray-300 rounded-lg text-gray-700 hover:bg-gray-50"
            >
              Cancel
            </button>
          </div>
        </form>
      )}
    </div>
  );
};

export default LandingPage;
