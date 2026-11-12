import React from 'react';
import { useTheme } from '../../hooks/useTheme';

const SimpleHeader: React.FC<{ title?: string }> = ({ title }) => {
    const { settings } = useTheme();

    return (
        <header className="bg-white shadow-sm border-b" style={{ backgroundColor: 'var(--topbar-bg)', borderColor: 'var(--border-color)' }}>
            <div className="px-4 sm:px-6 lg:px-8 h-16 flex items-center justify-between">
                {/* Logo */}
                <div className="flex items-center gap-2">
                    {settings.logoDataUrl ? (
                        <img 
                            src={settings.logoDataUrl} 
                            alt="logo" 
                            style={{ height: 'var(--logo-width)', maxHeight: 40, objectFit: 'contain' }}
                        />
                    ) : (
                        <div 
                            style={{ 
                                color: 'var(--logo-color)', 
                                fontWeight: 700, 
                                fontSize: 'var(--app-font-size)' 
                            }}
                        >
                            {settings.logoText || 'DQAi'}
                        </div>
                    )}
                </div>

                {/* Title if provided */}
                {title && (
                    <div className="text-center flex-1">
                        <h1 
                            className="text-lg font-semibold" 
                            style={{ color: 'var(--topbar-text)' }}
                        >
                            {title}
                        </h1>
                    </div>
                )}

                {/* Spacer */}
                <div style={{ width: 40 }} />
            </div>
        </header>
    );
};

export default SimpleHeader;
