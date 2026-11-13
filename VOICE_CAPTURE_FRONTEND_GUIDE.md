# Voice Data Capturing - Frontend Implementation Guide

## Overview

The Voice Data Capturing feature enables interviewers to record conversations with respondents, which are then automatically transcribed, processed by an LLM, and used to auto-fill form fields.

**Complete Flow:**
1. User clicks "Start Voice Capture" on form fill page
2. System shows interviewer's guide (must read)
3. User clicks "Begin Recording"
4. Interviewer asks questions, respondent answers
5. User clicks "Stop Recording"
6. System auto-transcribes the audio
7. System extracts Q&A pairs and maps to form fields using LLM
8. User reviews extracted data and confidence scores
9. User can edit data before applying
10. Form fields auto-populate with extracted data
11. User reviews complete form and saves normally

---

## Frontend Components

### 1. VoiceCapturePanel.tsx (Main Component)

**Location:** `/components/VoiceCapturePanel.tsx`

**Purpose:** Main UI component that handles the entire voice capture workflow

**Props:**
```typescript
interface VoiceCapturePanelProps {
    formId: number;              // ID of the form being filled
    activityId: number;          // ID of the activity/survey
    formFields: Array<{          // List of form fields to map to
        id: string;
        questionText: string;
        answerType: string;
        fieldName?: string;
    }>;
    onDataExtracted: (data: Record<string, any>) => void;  // Callback when data is extracted
    onClose: () => void;         // Callback when user closes panel
}
```

**Phases:**
- `idle` - Initializing
- `guide` - Showing interviewer's guide (if enabled)
- `recording` - Recording audio
- `transcribing` - Converting audio to text
- `extracting` - Using LLM to extract and map data
- `review` - Showing extracted data for editing
- `error` - Error state

**Usage:**
```tsx
import { VoiceCapturePanel } from '../components/VoiceCapturePanel';

// In your form component:
const [showVoiceCapture, setShowVoiceCapture] = useState(false);

const handleVoiceDataExtracted = (data) => {
    // Populate form fields with extracted data
    Object.entries(data).forEach(([fieldId, value]) => {
        updateFormField(fieldId, value);
    });
};

{showVoiceCapture && (
    <VoiceCapturePanel
        formId={formId}
        activityId={activityId}
        formFields={formFields}
        onDataExtracted={handleVoiceDataExtracted}
        onClose={() => setShowVoiceCapture(false)}
    />
)}
```

### 2. FormVoiceGuidelinesEditor.tsx

**Location:** `/components/FormVoiceGuidelinesEditor.tsx`

**Purpose:** Interface for editing voice capture guidelines for a specific form

**Props:**
```typescript
interface FormVoiceGuidelinesEditorProps {
    formId: number;              // ID of form to edit guidelines for
    onSave?: () => void;         // Callback after saving
    onClose?: () => void;        // Callback when closing
}
```

**Features:**
- Enable/disable voice capture for the form
- Edit interviewer's guide (displayed before recording)
- Edit AI guide (helps LLM extract data)
- Override default extraction prompt

**Integration Point:** Form Builder → Voice Guidelines Tab

### 3. SpeechToTextConfig.tsx

**Location:** `/components/SpeechToTextConfig.tsx`

**Purpose:** Configure and manage speech-to-text services

**Props:**
```typescript
interface SpeechToTextConfigProps {
    onClose?: () => void;        // Callback when closing
    onConfigured?: () => void;   // Callback after configuration
}
```

**Features:**
- Add/remove speech services
- Test service connections
- Set service priority/fallback order
- Enable/disable services

**Supported Providers:**
- OpenAI Whisper (recommended, highest accuracy)
- Google Cloud Speech-to-Text
- Azure Speech Services
- Local Whisper (self-hosted)

**Integration Point:** Settings → AI Integrations → Speech-to-Text Services

---

## Custom Hooks

### useVoiceRecorder

**Location:** `/hooks/useVoiceRecorder.ts`

