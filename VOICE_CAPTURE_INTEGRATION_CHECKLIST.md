# Voice Capture Integration - Implementation Checklist

## Overview
This document provides step-by-step instructions for integrating the Voice Capture feature into the existing FillFormPage.

## Prerequisites
- ✅ Backend API routes implemented (`server/voice-capture-routes.js`)
- ✅ Database migrations applied (`server/migrations/008_voice_capture.sql`)
- ✅ React components created (`components/VoiceCapturePanel.tsx`, etc.)
- ✅ Custom hooks created (`hooks/useVoiceRecorder.ts`, `hooks/useVoiceApi.ts`)
- ✅ Utility functions created (`utils/audioProcessing.ts`)

## Step 1: Update FillFormPage Component

### 1.1 Add State Variables

Add these state variables to the `FillFormPageProps` component (after existing state declarations):

```tsx
// Add after line ~460 where other state is declared:
const [showVoiceCapture, setShowVoiceCapture] = useState(false);
const [voiceCapturedData, setVoiceCapturedData] = useState<Record<string, any>>({});
```

### 1.2 Add Voice Capture Modal/Container

Add this code right before the main form card (around line ~1360, before the `<Card>` that contains the form):

```tsx
{/* Voice Capture Modal */}
{showVoiceCapture && (
    <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center z-50 p-4">
        <div className="bg-white rounded-lg shadow-2xl max-h-screen overflow-y-auto">
            <div className="sticky top-0 bg-white border-b p-4 flex justify-between items-center">
                <h2 className="text-lg font-bold">Voice Data Capture</h2>
                <button
                    onClick={() => setShowVoiceCapture(false)}
                    className="text-gray-500 hover:text-gray-700 text-2xl leading-none"
                >
                    ×
                </button>
            </div>
            <div className="p-6">
                <VoiceCapturePanel
                    formId={parseInt(activity?.id || '0')}
                    activityId={parseInt(activityId || '0')}
                    formFields={formDef.pages.flatMap(page =>
                        page.sections.flatMap(section =>
                            section.questions.map(q => ({
                                id: q.id,
                                fieldName: q.fieldName,
                                questionText: q.questionText,
                                answerType: q.answerType,
                                options: q.options
                            }))
                        )
                    )}
                    onDataExtracted={(data) => {
                        // Auto-populate form with extracted data
                        setAnswers(prev => ({
                            ...prev,
                            ...data
                        }));
                        setVoiceCapturedData(data);
                        setShowVoiceCapture(false);
                    }}
                    onClose={() => setShowVoiceCapture(false)}
                />
            </div>
        </div>
    </div>
)}
```

### 1.3 Add Voice Capture Button

Add this code right before the form's page navigation tabs (around line ~1375, inside the `<Card>` tag):

```tsx
{/* Voice Capture Button and Success Message */}
<div className="mb-6">
    <Button
        onClick={() => setShowVoiceCapture(true)}
        className="flex items-center gap-2 bg-green-600 hover:bg-green-700 text-white"
    >
        <MicrophoneIcon className="h-5 w-5" />
        Start Voice Capture
    </Button>

    {/* Success message after voice capture */}
    {Object.keys(voiceCapturedData).length > 0 && (
        <div className="mt-4 bg-green-50 border-l-4 border-green-500 p-4 rounded">
            <p className="text-green-900 text-sm font-medium">
                ✓ {Object.keys(voiceCapturedData).length} field(s) were auto-populated from voice capture.
                Please review the data before saving.
            </p>
        </div>
    )}
</div>
```

### 1.4 Add Import Statement

At the top of `FillFormPage.tsx`, add these imports:

```tsx
import { VoiceCapturePanel } from '../components/VoiceCapturePanel';
import { MicrophoneIcon } from '@heroicons/react/24/outline';
```

### 1.5 Verification Checklist

- [ ] All state variables added
- [ ] Modal container added
- [ ] Button added above form
- [ ] Import statements added
- [ ] Component compiles without errors

---

## Step 2: Create Settings Integration

### 2.1 Add Speech-to-Text Tab to Settings

Edit `/pages/SettingsPage.tsx` (or relevant settings component):

**Add to imports:**
```tsx
import { SpeechToTextConfig } from '../components/SpeechToTextConfig';
```

**Add to tab list (find where other settings tabs are defined):**
```tsx
{
    id: 'speech-to-text',
    name: '🎙️ Speech-to-Text Services',
    component: <SpeechToTextConfig onConfigured={() => { /* refresh */ }} />
}
```

