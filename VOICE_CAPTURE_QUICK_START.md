# Voice Data Capturing - Quick Start (15 Minutes)

## What Is It?
A feature that records interviews, auto-transcribes them, and auto-fills form fields using AI.

**Flow**: Record → Transcribe → Extract → Auto-Fill → Review → Save

---

## 📦 What's Included

### Files Created (4 files)
1. **Database Migration** - `server/migrations/008_voice_capture.sql` (6 tables)
2. **Backend API** - `server/voice-capture-routes.js` (22 KB, 10 endpoints)
3. **Backend Helpers** - `server/voice-capture-helpers.js` (14 KB, transcription/LLM)
4. **Media Library API** - `server/voice-media-library-routes.js` (11 KB, file management)

### Documentation (2 guides)
- `VOICE_CAPTURE_ARCHITECTURE.md` - System design overview
- `VOICE_CAPTURE_IMPLEMENTATION_GUIDE.md` - Full 6-day implementation plan

---

## 🚀 Quick Integration (3 Steps)

### Step 1: Database (2 minutes)
```bash
npm run migrate
```
✅ Creates 6 new tables for recordings, transcription services, guidelines, and media

### Step 2: Register Routes (3 minutes)

Edit `server/index.js`:
```javascript
import voiceCaptureRoutes from './voice-capture-routes.js';
import voiceMediaLibraryRoutes from './voice-media-library-routes.js';

// Add these (around line where other API routes are registered)
app.use('/api/voice-capture', voiceCaptureRoutes);
app.use('/api/voice-capture', voiceMediaLibraryRoutes);

// Enable file uploads (add if not present)
app.use(fileUpload({
    createParentPath: true,
    limits: { fileSize: 500 * 1024 * 1024 }
}));
```

Create uploads directory:
```bash
mkdir -p uploads/voice
```

### Step 3: Install Dependencies (2 minutes)
```bash
npm install axios form-data express-fileupload
```

---

## 🎯 Key Features

| Feature | Implementation |
|---------|-----------------|
| **Recording** | HTML5 MediaRecorder API (browser-based) |
| **Storage** | Local disk, organized by business/form |
| **Transcription** | Pluggable services (OpenAI, Google, Azure, Local) |
| **Extraction** | LLM-powered with confidence scores |
| **Auto-Fill** | Intelligent form field mapping |
| **Guidelines** | Two types: AI guide + Interviewer guide |
| **Media Library** | View, download, delete recordings |
| **Retention** | Permanent storage (never auto-delete) |

---

## 📊 Available APIs (10 Endpoints)

### Speech-to-Text Configuration
```
GET    /api/voice-capture/speech-services           → List all services
POST   /api/voice-capture/speech-services/configure → Add/configure service
POST   /api/voice-capture/speech-services/:id/test  → Test connection
DELETE /api/voice-capture/speech-services/:id       → Remove service
```

### Form Guidelines
```
GET    /api/voice-capture/form/:formId/guidelines
POST   /api/voice-capture/form/:formId/guidelines
```

### Recording Management
```
POST   /api/voice-capture/recordings               → Create recording
POST   /api/voice-capture/transcribe               → Transcribe audio
POST   /api/voice-capture/extract-and-map          → LLM extraction
GET    /api/voice-capture/media-library            → List recordings
DELETE /api/voice-capture/recordings/:id           → Delete recording
GET    /api/voice-capture/recordings/:id/download  → Download audio
```

---

## 🧠 How It Works

```
User clicks "Start Voice Capture"
    ↓
Shows interviewer's guide (must read before proceeding)
    ↓
Clicks "Begin Recording" → Recording starts
    ↓
Interviewer asks questions, responder answers
    ↓
Clicks "Stop Recording" → Audio saved locally
    ↓
[AUTO] Audio transcribed using speech service (10-30 seconds)
    ↓
[AUTO] LLM extracts Q&A pairs and maps to form fields
    ↓
Shows "Review Extracted Data" modal with confidence scores
    ↓
User can edit or confirm data
    ↓
Clicks "Apply to Form" → Form fields auto-populated
    ↓
User reviews complete form and saves normally
```

---

## 🔧 Configuration

### 1. Setup Speech-to-Text Service

In Settings → AI Integrations → **Speech-to-Text Services** (new tab):

**Option A: OpenAI Whisper** (Best accuracy, $0.006/min)
```
Provider: openai-whisper
API Key: sk-...
Model: whisper-1
Language: en
```

**Option B: Google Cloud** (Good accuracy, $0.024/15sec)
```
Provider: google-cloud-speech
Credentials: Upload JSON file
Language: en-US
```

**Option C: Local Whisper** (Private, free, slower)
```
Provider: local-whisper
URL: http://localhost:8000
```

### 2. Add Voice Guidelines to Form

In Form Builder → **Voice Guidelines** (new tab):