**Purpose:** Manages audio recording using Web Audio API

**Usage:**
```tsx
const { state, startRecording, stopRecording, pauseRecording, resumeRecording, resetRecording } = useVoiceRecorder();

// state contains:
// - isRecording: boolean
// - isPaused: boolean
// - duration: number (seconds)
// - audioBlob: Blob | null
// - error: string | null

// Start recording
await startRecording();

// Pause/resume
pauseRecording();
resumeRecording();

// Stop and get blob
await stopRecording();
const blob = state.audioBlob;

// Reset
resetRecording();
```

**Features:**
- Auto-detects best audio MIME type
- Enables echo cancellation and noise suppression
- Supports pause/resume
- Duration tracking
- Error handling

### useVoiceApi

**Location:** `/hooks/useVoiceApi.ts`

**Purpose:** Handles all API calls for voice capture operations

**Usage:**
```tsx
const {
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
} = useVoiceApi();

// Create recording entry
const recordingId = await createRecording(formId, activityId);

// Upload audio
await uploadAudio(recordingId, audioBlob);

// Transcribe
const text = await transcribeAudio(recordingId);

// Extract and map data
const extracted = await extractAndMapData(recordingId, formId);
// Returns: { extracted_data: {...}, confidence_scores: {...} }

// Get guidelines
const guidelines = await getFormGuidelines(formId);

// Update guidelines
await updateFormGuidelines(formId, guidelines);
```

**Returns:**
```typescript
interface ExtractedData {
    extracted_data: Record<string, any>;      // Mapped form field values
    confidence_scores: Record<string, number>; // 0-100 confidence per field
    extraction_notes?: string;                 // Any notes from LLM
}
```

---

## Utility Functions

### Audio Processing (`utils/audioProcessing.ts`)

```tsx
import {
    blobToBase64,
    base64ToBlob,
    formatFileSize,
    downloadBlob,
    validateAudioBlob,
    getAudioDuration,
    isRecordingSupported,
    getSupportedMimeTypes,
    extractFormFieldMetadata,
    validateExtractedData,
    getConfidenceColor,
    formatConfidenceScore
} from '../utils/audioProcessing';

// Check if browser supports recording
if (!isRecordingSupported()) {
    alert('Your browser does not support audio recording');
}

// Validate audio blob
const validation = validateAudioBlob(blob, 500); // max 500MB
if (!validation.valid) {
    console.error(validation.error);
}

// Get audio duration
const duration = await getAudioDuration(blob);
console.log(`Audio duration: ${duration}s`);

// Format file size
const sizeStr = formatFileSize(blob.size); // "2.5 MB"

// Download audio
downloadBlob(blob, 'interview.webm');

// Validate extracted data against form schema
const validation = validateExtractedData(extractedData, formFields);
if (!validation.valid) {
    Object.entries(validation.errors).forEach(([fieldId, error]) => {
        console.error(`Field ${fieldId}: ${error}`);
    });
}

// Get color for confidence display
const color = getConfidenceColor(85); // "text-green-600 bg-green-50"
```

---

## Integration into FillFormPage

The VoiceCapturePanel should be integrated into the FillFormPage component. Here's how:

### Step 1: Add State

```tsx
const [showVoiceCapture, setShowVoiceCapture] = useState(false);
const [voiceCapturedData, setVoiceCapturedData] = useState<Record<string, any>>({});
```

### Step 2: Add Button

Add this button above the form:

```tsx
<Button
    onClick={() => setShowVoiceCapture(true)}
    className="flex items-center gap-2 mb-4"
>
    <MicrophoneIcon className="h-5 w-5" />
    Start Voice Capture
</Button>
```

### Step 3: Add Modal/Panel

