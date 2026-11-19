import { useState, useCallback } from 'react';
import axios from 'axios';

export interface ExtractedData {
    extracted_data: Record<string, any>;
    confidence_scores: Record<string, number>;
    extraction_notes?: string;
}

export interface RecordingMetadata {
    id: number;
    recording_file_path: string;
    transcription_text: string;
    transcription_service: string;
    extracted_data: ExtractedData;
    status: 'recording' | 'transcribed' | 'extracted' | 'applied';
    duration_seconds: number;
    created_at: string;
}

export interface UseVoiceApiReturn {
    loading: boolean;
    error: string | null;
    createRecording: (formId: number, activityId: number) => Promise<number>;
    uploadAudio: (recordingId: number, audioBlob: Blob) => Promise<void>;
    transcribeAudio: (recordingId: number) => Promise<string>;
    extractAndMapData: (recordingId: number, formId: number, formFields?: any[]) => Promise<ExtractedData>;
    getRecording: (recordingId: number) => Promise<RecordingMetadata>;
    deleteRecording: (recordingId: number) => Promise<void>;
    listRecordings: (formId?: number, activityId?: number) => Promise<RecordingMetadata[]>;
    getFormGuidelines: (formId: number) => Promise<any>;
    updateFormGuidelines: (formId: number, guidelines: any) => Promise<void>;
}

/**
 * Custom hook for voice capture API interactions
 * Handles: recording creation, upload, transcription, extraction, media library
 */
export const useVoiceApi = (): UseVoiceApiReturn => {
    const [loading, setLoading] = useState(false);
    const [error, setError] = useState<string | null>(null);

    const resetError = () => setError(null);

    const createRecording = useCallback(async (formId: number, activityId: number): Promise<number> => {
        setLoading(true);
        resetError();
        try {
            const response = await axios.post('/api/voice-capture/recordings', {
                form_id: formId,
                activity_id: activityId
            });
            return response.data.recording_id;
        } catch (err) {
            const message = err instanceof Error ? err.message : 'Failed to create recording';
            setError(message);
            throw new Error(message);
        } finally {
            setLoading(false);
        }
    }, []);

    const uploadAudio = useCallback(async (recordingId: number, audioBlob: Blob): Promise<void> => {
        setLoading(true);
        resetError();
        try {
            const formData = new FormData();
            formData.append('audio', audioBlob, 'recording.webm');

            await axios.post(`/api/voice-capture/recordings/${recordingId}/save-audio`, formData, {
                headers: {
                    'Content-Type': 'multipart/form-data'
                }
            });
        } catch (err) {
            const message = err instanceof Error ? err.message : 'Failed to upload audio';
            setError(message);
            throw new Error(message);
        } finally {
            setLoading(false);
        }
    }, []);

    const transcribeAudio = useCallback(async (recordingId: number): Promise<string> => {
        setLoading(true);
        resetError();
        try {
            const response = await axios.post('/api/voice-capture/transcribe', {
                recording_id: recordingId
            });
            return response.data.transcription_text;
        } catch (err) {
            const message = err instanceof Error ? err.message : 'Failed to transcribe audio';
            setError(message);
            throw new Error(message);
        } finally {
            setLoading(false);
        }
    }, []);

    const extractAndMapData = useCallback(async (recordingId: number, formId: number, formFields?: any[]): Promise<ExtractedData> => {
        setLoading(true);
        resetError();
        try {
            const response = await axios.post('/api/voice-capture/extract-and-map', {
                recording_id: recordingId,
                form_id: formId,
                form_fields: formFields
            });
            return response.data.extracted_data;
        } catch (err) {
            const message = err instanceof Error ? err.message : 'Failed to extract and map data';
            setError(message);
            throw new Error(message);
        } finally {
            setLoading(false);
        }
    }, []);

    const getRecording = useCallback(async (recordingId: number): Promise<RecordingMetadata> => {
        setLoading(true);
        resetError();
        try {
            const response = await axios.get(`/api/voice-capture/recordings/${recordingId}`);
            return response.data.recording;
        } catch (err) {
            const message = err instanceof Error ? err.message : 'Failed to fetch recording';
            setError(message);
            throw new Error(message);
        } finally {
            setLoading(false);
        }
    }, []);

    const deleteRecording = useCallback(async (recordingId: number): Promise<void> => {
        setLoading(true);
        resetError();
        try {
            await axios.delete(`/api/voice-capture/recordings/${recordingId}`);
        } catch (err) {
            const message = err instanceof Error ? err.message : 'Failed to delete recording';
            setError(message);
            throw new Error(message);
        } finally {
            setLoading(false);
        }
    }, []);

    const listRecordings = useCallback(async (formId?: number, activityId?: number): Promise<RecordingMetadata[]> => {
        setLoading(true);
        resetError();
        try {
            const params = new URLSearchParams();
            if (formId) params.append('form_id', formId.toString());
            if (activityId) params.append('activity_id', activityId.toString());

            const response = await axios.get(`/api/voice-capture/media-library?${params.toString()}`);
            return response.data.recordings || [];
        } catch (err) {
            const message = err instanceof Error ? err.message : 'Failed to fetch recordings';
            setError(message);
            throw new Error(message);
        } finally {
            setLoading(false);
        }
    }, []);

    const getFormGuidelines = useCallback(async (formId: number): Promise<any> => {
        setLoading(true);
        resetError();
        try {
            const response = await axios.get(`/api/voice-capture/form/${formId}/guidelines`);
            return response.data.guidelines || null;
        } catch (err) {
            const message = err instanceof Error ? err.message : 'Failed to fetch guidelines';
            setError(message);
            throw new Error(message);
        } finally {
            setLoading(false);
        }
    }, []);

    const updateFormGuidelines = useCallback(async (formId: number, guidelines: any): Promise<void> => {
        setLoading(true);
        resetError();
        try {
            await axios.post(`/api/voice-capture/form/${formId}/guidelines`, guidelines);
        } catch (err) {
            const message = err instanceof Error ? err.message : 'Failed to update guidelines';
            setError(message);
            throw new Error(message);
        } finally {
            setLoading(false);
        }
    }, []);

    return {
        loading,
        error,
        createRecording,
        uploadAudio,
        transcribeAudio,
        extractAndMapData,
        getRecording,
        deleteRecording,
        listRecordings,
        getFormGuidelines,
        updateFormGuidelines
    };
};