```
Is Enabled: ✓

Interviewer's Guide (displays before recording):
"Please ask the following questions in a natural way:
1. What is the patient's name?
2. What is their main complaint?
3. When did symptoms start?
..."

AI Guide (helps LLM extract data):
"Extract patient name, complaint, and onset date.
Match responses to form fields precisely."
```

---

## 📈 Database Schema

### Main Tables
- **dqatb_voice_recordings** - Stores recording metadata, transcription, extracted data
- **dqatb_speech_to_text_configs** - Service configurations and API keys
- **dqatb_form_voice_guidelines** - Guidelines for each form
- **dqatb_voice_media_library** - File management and browsing
- **dqatb_voice_capture_audit** - Deletion and access logs
- **dqatb_voice_usage_stats** - Cost and usage tracking

### Key Fields
```sql
voice_recordings:
  - recording_file_path    -- Where audio is stored
  - transcription_text     -- Speech-to-text result
  - extracted_data         -- Mapped form fields {field_id: value}
  - confidence_scores      -- {field_id: 0-100}
  - status                 -- recording → transcribed → extracted → applied
```

---

## 🛠️ Frontend Components Needed

### 1. VoiceCapturePanel.tsx (High Priority)
**What it does**: Recording UI, guide display, transcription progress, data review
**Goes in**: `/activities/fill/{id}` form page
**Props**: `formId`, `activityId`, `formFields`, `onDataExtracted`

### 2. SpeechToTextConfig.tsx (Medium Priority)
**What it does**: Service configuration, API key setup, testing
**Goes in**: Settings → AI Integrations → Speech-to-Text Services tab
**Features**: Add/edit/delete services, test connection, priority ordering

### 3. FormVoiceGuidelinesEditor.tsx (Low Priority)
**What it does**: Edit guidelines for each form
**Goes in**: Form Builder → Voice Guidelines tab
**Features**: Toggle enable/disable, edit AI guide, edit interviewer guide

---

## ✅ Testing Checklist

- [ ] Migration runs without errors
- [ ] 6 new tables created in database
- [ ] Routes registered and accessible
- [ ] Can create recording metadata
- [ ] At least one speech service configured
- [ ] Can transcribe 30-second audio clip
- [ ] LLM extracts data successfully
- [ ] Confidence scores are reasonable (> 50%)
- [ ] Form fields auto-populate correctly
- [ ] Media library lists recordings
- [ ] Can download recording file
- [ ] Can delete recording

---

## 🎓 LLM Prompt Details

The system sends this to the LLM:

```
SYSTEM:
You are an expert form data extractor. Extract structured data from 
a transcribed interview.

CONTEXT: [AI Context from Settings - e.g., healthcare knowledge]

FORM FIELDS:
{field_id: "patient_name", type: "text", label: "Patient Name", ...}
{field_id: "age", type: "number", label: "Age (years)", ...}
...

GUIDELINES: [From Form Voice Guidelines - AI section]

CONVERSATION:
Interviewer: "What's your name?"
Responder: "My name is John Smith"
Interviewer: "How old are you?"
Responder: "I'm 42 years old"
...

OUTPUT:
{
  "extracted_data": {
    "patient_name": "John Smith",
    "age": 42
  },
  "confidence_scores": {
    "patient_name": 95,
    "age": 92
  }
}
```

---

## 💾 Storage & Retention

- **Location**: `uploads/voice/{business_id}/{form_id}/{activity_id}/recording_XXX.webm`
- **Format**: WebM (browser-native)
- **Retention**: Permanent (never auto-deleted)
- **Management**: Settings → Media Library
- **Download**: One-click in media library
- **Delete**: One-click in media library (soft delete + file removal)

---

## 🚨 Common Issues & Solutions

| Issue | Solution |
|-------|----------|
| Routes not found (404) | Check routes are registered in server/index.js |
| No transcription | Check speech service is configured and API key is valid |
| Transcription but no extraction | Check LLM settings are configured in AI Context |
| Fields not auto-populating | Check field IDs match between form and extraction JSON |
| Audio file too large | Max 500MB, compress or split long recordings |

---

## 📞 Support Files

- **VOICE_CAPTURE_ARCHITECTURE.md** - Detailed system design
- **VOICE_CAPTURE_IMPLEMENTATION_GUIDE.md** - Full 6-day implementation roadmap
- **server/voice-capture-routes.js** - API endpoint source code
- **server/voice-capture-helpers.js** - Transcription/LLM helpers source

---

## 🎉 Next Steps

1. **Day 1**: Run migration, register routes
2. **Days 2-3**: Review backend code, configure speech services
3. **Days 4-5**: Build React components
4. **Day 6**: Test end-to-end, deploy to staging

**Total time**: ~6 days  
**Current status**: Backend complete, ready for frontend development

---

**Questions?** Check the full implementation guide or contact the development team.
