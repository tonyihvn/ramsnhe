import React, { useRef, useEffect, useState } from 'react';

interface CkEditorProps {
    value?: string;
    onChange?: (html: string) => void;
    height?: number;
    placeholder?: string;
}

const CkEditorEditor: React.FC<CkEditorProps> = ({ value = '', onChange, height = 300, placeholder = 'Enter text...' }) => {
    const [isReady, setIsReady] = useState(false);
    const CKEditorRef = useRef<any>(null);
    const ClassicEditorRef = useRef<any>(null);

    useEffect(() => {
        let mounted = true;
        (async () => {
            try {
                const ck = await import('@ckeditor/ckeditor5-react');
                const build = await import('@ckeditor/ckeditor5-build-classic');
                if (!mounted) return;
                CKEditorRef.current = ck.CKEditor;
                ClassicEditorRef.current = build.default || build;
                setIsReady(true);
            } catch (e) {
                // not installed or failed to load
                if (mounted) setIsReady(false);
            }
        })();
        return () => { mounted = false; };
    }, []);

    if (!isReady || !CKEditorRef.current || !ClassicEditorRef.current) {
        return (
            <div>
                <div className="text-xs text-gray-500 mb-2">CKEditor not installed — using basic fallback.</div>
                <textarea value={value} onChange={e => onChange?.(e.target.value)} placeholder={placeholder} style={{ width: '100%', minHeight: height, border: '1px solid #ccc', borderRadius: 4, padding: 8 }} />
            </div>
        );
    }

    // If the incoming value looks like Editor.js JSON, attempt to extract text blocks
    let dataForEditor: string = value || '';
    if (value && typeof value === 'string') {
        try {
            const parsed = JSON.parse(value);
            if (parsed && parsed.blocks && Array.isArray(parsed.blocks)) {
                // join block texts into a simple HTML fallback
                dataForEditor = parsed.blocks.map((b: any) => (b?.data?.text ?? '')).join('<p></p>') || '';
            }
        } catch (e) {
            // not JSON, assume HTML string — ok
        }
    }

    const CKEditor = CKEditorRef.current;
    const ClassicEditor = ClassicEditorRef.current;

    return (
        <div>
            <CKEditor
                editor={ClassicEditor}
                data={dataForEditor}
                onChange={(event: any, editor: any) => { const data = editor.getData(); onChange?.(data); }}
            />
        </div>
    );
};

export default CkEditorEditor;
