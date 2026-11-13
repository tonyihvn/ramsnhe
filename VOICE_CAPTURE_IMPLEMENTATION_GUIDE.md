# Voice Data Capturing - Complete Implementation Guide

## 📋 Overview

This guide covers implementing the Voice Data Capturing feature that:
- Records interviewer-responder conversations
- Auto-transcribes using configurable speech-to-text services
- Extracts and maps responses to form fields using LLM
- Auto-populates forms with captured data
- Provides media library for managing recordings

**Timeline**: 6 days  
**Complexity**: High  
**Priority**: Core feature for healthcare interviews

---

## 🗂️ Files Created

### Database Migration
- ✅ `server/migrations/008_voice_capture.sql` - 6 new tables with indexes

### Backend Routes
- ✅ `server/voice-capture-routes.js` - Main API endpoints (22 KB)
- ✅ `server/voice-media-library-routes.js` - Media management endpoints (11 KB)
- ✅ `server/voice-capture-helpers.js` - Transcription & LLM helpers (14 KB)

### Architecture Documentation
- ✅ `VOICE_CAPTURE_ARCHITECTURE.md` - System design (13 KB)

### Frontend Components (To Be Created)
- `components/VoiceCapturePanel.tsx` - Recording UI
- `components/SpeechToTextConfig.tsx` - Settings panel
- `components/FormVoiceGuidelinesEditor.tsx` - Form Builder tab

---

## 🚀 Phase 1: Database Setup (Day 1)

### Step 1: Run Migration

```bash
# Navigate to project root
cd ~/ramsnhe

# Run migration
npm run migrate

# Verify tables created
psql -U $DB_USER -d $DB_NAME -c "\dt dqatb_voice*"
```

**Expected Output**: 6 tables created
- `dqatb_voice_recordings`
- `dqatb_speech_to_text_configs`
- `dqatb_form_voice_guidelines`
- `dqatb_voice_media_library`
- `dqatb_voice_capture_audit`
- `dqatb_voice_usage_stats`

### Step 2: Verify Schema

```sql
-- Connect to database
psql -U $DB_USER -d $DB_NAME

-- Check voice_recordings table
\d dqatb_voice_recordings

-- Check indexes
SELECT indexname FROM pg_indexes WHERE tablename = 'dqatb_voice_recordings';
```

---

## 🧠 Phase 2: Backend Integration (Days 2-3)

### Step 1: Install Dependencies

Add to `package.json`:
```json
{
  "dependencies": {
    "axios": "^1.6.0",
    "form-data": "^4.0.0",
    "@google-cloud/speech": "^6.0.0",
    "express-fileupload": "^1.4.0"
  }
}
```

```bash
npm install
```

### Step 2: Register Routes in Server

Edit `server/index.js`:

```javascript
import voiceCaptureRoutes from './voice-capture-routes.js';
import voiceMediaLibraryRoutes from './voice-media-library-routes.js';

// Add these routes (around line where other routes are registered)
app.use('/api/voice-capture', voiceCaptureRoutes);
app.use('/api/voice-capture', voiceMediaLibraryRoutes);

// Enable file uploads
app.use(fileUpload({
    createParentPath: true,
    limits: { fileSize: 500 * 1024 * 1024 } // 500MB limit for audio
}));
```

### Step 3: Create Uploads Directory

```bash
mkdir -p uploads/voice
chmod 755 uploads/voice
```

### Step 4: Configure Speech-to-Text Services

Create `.env` additions:

```env
# Speech-to-Text Services
OPENAI_API_KEY=sk-...
GOOGLE_APPLICATION_CREDENTIALS=/path/to/google-credentials.json
AZURE_SPEECH_KEY=...
AZURE_SPEECH_REGION=eastus
LOCAL_WHISPER_URL=http://localhost:8000

# Optional: Default transcription service
DEFAULT_SPEECH_SERVICE=openai-whisper
```

### Step 5: Test Backend Routes

```bash
# Start server
npm run dev

# Test speech service endpoints
curl -X GET http://localhost:3000/api/voice-capture/speech-services \
  -H "Authorization: Bearer $TOKEN"

# Response should show configured services
```

---

## 🎨 Phase 3: Frontend Components (Days 4-5)

### Component 1: VoiceCapturePanel.tsx

Create `components/VoiceCapturePanel.tsx`:

**Key Features**:
- Start/Stop voice recording
- Display interviewer's guide before recording
- Real-time waveform visualization
- Transcription progress indicator
- Extracted data review modal
- Auto-populate form fields

**Props**:
```typescript
interface VoiceCapturePanelProps {
  formId: number;
  activityId: number;
  formFields: FormField[];
  onDataExtracted: (extractedData: Record<string, any>) => void;
  onError: (error: string) => void;
}
```

