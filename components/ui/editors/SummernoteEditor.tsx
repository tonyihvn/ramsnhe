import React, { useEffect, useRef } from 'react';
import $ from 'jquery';
import 'summernote/dist/summernote-lite.css';

// Lazy load summernote to avoid import analysis issues
let summernoteLoaded = false;

// Make jQuery available globally for Summernote
(window as any).$ = $;
(window as any).jQuery = $;

interface SummernoteEditorProps {
    value?: string;
    onChange?: (html: string) => void;
    height?: number;
    placeholder?: string;
}

const SummernoteEditor: React.FC<SummernoteEditorProps> = ({
    value = '',
    onChange,
    height = 300,
    placeholder = 'Enter text...',
}) => {
    const textareaRef = useRef<HTMLDivElement | null>(null);
    const isUpdatingRef = useRef(false);

    useEffect(() => {
        if (!textareaRef.current) return;

        // Dynamically import summernote on first use
        const initSummernote = async () => {
            if (!summernoteLoaded) {
                await import('summernote');
                summernoteLoaded = true;
            }

            try {
                $(textareaRef.current).summernote({
                    height,
                    placeholder,
                    dialogsInBody: true,
                    toolbar: [
                        ['style', ['style']],
                        ['font', ['bold', 'underline', 'clear']],
                        ['fontname', ['fontname']],
                        ['color', ['color']],
                        ['para', ['ul', 'ol', 'paragraph']],
                        ['table', ['table']],
                        ['insert', ['link', 'picture', 'video']],
                        ['view', ['fullscreen', 'codeview', 'help']],
                    ],
                    onChange: () => {
                        if (isUpdatingRef.current) return;
                        const html = $(textareaRef.current).summernote('code');
                        onChange?.(html);
                    },
                });

                // Set initial value
                if (value) {
                    isUpdatingRef.current = true;
                    $(textareaRef.current).summernote('code', value);
                    isUpdatingRef.current = false;
                }
            } catch (e) {
                console.error('Summernote initialization error:', e);
            }

            return () => {
                try {
                    $(textareaRef.current).summernote('destroy');
                } catch (e) {
                    // ignore destroy errors
                }
            };
        };

        initSummernote();
    }, [height, placeholder]);

    // Update content when value prop changes
    useEffect(() => {
        if (!textareaRef.current || isUpdatingRef.current) return;
        try {
            const currentHtml = $(textareaRef.current).summernote('code');
            if (currentHtml !== value) {
                isUpdatingRef.current = true;
                $(textareaRef.current).summernote('code', value);
                isUpdatingRef.current = false;
            }
        } catch (e) {
            console.error('Failed to update Summernote content:', e);
        }
    }, [value]);

    return (
        <div
            ref={textareaRef}
            dangerouslySetInnerHTML={{ __html: value || '' }}
            style={{
                width: '100%',
                border: '1px solid #ccc',
                borderRadius: '4px',
                background: 'white',
                padding: '8px',
            }}
        />
    );
};

export default SummernoteEditor;