### 2.2 Add Voice Guidelines Tab to Form Builder

Edit `/pages/BuildFormPage.tsx` (or relevant form builder component):

**Add to imports:**
```tsx
import { FormVoiceGuidelinesEditor } from '../components/FormVoiceGuidelinesEditor';
```

**Add to form builder tabs:**
```tsx
{
    id: 'voice-guidelines',
    label: '🎤 Voice Guidelines',
    component: <FormVoiceGuidelinesEditor formId={parseInt(formId)} />
}
```

---

## Step 3: Test Integration

### 3.1 Backend Tests

```bash
# 1. Check that migration ran
curl http://localhost:5000/api/voice-capture/speech-services

# Should return: { success: true, services: [], count: 0 }

# 2. Try to create a recording (will need auth token)
curl -X POST http://localhost:5000/api/voice-capture/recordings \
  -H "Content-Type: application/json" \
  -H "Authorization: Bearer YOUR_TOKEN" \
  -d '{"form_id": 1, "activity_id": 1}'
```

### 3.2 Frontend Tests

1. **Navigate to form fill page:**
   - Go to `/activities/fill/{activityId}`
   - Should see "Start Voice Capture" button

2. **Configure speech service:**
   - Go to Settings → AI Integrations → Speech-to-Text Services
   - Add OpenAI Whisper service (or local service)
   - Test connection

3. **Set form guidelines:**
   - Go to Form Builder
   - Find "Voice Guidelines" tab
   - Enable voice capture
   - Add interviewer guide and AI guide
   - Save

4. **Test voice capture flow:**
   - Open form fill page
   - Click "Start Voice Capture"
   - Read interviewer guide (checkbox to accept)
   - Click "Begin Recording"
   - Allow microphone access
   - Record 10+ seconds of audio
   - Click "Stop Recording"
   - Wait for transcription and extraction
   - Review extracted data
   - Modify if needed
   - Click "Apply to Form"
   - Verify form fields are populated
   - Save form normally

### 3.3 Troubleshooting Tests

| Issue | Test | Solution |
|-------|------|----------|
| "Start Voice Capture" button doesn't appear | Check browser console for errors | Clear cache, rebuild |
| Microphone access denied | Check browser permissions | Allow microphone in browser settings |
| Transcription fails | Check speech service config in settings | Verify API key and connection |
| Extraction fails | Check form guidelines are set | Set both AI guide and interviewer guide |
| Data doesn't appear in form | Check field ID mapping | Verify field IDs match between form and extraction |

---

## Step 4: Database Verification

Run these queries to verify setup:

```sql
-- Check if tables were created
SELECT table_name FROM information_schema.tables 
WHERE table_name LIKE '%voice%' 
ORDER BY table_name;

-- Should return 6 tables:
-- dqatb_voice_recordings
-- dqatb_voice_media_library
-- dqatb_voice_capture_audit
-- dqatb_form_voice_guidelines
-- dqatb_speech_to_text_configs
-- dqatb_voice_usage_stats

-- Check if any speech services are configured
SELECT * FROM dqatb_speech_to_text_configs;

-- Check if any form guidelines exist
SELECT * FROM dqatb_form_voice_guidelines;
```

---

## Step 5: Documentation & Training

### 5.1 Update README

Add to project README:

```markdown
## Voice Capture Feature

### What It Does
Records interviews, automatically transcribes them, and auto-fills form fields using AI.

### Quick Start
1. Open any form for filling
2. Click "Start Voice Capture"
3. Read the interviewer guide (required)
4. Record your interview
5. Review and confirm extracted data
6. Form fields auto-populate

### Configuration
1. Settings → AI Integrations → Speech-to-Text Services
   - Configure a speech-to-text provider (OpenAI, Google, Azure, or Local)
   - Test the connection

2. Form Builder → Voice Guidelines
   - Enable voice capture for specific forms
   - Add interviewer guide (what to say/ask)
   - Add AI guide (how to extract data)

### Supported Browsers
- Chrome/Edge 49+
- Firefox 25+
- Safari 14.1+
- Mobile Chrome/Safari (iOS 14.5+)
```

### 5.2 User Documentation

Create `/VOICE_CAPTURE_USER_GUIDE.md`:

