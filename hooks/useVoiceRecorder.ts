import { useState, useRef, useCallback, useEffect } from 'react';

export interface RecordingState {
    isRecording: boolean;
    isPaused: boolean;
    duration: number;
    audioBlob: Blob | null;
    error: string | null;
}

export interface UseVoiceRecorderReturn {
    state: RecordingState;
    startRecording: () => Promise<void>;
    stopRecording: () => Promise<Blob | null>;
    pauseRecording: () => void;
    resumeRecording: () => void;
    resetRecording: () => void;
}

/**
 * Custom hook for audio recording using Web Audio API
 * Supports pause/resume and provides audio blob for upload
 */
export const useVoiceRecorder = (): UseVoiceRecorderReturn => {
    const recordingInstanceRef = useRef<number>(Math.random());
    console.log('[useVoiceRecorder] Hook initialized or re-rendered - instance:', recordingInstanceRef.current);
    
    const [state, setState] = useState<RecordingState>({
        isRecording: false,
        isPaused: false,
        duration: 0,
        audioBlob: null,
        error: null
    });

    // Log state changes for debugging
    const setStateWithLog = (newState: RecordingState | ((prev: RecordingState) => RecordingState)) => {
        setState(prev => {
            const updated = typeof newState === 'function' ? newState(prev) : newState;
            console.log(`[useVoiceRecorder #${recordingInstanceRef.current.toFixed(4)}] State update:`, {
                prevIsRecording: prev.isRecording,
                updatedIsRecording: updated.isRecording,
                prevDuration: prev.duration,
                updatedDuration: updated.duration,
                mediaRecorderState: mediaRecorderRef.current?.state
            });
            
            return updated;
        });
    };

    const mediaRecorderRef = useRef<MediaRecorder | null>(null);
    const streamRef = useRef<MediaStream | null>(null);
    const chunksRef = useRef<Blob[]>([]);
    const durationIntervalRef = useRef<NodeJS.Timeout | null>(null);
    const startTimeRef = useRef<number>(0);
    const pausedTimeRef = useRef<number>(0);
    const isRecordingRefForced = useRef<boolean>(false);

    const getMicrophoneErrorMessage = (err: unknown): string => {
        if (err instanceof DOMException) {
            if (err.name === 'NotAllowedError' || err.name === 'PermissionDeniedError') {
                return 'Microphone permission was denied. Allow microphone access in your browser/site settings and try again.';
            }
            if (err.name === 'NotFoundError' || err.name === 'DevicesNotFoundError') {
                return 'No microphone device was found. Connect a microphone and try again.';
            }
            if (err.name === 'NotReadableError' || err.name === 'TrackStartError') {
                return 'Microphone is busy or unavailable. Close other apps using it and try again.';
            }
            if (err.name === 'SecurityError') {
                return 'Microphone access is blocked by browser security policy. Use HTTPS (or localhost) and allow microphone access.';
            }
        }
        if (err instanceof Error && err.message) {
            return err.message;
        }
        return 'Failed to access microphone';
    };

    const startRecording = useCallback(async () => {
        try {
            console.log('[useVoiceRecorder] Starting recording');
            setStateWithLog(prev => ({ ...prev, error: null }));

            if (typeof navigator === 'undefined') {
                throw new Error('Microphone access is unavailable in this environment.');
            }

            const legacyNavigator = navigator as Navigator & {
                getUserMedia?: (constraints: MediaStreamConstraints, successCallback: NavigatorUserMediaSuccessCallback, errorCallback: NavigatorUserMediaErrorCallback) => void;
                webkitGetUserMedia?: (constraints: MediaStreamConstraints, successCallback: NavigatorUserMediaSuccessCallback, errorCallback: NavigatorUserMediaErrorCallback) => void;
                mozGetUserMedia?: (constraints: MediaStreamConstraints, successCallback: NavigatorUserMediaSuccessCallback, errorCallback: NavigatorUserMediaErrorCallback) => void;
            };

            const legacyGetUserMedia =
                legacyNavigator.getUserMedia ||
                legacyNavigator.webkitGetUserMedia ||
                legacyNavigator.mozGetUserMedia;

            const supportsModernGetUserMedia =
                !!navigator.mediaDevices &&
                typeof navigator.mediaDevices.getUserMedia === 'function';

            if (!supportsModernGetUserMedia && !legacyGetUserMedia) {
                const secureContextHint =
                    typeof window !== 'undefined' && !window.isSecureContext
                        ? ' Use HTTPS (or localhost).'
                        : '';
                throw new Error(`Microphone access is unavailable in this browser/context.${secureContextHint}`);
            }

            if (typeof MediaRecorder === 'undefined') {
                throw new Error('Audio recording is not supported in this browser.');
            }

            const getUserMedia = supportsModernGetUserMedia
                ? navigator.mediaDevices.getUserMedia.bind(navigator.mediaDevices)
                : (constraints: MediaStreamConstraints) =>
                      new Promise<MediaStream>((resolve, reject) => {
                          if (!legacyGetUserMedia) {
                              reject(new Error('Microphone access is unavailable in this browser/context.'));
                              return;
                          }
                          legacyGetUserMedia.call(navigator, constraints, resolve, reject);
                      });

            // Request microphone access
            console.log('[useVoiceRecorder] Requesting microphone access');
            const stream = await getUserMedia({
                audio: {
                    echoCancellation: true,
                    noiseSuppression: true,
                    autoGainControl: true,
                }
            });
            console.log('[useVoiceRecorder] Microphone access granted');

            streamRef.current = stream;
            chunksRef.current = [];

            // Create MediaRecorder
            const mimeType = 'audio/webm;codecs=opus';
            const isSupported = MediaRecorder.isTypeSupported(mimeType);
            
            const recorder = new MediaRecorder(stream, {
                mimeType: isSupported ? mimeType : undefined
            });

            mediaRecorderRef.current = recorder;

            // Handle data available
            recorder.ondataavailable = (event) => {
                if (event.data.size > 0) {
                    chunksRef.current.push(event.data);
                }
            };

            // Start recording
            console.log('[useVoiceRecorder] Starting MediaRecorder');
            recorder.start();
            startTimeRef.current = Date.now();
            pausedTimeRef.current = 0;
            isRecordingRefForced.current = true;

            setState(prev => {
                const updated = {
                    ...prev,
                    isRecording: true,
                    isPaused: false,
                    duration: 0
                };
                console.log('[useVoiceRecorder] setState isRecording: true - prev:', prev.isRecording, 'updated:', updated.isRecording);
                return updated;
            });
            console.log('[useVoiceRecorder] Recording state set to true - waiting for state to settle');
            
            // Ensure state settles before returning
            await new Promise(resolve => setTimeout(resolve, 50));

            // Update duration every 100ms
            durationIntervalRef.current = setInterval(() => {
                setStateWithLog(prev => ({
                    ...prev,
                    duration: Math.floor((Date.now() - startTimeRef.current - pausedTimeRef.current) / 1000)
                }));
            }, 100);

        } catch (err) {
            isRecordingRefForced.current = false;
            const errorMessage = getMicrophoneErrorMessage(err);
            console.error('[useVoiceRecorder] Error:', errorMessage);
            setStateWithLog(prev => ({
                ...prev,
                error: errorMessage,
                isRecording: false
            }));
        }
    }, []);

    const stopRecording = useCallback(async (): Promise<Blob | null> => {
        console.log('[useVoiceRecorder] stopRecording called, mediaRecorder state:', mediaRecorderRef.current?.state);
        return new Promise((resolve) => {
            if (!mediaRecorderRef.current || mediaRecorderRef.current.state === 'inactive') {
                resolve(null);
                return;
            }

            const recorder = mediaRecorderRef.current;

            recorder.onstop = () => {
                // Clear interval
                if (durationIntervalRef.current) {
                    clearInterval(durationIntervalRef.current);
                }

                // Create blob from chunks
                const mimeType = 'audio/webm;codecs=opus';
                const blob = new Blob(chunksRef.current, { type: mimeType });

                // Stop stream
                if (streamRef.current) {
                    streamRef.current.getTracks().forEach(track => track.stop());
                }

                isRecordingRefForced.current = false;

                setState(prev => ({
                    ...prev,
                    isRecording: false,
                    isPaused: false,
                    audioBlob: blob
                }));

                resolve(blob);
            };

            recorder.stop();
        });
    }, []);

    const pauseRecording = useCallback(() => {
        if (mediaRecorderRef.current && mediaRecorderRef.current.state === 'recording') {
            mediaRecorderRef.current.pause();
            pausedTimeRef.current += Date.now() - startTimeRef.current;
            startTimeRef.current = Date.now();
            setStateWithLog(prev => ({ ...prev, isPaused: true }));
        }
    }, []);

    const resumeRecording = useCallback(() => {
        if (mediaRecorderRef.current && mediaRecorderRef.current.state === 'paused') {
            mediaRecorderRef.current.resume();
            startTimeRef.current = Date.now();
            setStateWithLog(prev => ({ ...prev, isPaused: false }));
        }
    }, []);

    const resetRecording = useCallback(() => {
        console.log('[useVoiceRecorder] resetRecording called');
        isRecordingRefForced.current = false;
        if (durationIntervalRef.current) {
            clearInterval(durationIntervalRef.current);
        }
        if (streamRef.current) {
            streamRef.current.getTracks().forEach(track => track.stop());
        }
        chunksRef.current = [];
        mediaRecorderRef.current = null;
        streamRef.current = null;

        setStateWithLog({
            isRecording: false,
            isPaused: false,
            duration: 0,
            audioBlob: null,
            error: null
        });
    }, []);

    // Add cleanup logging
    useEffect(() => {
        console.log('[useVoiceRecorder] Component mounted/updated');
        return () => {
            console.log('[useVoiceRecorder] Component will unmount or cleanup');
            isRecordingRefForced.current = false;
        };
    }, []);

    return {
        state,
        startRecording,
        stopRecording,
        pauseRecording,
        resumeRecording,
        resetRecording
    };
};
