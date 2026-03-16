import React, { useState, useEffect } from 'react';
import Card from '../components/ui/Card';
import Button from '../components/ui/Button';
import Modal from '../components/ui/Modal';
import UnifiedRichTextEditor from '../components/ui/UnifiedRichTextEditor';
import { PencilIcon } from '@heroicons/react/24/outline';

interface LandingPageContent {
  id?: string;
  title: string;
  subtitle: string;
  hero_image_url?: string;
  hero_content: string;
  features_content: string;
  about_content: string;
  cta_button_text: string;
  cta_button_link: string;
  footer_content: string;
  updated_at?: string;
}

const LandingPageDesignerPage: React.FC = () => {
  const [content, setContent] = useState<LandingPageContent>({
    title: 'IntelliForm',
    subtitle: 'Intelligent Data Collection Platform',
    hero_content: '<h1>Welcome to IntelliForm</h1>',
    features_content: '<h2>Features</h2>',
    about_content: '<h2>About Us</h2>',
    cta_button_text: 'Get Started',
    cta_button_link: '#/login',
    footer_content: '<p>&copy; 2025 IntelliForm. All rights reserved.</p>'
  });
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);
  const [editingField, setEditingField] = useState<keyof LandingPageContent | null>(null);
  const [previewOpen, setPreviewOpen] = useState(false);

  useEffect(() => {
    fetchContent();
  }, []);

  const fetchContent = async () => {
    try {
      setLoading(true);
      const res = await fetch('/api/super-admin/landing-page-content', { credentials: 'include' });
      if (res.ok) {
        const data = await res.json();
        setContent(data || content);
      }
    } catch (err) {
      console.error('Failed to fetch landing page content', err);
    } finally {
      setLoading(false);
    }
  };

  const handleSave = async () => {
    try {
      setSaving(true);
      const res = await fetch('/api/super-admin/landing-page-content', {
        method: 'POST',
        credentials: 'include',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(content)
      });

      if (res.ok) {
        const data = await res.json();
        setContent(data);
        setEditingField(null);
        alert('Landing page content saved successfully!');
      } else {
        alert('Failed to save landing page content');
      }
    } catch (err) {
      console.error('Failed to save content', err);
      alert('Error saving content');
    } finally {
      setSaving(false);
    }
  };

  if (loading) {
    return <Card className="text-center text-gray-500">Loading landing page content...</Card>;
  }

  return (
    <div className="space-y-6">
      <div className="flex justify-between items-center">
        <h1 className="text-3xl font-bold text-gray-900">Landing Page Designer</h1>
        <div className="flex gap-2">
          <Button variant="secondary" onClick={() => setPreviewOpen(true)}>
            Preview
          </Button>
          <Button onClick={handleSave} disabled={saving}>
            {saving ? 'Saving...' : 'Save Changes'}
          </Button>
        </div>
      </div>

      <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
        {/* Left Column: Basic Info */}
        <Card className="space-y-4">
          <h2 className="text-lg font-semibold text-gray-900">Basic Information</h2>

          <div>
            <label className="block text-sm font-medium text-gray-700 mb-1">Site Title</label>
            <input
              type="text"
              value={content.title}
              onChange={(e) => setContent({ ...content, title: e.target.value })}
              className="w-full border border-gray-300 rounded px-3 py-2"
            />
          </div>

          <div>
            <label className="block text-sm font-medium text-gray-700 mb-1">Subtitle</label>
            <input
              type="text"
              value={content.subtitle}
              onChange={(e) => setContent({ ...content, subtitle: e.target.value })}
              className="w-full border border-gray-300 rounded px-3 py-2"
            />
          </div>

          <div>
            <label className="block text-sm font-medium text-gray-700 mb-1">Hero Image URL</label>
            <input
              type="url"
              value={content.hero_image_url || ''}
              onChange={(e) => setContent({ ...content, hero_image_url: e.target.value })}
              className="w-full border border-gray-300 rounded px-3 py-2"
              placeholder="https://..."
            />
          </div>

          <div>
            <label className="block text-sm font-medium text-gray-700 mb-1">CTA Button Text</label>
            <input
              type="text"
              value={content.cta_button_text}
              onChange={(e) => setContent({ ...content, cta_button_text: e.target.value })}
              className="w-full border border-gray-300 rounded px-3 py-2"
            />
          </div>

          <div>
            <label className="block text-sm font-medium text-gray-700 mb-1">CTA Button Link</label>
            <input
              type="text"
              value={content.cta_button_link}
              onChange={(e) => setContent({ ...content, cta_button_link: e.target.value })}
              className="w-full border border-gray-300 rounded px-3 py-2"
              placeholder="#/login"
            />
          </div>
        </Card>

        {/* Right Column: Content Sections */}
        <Card className="space-y-4">
          <h2 className="text-lg font-semibold text-gray-900">Content Sections</h2>
          <div className="space-y-2">
            {['hero_content', 'features_content', 'about_content', 'footer_content'].map((field) => (
              <button
                key={field}
                onClick={() => setEditingField(field as keyof LandingPageContent)}
                className="w-full text-left px-3 py-2 rounded border border-gray-300 hover:bg-gray-50 flex items-center justify-between group"
              >
                <span className="font-medium text-gray-900">
                  {field === 'hero_content' && 'Hero Section'}
                  {field === 'features_content' && 'Features Section'}
                  {field === 'about_content' && 'About Section'}
                  {field === 'footer_content' && 'Footer Section'}
                </span>
                <PencilIcon className="h-4 w-4 text-gray-400 group-hover:text-gray-600" />
              </button>
            ))}
          </div>
        </Card>
      </div>

      {/* Rich Editor Modal */}
      <Modal
        isOpen={editingField !== null}
        onClose={() => setEditingField(null)}
        title={`Edit ${editingField === 'hero_content' ? 'Hero' : editingField === 'features_content' ? 'Features' : editingField === 'about_content' ? 'About' : 'Footer'} Section`}
        size="4xl"
      >
        {editingField && (
          <div className="space-y-4">
            <UnifiedRichTextEditor
              value={content[editingField] as string}
              onChange={(val) => setContent({ ...content, [editingField]: val })}
              height={400}
            />
            <div className="flex gap-2 justify-end">
              <Button variant="secondary" onClick={() => setEditingField(null)}>
                Done
              </Button>
            </div>
          </div>
        )}
      </Modal>

      {/* Preview Modal */}
      <Modal
        isOpen={previewOpen}
        onClose={() => setPreviewOpen(false)}
        title="Landing Page Preview"
        size="4xl"
      >
        <div className="space-y-6 max-h-96 overflow-y-auto">
          {/* Hero Section */}
          <div className="bg-gradient-to-r from-blue-600 to-blue-800 text-white p-8 rounded-lg">
            <h1 className="text-4xl font-bold mb-2">{content.title}</h1>
            <p className="text-xl mb-6">{content.subtitle}</p>
            {content.hero_image_url && (
              <img src={content.hero_image_url} alt="Hero" className="mb-4 max-h-48 rounded" />
            )}
            <div className="prose prose-invert max-w-none" dangerouslySetInnerHTML={{ __html: content.hero_content }} />
            <a
              href={content.cta_button_link}
              className="inline-block mt-6 px-6 py-3 bg-white text-blue-600 rounded-lg font-semibold hover:bg-gray-100"
            >
              {content.cta_button_text}
            </a>
          </div>

          {/* Features Section */}
          <div className="prose max-w-none" dangerouslySetInnerHTML={{ __html: content.features_content }} />

          {/* About Section */}
          <div className="prose max-w-none" dangerouslySetInnerHTML={{ __html: content.about_content }} />

          {/* Footer Section */}
          <div className="prose max-w-none border-t pt-6" dangerouslySetInnerHTML={{ __html: content.footer_content }} />
        </div>
      </Modal>
    </div>
  );
};

export default LandingPageDesignerPage;