```markdown
# Voice Capture - User Guide

## For Interviewers

1. Open the form you need to fill
2. Click "Start Voice Capture" button
3. Read the interviewer's guide carefully
4. Click checkbox to confirm you've read it
5. Click "Begin Recording"
6. Allow microphone access when prompted
7. Ask questions and record responses naturally
8. Click "Stop Recording" when done
9. Wait for audio processing (~30 seconds)
10. Review the extracted data
11. Edit any fields that need correction
12. Click "Apply to Form"
13. Review the complete form
14. Click "Submit" to save

## For Administrators

### Setting Up Speech Services
1. Go to Settings → AI Integrations
2. Find "Speech-to-Text Services" tab
3. Click "Add New Service"
4. Choose provider:
   - **OpenAI Whisper** (recommended, high accuracy, ~$0.006/min)
   - **Google Cloud** (good accuracy, ~$0.024/15sec)
   - **Azure** (Microsoft service)
   - **Local Whisper** (free, private, self-hosted)
5. Fill in API key or configuration
6. Test connection
7. Set priority if using multiple services

### Configuring Forms for Voice Capture
1. Go to Form Builder
2. Find the form to enable
3. Click "Voice Guidelines" tab
4. Check "Enable Voice Capture"
5. Add **Interviewer Guide** (example):
   ```
   Please ask the following questions in a natural, conversational way:
   1. What is the patient's full name?
   2. What is their age?
   3. When did symptoms start?
   4. What is the main complaint?
   ```
6. Add **AI Guide** (example):
   ```
   Extract from the conversation:
   - patient_name: Full name (string, required)
   - age: Age in years (number)
   - symptom_date: Date symptoms started (date format: YYYY-MM-DD)
   - complaint: Main health complaint (string)
   ```
7. Click "Save Guidelines"

## Troubleshooting

### "Microphone access denied"
- Click browser permission prompt and allow microphone
- Check browser settings → Privacy → Microphone

### "Transcription failed"
- Check speech service is configured and active
- Verify API key is correct
- Try with a shorter recording first

### "Form fields not auto-populating"
- Check that field names in AI guide match form fields
- Verify extracted data displays in review modal
- Try editing the field manually

### Recording sounds muted/quiet
- Check microphone levels in system settings
- Move closer to microphone
- Try recording with different microphone

---

## Privacy & Security

- All recordings are stored securely on the server
- Recordings never leave your premises if using Local Whisper
- Recordings can be deleted anytime from Settings → Media Library
- All deletion is logged in audit trail
```

---

## Step 6: Deployment Checklist

Before going live:

- [ ] Backend migration run successfully
- [ ] All environment variables set (API keys for speech services)
- [ ] Speech-to-Text service configured and tested
- [ ] FillFormPage component updated and tested
- [ ] Settings pages updated with new tabs
- [ ] Documentation reviewed and approved
- [ ] End-to-end flow tested in staging
- [ ] Browser compatibility tested
- [ ] Mobile testing completed
- [ ] Error handling verified
- [ ] Database backup created
- [ ] User training completed
- [ ] Support documentation published

---

## Files Changed Summary

### New Files Created
- `/components/VoiceCapturePanel.tsx`
- `/components/FormVoiceGuidelinesEditor.tsx`
- `/components/SpeechToTextConfig.tsx`
- `/hooks/useVoiceRecorder.ts`
- `/hooks/useVoiceApi.ts`
- `/utils/audioProcessing.ts`
- `VOICE_CAPTURE_FRONTEND_GUIDE.md`
- `VOICE_CAPTURE_USER_GUIDE.md`
- `VOICE_CAPTURE_INTEGRATION_CHECKLIST.md` (this file)

### Modified Files
- `/pages/FillFormPage.tsx` (add state, button, modal)
- `/pages/SettingsPage.tsx` (add speech services tab)
- `/pages/BuildFormPage.tsx` (add voice guidelines tab)

### Existing Backend Files (Already Complete)
- `/server/voice-capture-routes.js`
- `/server/voice-capture-helpers.js`
- `/server/voice-media-library-routes.js`
- `/server/migrations/008_voice_capture.sql`

---

## Support & Next Steps

If issues arise:
1. Check browser console for JavaScript errors
2. Check backend logs for API errors
3. Verify speech service configuration
4. Test with a known good recording
5. Check database tables exist and have correct schema

For questions or issues:
- Review the full implementation guide: `VOICE_CAPTURE_FRONTEND_GUIDE.md`
- Check backend helpers: `server/voice-capture-helpers.js`
- Review database schema: `server/migrations/008_voice_capture.sql`

---

**Integration Status:** ✅ Ready to Implement  
**Estimated Time:** 2-3 hours  
**Complexity:** Medium  
**Testing Time:** 1-2 hours  

**Last Updated:** 2024  
**Version:** 1.0
