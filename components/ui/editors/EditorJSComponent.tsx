import React, { useEffect, useRef } from 'react';

interface EditorJSComponentProps {
    value?: string;
    onChange?: (html: string) => void;
    height?: number;
}

const EditorJSComponent: React.FC<EditorJSComponentProps> = ({
    value = '',
    onChange,
    height = 300,
}) => {
    const containerRef = useRef<HTMLDivElement | null>(null);
    const editorRef = useRef<any | null>(null);
    const isUpdatingRef = useRef(false);

    useEffect(() => {
        if (!containerRef.current) return;

            const initEditor = async () => {
                // dynamic import core and tools to tolerate different bundler/module shapes
                let EditorJsCtor: any = null;
                let Header: any = null;
                let List: any = null;
                let Code: any = null;
                let Quote: any = null;
                let Paragraph: any = null;
                let Link: any = null;
                let Image: any = null;
                try {
                    const m = await import('@editorjs/editorjs');
                    EditorJsCtor = m?.default || m;
                } catch (e) {
                    console.error('Failed to import EditorJS core', e);
                    return;
                }

                // import tools (best-effort)
                try { const m = await import('@editorjs/header'); Header = m?.default || m; } catch (e) { /* optional */ }
                try { const m = await import('@editorjs/list'); List = m?.default || m; } catch (e) { /* optional */ }
                try { const m = await import('@editorjs/code'); Code = m?.default || m; } catch (e) { /* optional */ }
                try { const m = await import('@editorjs/quote'); Quote = m?.default || m; } catch (e) { /* optional */ }
                try { const m = await import('@editorjs/paragraph'); Paragraph = m?.default || m; } catch (e) { /* optional */ }
                try { const m = await import('@editorjs/link'); Link = m?.default || m; } catch (e) { /* optional */ }
                try { const m = await import('@editorjs/image'); Image = m?.default || m; } catch (e) { /* optional */ }

                // optional extras
                let Marker: any = null;
                let InlineCode: any = null;
                let Table: any = null;
                try { const m = await import('@editorjs/marker'); Marker = m?.default || m; } catch (e) { /* optional */ }
                try { const m = await import('@editorjs/inline-code'); InlineCode = m?.default || m; } catch (e) { /* optional */ }
                try { const m = await import('@editorjs/table'); Table = m?.default || m; } catch (e) { /* optional */ }

                const tools: any = {};
                if (Header) tools.header = Header;
                if (List) tools.list = List;
                if (Code) tools.code = Code;
                if (Quote) tools.quote = Quote;
                if (Paragraph) tools.paragraph = Paragraph;
                if (Link) tools.linkTool = Link;
                if (Image) tools.image = {
                    class: Image,
                    config: {
                        endpoints: { byFile: '/api/upload', byUrl: '/api/fetchUrl' }
                    }
                };
                if (Marker) tools.marker = Marker;
                if (InlineCode) tools.inlineCode = InlineCode;
                if (Table) tools.table = Table;

                // prepare initial data: try parsing JSON, fall back to paragraph block containing raw HTML/text
                let initialData: any = undefined;
                if (value) {
                    try {
                        initialData = JSON.parse(value);
                    } catch (e) {
                        initialData = { time: Date.now(), blocks: [{ type: 'paragraph', data: { text: String(value) } }] };
                    }
                }

                try {
                    editorRef.current = new EditorJsCtor({
                        holder: containerRef.current!,
                        tools,
                        data: initialData,
                        onChange: async () => {
                            if (isUpdatingRef.current) return;
                            try {
                                const data = await editorRef.current?.save();
                                onChange?.(JSON.stringify(data));
                            } catch (e) {
                                console.error('Editor.js save error:', e);
                            }
                        },
                        autofocus: false,
                        inlineToolbar: true,
                    });
                } catch (e) {
                    console.error('Failed to initialize EditorJS instance', e);
                }
            };

        initEditor();

        return () => {
            if (editorRef.current && editorRef.current.destroy) {
                editorRef.current.destroy();
            }
        };
    }, []);

    // Update content when value prop changes
    useEffect(() => {
        if (!editorRef.current || isUpdatingRef.current) return;
        if (value) {
            try {
                isUpdatingRef.current = true;
                let parsed: any = null;
                try { parsed = JSON.parse(value); } catch (e) { parsed = { time: Date.now(), blocks: [{ type: 'paragraph', data: { text: String(value) } }] }; }
                // render expects Editor.js data object
                if (editorRef.current && typeof editorRef.current.render === 'function') {
                    editorRef.current.render(parsed);
                }
                isUpdatingRef.current = false;
            } catch (e) {
                console.error('Failed to update Editor.js content:', e);
                isUpdatingRef.current = false;
            }
        }
    }, [value]);

    return (
        <div
            ref={containerRef}
            style={{
                height: `${height}px`,
                border: '1px solid #ccc',
                borderRadius: '4px',
                backgroundColor: 'white',
                overflow: 'auto',
                padding: '12px',
            }}
            className="ce-block-content"
        />
    );
};

export default EditorJSComponent;
