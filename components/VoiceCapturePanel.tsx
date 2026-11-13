import React, { useState, useEffect } from 'react';
import { useVoiceRecorder } from '../hooks/useVoiceRecorder';
import { useVoiceApi, ExtractedData } from '../hooks/useVoiceApi';
import Button from './ui/Button';
import Card from './ui/Card';
import MInput from './ui/MInput';
import { PauseIcon, PlayIcon, StopIcon, MicrophoneIcon, TrashIcon, CheckIcon } from '@heroicons/react/24/outline';

interface VoiceCapturePanelProps {
    formId: number;
    activityId: number;
    formFields: Array<{
        id: string;
        questionText: string;
        answerType: string;
        fieldName?: string;
    }>;
    onDataExtracted: (data: Record<string, any>) => void;
    onClose: () => void;
}

interface RecordingPhase {
    phase: 'idle' | 'guide' | 'recording' | 'transcribing' | 'extracting' | 'review' | 'error';
    data?: any;
    error?: string;
}

const formatDuration = (seconds: number): string => {
    const hrs = Math.floor(seconds / 3600);
    const mins = Math.floor((seconds % 3600) / 60);
    const secs = seconds % 60;
    return `${String(hrs).padStart(2, '0')}:${String(mins).padStart(2, '0')}:${String(secs).padStart(2, '0')}`;
};

/**
 * VoiceCapturePanel Component
 * Main UI for recording interviews, transcription, data extraction, and form auto-fill
 *
 * Flow:
 * 1. Show Interviewer's Guide (must read before proceeding)
 * 2. Start Recording (with pause/resume capability)
 * 3. Stop Recording & Show Progress (transcribing → extracting)
 * 4. Review Extracted Data (with confidence scores and ability to edit)
 * 5. Apply to Form
 */
