import React, { useState, useEffect } from 'react';
import { useVoiceApi } from '../hooks/useVoiceApi';
import Button from './ui/Button';
import Card from './ui/Card';
import MInput from './ui/MInput';
import { CheckIcon, ExclamationIcon, SparklesIcon } from '@heroicons/react/24/outline';

interface FormVoiceGuidelinesEditorProps {
    formId?: number;
    activityId?: number;
    formDefinition?: any;
    onSave?: () => void;
    onClose?: () => void;
}

interface Guidelines {
    id?: number;
    is_enabled: boolean;
    ai_guide_text: string;
    interviewer_guide_text: string;
    extraction_prompt_override?: string;
}

/**
 * FormVoiceGuidelinesEditor Component
 * Allows editing of voice capture guidelines for a specific form
 *
 * Features:
 * - Enable/disable voice capture for form
 * - Edit interviewer's guide (displayed before recording)
 * - Edit AI guide (helps LLM extract data correctly)
 * - Auto-generate AI guide from form structure
 * - Custom extraction prompt override
 */
export const FormVoiceGuidelinesEditor: React.FC<FormVoiceGuidelinesEditorProps> = ({
    formId,
    activityId,
    formDefinition,
    onSave,
    onClose
}) => {
    const { loading, error, getFormGuidelines, updateFormGuidelines } = useVoiceApi();

    const [guidelines, setGuidelines] = useState<Guidelines>({
        is_enabled: true,
        ai_guide_text: '',
        interviewer_guide_text: '',
        extraction_prompt_override: ''
    });

    const [isSaving, setIsSaving] = useState(false);
    const [saveSuccess, setSaveSuccess] = useState(false);
    const [localError, setLocalError] = useState<string | null>(null);
    const [showGeneratedPreview, setShowGeneratedPreview] = useState(false);

    /**
     * Auto-generate AI Extraction Guide from form definition
     */
    const generateAIGuide = () => {
        if (!formDefinition || !formDefinition.questions) {
            setLocalError('No form questions found. Please add questions to the form first.');
            return;
        }

        let guide = 'Extract the following fields from the transcribed interview conversation:\n\n';
        const fieldDescriptions: string[] = [];

        formDefinition.questions.forEach((section: any) => {
            if (section.questions) {
                section.questions.forEach((question: any) => {
                    const fieldName = question.fieldName || `field_${question.id}`;
                    const label = question.questionText || question.label || 'Unknown field';
                    const elementType = question.elementType || question.type || 'text';
                    
                    let fieldDesc = `- ${fieldName}`;
                    let typeDesc = '';
                    let valueDesc = '';

                    // Add type information
                    switch (elementType) {
                        case 'text':
                        case 'textarea':
                            typeDesc = '(string, required)';
                            valueDesc = `natural text response from interview`;
                            break;
                        case 'number':
                            typeDesc = '(number)';
                            valueDesc = `numeric value (e.g., "42 years old" → 42)`;
                            break;
                        case 'email':
                            typeDesc = '(string, email format)';
                            valueDesc = `valid email address`;
                            break;
                        case 'phone':
                            typeDesc = '(string, phone format)';
                            valueDesc = `phone number (extract digits and format)`;
                            break;
                        case 'date':
                            typeDesc = '(date, YYYY-MM-DD format)';
                            valueDesc = `date (convert verbal descriptions like "last Monday" to YYYY-MM-DD)`;
                            break;
                        case 'select':
                        case 'dropdown':
                            typeDesc = '(string, select from options)';
                            const options = question.options || question.answers || [];
                            if (Array.isArray(options) && options.length > 0) {
                                valueDesc = `one of: ${options.map((o: any) => `"${o.text || o}"`).join(', ')}`;
                            } else {
                                valueDesc = `one of predefined options`;
                            }
                            break;
                        case 'checkbox':
                            typeDesc = '(boolean)';
                            valueDesc = `true/false based on user confirmation`;
                            break;
                        default:
                            typeDesc = '(string)';
                            valueDesc = `text response`;
                    }

                    fieldDesc += `: ${label} (${typeDesc})`;
                    fieldDescriptions.push(fieldDesc);
                    guide += `${fieldDesc}\n`;
                    
                    if (valueDesc) {
                        guide += `  Expected: ${valueDesc}\n`;
                    }
                    guide += `\n`;
                });
            }
        });

        guide += `\nIMPORTANT EXTRACTION RULES:\n`;
        guide += `1. Map each interviewer question and responder answer to the corresponding form field above\n`;
        guide += `2. For select/dropdown fields, only use values from the predefined options\n`;
        guide += `3. For dates, always convert to YYYY-MM-DD format (e.g., "3/15/2024" → "2024-03-15")\n`;
        guide += `4. For numbers, extract numeric values even if embedded in text\n`;
        guide += `5. If a field cannot be confidently extracted, mark confidence as 0\n`;
        guide += `6. Return confidence scores (0-1) for each extracted field\n`;
        guide += `7. Preserve original spelling and capitalization for names and text fields\n`;
        guide += `8. For multi-part answers, try to extract all relevant information\n`;
        guide += `9. If the interviewer corrects a previous answer, use the final answer\n`;
        guide += `10. Handle acronyms and abbreviations based on context\n`;

        return guide;
    };

    const handleAutoGenerateAIGuide = () => {
        const generatedGuide = generateAIGuide();
        if (generatedGuide) {
            setGuidelines(prev => ({
                ...prev,
                ai_guide_text: generatedGuide
            }));
            setShowGeneratedPreview(false);
            setSaveSuccess(false);
        }
    };

    // Load guidelines on mount
    useEffect(() => {
        const loadGuidelines = async () => {
            try {
                const id = formId || activityId;
                if (!id) return;

                const data = await getFormGuidelines(id);
                if (data) {
                    setGuidelines(data);
                } else {
                    // Initialize with empty guidelines
                    setGuidelines({
                        is_enabled: true,
                        ai_guide_text: '',
                        interviewer_guide_text: '',
                        extraction_prompt_override: ''
                    });
                }
            } catch (err) {
                console.error('Failed to load guidelines:', err);
                setLocalError(err instanceof Error ? err.message : 'Failed to load guidelines');
            }
        };

        loadGuidelines();
    }, [formId, activityId, getFormGuidelines]);

    const handleSave = async () => {
        setIsSaving(true);
        setLocalError(null);
        setSaveSuccess(false);

        try {
            const id = formId || activityId;
            if (!id) {
                throw new Error('Form ID or Activity ID required');
            }
            await updateFormGuidelines(id, guidelines);
            setSaveSuccess(true);
            onSave?.();

            // Clear success message after 3 seconds
            setTimeout(() => setSaveSuccess(false), 3000);
        } catch (err) {
            setLocalError(err instanceof Error ? err.message : 'Failed to save guidelines');
        } finally {
            setIsSaving(false);
        }
    };

    return (
        <Card title="🎤 Voice Capture Guidelines" className="max-w-3xl">
            <div className="space-y-6">
                {/* Error Display */}
                {(error || localError) && (
                    <div className="bg-red-50 border-l-4 border-red-500 p-4 rounded">
                        <p className="text-red-900 text-sm">
                            {error || localError}
                        </p>
                    </div>
                )}

                {/* Success Display */}
                {saveSuccess && (
                    <div className="bg-green-50 border-l-4 border-green-500 p-4 rounded flex items-center gap-2">
                        <CheckIcon className="h-5 w-5 text-green-600" />
                        <p className="text-green-900 text-sm font-medium">Guidelines saved successfully!</p>
                    </div>
                )}

                {/* Enable/Disable Toggle */}
                <div className="bg-gray-50 border rounded-lg p-4">
                    <div className="flex items-center gap-3">
                        <input
                            type="checkbox"
                            id="enableVoiceCapture"
                            checked={guidelines.is_enabled}
                            onChange={(e) => setGuidelines(prev => ({
                                ...prev,
                                is_enabled: e.target.checked
                            }))}
                            className="w-4 h-4 rounded"
                        />
                        <div>
                            <label htmlFor="enableVoiceCapture" className="font-semibold text-gray-900">
                                Enable Voice Capture for This Form
                            </label>
                            <p className="text-xs text-gray-600 mt-1">
                                When enabled, users will see the "Start Voice Capture" button when filling this form
                            </p>
                        </div>
                    </div>
                </div>

                {/* Interviewer's Guide */}
                <div className="space-y-2">
                    <div>
                        <label className="block text-sm font-semibold text-gray-900 mb-1">
                            📋 Interviewer's Guide
                        </label>
                        <p className="text-xs text-gray-600 mb-3">
                            This guide will be displayed to the interviewer BEFORE recording starts. 
                            It should contain instructions on how to ask questions and what to listen for.
                        </p>
                    </div>
                    <textarea
                        value={guidelines.interviewer_guide_text}
                        onChange={(e) => setGuidelines(prev => ({
                            ...prev,
                            interviewer_guide_text: e.target.value
                        }))}
                        placeholder="Example:&#10;Please ask the following questions in a natural conversational way:&#10;1. What is the patient's full name?&#10;2. What is their main complaint?&#10;3. When did the symptoms start?&#10;4. Have they sought treatment before?&#10;&#10;Listen carefully and ask follow-up questions if needed to clarify responses."
                        rows={6}
                        className="w-full border rounded-lg px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-primary-500"
                    />
                    <p className="text-xs text-gray-500">
                        {guidelines.interviewer_guide_text.length} characters
                    </p>
                </div>

                {/* AI Guide */}
                <div className="space-y-2">
                    <div>
                        <div className="flex items-center justify-between">
                            <label className="block text-sm font-semibold text-gray-900 mb-1">
                                🤖 AI Extraction Guide
                            </label>
                            {formDefinition && formDefinition.questions && (
                                <button
                                    onClick={() => setShowGeneratedPreview(!showGeneratedPreview)}
                                    className="text-xs text-primary-600 hover:text-primary-700 font-medium flex items-center gap-1 px-2 py-1 rounded hover:bg-primary-50"
                                >
                                    <SparklesIcon className="h-4 w-4" />
                                    {showGeneratedPreview ? 'Hide' : 'Auto-Generate'}
                                </button>
                            )}
                        </div>
                        <p className="text-xs text-gray-600 mb-3">
                            This guide helps the LLM understand how to extract and map data from the conversation.
                            Be specific about field formats, expected values, and any special handling rules.
                        </p>
                    </div>

                    {/* Auto-Generated Preview */}
                    {showGeneratedPreview && formDefinition && formDefinition.questions && (
                        <div className="bg-blue-50 border border-blue-200 rounded-lg p-4 mb-3">
                            <div className="flex items-center justify-between mb-3">
                                <p className="text-sm font-semibold text-blue-900">✨ Auto-Generated Guide Preview</p>
                                <button
                                    onClick={handleAutoGenerateAIGuide}
                                    className="text-xs bg-blue-600 hover:bg-blue-700 text-white px-3 py-1 rounded transition"
                                >
                                    Use This
                                </button>
                            </div>
                            <div className="bg-white rounded p-3 text-xs text-gray-700 font-mono whitespace-pre-wrap break-words max-h-80 overflow-y-auto">
                                {generateAIGuide()}
                            </div>
                        </div>
                    )}

                    <textarea
                        value={guidelines.ai_guide_text}
                        onChange={(e) => {
                            setGuidelines(prev => ({
                                ...prev,
                                ai_guide_text: e.target.value
                            }));
                            setShowGeneratedPreview(false);
                        }}
                        placeholder="Example:&#10;Extract the following from the transcribed conversation:&#10;- patient_name: Full name of the patient (string, required)&#10;- patient_age: Age in years (number, extract from responses like 'I'm 42 years old')&#10;- main_complaint: Primary health concern (string)&#10;- symptom_onset_date: When symptoms started (date, convert to YYYY-MM-DD format)&#10;- previous_treatment: Whether they've sought treatment (boolean)&#10;&#10;Map responses precisely to these fields. If a value cannot be extracted, set confidence to 0."
                        rows={6}
                        className="w-full border rounded-lg px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-primary-500"
                    />
                    <p className="text-xs text-gray-500">
                        {guidelines.ai_guide_text.length} characters
                    </p>
                </div>

                {/* Custom Extraction Prompt */}
                <div className="space-y-2">
                    <div>
                        <label className="block text-sm font-semibold text-gray-900 mb-1">
                            ⚙️ Custom Extraction Prompt (Optional)
                        </label>
                        <p className="text-xs text-gray-600 mb-3">
                            Advanced: Override the default extraction prompt with a custom one. 
                            Leave empty to use the default system prompt.
                        </p>
                    </div>
                    <textarea
                        value={guidelines.extraction_prompt_override || ''}
                        onChange={(e) => setGuidelines(prev => ({
                            ...prev,
                            extraction_prompt_override: e.target.value
                        }))}
                        placeholder="Advanced prompt override (optional)"
                        rows={4}
                        className="w-full border rounded-lg px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-primary-500 font-mono text-xs"
                    />
                </div>

                {/* Info Box */}
                <div className="bg-blue-50 border-l-4 border-blue-500 p-4 rounded">
                    <p className="text-sm text-blue-900 font-semibold mb-2">💡 Tips for Better Results:</p>
                    <ul className="text-xs text-blue-900 space-y-1 list-disc list-inside">
                        <li>Be specific about field formats (date format, expected ranges, etc.)</li>
                        <li>Include examples of expected responses in the AI guide</li>
                        <li>Mention any special abbreviations or terminology used in your domain</li>
                        <li>Test with a sample recording to verify extraction quality</li>
                        <li>Higher quality guides = better extraction accuracy = fewer manual edits needed</li>
                    </ul>
                </div>

                {/* Action Buttons */}
                <div className="flex gap-2 justify-end pt-4 border-t">
                    {onClose && (
                        <Button variant="secondary" onClick={onClose} disabled={isSaving || loading}>
                            Cancel
                        </Button>
                    )}
                    <Button
                        onClick={handleSave}
                        disabled={isSaving || loading}
                        className="flex items-center gap-2"
                    >
                        {isSaving && <span className="animate-spin">⏳</span>}
                        {isSaving ? 'Saving...' : 'Save Guidelines'}
                    </Button>
                </div>
            </div>
        </Card>
    );
};

export default FormVoiceGuidelinesEditor;

