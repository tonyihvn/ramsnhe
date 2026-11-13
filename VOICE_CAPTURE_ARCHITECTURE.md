# Voice Data Capturing Feature - Architecture & Implementation Plan

## 🎯 Overview

A complete voice-to-form-data system that:
1. Records interviewer-responder conversations
2. Auto-transcribes using selectable speech-to-text services
3. Uses LLM to extract and map responses to form fields
4. Auto-populates form with mapped data
5. Allows manual review and editing before saving

**Status**: ✅ READY FOR IMPLEMENTATION

---

## 📐 System Architecture

```
┌─────────────────────────────────────────────────────────────┐
│                   VOICE CAPTURE FLOW                        │
└─────────────────────────────────────────────────────────────┘

Activities/Fill/{id} Form Page
    ↓
1. Display "Start Voice Capture" Button
    ↓
2. Click → Show Consent + Interviewer's Guide
    ↓
3. Ready → Click "Start Recording" → Show "Recording..." status
    ↓
4. Interviewer asks questions, Responder answers
    ↓
5. Click "Stop Voice Capture" → Save audio locally
    ↓
6. POST /api/voice-capture/transcribe → Transcription Service (Whisper/Google/etc)
    ↓
7. Receive transcribed text
    ↓
8. POST /api/voice-capture/extract-and-map → LLM (with AI Context + Form Fields)
    ↓
9. LLM returns structured JSON mapping: {field_id: value, ...}
    ↓
10. Auto-populate form fields based on data types
    ↓
11. Show "Review Data" modal → User edits if needed
    ↓
12. User clicks "Apply to Form" → Fields populated
    ↓
13. User reviews complete form and saves normally
```

---

## 🗄️ Database Schema (New Tables)

### Table 1: `dqatb_voice_recordings`
```sql
CREATE TABLE dqatb_voice_recordings (
    id SERIAL PRIMARY KEY,
    business_id INTEGER NOT NULL,
    form_id INTEGER NOT NULL,
    activity_id INTEGER NOT NULL,
    recording_file_path VARCHAR(500) NOT NULL,           -- local disk path
    transcription_text TEXT,
    transcription_service VARCHAR(50),                   -- openai-whisper, google-cloud, azure, etc
    extracted_data JSONB,                                -- LLM extracted {field_id: value}
    confidence_scores JSONB,                             -- {field_id: confidence_percent}
    duration_seconds INTEGER,
    file_size_bytes BIGINT,
    status VARCHAR(50),                                  -- recording, transcribing, extracting, ready, applied
    created_by INTEGER NOT NULL,
    created_at TIMESTAMP DEFAULT NOW(),
    updated_at TIMESTAMP DEFAULT NOW(),
    FOREIGN KEY (business_id) REFERENCES dqatb_businesses(id),
    FOREIGN KEY (form_id) REFERENCES dqatb_forms(id),
    FOREIGN KEY (activity_id) REFERENCES dqatb_activities(id)
);

CREATE INDEX idx_voice_business_activity ON dqatb_voice_recordings(business_id, activity_id);
CREATE INDEX idx_voice_created_at ON dqatb_voice_recordings(created_at DESC);
```

### Table 2: `dqatb_speech_to_text_configs`
```sql
CREATE TABLE dqatb_speech_to_text_configs (
    id SERIAL PRIMARY KEY,
    business_id INTEGER NOT NULL,
    provider VARCHAR(50) NOT NULL,                       -- openai-whisper, google-cloud, azure, local-whisper, browser-webapi
    is_active BOOLEAN DEFAULT false,
    configuration JSONB,                                 -- {api_key, endpoint, language, model, etc}
    priority_order INTEGER,                              -- 1 = primary, 2 = fallback, etc
    created_at TIMESTAMP DEFAULT NOW(),
    updated_at TIMESTAMP DEFAULT NOW(),
    UNIQUE(business_id, provider),
    FOREIGN KEY (business_id) REFERENCES dqatb_businesses(id)
);
```

### Table 3: `dqatb_form_voice_guidelines`
```sql
CREATE TABLE dqatb_form_voice_guidelines (
    id SERIAL PRIMARY KEY,
    business_id INTEGER NOT NULL,
    form_id INTEGER NOT NULL,
    is_enabled BOOLEAN DEFAULT true,
    ai_guide_text TEXT,                                  -- For LLM to use during extraction
    interviewer_guide_text TEXT,                         -- Display to user before recording
    extraction_prompt_override TEXT,                     -- Custom LLM prompt (optional)
    created_by INTEGER NOT NULL,
    created_at TIMESTAMP DEFAULT NOW(),
    updated_at TIMESTAMP DEFAULT NOW(),
    FOREIGN KEY (business_id) REFERENCES dqatb_businesses(id),
    FOREIGN KEY (form_id) REFERENCES dqatb_forms(id)
);
```

