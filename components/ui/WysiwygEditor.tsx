import React from 'react';
import UnifiedRichTextEditor from './UnifiedRichTextEditor';

type Props = {
  value?: string;
  onChange?: (html: string) => void;
};

// This component uses the unified rich text editor which supports multiple free editors
// Quill (default), Editor.js, Summernote, and a basic fallback
const WysiwygEditor: React.FC<Props> = ({ value = '', onChange }) => {
  return <UnifiedRichTextEditor value={value} onChange={onChange} height={400} />;
};

export default WysiwygEditor;