export const VoiceCapturePanel: React.FC<VoiceCapturePanelProps> = ({
    formId,
    activityId,
    formFields,
    onDataExtracted,
    onClose
}) => {
    const { state: recordingState, startRecording, stopRecording, pauseRecording, resumeRecording, resetRecording } = useVoiceRecorder();
    const { loading: apiLoading, error: apiError, createRecording, uploadAudio, transcribeAudio, extractAndMapData, getFormGuidelines } = useVoiceApi();

    const [phase, setPhase] = useState<RecordingPhase>({ phase: 'idle' });
    const [guidelines, setGuidelines] = useState<any>(null);
    const [recordingId, setRecordingId] = useState<number | null>(null);
    const [guideAccepted, setGuideAccepted] = useState(false);
    const [extractedData, setExtractedData] = useState<ExtractedData | null>(null);
    const [editedData, setEditedData] = useState<Record<string, any>>({});

    // Load form guidelines on mount
    useEffect(() => {
        const loadGuidelines = async () => {
            try {
                const data = await getFormGuidelines(formId);
                setGuidelines(data);
                if (!data?.is_enabled) {
                    // If guidelines are disabled, go straight to recording
                    setPhase({ phase: 'recording' });
                }
            } catch (err) {
                console.error('Failed to load guidelines:', err);
                // Continue without guidelines
                setPhase({ phase: 'recording' });
            }
        };
        loadGuidelines();
    }, [formId, getFormGuidelines]);

    const handleStartRecording = async () => {
        try {
            setPhase({ phase: 'recording' });
            // Create recording entry in database
            const recId = await createRecording(formId, activityId);
            setRecordingId(recId);
            // Start audio recording
            await startRecording();
        } catch (err) {
            const errorMsg = err instanceof Error ? err.message : 'Failed to start recording';
            setPhase({ phase: 'error', error: errorMsg });
        }
    };

    const handleStopRecording = async () => {
        try {
            setPhase({ phase: 'transcribing', data: { status: 'Stopping recording...' } });
            
            // Stop recording
            await stopRecording();

            if (!recordingState.audioBlob || !recordingId) {
                throw new Error('No audio data recorded');
            }

            // Upload audio file
            setPhase({ phase: 'transcribing', data: { status: 'Uploading audio...' } });
            await uploadAudio(recordingId, recordingState.audioBlob);

            // Transcribe audio
            setPhase({ phase: 'transcribing', data: { status: 'Transcribing audio...' } });
            const transcriptionText = await transcribeAudio(recordingId);

            // Extract and map data
            setPhase({ phase: 'extracting', data: { status: 'Extracting form data...' } });
            const extractedFormData = await extractAndMapData(recordingId, formId);

            setExtractedData(extractedFormData);
            setEditedData(extractedFormData.extracted_data);
            setPhase({ phase: 'review', data: extractedFormData });

        } catch (err) {
            const errorMsg = err instanceof Error ? err.message : 'Failed to process recording';
            setPhase({ phase: 'error', error: errorMsg });
            resetRecording();
        }
    };

    const handleApplyData = () => {
        // Pass edited data back to form
        onDataExtracted(editedData);
        // Close the panel
        onClose();
    };

    const handleReset = () => {
        resetRecording();
        const nextPhase = (guidelines && guidelines.is_enabled) ? { phase: 'guide' } : { phase: 'recording' };
        setPhase(nextPhase);
        setRecordingId(null);
        setExtractedData(null);
        setEditedData({});
        setGuideAccepted(false);
    };

    // Render different phases
    if (phase.phase === 'idle') {
        return (
            <div className="text-center py-8">
                <MicrophoneIcon className="h-12 w-12 mx-auto text-gray-400 mb-4" />
                <p className="text-gray-600 mb-4">Loading voice capture...</p>
            </div>
        );
    }

    if (phase.phase === 'guide') {
        return (
            <Card title="📋 Before You Begin - Interviewer's Guide" className="max-w-2xl">
                <div className="space-y-4">
                    <div className="bg-blue-50 border-l-4 border-blue-500 p-4 rounded">
                        <p className="text-sm text-blue-900 whitespace-pre-wrap">
                            {guidelines?.interviewer_guide_text || 'No guidelines available. You can proceed with recording.'}
                        </p>
                    </div>

                    <div className="bg-amber-50 border-l-4 border-amber-500 p-4 rounded">
                        <p className="text-sm font-semibold text-amber-900 mb-2">⚠️ Important:</p>
                        <ul className="text-sm text-amber-900 list-disc list-inside space-y-1">
                            <li>Read the guide above carefully before proceeding</li>
                            <li>Ensure you have consent to record</li>
                            <li>Speak clearly and naturally</li>
                            <li>You can pause and resume at any time</li>
                        </ul>
                    </div>

                    <div className="flex items-center gap-3 bg-gray-100 p-4 rounded">
                        <input
                            type="checkbox"
                            id="acceptGuide"
                            checked={guideAccepted}
                            onChange={(e) => setGuideAccepted(e.target.checked)}
                            className="w-4 h-4"
                        />
                        <label htmlFor="acceptGuide" className="text-sm font-medium text-gray-700">
                            I have read and understood the guide above
                        </label>
                    </div>

                    <div className="flex gap-2 justify-end">
                        <Button variant="secondary" onClick={onClose}>
                            Cancel
                        </Button>
                        <Button
                            disabled={!guideAccepted}
                            onClick={() => setPhase({ phase: 'recording' })}
                        >
                            Begin Recording
                        </Button>
                    </div>
                </div>
            </Card>
        );
    }

    if (phase.phase === 'recording') {
        return (
            <Card title="🎤 Recording Interview" className="max-w-md">
                <div className="space-y-6">
                    {/* Recording Indicator */}
                    <div className="bg-red-50 border-2 border-red-200 rounded-lg p-4">
                        <div className="flex items-center justify-between">
                            <div className="flex items-center gap-3">
                                <div className="relative w-3 h-3">
                                    <div className="absolute inset-0 bg-red-500 rounded-full animate-pulse" />
                                </div>
                                <span className="font-semibold text-red-700">
                                    {recordingState.isRecording ? 'Recording...' : 'Ready'}
                                </span>
                            </div>
                            <span className="text-2xl font-mono font-bold text-red-700">
                                {formatDuration(recordingState.duration)}
                            </span>
                        </div>
                    </div>

                    {/* Recording Instructions */}
                    <div className="bg-blue-50 border-l-4 border-blue-500 p-3 rounded text-sm text-blue-900">
                        {recordingState.isRecording
                            ? '🎤 Speak clearly. The interviewer should ask questions and the responder should answer.'
                            : 'Click "Start Recording" to begin. The interviewer will ask questions and record the responder\'s answers.'}
                    </div>

                    {/* Error Display */}
                    {recordingState.error && (
                        <div className="bg-red-50 border-l-4 border-red-500 p-3 rounded text-sm text-red-900">
                            ⚠️ {recordingState.error}
                        </div>
                    )}

                    {/* Control Buttons */}
                    <div className="grid grid-cols-2 gap-3">
                        {!recordingState.isRecording ? (
                            <Button
                                onClick={handleStartRecording}
                                disabled={apiLoading}
                                className="col-span-2"
                            >
                                <MicrophoneIcon className="h-4 w-4 mr-2 inline" />
                                {apiLoading ? 'Initializing...' : 'Start Recording'}
                            </Button>
                        ) : (
                            <>
                                <Button
                                    variant={recordingState.isPaused ? 'primary' : 'secondary'}
                                    onClick={recordingState.isPaused ? resumeRecording : pauseRecording}
                                    className="flex items-center justify-center gap-2"
                                >
                                    {recordingState.isPaused ? (
                                        <>
                                            <PlayIcon className="h-4 w-4" />
                                            Resume
                                        </>
                                    ) : (
                                        <>
                                            <PauseIcon className="h-4 w-4" />
                                            Pause
                                        </>
                                    )}
                                </Button>
                                <Button
                                    variant="danger"
                                    onClick={handleStopRecording}
                                    className="flex items-center justify-center gap-2"
                                >
                                    <StopIcon className="h-4 w-4" />
                                    Stop
                                </Button>
                            </>
                        )}
                    </div>

                    {/* Cancel Button */}
                    <Button variant="secondary" onClick={onClose} className="w-full">
                        Cancel & Close
                    </Button>
                </div>
            </Card>
        );
    }

    if (phase.phase === 'transcribing' || phase.phase === 'extracting') {
        return (
            <Card className="max-w-md">
                <div className="space-y-4 text-center">
                    <div className="inline-block">
                        <div className="animate-spin">
                            <MicrophoneIcon className="h-12 w-12 text-primary-500" />
                        </div>
                    </div>
                    <h3 className="font-semibold text-lg">
                        {phase.phase === 'transcribing' ? '🎵 Transcribing Audio' : '🤖 Extracting Data'}
                    </h3>
                    <p className="text-gray-600 text-sm">
                        {phase.data?.status || 'Processing your recording...'}
                    </p>
                    <div className="pt-4">
                        <div className="w-full bg-gray-200 rounded-full h-2 overflow-hidden">
                            <div className="bg-primary-500 h-full w-1/3 rounded-full animate-pulse" />
                        </div>
                        <p className="text-xs text-gray-500 mt-2">This may take a few moments</p>
                    </div>
                </div>
            </Card>
        );
    }

    if (phase.phase === 'review') {
        return (
            <Card title="✅ Review Extracted Data" className="max-w-2xl max-h-screen overflow-y-auto">
                <div className="space-y-4">
                    <div className="bg-blue-50 border-l-4 border-blue-500 p-3 rounded text-sm text-blue-900">
                        💡 Review the extracted data below. You can edit any fields before applying them to the form.
                    </div>

                    {/* Data Grid */}
                    <div className="space-y-3">
                        {Object.entries(editedData).map(([fieldId, value]) => {
                            const field = formFields.find(f => f.id === fieldId);
                            const confidence = extractedData?.confidence_scores[fieldId] || 0;

                            return (
                                <div key={fieldId} className="border rounded-lg p-3 space-y-2">
                                    <div className="flex justify-between items-start">
                                        <label className="font-semibold text-sm text-gray-700">
                                            {field?.questionText || fieldId}
                                        </label>
                                        <div className="flex items-center gap-2">
                                            <span className={`text-xs font-semibold px-2 py-1 rounded ${
                                                confidence >= 80 ? 'bg-green-100 text-green-800' :
                                                confidence >= 60 ? 'bg-yellow-100 text-yellow-800' :
                                                'bg-red-100 text-red-800'
                                            }`}>
                                                {confidence}% confidence
                                            </span>
                                        </div>
                                    </div>
                                    <input
                                        type={field?.answerType === 'number' ? 'number' : 'text'}
                                        value={value || ''}
                                        onChange={(e) => setEditedData(prev => ({
                                            ...prev,
                                            [fieldId]: e.target.value
                                        }))}
                                        className="w-full border rounded px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-primary-500"
                                        placeholder="No value extracted"
                                    />
                                </div>
                            );
                        })}
                    </div>

                    {/* Action Buttons */}
                    <div className="flex gap-2 justify-end pt-4 border-t">
                        <Button
                            variant="secondary"
                            onClick={handleReset}
                            className="flex items-center gap-2"
                        >
                            <TrashIcon className="h-4 w-4" />
                            Start Over
                        </Button>
                        <Button
                            onClick={handleApplyData}
                            className="flex items-center gap-2"
                        >
                            <CheckIcon className="h-4 w-4" />
                            Apply to Form
                        </Button>
                    </div>
                </div>
            </Card>
        );
    }

    if (phase.phase === 'error') {
        return (
            <Card title="❌ Error" className="max-w-md border-2 border-red-300">
                <div className="space-y-4">
                    <div className="bg-red-50 border-l-4 border-red-500 p-4 rounded">
                        <p className="text-red-900 text-sm">{phase.error || 'An error occurred'}</p>
                        {apiError && (
                            <p className="text-red-700 text-xs mt-2 font-mono">{apiError}</p>
                        )}
                    </div>

                    <div className="flex gap-2 justify-end">
                        <Button variant="secondary" onClick={onClose}>
                            Cancel
                        </Button>
                        <Button variant="danger" onClick={handleReset}>
                            Try Again
                        </Button>
                    </div>
                </div>
            </Card>
        );
    }

    return null;
};

export default VoiceCapturePanel;

