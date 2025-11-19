import React from 'react';
import Card from '../components/ui/Card';
import Button from '../components/ui/Button';
import { useTheme } from '../hooks/useTheme';

const SettingsPage: React.FC = () => {
    const { settings, setSettings, reset } = useTheme();
    const handleLogoUpload = (e: React.ChangeEvent<HTMLInputElement>) => {
        const f = e.target.files?.[0];
        if (!f) return;
        const reader = new FileReader();
        reader.onload = (ev) => {
            const dataUrl = ev.target?.result as string;
            setSettings({ logoDataUrl: dataUrl });
        };
        reader.readAsDataURL(f);
    };

    return (
        <div className="space-y-6">
            <div className="flex items-center justify-between">
                <h1 className="text-2xl font-bold">Appearance & Theme Settings</h1>
            </div>

            <Card>
                <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
                    <div>
                        <label className="block text-sm font-medium text-gray-700">Primary Color</label>
                        <input type="color" value={settings.primaryColor} onChange={e => setSettings({ primaryColor: e.target.value })} className="mt-2" />
                    </div>

                    <div>
                        <label className="block text-sm font-medium text-gray-700">Sidebar Background</label>
                        <input type="color" value={settings.sidebarBg} onChange={e => setSettings({ sidebarBg: e.target.value })} className="mt-2" />
                    </div>

                    <div>
                        <label className="block text-sm font-medium text-gray-700">Navbar / Nav Text Color</label>
                        <input type="color" value={settings.navTextColor} onChange={e => setSettings({ navTextColor: e.target.value })} className="mt-2" />
                    </div>

                    <div>
                        <label className="block text-sm font-medium text-gray-700">Logo Color</label>
                        <input type="color" value={settings.logoColor} onChange={e => setSettings({ logoColor: e.target.value })} className="mt-2" />
                    </div>

                    <div>
                        <label className="block text-sm font-medium text-gray-700">Navbar Background</label>
                        <input type="color" value={settings.navbarBg} onChange={e => setSettings({ navbarBg: e.target.value })} className="mt-2" />
                    </div>

                    <div>
                        <label className="block text-sm font-medium text-gray-700">Upload Logo</label>
                        <input type="file" accept="image/*" onChange={handleLogoUpload} className="mt-2" />
                        <p className="text-xs text-gray-500">Uploaded logo will be stored in browser localStorage (data URL).</p>
                    </div>

                    <div>
                        <label className="block text-sm font-medium text-gray-700">Logo Text</label>
                        <input type="text" value={settings.logoText} onChange={e => setSettings({ logoText: e.target.value })} className="mt-2 block w-full p-2 border rounded" />
                    </div>

                    <div>
                        <label className="block text-sm font-medium text-gray-700">Text Color</label>
                        <input type="color" value={settings.textColor} onChange={e => setSettings({ textColor: e.target.value })} className="mt-2" />
                    </div>

                    <div>
                        <label className="block text-sm font-medium text-gray-700">Font Family</label>
                        <input type="text" value={settings.fontFamily} onChange={e => setSettings({ fontFamily: e.target.value })} className="mt-2 block w-full p-2 border rounded" />
                    </div>
                </div>

                <div className="mt-6 flex space-x-3">
                    <Button onClick={() => reset()}>Reset to Defaults</Button>
                    <Button variant="secondary" onClick={() => alert('Theme saved to localStorage')}>Save</Button>
                </div>
            </Card>

            <Card>
                <h3 className="text-lg font-medium mb-2">Preview</h3>
                <div className="p-4 rounded" style={{ background: 'var(--sidebar-bg)', color: 'var(--app-text-color)' }}>
                    <div style={{ color: 'var(--logo-color)', fontWeight: 700 }}>DQAPlus (Logo)</div>
                    <p>Primary accent: <span style={{ color: 'var(--primary-color)' }}>{settings.primaryColor}</span></p>
                </div>
            </Card>
        </div>
    );
};

export default SettingsPage;