```tsx
{showVoiceCapture && (
    <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center z-50">
        <div className="bg-white rounded-lg shadow-lg max-h-screen overflow-y-auto">
            <VoiceCapturePanel
                formId={formId}
                activityId={activityId}
                formFields={formDefinition.pages.flatMap(page =>
                    page.sections.flatMap(section => section.questions)
                )}
                onDataExtracted={(data) => {
                    // Auto-populate form with extracted data
                    Object.entries(data).forEach(([questionId, value]) => {
                        setAnswers(prev => ({
                            ...prev,
                            [questionId]: value
                        }));
                    });
                    setVoiceCapturedData(data);
                    setShowVoiceCapture(false);
                }}
                onClose={() => setShowVoiceCapture(false)}
            />
        </div>
    </div>
)}
```

### Step 4: Show Review Notification

After voice data is captured:

```tsx
{Object.keys(voiceCapturedData).length > 0 && (
    <div className="bg-green-50 border-l-4 border-green-500 p-4 rounded mb-4">
        <p className="text-green-900 text-sm">
            ✓ {Object.keys(voiceCapturedData).length} fields were auto-populated from voice capture.
            Please review the data before saving.
        </p>
    </div>
)}
```

---

## Backend API Endpoints

The frontend communicates with these backend endpoints:

### Recording Management
```
POST   /api/voice-capture/recordings
       Create recording entry
       Body: { form_id, activity_id }
       Returns: { recording_id }

POST   /api/voice-capture/upload-audio
       Upload audio file
       Body: FormData with 'audio' blob and 'recording_id'
       Returns: { success }

POST   /api/voice-capture/transcribe
       Transcribe audio to text
       Body: { recording_id }
       Returns: { transcription_text }

POST   /api/voice-capture/extract-and-map
       Extract data and map to form fields
       Body: { recording_id, form_id }
       Returns: { extracted_data: {...}, confidence_scores: {...} }

GET    /api/voice-capture/recordings/:id
       Get recording details
       Returns: Recording metadata

DELETE /api/voice-capture/recordings/:id
       Delete recording (soft delete)
       Returns: { success }

GET    /api/voice-capture/media-library
       List all recordings
       Query: form_id?, activity_id?
       Returns: { recordings: [...] }
```

### Speech Services
```
GET    /api/voice-capture/speech-services
       List all configured services
       Returns: { services: [...] }

GET    /api/voice-capture/speech-services/active
       List active services
       Returns: { services: [...] }

POST   /api/voice-capture/speech-services/configure
       Add/configure service
       Body: { provider, configuration, is_active }
       Returns: { success }

POST   /api/voice-capture/speech-services/:id/test
       Test service connection
       Returns: { success, message }

PUT    /api/voice-capture/speech-services/:id
       Update service
       Body: { is_active?, priority_order? }
       Returns: { success }

DELETE /api/voice-capture/speech-services/:id
       Delete service
       Returns: { success }
```

### Form Guidelines
```
GET    /api/voice-capture/form/:formId/guidelines
       Get guidelines for form
       Returns: { guidelines: {...} }

POST   /api/voice-capture/form/:formId/guidelines
       Save guidelines for form
       Body: { guidelines: {...} }
       Returns: { success }
```

---

## Settings Integration

### New Settings Tabs to Add

1. **Speech-to-Text Services** (Settings → AI Integrations)
   - Configure and manage transcription services
   - Component: `SpeechToTextConfig`
   - Required because: Without this, transcription won't work

2. **Voice Guidelines** (Form Builder)
   - Edit interviewer and AI guides for each form
   - Component: `FormVoiceGuidelinesEditor`
   - Required because: Guides improve extraction quality

---

## Testing & Validation

### Unit Tests to Write

1. **Audio Recording**
   - Test microphone access
   - Test pause/resume functionality
   - Test audio blob creation
   - Test error handling

2. **API Integration**
   - Test recording creation
   - Test audio upload
   - Test transcription API calls
   - Test error handling

3. **Data Extraction**
   - Test extracted data validation
   - Test confidence score ranges
   - Test field mapping accuracy

### Manual Testing Checklist

