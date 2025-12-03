import React, { useEffect, useState } from 'react';

interface TinyMCEEditorProps {
    value?: string;
    onChange?: (html: string) => void;
    height?: number;
    placeholder?: string;
}

const TinyMCEEditor: React.FC<TinyMCEEditorProps> = ({ value = '', onChange, height = 300, placeholder = 'Enter text...' }) => {
    const [EditorComp, setEditorComp] = useState<any>(null);

    useEffect(() => {
        let mounted = true;
        (async () => {
            try {
                const mod = await import('@tinymce/tinymce-react');
                if (!mounted) return;
                // Editor is a named export
                setEditorComp(mod.Editor || mod.default || mod);
            } catch (e) {
                // package not installed or failed to load
            }
        })();
        return () => { mounted = false; };
    }, []);

    if (!EditorComp) {
        return (
            <div>
                <div className="text-xs text-gray-500 mb-2">TinyMCE not installed — using basic fallback.</div>
                <textarea value={value} onChange={e => onChange?.(e.target.value)} placeholder={placeholder} style={{ width: '100%', minHeight: height, border: '1px solid #ccc', borderRadius: 4, padding: 8 }} />
            </div>
        );
    }

    // Render TinyMCE Editor
    return (
        <div>
            <EditorComp
                tinymceScriptSrc={undefined}
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
