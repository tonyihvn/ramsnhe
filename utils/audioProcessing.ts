/**
 * Audio Processing Utilities
 * Helper functions for audio handling, conversion, and validation
 */

/**
 * Convert audio blob to base64
 * Useful for uploading or storing audio data
 */
export const blobToBase64 = (blob: Blob): Promise<string> => {
    return new Promise((resolve, reject) => {
        const reader = new FileReader();
        reader.onloadend = () => {
            const result = reader.result as string;
            // Remove data:audio/webm;base64, prefix
            const base64 = result.split(',')[1];
            resolve(base64);
        };
        reader.onerror = reject;
        reader.readAsDataURL(blob);
    });
};

/**
 * Convert base64 to blob
 * Useful for retrieving stored audio data
 */
export const base64ToBlob = (base64: string, mimeType: string = 'audio/webm'): Blob => {
    const binaryString = atob(base64);
    const bytes = new Uint8Array(binaryString.length);
    for (let i = 0; i < binaryString.length; i++) {
        bytes[i] = binaryString.charCodeAt(i);
    }
    return new Blob([bytes], { type: mimeType });
};

/**
 * Format file size for display
 */
export const formatFileSize = (bytes: number): string => {
    if (bytes === 0) return '0 Bytes';
    const k = 1024;
    const sizes = ['Bytes', 'KB', 'MB', 'GB'];
    const i = Math.floor(Math.log(bytes) / Math.log(k));
    return Math.round((bytes / Math.pow(k, i)) * 100) / 100 + ' ' + sizes[i];
};

/**
 * Download blob as file
 * Useful for downloading recorded audio
 */
export const downloadBlob = (blob: Blob, filename: string) => {
    const url = window.URL.createObjectURL(blob);
    const link = document.createElement('a');
    link.href = url;
    link.download = filename;
    document.body.appendChild(link);
    link.click();
    document.body.removeChild(link);
    window.URL.revokeObjectURL(url);
};

/**
 * Validate audio blob
 * Checks if blob is valid audio and reasonable size
 */
export const validateAudioBlob = (blob: Blob, maxSizeMB: number = 500): { valid: boolean; error?: string } => {
    if (!blob) {
        return { valid: false, error: 'No audio data' };
    }

    // Check MIME type
    if (!blob.type.includes('audio')) {
        return { valid: false, error: 'Invalid audio format' };
    }

    // Check file size
    const maxBytes = maxSizeMB * 1024 * 1024;
    if (blob.size > maxBytes) {
        return { valid: false, error: `Audio file too large (max ${maxSizeMB}MB)` };
    }

    if (blob.size < 1000) {
        return { valid: false, error: 'Audio file too small (less than 1KB)' };
    }

    return { valid: true };
};

/**
 * Extract audio duration from blob
 * Creates temporary audio element to get duration
 */
export const getAudioDuration = (blob: Blob): Promise<number> => {
    return new Promise((resolve, reject) => {
        const url = window.URL.createObjectURL(blob);
        const audio = new Audio();
        audio.onloadedmetadata = () => {
            window.URL.revokeObjectURL(url);
            resolve(audio.duration);
        };
        audio.onerror = () => {
            window.URL.revokeObjectURL(url);
            reject(new Error('Failed to get audio duration'));
        };
        audio.src = url;
    });
};

/**
 * Split audio blob into chunks
 * Useful for chunked uploads or processing
 */
export const splitAudioBlob = (blob: Blob, chunkSize: number = 1024 * 1024): Blob[] => {
    const chunks: Blob[] = [];
    let offset = 0;

    while (offset < blob.size) {
        const end = Math.min(offset + chunkSize, blob.size);
        chunks.push(blob.slice(offset, end));
        offset = end;
    }

    return chunks;
};

/**
 * Merge audio blobs
 * Combines multiple audio chunks (note: proper audio merging is complex)
 */
export const mergeAudioBlobs = (blobs: Blob[]): Blob => {
    return new Blob(blobs, { type: 'audio/webm' });
};

/**
 * Create audio playback URL
 * Returns object URL that can be used as audio src
 */
export const createAudioUrl = (blob: Blob): string => {
    return window.URL.createObjectURL(blob);
};

/**
 * Revoke audio URL
 * Cleanup function for created object URLs
 */
export const revokeAudioUrl = (url: string) => {
    window.URL.revokeObjectURL(url);
};

/**
 * Check browser support for recording
 */
export const isRecordingSupported = (): boolean => {
    return !!(
        navigator.mediaDevices &&
        navigator.mediaDevices.getUserMedia &&
        typeof MediaRecorder !== 'undefined'
    );
};

/**
 * Get supported MIME types for recording
 */
export const getSupportedMimeTypes = (): string[] => {
    const types = [
        'audio/webm;codecs=opus',
        'audio/webm;codecs=vp8',
        'audio/webm',
        'audio/mp4',
        'audio/mp3',
        'audio/aac'
    ];

    return types.filter(type => MediaRecorder.isTypeSupported(type));
};

/**
 * Extract metadata from form fields for mapping
 * Prepares field data for LLM extraction context
 */
export const extractFormFieldMetadata = (formFields: Array<any>) => {
    return formFields.map(field => ({
        id: field.id,
        fieldName: field.fieldName,
        questionText: field.questionText,
        answerType: field.answerType,
        required: field.required || false,
        options: field.options || []
    }));
};

/**
 * Validate extracted data against form schema
 * Ensures extracted values match expected field types
 */
export const validateExtractedData = (
    extractedData: Record<string, any>,
    formFields: Array<any>
): { valid: boolean; errors: Record<string, string> } => {
    const errors: Record<string, string> = {};

    formFields.forEach(field => {
        const value = extractedData[field.id];

        // Check required fields
        if (field.required && !value) {
            errors[field.id] = 'This field is required';
            return;
        }

        if (!value) return; // Skip validation if not required and empty

        // Type-specific validation
        switch (field.answerType) {
            case 'number':
                if (isNaN(Number(value))) {
                    errors[field.id] = 'Must be a number';
                }
                break;
            case 'date':
                if (!/^\d{4}-\d{2}-\d{2}$/.test(String(value))) {
                    errors[field.id] = 'Must be in YYYY-MM-DD format';
                }
                break;
            case 'dropdown':
            case 'radio':
                const validOptions = field.options?.map((opt: any) => opt.value) || [];
                if (validOptions.length > 0 && !validOptions.includes(value)) {
                    errors[field.id] = 'Invalid option selected';
                }
                break;
        }
    });

    return {
        valid: Object.keys(errors).length === 0,
        errors
    };
};

/**
 * Format confidence score for display
 */
export const getConfidenceColor = (score: number): string => {
    if (score >= 80) return 'text-green-600 bg-green-50';
    if (score >= 60) return 'text-yellow-600 bg-yellow-50';
    return 'text-red-600 bg-red-50';
};

/**
 * Format confidence score as percentage string
 */
export const formatConfidenceScore = (score: number): string => {
    return `${Math.round(score * 100) / 100}%`;
};
