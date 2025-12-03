import React, { useEffect, useState } from 'react';

interface CkEditorProps {
    value?: string;
    onChange?: (html: string) => void;
    height?: number;
    placeholder?: string;
}

const CkEditorEditor: React.FC<CkEditorProps> = ({ value = '', onChange, height = 300, placeholder = 'Enter text...' }) => {
    const [CKEditorComp, setCKEditorComp] = useState<any>(null);
    const [ClassicEditor, setClassicEditor] = useState<any>(null);

    useEffect(() => {
        let mounted = true;
        (async () => {
            try {
                const ck = await import('@ckeditor/ckeditor5-react');
                const build = await import('@ckeditor/ckeditor5-build-classic');
                if (!mounted) return;
                setCKEditorComp(ck.CKEditor || ck.default || ck);
                setClassicEditor(build.default || build);
            } catch (e) {
                // not installed or failed to load
            }
        })();
        return () => { mounted = false; };
    }, []);

    if (!CKEditorComp || !ClassicEditor) {
        return (
            <div>
                <div className="text-xs text-gray-500 mb-2">CKEditor not installed — using basic fallback.</div>
                <textarea value={value} onChange={e => onChange?.(e.target.value)} placeholder={placeholder} style={{ width: '100%', minHeight: height, border: '1px solid #ccc', borderRadius: 4, padding: 8 }} />
            </div>
        );
    }

    return (
        <div>
            <CKEditorComp
                editor={ClassicEditor}
                data={value}
                onChange={(event: any, editor: any) => { const data = editor.getData(); onChange?.(data); }}
            />
        </div>
    );
};

export default CkEditorEditor;