**Usage in ActivitiesFill.tsx**:
```typescript
<VoiceCapturePanel
  formId={formData.form_id}
  activityId={activityId}
  formFields={formFields}
  onDataExtracted={(data) => {
    // Auto-populate form with extracted data
    updateFormFieldsWithVoiceData(data);
  }}
/>
```

### Component 2: SpeechToTextConfig.tsx

Create `components/SpeechToTextConfig.tsx`:

**Features**:
- List all available speech services
- Add/configure new service
- Test connection
- Set priority order
- Enable/disable services
- Display usage statistics

**Integration in SettingsPage.tsx**:
```typescript
// In AI Integrations tab
<Tab label="Speech-to-Text Services">
  <SpeechToTextConfig />
</Tab>
```

### Component 3: FormVoiceGuidelinesEditor.tsx

Create `components/FormVoiceGuidelinesEditor.tsx`:

**Features**:
- Toggle voice capture enabled/disabled
- Edit AI guide text (for LLM extraction)
- Edit interviewer guide text (display before recording)
- Optional custom LLM extraction prompt
- Preview interviewer guide
- Form field tags for LLM context

**Integration in Form Builder**:
```typescript
// Add to form builder tabs
<Tab label="Voice Guidelines">
  <FormVoiceGuidelinesEditor formId={formId} />
</Tab>
```

### Step 4: Component Implementation Order

1. **Build VoiceCapturePanel** (High complexity, core feature)
   - MediaRecorder setup
   - Audio blob handling
   - Transcription progress
   - Data review modal

2. **Build SpeechToTextConfig** (Medium complexity)
   - Service CRUD
   - Testing UI
   - Configuration forms

3. **Build FormVoiceGuidelinesEditor** (Low complexity)
   - Simple form with text areas
   - Toggle switches
   - Field tag selector

4. **Integrate into existing pages**
   - Modify ActivitiesFill.tsx
   - Modify Form Builder
   - Update Settings page

---

## 📝 Phase 4: Testing (Day 6)

### Test Suite 1: API Endpoint Testing

```bash
# Speech Service Configuration
POST /api/voice-capture/speech-services/configure
  Body: {
    provider: "openai-whisper",
    is_active: true,
    configuration: { api_key: "sk-...", model: "whisper-1" }
  }
  Expected: 200 OK with service details

# Get Active Services
GET /api/voice-capture/speech-services/active
  Expected: 200 OK with array of active services

# Test Service Connection
POST /api/voice-capture/speech-services/1/test
  Expected: 200 OK with connection status

# Form Voice Guidelines
POST /api/voice-capture/form/1/guidelines
  Body: {
    is_enabled: true,
    ai_guide_text: "...",
    interviewer_guide_text: "..."
  }
  Expected: 200 OK with saved guidelines
```

### Test Suite 2: Voice Recording Flow

```javascript
// 1. Create recording metadata
const recording = await recordVoiceAudio({
  activityId: 1,
  formId: 1,
  duration: 120
});

// 2. Transcribe audio
const transcription = await transcribeRecording(recording.id, {
  serviceId: 1
});

// 3. Extract and map data
const extractedData = await extractFormData(recording.id, {
  formId: 1,
  formFields: [...]
});

// 4. Verify auto-population
expect(extractedData.extracted_data).toHaveProperty('field_1');
expect(extractedData.confidence_scores['field_1']).toBeGreaterThan(0);
```

### Test Suite 3: End-to-End Flow

1. **Navigate** to `/activities/fill/1`
2. **Click** "Start Voice Capture"
3. **Review** interviewer's guide
4. **Click** "Begin Recording"
5. **Conduct** mock interview (2-3 minutes)
6. **Click** "Stop Recording"
7. **Verify** transcription appears (wait 10-30 seconds)
8. **Review** extracted data modal
9. **Confirm** auto-population in form fields
10. **Edit** if needed
11. **Save** form normally

### Test Suite 4: Error Scenarios

- No speech service configured
- Invalid API key
- Network timeout during transcription
- Malformed LLM response
- Confidence score below threshold
- Missing form fields in extraction

### Test Suite 5: Media Library

- View recordings (paginated)
- Download recording
- Delete recording
- View statistics
- Filter by date range

---

## 📊 Phase 5: Configuration Setup (Day 6)

### Step 1: Setup OpenAI Whisper

1. Get API key from https://platform.openai.com/api-keys
2. Navigate to Settings → AI Integrations → Speech-to-Text Services
3. Click "+ Add Service"
4. Select "OpenAI Whisper"
5. Enter API key
6. Click "Test Connection"
7. Set as primary (Priority = 1)
8. Click "Save"

**Cost**: ~$0.006 per minute of audio

### Step 2: (Optional) Setup Google Cloud Speech

1. Create GCP project and enable Speech-to-Text API
2. Create service account credentials
3. Download JSON key file
4. Add settings in Speech-to-Text Services tab
5. Upload credentials file
6. Test connection

**Cost**: ~$0.024 per 15 seconds