- [ ] Start recording works
- [ ] Pause/resume works
- [ ] Stop recording returns audio blob
- [ ] Audio uploads successfully
- [ ] Transcription completes
- [ ] Extracted data appears in review modal
- [ ] Can edit extracted data
- [ ] Apply to form auto-populates fields
- [ ] Form can be saved normally
- [ ] Media library lists recordings
- [ ] Can download recording
- [ ] Can delete recording

---

## Performance Considerations

1. **Audio Blob Size**
   - WebM format is more efficient than others
   - Typical 5-minute recording: ~2-5 MB
   - Max file size: 500 MB

2. **Transcription Time**
   - 1 minute audio: ~10-30 seconds
   - Depends on speech service used
   - Show progress indicator to user

3. **LLM Processing**
   - Extraction: ~5-15 seconds
   - Depends on form complexity and data size
   - Show progress indicator to user

4. **Storage**
   - Recordings stored on disk
   - Location: `uploads/voice/{business_id}/{form_id}/{activity_id}/`
   - Retention: Permanent (never auto-deleted)

---

## Error Handling

### Common Errors & Solutions

| Error | Cause | Solution |
|-------|-------|----------|
| "Microphone access denied" | User rejected permission | Ask user to allow microphone in browser settings |
| "No audio data recorded" | Recording too short or failed | Try recording again with longer duration |
| "Transcription failed" | Speech service error | Check service configuration and API key |
| "Extraction failed" | LLM error or no form guidelines | Configure speech service and form guidelines |
| "Failed to upload audio" | Network error | Check internet connection and try again |

### Error Display

Errors are shown in the error phase:

```tsx
if (phase.phase === 'error') {
    // Shows error message and allows user to:
    // 1. Close and return to form
    // 2. Try again (resets recording)
}
```

---

## Browser Compatibility

**Supported Browsers:**
- Chrome/Edge 49+ (MediaRecorder API)
- Firefox 25+
- Safari 14.1+ (added MediaRecorder support)
- Mobile browsers (iOS 14.5+, Android Chrome)

**Fallback:**
If browser doesn't support recording:
```tsx
if (!isRecordingSupported()) {
    // Show message: "Your browser doesn't support voice recording"
    // Disable voice capture button
}
```

---

## Security & Privacy

1. **Audio Storage**
   - Stored on disk, not in database
   - Path includes business_id for isolation
   - All recordings are associated with user

2. **API Keys**
   - Speech service keys stored encrypted in database
   - Never exposed to frontend
   - Backend handles all API calls

3. **User Consent**
   - Browser prompts user for microphone permission
   - User must explicitly allow recording
   - Interview guide makes recording intent clear

4. **Data Retention**
   - Recordings never auto-deleted
   - Users can manually delete via media library
   - Delete triggers audit log entry

---

## File Structure

```
components/
  ├── VoiceCapturePanel.tsx           (Main recording UI)
  ├── FormVoiceGuidelinesEditor.tsx   (Guidelines editor)
  └── SpeechToTextConfig.tsx          (Service configuration)

hooks/
  ├── useVoiceRecorder.ts             (Audio recording hook)
  └── useVoiceApi.ts                  (API communication hook)

utils/
  └── audioProcessing.ts             (Audio utilities)

server/
  ├── voice-capture-routes.js         (API endpoints)
  ├── voice-capture-helpers.js        (Business logic)
  ├── voice-media-library-routes.js   (Media management)
  └── migrations/008_voice_capture.sql (Database schema)
```

---

## Next Steps

1. ✅ Database schema created (migration 008)
2. ✅ Backend API endpoints implemented
3. ✅ Frontend components created
4. ⏳ **Integrate into FillFormPage**
5. ⏳ **Add settings tabs**
6. ⏳ **Test end-to-end flow**
7. ⏳ **Deploy and train users**

---

## Support & Troubleshooting

For issues:
1. Check browser console for errors
2. Review backend logs for API errors
3. Verify speech service is configured
4. Test speech service connection in settings
5. Check form guidelines are set appropriately

---

**Last Updated:** 2024  
**Version:** 1.0  
**Status:** Ready for Integration