### Table 4: `dqatb_voice_media_library`
```sql
CREATE TABLE dqatb_voice_media_library (
    id SERIAL PRIMARY KEY,
    business_id INTEGER NOT NULL,
    recording_id INTEGER NOT NULL,
    file_name VARCHAR(255),
    file_path VARCHAR(500),
    file_size_bytes BIGINT,
    duration_seconds INTEGER,
    created_at TIMESTAMP DEFAULT NOW(),
    FOREIGN KEY (business_id) REFERENCES dqatb_businesses(id),
    FOREIGN KEY (recording_id) REFERENCES dqatb_voice_recordings(id)
);
```

---

## 🔌 Backend API Endpoints (8 New Endpoints)

### 1. Get Active Speech-to-Text Services
```
GET /api/voice-capture/speech-services
Response: [{id, provider, is_active, configuration}]
```

### 2. Configure Speech-to-Text Service
```
POST /api/voice-capture/speech-services/configure
Body: {provider, api_key, configuration}
Response: {success, message, config}
```

### 3. Get Form Voice Guidelines
```
GET /api/voice-capture/form/:formId/guidelines
Response: {ai_guide, interviewer_guide, extraction_prompt_override}
```

### 4. Save/Update Form Voice Guidelines
```
POST /api/voice-capture/form/:formId/guidelines
Body: {
    is_enabled,
    ai_guide_text,
    interviewer_guide_text,
    extraction_prompt_override
}
Response: {success, guidelines}
```

### 5. Save Recording Metadata
```
POST /api/voice-capture/recordings
Body: {
    activity_id,
    form_id,
    duration_seconds,
    file_size_bytes
}
Response: {recording_id, file_path}
```

### 6. Transcribe Audio
```
POST /api/voice-capture/transcribe
Body: {
    recording_id,
    recording_file_path,
    speech_service_id  // which service to use
}
Response: {recording_id, transcription_text, status}
```

### 7. Extract & Map Data (LLM Integration)
```
POST /api/voice-capture/extract-and-map
Body: {
    recording_id,
    transcription_text,
    form_id,
    form_field_definitions,      // [{id, name, type, label}]
    ai_context_id                 // from AI Context settings
}
Response: {
    extracted_data: {field_id: value, ...},
    confidence_scores: {field_id: 0-100, ...},
    extraction_log
}
```

### 8. Get Voice Recordings for Media Library
```
GET /api/voice-capture/media-library?page=1&limit=20
Response: {
    recordings: [{id, file_name, duration, size, created_at}],
    total,
    pagination
}
```

### 9. Delete Recording from Media Library
```
DELETE /api/voice-capture/recordings/:recordingId
Response: {success, message}
```

### 10. Download Recording
```
GET /api/voice-capture/recordings/:recordingId/download
Response: Binary audio file
```

---

## 🎨 Frontend Components (New & Modified)

### NEW: VoiceCapturePanel.tsx
Location: `components/VoiceCapturePanel.tsx`

```typescript
interface VoiceCapturePanelProps {
  formId: number;
  activityId: number;
  formFields: FormField[];
  onDataExtracted: (extractedData: Record<string, any>) => void;
  onError: (error: string) => void;
}

Features:
- Voice recording start/stop with MediaRecorder API
- Real-time waveform visualization
- Interviewer's guide display before recording
- Transcription progress indicator
- LLM extraction progress
- Extracted data review modal
- Auto-population to form
```

### NEW: SpeechToTextConfig.tsx (Settings Tab)
Location: `components/SpeechToTextConfig.tsx`

```typescript
Features:
- List all available speech-to-text providers
- Configure each service (API key, settings)
- Set priority order for fallback
- Test connection for each service
- Enable/disable services
- Display usage statistics
```

### NEW: FormVoiceGuidelinesEditor.tsx (Form Builder Tab)
Location: `components/FormVoiceGuidelinesEditor.tsx`

```typescript
Features:
- Toggle voice capture enabled/disabled
- Edit AI guide text
- Edit interviewer guide text
- Optional custom LLM extraction prompt
- Preview interviewer guide
- Save & validate
```

### MODIFIED: ActivitiesFill.tsx
```typescript
Changes:
- Add VoiceCapturePanel above form
- Only show if form has voice capture enabled
- Handle extracted data in form context
- Show extracted confidence scores
- Enable/disable fields based on confidence
```