### Step 3: (Optional) Setup Local Whisper

For privacy/cost, run Whisper locally:

```bash
# Install whisper.cpp
git clone https://github.com/ggerganov/whisper.cpp
cd whisper.cpp
make

# Download model
./models/download-ggml-model.sh base

# Start server
./stream -m models/ggml-base.bin \
  -t 4 \
  --server \
  --bind 127.0.0.1 \
  -p 8000
```

Then configure in Settings with:
```
Provider: local-whisper
URL: http://localhost:8000
```

---

## 🧪 Verification Checklist

- [ ] Database migration applied successfully
- [ ] All 6 new tables created with correct schema
- [ ] Backend routes registered in server/index.js
- [ ] File upload directory created
- [ ] At least one speech-to-text service configured and tested
- [ ] VoiceCapturePanel component renders on activity form
- [ ] Interviewer's guide displays before recording
- [ ] Recording starts and stops correctly
- [ ] Transcription completes within 1-2 minutes
- [ ] LLM extraction returns valid JSON
- [ ] Form fields auto-populate with extracted data
- [ ] Confidence scores display correctly
- [ ] User can edit auto-populated data
- [ ] Form saves successfully with voice-captured data
- [ ] Media library shows recorded audio
- [ ] Can download and delete recordings
- [ ] Settings → AI Integrations has Speech-to-Text Services tab
- [ ] Form Builder has Voice Guidelines tab
- [ ] Statistics display total recordings and storage

---

## 🎯 Key Implementation Notes

### Data Mapping Strategy
- LLM receives form field names, types, and labels
- LLM matches transcribed responses to fields
- Confidence scores indicate mapping certainty
- User can manually adjust before saving

### Transcription Services
- OpenAI Whisper: Best accuracy, fastest
- Google Cloud: Good accuracy, higher cost
- Azure: Enterprise, feature-rich
- Local Whisper: Privacy-focused, slower
- Browser API: Free, limited accuracy

### LLM Prompt Engineering
- Include form field definitions in context
- Specify expected output format (JSON)
- Provide interviewer's guide text
- Include AI context for domain knowledge
- Return confidence scores for validation

### Audio Storage
- Local disk at `uploads/voice/{business_id}/{form_id}/{activity_id}/`
- Permanent retention (never auto-delete)
- Manage via Media Library in Settings
- Support download and deletion

### Security Considerations
- Require authentication for all endpoints
- Validate business_id ownership
- Never expose transcription text unnecessarily
- Log all deletion operations
- Mask sensitive data before LLM processing

---

## 📈 Performance Targets

- Recording start: < 100ms
- Transcription: 0.5x to 2x real-time (depending on service)
- LLM extraction: 10-30 seconds
- Auto-population: < 500ms
- Media library load: < 2 seconds (20 items)

---

## 🆘 Troubleshooting

### Transcription failing
- Check speech service is configured and tested
- Verify API keys are correct
- Check audio file is valid WebM format
- Review server logs for error details

### LLM extraction returns empty
- Ensure transcription is complete and has content
- Check LLM settings are configured
- Verify form fields have proper labels
- Review LLM response in server logs

### Form fields not auto-populating
- Check confidence scores (should be > 0)
- Verify field IDs match between form and extraction
- Ensure data types are compatible
- Review browser console for errors

### Audio file not saved
- Check `uploads/voice/` directory exists and writable
- Verify file size < 500MB
- Check disk space available
- Review server logs

---

## 📚 Next Steps After Implementation

1. **User Testing** (2-3 hours)
   - Test with real interviewer/responder
   - Collect feedback on guide text
   - Adjust LLM prompts based on results

2. **Production Deployment** (1 day)
   - Set up backup for audio files
   - Configure automatic cleanup of old recordings
   - Monitor API costs for transcription services
   - Set up alerts for failed transcriptions

3. **Analytics & Improvements** (Ongoing)
   - Track which forms use voice capture most
   - Monitor confidence scores
   - Collect feedback on data accuracy
   - Optimize LLM prompts

4. **Additional Features** (Future)
   - Multi-language support
   - Speaker identification
   - Real-time transcription display
   - Offline recording capability
   - Batch transcription for cost optimization

---

## 🎓 Developer Resources

- [OpenAI Whisper API](https://platform.openai.com/docs/guides/speech-to-text)
- [Google Cloud Speech-to-Text](https://cloud.google.com/speech-to-text/docs)
- [Azure Cognitive Services](https://learn.microsoft.com/en-us/azure/cognitive-services/speech-service/)
- [Web Audio API](https://developer.mozilla.org/en-US/docs/Web/API/Web_Audio_API)
- [MediaRecorder API](https://developer.mozilla.org/en-US/docs/Web/API/MediaRecorder)

---

**Total Implementation Time**: 6 days  
**Estimated Effort**: 120-150 hours  
**Priority**: High (Core healthcare feature)  
**Status**: ✅ Ready for Development

