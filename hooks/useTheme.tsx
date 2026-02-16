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
    logoText: 'DQAi'
    , fontSize: '14px'
    , logoWidth: '100%'
    , organizationName: 'Federal Ministry of Health and Social Welfare (FMOH&SW)'
    , backgroundImage: null
};

const STORAGE_KEY = 'intelliform_theme_settings_backup';

const ThemeContext = createContext<{
    settings: ThemeSettings;
    setSettings: (s: Partial<ThemeSettings>) => void;
    reset: () => void;
    isLoading: boolean;
} | undefined>(undefined);

export const ThemeProvider = ({ children }: { children: ReactNode }) => {
    // Initialize from localStorage (backup cache) for instant load
    const [settings, setSettingsState] = useState<ThemeSettings>(() => {
        try {
            const cached = localStorage.getItem(STORAGE_KEY);
            if (cached) return JSON.parse(cached);
        } catch (e) {
            console.warn('Failed to load cached settings from localStorage');
        }
        return DEFAULT;
    });
    const [isAdmin, setIsAdmin] = useState(false);
    const [isLoading, setIsLoading] = useState(true);
    const saveTimer = React.useRef<number | null>(null);

    useEffect(() => {
        // Persist settings to localStorage (backup cache)
        try {
            localStorage.setItem(STORAGE_KEY, JSON.stringify(settings));
        } catch (e) {
            console.warn('Failed to save settings to localStorage:', e);
        }
    }, [settings]);

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
    }, [settings]);

    // Load theme settings from database (for all users - ensures consistency across systems)
    // Overwrites localStorage cache with API data when available
    useEffect(() => {
        const loadSettings = async () => {
            setIsLoading(true);
            try {
                // First, check user role to determine if admin
                let isUserAdmin = false;
                try {
                    const userRes = await fetch('/api/current_user', { credentials: 'include' });
                    if (userRes.ok) {
                        const userData = await userRes.json();
                        const role = (userData && (userData.role || '')).toString().toLowerCase();
                        isUserAdmin = role === 'admin' || role === 'super-admin' || role === 'super_admin';
                    }
                } catch (e) {
                    console.warn('Failed to check user role:', e);
                }
                setIsAdmin(isUserAdmin);

                // Load theme settings from database (all users can read)
                try {
                    const settingsRes = await fetch('/api/app/settings', { credentials: 'include' });
                    if (settingsRes.ok) {
                        const payload = await settingsRes.json();
                        if (payload && typeof payload === 'object') {
                            const merge: Partial<ThemeSettings> = {};
                            // Extract theme-related keys from the payload
                            if (payload.theme && typeof payload.theme === 'object') {
                                // If server returns a 'theme' key with theme object
                                Object.assign(merge, payload.theme);
                            } else {
                                // Look for top-level theme property keys
                                const themeKeys = ['primaryColor', 'sidebarBg', 'navTextColor', 'logoColor', 'textColor', 'fontFamily', 'navbarBg', 'logoDataUrl', 'logoText', 'fontSize', 'logoWidth', 'organizationName', 'backgroundImage'];
                                themeKeys.forEach(k => {
                                    if (k in payload) (merge as any)[k] = (payload as any)[k];
                                });
                            }
                            if (Object.keys(merge).length > 0) {
                                // Update settings from database (will auto-save to localStorage via useEffect)
                                setSettingsState(prev => ({ ...prev, ...merge }));
                            }
                        }
                    }
                } catch (e) {
                    console.warn('Failed to load theme settings from database:', e);
                    // Settings remain as cached from localStorage (fallback)
                }
            } catch (e) {
                console.warn('Failed to load settings:', e);
                // Settings remain as cached from localStorage (fallback)
            } finally {
                setIsLoading(false);
            }
        };
        loadSettings();
    }, []);

    // Debounced autosave: persist theme settings to database (admin only)
    // All users load settings from database, but only admins can save
    const persistToServer = async (toSave: ThemeSettings) => {
        if (!isAdmin) return; // Only admins can persist changes
        try {
            const res = await fetch('/api/admin/settings', {
                method: 'POST',
                credentials: 'include',
                headers: { 'Content-Type': 'application/json' },
                body: JSON.stringify(toSave)
            });
            if (!res.ok) {
                console.warn('Failed to persist theme settings to database');
            }
        } catch (e) {
            console.warn('Failed to persist theme settings:', e);
        }
    };

    const setSettings = (patch: Partial<ThemeSettings>) => {
        setSettingsState(prev => {
            const next = ({ ...prev, ...patch });
            if (isAdmin) {
                if (saveTimer.current) window.clearTimeout(saveTimer.current);
                // Debounce 1.5s before saving to database
                saveTimer.current = window.setTimeout(() => { persistToServer(next); saveTimer.current = null; }, 1500) as unknown as number;
            }
            return next;
        });
    };

    const reset = () => {
        const defaultSettings = DEFAULT;
        setSettingsState(defaultSettings);
        // If admin, also save reset to database
        if (isAdmin) {
            persistToServer(defaultSettings);
        }
    };

    return (
        <ThemeContext.Provider value={{ settings, setSettings, reset, isLoading }}>
            {children}
        </ThemeContext.Provider>
    );
};

export const useTheme = () => {
    const ctx = useContext(ThemeContext);
    if (!ctx) throw new Error('useTheme must be used inside ThemeProvider');
    return ctx;
};

export type ThemeContextType = {
    settings: ThemeSettings;
    setSettings: (s: Partial<ThemeSettings>) => void;
    reset: () => void;
    isLoading: boolean;
};

export type { ThemeSettings };
