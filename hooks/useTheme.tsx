import React, { createContext, useContext, useEffect, useState, ReactNode } from 'react';

type ThemeSettings = {
    primaryColor: string;
    sidebarBg: string;
    navTextColor: string;
    logoColor: string;
    textColor: string;
    fontFamily: string;
    navbarBg?: string;
    logoDataUrl?: string | null;
    logoText?: string;
    fontSize?: string;
    logoWidth?: string;
    organizationName?: string;
    backgroundImage?: string | null;
};

const DEFAULT: ThemeSettings = {
    primaryColor: '#3b82f6',
    sidebarBg: '#ffffff',
    navTextColor: '#111827',
    logoColor: '#111827',
    textColor: '#111827',
    fontFamily: 'Inter, system-ui, -apple-system, "Segoe UI", Roboto, "Helvetica Neue", Arial'
    , navbarBg: '#ffffff',
    logoDataUrl: null,
    logoText: 'OneApp'
    , fontSize: '14px'
    , logoWidth: '100%'
    , organizationName: 'Federal Ministry of Health and Social Welfare (FMOH&SW)'
    , backgroundImage: null
};

const STORAGE_KEY = 'intelliform_theme_settings_v1';

const ThemeContext = createContext<{
    settings: ThemeSettings;
    setSettings: (s: Partial<ThemeSettings>) => void;
    reset: () => void;
} | undefined>(undefined);

export const ThemeProvider = ({ children }: { children: ReactNode }) => {
    const [settings, setSettingsState] = useState<ThemeSettings>(() => {
        try {
            const raw = localStorage.getItem(STORAGE_KEY);
            return raw ? JSON.parse(raw) : DEFAULT;
        } catch (e) {
            return DEFAULT;
        }
    });
    const [isAdmin, setIsAdmin] = useState(false);
    const saveTimer = React.useRef<number | null>(null);

    useEffect(() => {
        // Apply CSS variables to :root
        const root = document.documentElement;
        root.style.setProperty('--primary-color', settings.primaryColor);
        root.style.setProperty('--sidebar-bg', settings.sidebarBg);
        root.style.setProperty('--nav-text-color', settings.navTextColor);
        root.style.setProperty('--logo-color', settings.logoColor);
        root.style.setProperty('--app-text-color', settings.textColor);
        root.style.setProperty('--app-font-family', settings.fontFamily);
        root.style.setProperty('--app-font-size', (settings as any).fontSize || '14px');
        root.style.setProperty('--logo-width', (settings as any).logoWidth || '40px');
        root.style.setProperty('--navbar-bg', settings.navbarBg || '#ffffff');
        // Apply absolute font-size to root so most elements scale if they don't reference the CSS var
        try { root.style.fontSize = (settings as any).fontSize || '14px'; } catch (e) { }
        if (settings.logoDataUrl) root.style.setProperty('--logo-image', `url(${settings.logoDataUrl})`);
        root.dataset.logoText = settings.logoText || '';
        try { localStorage.setItem(STORAGE_KEY, JSON.stringify(settings)); } catch (e) { }
    }, [settings]);

    // Determine if current user is admin to enable auto-save AND load persisted settings
    useEffect(() => {
        (async () => {
            try {
                const r = await fetch('/api/current_user', { credentials: 'include' });
                if (!r.ok) { setIsAdmin(false); return; }
                const j = await r.json();
                const role = (j && (j.role || '')).toString().toLowerCase();
                const isAdminUser = role === 'admin' || role === 'super-admin' || role === 'super_admin';
                setIsAdmin(isAdminUser);
                
                // If admin, load persisted settings from server
                if (isAdminUser) {
                    try {
                        const settingsRes = await fetch('/api/admin/settings', { credentials: 'include' });
                        if (!settingsRes.ok) return;
                        const payload = await settingsRes.json();
                        if (!payload) return;
                        // payload is { key: value } mapping; merge keys that match ThemeSettings
                        const merge: Partial<ThemeSettings> = {};
                        // common theme keys live at top-level in the settings object; if server saved the whole theme object, it may be returned directly
                        if (typeof payload === 'object' && !Array.isArray(payload)) {
                            // if payload looks like a theme object directly (has primaryColor), merge it
                            if (payload.primaryColor) {
                                Object.assign(merge, payload);
                            } else if (payload.theme) {
                                Object.assign(merge, payload.theme);
                            } else {
                                // sometimes settings stored top-level — pick known keys
                                ['primaryColor','sidebarBg','navTextColor','logoColor','textColor','fontFamily','navbarBg','logoDataUrl','logoText','fontSize','logoWidth','organizationName','backgroundImage'].forEach(k => {
                                    if (k in payload) (merge as any)[k] = (payload as any)[k];
                                });
                                // also if server returned many keys and one is 'theme', prefer that
                                if (payload.settings && typeof payload.settings === 'object') Object.assign(merge, payload.settings);
                            }
                        }
                        if (Object.keys(merge).length) setSettingsState(prev => ({ ...prev, ...merge }));
                    } catch (e) { /* ignore settings fetch */ }
                }
            } catch (e) { setIsAdmin(false); }
        })();
    }, []);

    // Debounced autosave: if admin, persist theme to server after changes
    const persistToServer = async (toSave: ThemeSettings) => {
        try {
            // Try admin endpoint first, ignore errors silently
            await fetch('/api/admin/settings', { method: 'POST', credentials: 'include', headers: { 'Content-Type': 'application/json' }, body: JSON.stringify(toSave) }).catch(() => {});
        } catch (e) { /* ignore saving errors silently */ }
    };

    const setSettings = (patch: Partial<ThemeSettings>) => {
        setSettingsState(prev => {
            const next = ({ ...prev, ...patch });
            try {
                if (isAdmin) {
                    if (saveTimer.current) window.clearTimeout(saveTimer.current);
                    // debounce 1.5s
                    saveTimer.current = window.setTimeout(() => { persistToServer(next); saveTimer.current = null; }, 1500) as unknown as number;
                }
            } catch (e) { /* ignore */ }
            return next;
        });
    };

    const reset = () => setSettingsState(DEFAULT);

    return (
        <ThemeContext.Provider value={{ settings, setSettings, reset }}>
            {children}
        </ThemeContext.Provider>
    );
};

export const useTheme = () => {
    const ctx = useContext(ThemeContext);
    if (!ctx) throw new Error('useTheme must be used inside ThemeProvider');
    return ctx;
};

export type { ThemeSettings };
