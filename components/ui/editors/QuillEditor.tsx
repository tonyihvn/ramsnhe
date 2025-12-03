import React, { useEffect, useRef } from 'react';
import Quill from 'quill';
import 'quill/dist/quill.snow.css';

interface QuillEditorProps {
    value?: string;
    onChange?: (html: string) => void;
    height?: number;
    placeholder?: string;
}

const QuillEditor: React.FC<QuillEditorProps> = ({
    value = '',
    onChange,
    height = 300,
    placeholder = 'Enter text...',
}) => {
    const containerRef = useRef<HTMLDivElement | null>(null);
    const quillRef = useRef<Quill | null>(null);
    const isUpdatingRef = useRef(false);

    useEffect(() => {
        if (!containerRef.current) return;

        // Initialize Quill
        quillRef.current = new Quill(containerRef.current, {
            theme: 'snow',
            placeholder,
            modules: {
                toolbar: [
                    ['bold', 'italic', 'underline', 'strike'],
                    ['blockquote', 'code-block'],
                    [{ 'header': 1 }, { 'header': 2 }],
                    [{ 'list': 'ordered' }, { 'list': 'bullet' }],
                    [{ 'script': 'sub' }, { 'script': 'super' }],
                    [{ 'indent': '-1' }, { 'indent': '+1' }],
                    [{ 'size': ['small', false, 'large', 'huge'] }],
                    [{ 'header': [false, 1, 2, 3, 4, 5, 6] }],
                    [{ 'color': [] }, { 'background': [] }],
                    [{ 'align': [] }],
                    ['clean'],
                    ['link', 'image', 'video'],
                ],
            },
        });

        // Set initial content
        if (value) {
            isUpdatingRef.current = true;
            quillRef.current.root.innerHTML = value;
            isUpdatingRef.current = false;
        }

        // Handle changes
        const handleChange = () => {
            if (isUpdatingRef.current) return;
            const html = quillRef.current?.root.innerHTML || '';
            onChange?.(html);
        };

        quillRef.current.on('text-change', handleChange);

        return () => {
            if (quillRef.current) {
                quillRef.current.off('text-change', handleChange);
            }
        };
    }, []);

    // Update content when value prop changes
    useEffect(() => {
        if (!quillRef.current || isUpdatingRef.current) return;
        const currentHtml = quillRef.current.root.innerHTML;
        if (currentHtml !== value) {
            isUpdatingRef.current = true;
            quillRef.current.root.innerHTML = value;
            isUpdatingRef.current = false;
        }
    }, [value]);

    return (
        <div style={{ height: '100%', display: 'flex', flexDirection: 'column' }}>
            <div
                ref={containerRef}
                style={{
                    height: `${height}px`,
                    border: '1px solid #ccc',
                    borderRadius: '4px',
                    backgroundColor: 'white',
                }}
            />
        </div>
    );
};

export default QuillEditor;
