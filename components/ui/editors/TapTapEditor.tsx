import React, { useEffect, useRef, useState } from 'react';

interface TapTapEditorProps {
    value?: string;
    onChange?: (html: string) => void;
    height?: number;
    placeholder?: string;
}

// Lightweight Tiptap/TapTap wrapper that dynamically imports @tiptap/react
// If the package isn't installed, it renders a fallback textarea with a message.
const TapTapEditor: React.FC<TapTapEditorProps> = ({ value = '', onChange, height = 300, placeholder = 'Enter text...' }) => {
    const editorRef = useRef<any>(null);
    const containerRef = useRef<HTMLDivElement | null>(null);
    const [ready, setReady] = useState(false);

    useEffect(() => {
        let mounted = true;
        (async () => {
            try {
                // Import core Editor class and starter kit
                const core = await import('@tiptap/core');
                const StarterKitMod = await import('@tiptap/starter-kit');
                const EditorClass = (core && (core.Editor || (core as any).default)) as any;
                const StarterKit = StarterKitMod && (StarterKitMod.default || StarterKitMod) as any;
                if (!mounted || !containerRef.current || !EditorClass || !StarterKit) return;
                editorRef.current = new EditorClass({
                    element: containerRef.current,
                    extensions: [StarterKit()],
                    content: value || '',
                    onUpdate: ({ editor }: any) => {
                        try { onChange?.(editor.getHTML()); } catch (e) { /* ignore */ }
                    },
                });
                setReady(true);
            } catch (e) {
                // package not available — nothing to do, fallback will be visible
                setReady(false);
            }
        })();
        return () => { mounted = false; if (editorRef.current && editorRef.current.destroy) try { editorRef.current.destroy(); } catch (e) { } };
    }, []);

    // If module not loaded, show fallback textarea until ready
    return (
        <div style={{ minHeight: height }}>
            <div ref={containerRef} />
            {!ready && (
                <div>
                    <div className="text-xs text-gray-500 mb-2">TapTap editor not installed or initializing — using simple fallback.</div>
                    <textarea value={value} onChange={e => onChange?.(e.target.value)} placeholder={placeholder} style={{ width: '100%', minHeight: height, border: '1px solid #ccc', borderRadius: 4, padding: 8 }} />
                </div>
            )}
        </div>
    );
};

export default TapTapEditor;
