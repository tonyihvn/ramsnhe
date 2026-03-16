import React, { useEffect, useState } from 'react';
import { useTheme } from '../../hooks/useTheme';
import EditorJSComponent from './editors/EditorJSComponent';
import SummernoteEditor from './editors/SummernoteEditor';
import TapTapEditor from './editors/TapTapEditor';
import TinyMCEEditor from './editors/TinyMCEEditor';
import CkEditorEditor from './editors/CkEditorEditor';
import RichTextEditor from './RichTextEditor';

export type RichTextEditorType = 'editorjs' | 'summernote' | 'taptap' | 'tinymce' | 'ckeditor' | 'basic';

interface UnifiedRichTextEditorProps {
    value?: string;
    onChange?: (html: string) => void;
    editorType?: RichTextEditorType;
    height?: number;
    placeholder?: string;
}

const UnifiedRichTextEditor: React.FC<UnifiedRichTextEditorProps> = ({
    value = '',
    onChange,
    editorType,
    height = 300,
    placeholder = 'Enter text...',
}) => {
    const { settings } = useTheme();
    const [editor, setEditor] = useState<RichTextEditorType>('editorjs');

    useEffect(() => {
        // Use provided editorType, fall back to settings, default to editorjs
        const selectedEditor = editorType || (settings as any)?.defaultRichTextEditor || 'editorjs';
        // Ensure the selected editor is valid (not quill)
        if (selectedEditor === 'quill') {
            setEditor('editorjs');
        } else {
            setEditor(selectedEditor as RichTextEditorType);
        }
    }, [editorType, settings]);

    switch (editor) {
        case 'editorjs':
            return <EditorJSComponent value={value} onChange={onChange} height={height} />;
        case 'summernote':
            return <SummernoteEditor value={value} onChange={onChange} height={height} placeholder={placeholder} />;
        case 'taptap':
            return <TapTapEditor value={value} onChange={onChange} height={height} placeholder={placeholder} />;
        case 'tinymce':
            return <TinyMCEEditor value={value} onChange={onChange} height={height} placeholder={placeholder} />;
        case 'ckeditor':
            return <CkEditorEditor value={value} onChange={onChange} height={height} placeholder={placeholder} />;
        case 'basic':
        default:
            return <RichTextEditor value={value} onChange={onChange} />;
    }
};

export default UnifiedRichTextEditor;
