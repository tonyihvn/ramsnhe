import React, { useEffect, useState } from 'react';

interface TinyMCEEditorProps {
    value?: string;
    onChange?: (html: string) => void;
    height?: number;
    placeholder?: string;
}

const TinyMCEEditor: React.FC<TinyMCEEditorProps> = ({ value = '', onChange, height = 300, placeholder = 'Enter text...' }) => {
    const [EditorComp, setEditorComp] = useState<any>(null);
    const [apiKey, setApiKey] = useState<string | null>(null);

    useEffect(() => {
        let mounted = true;
        (async () => {
            try {
                const mod = await import('@tinymce/tinymce-react');
                if (!mounted) return;
                // Wrap the imported Editor in a safe functional wrapper so its props are forwarded
                const EditorImpl = mod && (mod.Editor || (mod.default && mod.default.Editor) || mod.default || mod);
                if (EditorImpl) {
                    // create a wrapper functional component that forwards props to the real Editor
                    const Wrapper: React.FC<any> = (props) => {
                        // eslint-disable-next-line react/jsx-props-no-spreading
                        return React.createElement(EditorImpl, { ...props });
                    };
                    setEditorComp(() => Wrapper);
                }
            } catch (e) {
                // package not installed or failed to load
                console.error('Failed to load TinyMCE editor module', e);
            }
        })();
        // fetch TinyMCE API key from server env endpoint (if provided)
        (async () => {
            try {
                const r = await fetch('/api/tiny_mce_key');
                if (!r.ok) return;
                const j = await r.json();
                if (mounted) setApiKey(j && j.key ? j.key : null);
            } catch (e) { /* ignore */ }
        })();
        return () => { mounted = false; };
    }, []);

    const keyInvalid = !apiKey || (typeof apiKey === 'string' && apiKey.trim() === '') || apiKey === 'no-api-key';

    if (!EditorComp || keyInvalid) {
        return (
            <div>
                {!EditorComp ? (
                    <div className="text-xs text-gray-500 mb-2">TinyMCE not installed — using basic fallback.</div>
                ) : (
                    <div className="text-xs text-red-600 mb-2">TinyMCE disabled — no valid API key configured. Admins: set the TinyMCE API key in server settings to enable the full editor.</div>
                )}
                <textarea value={value} onChange={e => onChange?.(e.target.value)} placeholder={placeholder} style={{ width: '100%', minHeight: height, border: '1px solid #ccc', borderRadius: 4, padding: 8 }} />
            </div>
        );
    }

    // Render TinyMCE Editor
    return (
        <div>
            <EditorComp
                apiKey={apiKey || undefined}
                value={value}
                init={{
                    height,
                    menubar: false,
                    plugins: ['advlist', 'autolink', 'lists', 'link', 'image', 'charmap', 'preview', 'anchor', 'searchreplace', 'visualblocks', 'code', 'table', 'help', 'wordcount'],
                    toolbar: 'undo redo | formatselect | bold italic backcolor | alignleft aligncenter alignright alignjustify | bullist numlist outdent indent | removeformat | table | code',
                }}
                onEditorChange={(content: string) => onChange?.(content)}
            />
        </div>
    );
};

export default TinyMCEEditor;
