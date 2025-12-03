import React, { useEffect, useRef } from 'react';
import EditorJS from '@editorjs/editorjs';
import Header from '@editorjs/header';
import List from '@editorjs/list';
import Code from '@editorjs/code';
import Quote from '@editorjs/quote';
import Paragraph from '@editorjs/paragraph';
import Link from '@editorjs/link';
import Image from '@editorjs/image';
import '@editorjs/editorjs';

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
    const editorRef = useRef<EditorJS | null>(null);
    const isUpdatingRef = useRef(false);

    useEffect(() => {
        if (!containerRef.current) return;

        const initEditor = async () => {
            // Dynamically try to import optional plugins (marker, inline-code, table)
            let Marker: any = null;
            let InlineCode: any = null;
            let Table: any = null;
            try { Marker = (await eval('import("@editorjs/marker")')).default || (await eval('import("@editorjs/marker")')); } catch (e) { /* optional */ }
            try { InlineCode = (await eval('import("@editorjs/inline-code")')).default || (await eval('import("@editorjs/inline-code")')); } catch (e) { /* optional */ }
            try { Table = (await eval('import("@editorjs/table")')).default || (await eval('import("@editorjs/table")')); } catch (e) { /* optional */ }

            const tools: any = {
                header: Header,
                list: List,
                code: Code,
                quote: Quote,
                paragraph: Paragraph,
                linkTool: Link,
                image: {
                    class: Image,
                    config: {
                        endpoints: {
                            byFile: '/api/upload',
                            byUrl: '/api/fetchUrl',
                        },
                    },
                },
            };

            if (Marker) tools.marker = Marker;
            if (InlineCode) tools.inlineCode = InlineCode;
            if (Table) tools.table = Table;

            editorRef.current = new EditorJS({
                holder: containerRef.current!,
                tools,
                data: value ? JSON.parse(value) : undefined,
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
                editorRef.current.render(JSON.parse(value));
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