### MODIFIED: SettingsPage.tsx
```typescript
Changes:
- Add "Speech-to-Text Services" tab in AI Integrations
- Add "Media Library" tab in Settings
- Keep existing tabs intact
```

---

## 🧠 LLM Extraction Prompt (System Prompt)

```
You are an expert form data extractor. Your job is to analyze a 
transcribed interview conversation and extract structured data for 
form submission.

CONTEXT:
${aiContextData}

FORM FIELDS TO EXTRACT:
${formFieldsDefinition}

VOICE GUIDELINES:
${aiGuideText}

TRANSCRIBED CONVERSATION:
${transcriptionText}

TASK:
1. Identify each question asked by the interviewer
2. Find the corresponding answer from the responder
3. Map each answer to the most appropriate form field
4. Convert values to match field data types:
   - Text → string
   - Number → parse as integer/float
   - Date → parse to ISO format
   - Select → match to available options
   - Checkbox → boolean (yes/true/agreed = true)
   - Multiple Select → array of matched values

OUTPUT FORMAT (JSON):
{
  "extracted_data": {
    "field_id_1": value1,
    "field_id_2": value2
  },
  "confidence_scores": {
    "field_id_1": 95,
    "field_id_2": 87
  },
  "notes": "any important observations",
  "unmapped_responses": ["list of responses that didn't map to any field"]
}

Be thorough but conservative. Only map responses you're confident about.
If ambiguous, set lower confidence score.
```

---

## 📋 Implementation Checklist

### Phase 1: Database (Day 1)
- [ ] Create migration file: `008_voice_capture.sql`
- [ ] Run migration to create 4 new tables
- [ ] Verify table creation
- [ ] Test indexes on business_id

### Phase 2: Backend API (Days 2-3)
- [ ] Create `server/voice-capture-routes.js`
  - [ ] Speech service CRUD endpoints
  - [ ] Recording metadata endpoints
  - [ ] Transcription integration endpoints
  - [ ] LLM extraction endpoints
  - [ ] Media library endpoints
- [ ] Integrate speech-to-text services:
  - [ ] OpenAI Whisper
  - [ ] Google Cloud Speech
  - [ ] Azure Cognitive Services
  - [ ] Local Whisper.cpp
  - [ ] Browser Web Speech API
- [ ] Create LLM extraction prompt builder
- [ ] Add error handling & retry logic

### Phase 3: Frontend Components (Days 4-5)
- [ ] Build VoiceCapturePanel component
  - [ ] MediaRecorder setup
  - [ ] Waveform visualization
  - [ ] Guide display logic
  - [ ] Recording timer
  - [ ] Transcription progress
- [ ] Build SpeechToTextConfig component
- [ ] Build FormVoiceGuidelinesEditor component
- [ ] Modify ActivitiesFill to integrate VoiceCapturePanel
- [ ] Add Media Library tab to Settings

### Phase 4: Form Builder Integration (Day 5)
- [ ] Add Voice Guidelines tab to Form Builder
- [ ] Modify form schema to include voice_capture_enabled
- [ ] Add guides to form metadata

### Phase 5: Testing (Day 6)
- [ ] Unit tests for speech service configs
- [ ] Integration tests for transcription flow
- [ ] E2E tests for full voice capture → form fill flow
- [ ] Test each speech-to-text service
- [ ] Test data mapping accuracy
- [ ] Test media library operations

### Phase 6: Documentation (Day 6)
- [ ] API documentation
- [ ] Component prop documentation
- [ ] Setup guide for speech services
- [ ] User guide for interviewers
- [ ] Admin guide for voice guidelines

---

## 🎯 Key Features Summary

| Feature | Implementation |
|---------|-----------------|
| **Recording** | HTML5 MediaRecorder API |
| **Storage** | Local disk, organized by business/form/activity |
| **Transcription** | Pluggable (5 services), auto-fallback |
| **LLM Extraction** | Context-aware, confidence scoring |
| **Data Mapping** | Automatic with manual override support |
| **Media Library** | View, download, delete recordings |
| **Guidelines** | Two types (AI + Interviewer) |
| **Consent** | Consent notice on first recording (configurable) |
| **Retention** | Permanent storage with deletion option |

---

## 🚀 Next Steps

1. Create database migration file
2. Build backend API routes
3. Integrate speech-to-text services
4. Create React components
5. Test full flow end-to-end
6. Deploy and monitor

---

**Total Implementation Time**: 6 days  
**Complexity**: High (audio + AI integration)  
**Priority**: Core feature for healthcare interviews

