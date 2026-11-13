# Voice Capture - Developer Quick Reference

## 🎯 TL;DR

**You need to integrate 3 components into your pages:**
1. Add Voice Capture button to `/pages/FillFormPage.tsx`
2. Add Speech Services config tab to Settings
3. Add Voice Guidelines editor to Form Builder

**Time to complete:** 2-3 hours

---

## 📁 Files You'll Use

### Components
```
✅ components/VoiceCapturePanel.tsx           (19 KB) - Main recording UI
✅ components/FormVoiceGuidelinesEditor.tsx   (11.6 KB) - Guidelines editor
✅ components/SpeechToTextConfig.tsx          (17.1 KB) - Service config
```

### Hooks
```
✅ hooks/useVoiceRecorder.ts                  (5.9 KB) - Audio recording
✅ hooks/useVoiceApi.ts                       (7.8 KB) - API calls
```

### Utilities
```
✅ utils/audioProcessing.ts                   (7.4 KB) - Helper functions
```

### Documentation
```
📖 VOICE_CAPTURE_FRONTEND_GUIDE.md            - Full technical guide
📖 VOICE_CAPTURE_INTEGRATION_CHECKLIST.md     - Step-by-step instructions
📖 VOICE_CAPTURE_IMPLEMENTATION_COMPLETE.md   - This summary
📖 VOICE_CAPTURE_QUICK_START.md               - Original quick start
```

---

## ⚡ 30-Second Integration Summary

### Step 1: Add to FillFormPage.tsx
```tsx
// Add imports
import { VoiceCapturePanel } from '../components/VoiceCapturePanel';
import { MicrophoneIcon } from '@heroicons/react/24/outline';

// Add state
const [showVoiceCapture, setShowVoiceCapture] = useState(false);

// Add button above form
<Button onClick={() => setShowVoiceCapture(true)}>
  <MicrophoneIcon /> Start Voice Capture
</Button>

// Add modal container
{showVoiceCapture && (
  <VoiceCapturePanel
    formId={parseInt(activity?.id || '0')}
    activityId={parseInt(activityId || '0')}
    formFields={formDef.pages.flatMap(p => p.sections.flatMap(s => s.questions))}
    onDataExtracted={(data) => {
      setAnswers(prev => ({ ...prev, ...data }));
      setShowVoiceCapture(false);
    }}
    onClose={() => setShowVoiceCapture(false)}
  />
)}
```

### Step 2: Add to Settings Page
```tsx
import { SpeechToTextConfig } from '../components/SpeechToTextConfig';

// Add to tabs
{
  id: 'speech-to-text',
  name: '🎙️ Speech-to-Text Services',
  component: <SpeechToTextConfig />
}
```

### Step 3: Add to Form Builder
```tsx
import { FormVoiceGuidelinesEditor } from '../components/FormVoiceGuidelinesEditor';

// Add to tabs
{
  id: 'voice-guidelines',
  label: '🎤 Voice Guidelines',
  component: <FormVoiceGuidelinesEditor formId={formId} />
}
```

---

## 🪣 Component Props Reference

### VoiceCapturePanel
```tsx
interface Props {
  formId: number;              // Form being filled
  activityId: number;          // Activity/survey ID
  formFields: Array<{          // All form fields
    id: string;
    questionText: string;
    answerType: string;
  }>;
  onDataExtracted: (data: Record<string, any>) => void;  // Callback
  onClose: () => void;         // Close handler
}
```

### FormVoiceGuidelinesEditor
```tsx
interface Props {
  formId: number;              // Form to edit guidelines for
  onSave?: () => void;         // Save callback
  onClose?: () => void;        // Close callback
}
```

### SpeechToTextConfig
```tsx
interface Props {
  onClose?: () => void;        // Close callback
  onConfigured?: () => void;   // Configuration callback
}
```

---

## 🎣 Hook Usage Examples

### useVoiceRecorder
```tsx
const { state, startRecording, stopRecording, pauseRecording, resumeRecording } = useVoiceRecorder();

// Start recording
await startRecording();

// State
console.log(state.isRecording);    // true/false
console.log(state.duration);       // seconds
console.log(state.audioBlob);      // Blob object
console.log(state.error);          // error message

// Stop and get audio
await stopRecording();
const audioBlob = state.audioBlob;  // Ready to upload
```

### useVoiceApi
```tsx
const { loading, error, transcribeAudio, extractAndMapData } = useVoiceApi();

// Transcribe audio
const text = await transcribeAudio(recordingId);

// Extract and map
const result = await extractAndMapData(recordingId, formId);
console.log(result.extracted_data);      // { field_id: value, ... }
console.log(result.confidence_scores);   // { field_id: 95, ... }
```

---

## 📞 API Endpoints Used

**Recording Endpoints:**
```
POST   /api/voice-capture/recordings              → Create recording
POST   /api/voice-capture/upload-audio            → Upload audio file
POST   /api/voice-capture/transcribe              → Transcribe audio
POST   /api/voice-capture/extract-and-map         → Extract data
GET    /api/voice-capture/recordings/:id          → Get recording
DELETE /api/voice-capture/recordings/:id          → Delete recording
```

**Service Endpoints:**
```
GET    /api/voice-capture/speech-services         → List services
POST   /api/voice-capture/speech-services/configure
POST   /api/voice-capture/speech-services/:id/test
DELETE /api/voice-capture/speech-services/:id
```

**Guidelines Endpoints:**
```
GET    /api/voice-capture/form/:formId/guidelines
POST   /api/voice-capture/form/:formId/guidelines
```

---

## 🐛 Troubleshooting

| Problem | Solution |
|---------|----------|
| "Button doesn't show" | Check imports and state declarations |
| "Microphone denied" | Check browser microphone permissions |
| "Transcription fails" | Configure speech service in Settings |
| "Data not appearing" | Check field ID mapping, verify extraction returned data |
| "Form fields not updating" | Check onDataExtracted callback is setting state correctly |

---

## ✅ Testing Checklist

- [ ] Component imports without errors
- [ ] Button appears on form
- [ ] Button opens modal
- [ ] Modal shows interviewer guide (if configured)
- [ ] Can allow/deny microphone
- [ ] Recording starts/stops/pauses
- [ ] Audio uploads after stop
- [ ] Transcription appears
- [ ] Data extraction completes
- [ ] Review modal shows confidence scores
- [ ] Can edit data in review
- [ ] Apply button works
- [ ] Form fields populate with data
- [ ] Can save form normally

---

## 🚀 Deployment Checklist

Before going live:

- [ ] All 3 components integrated
- [ ] Speech service configured (OpenAI, Google, etc.)
- [ ] Form guidelines set for each form
- [ ] Test end-to-end flow
- [ ] Test on mobile devices
- [ ] Test error scenarios
- [ ] Update user documentation
- [ ] Train users on feature
- [ ] Monitor first day of use

---

## 💾 Key Data Structures

### Extracted Data Format
```javascript
{
  "extracted_data": {
    "patient_name": "John Smith",
    "age": 42,
    "complaint": "fever"
  },
  "confidence_scores": {
    "patient_name": 95,
    "age": 90,
    "complaint": 85
  }
}
```

### Recording Metadata
```javascript
{
  "id": 123,
  "form_id": 456,
  "activity_id": 789,
  "status": "extracted",
  "transcription_text": "Interviewer: What's your name?...",
  "extracted_data": {...},
  "duration_seconds": 300,
  "created_at": "2024-01-15T10:30:00Z"
}
```

---

## 🎤 Speech Service Configuration

### OpenAI Whisper (Recommended)
```
Provider: openai-whisper
API Key: sk-...
Model: whisper-1
Language: en
Cost: ~$0.006/minute
```

### Google Cloud
```
Provider: google-cloud-speech
Credentials: JSON file
Language: en-US
Cost: ~$0.024/15 seconds
```

### Azure
```
Provider: azure-speech
Subscription Key: ...
Region: eastus
Language: en
```

### Local (Self-Hosted)
```
Provider: local-whisper
URL: http://localhost:8000
Cost: Free
Privacy: Full
```

---

## 📚 Example Implementation

### Complete FillFormPage Integration:
```tsx
import { useState } from 'react';
import { VoiceCapturePanel } from '../components/VoiceCapturePanel';
import { MicrophoneIcon } from '@heroicons/react/24/outline';

export const FillFormPage = () => {
  const [answers, setAnswers] = useState({});
  const [showVoiceCapture, setShowVoiceCapture] = useState(false);
  // ... other state

  return (
    <div>
      <Button onClick={() => setShowVoiceCapture(true)}>
        <MicrophoneIcon /> Start Voice Capture
      </Button>

      {showVoiceCapture && (
        <div className="modal">
          <VoiceCapturePanel
            formId={formId}
            activityId={activityId}
            formFields={formFields}
            onDataExtracted={(data) => {
              setAnswers(prev => ({ ...prev, ...data }));
              setShowVoiceCapture(false);
            }}
            onClose={() => setShowVoiceCapture(false)}
          />
        </div>
      )}

      {/* Rest of form... */}
    </div>
  );
};
```

---

## 🔗 File Dependencies

```
VoiceCapturePanel.tsx
  ├─ useVoiceRecorder hook
  ├─ useVoiceApi hook
  ├─ Button component (ui/Button)
  ├─ Card component (ui/Card)
  ├─ MInput component (ui/MInput)
  └─ @heroicons/react

FormVoiceGuidelinesEditor.tsx
  ├─ useVoiceApi hook
  ├─ Button component
  ├─ Card component
  ├─ MInput component
  └─ axios

SpeechToTextConfig.tsx
  ├─ Button component
  ├─ Card component
  ├─ MInput component
  ├─ axios
  └─ @heroicons/react

useVoiceRecorder.ts
  └─ Web Audio API (browser native)

useVoiceApi.ts
  └─ axios
```

---

## 🎓 Learning Path

**New to the feature?** Follow this path:

1. Read: `VOICE_CAPTURE_QUICK_START.md` (5 min)
2. Read: This quick reference (10 min)
3. Read: `VOICE_CAPTURE_INTEGRATION_CHECKLIST.md` (20 min)
4. Implement: Step 1: Add to FillFormPage (30 min)
5. Test: Record and check that button works (10 min)
6. Implement: Step 2: Add to Settings (15 min)
7. Implement: Step 3: Add to Form Builder (15 min)
8. Test: Full end-to-end flow (30 min)
9. Deploy: Follow deployment checklist (30 min)

**Total Time:** 2-3 hours

---

## 📞 Get Help

**Error in console?**
- Search error message in backend routes: `server/voice-capture-routes.js`
- Check browser DevTools Console tab

**API error?**
- Check backend is running: `npm run server:dev`
- Check speech service is configured in Settings
- Check API key is correct

**Component not rendering?**
- Check import statements
- Check component exports
- Check required props are passed

**Data not appearing?**
- Check onDataExtracted callback
- Check field IDs match
- Check form fields array is correct

---

## 🎯 Success Criteria

Your implementation is successful when:

✅ Button appears on form fill page  
✅ Can record audio successfully  
✅ Transcription completes without errors  
✅ Data extraction shows confidence scores  
✅ Can edit extracted data  
✅ Form fields populate when "Apply" clicked  
✅ Form can be saved normally  
✅ Settings tab shows speech services  
✅ Form builder tab shows voice guidelines  

---

## 📊 Performance Tips

- Use OpenAI Whisper for best accuracy
- Keep interviews under 10 minutes for faster processing
- Set detailed guidelines for better extraction
- Test with your domain-specific vocabulary
- Monitor confidence scores to tune guidelines

---

## 🔐 Security Reminders

✅ **Do:**
- Store API keys in environment variables
- Use backend-only API calls
- Validate extracted data
- Log deletion operations

❌ **Don't:**
- Expose API keys in frontend code
- Store sensitive data in local storage
- Skip user permission for recording
- Auto-delete recordings without confirmation

---

## 🆘 Support Files

| File | Purpose | Size |
|------|---------|------|
| VoiceCapturePanel.tsx | Main component | 19 KB |
| useVoiceRecorder.ts | Recording hook | 5.9 KB |
| useVoiceApi.ts | API hook | 7.8 KB |
| VOICE_CAPTURE_FRONTEND_GUIDE.md | Full guide | 17 KB |
| VOICE_CAPTURE_INTEGRATION_CHECKLIST.md | Step-by-step | 14 KB |

---

## ✨ You're Ready!

You have everything you need. The components are built, tested, and ready to integrate.

**Start here:** `VOICE_CAPTURE_INTEGRATION_CHECKLIST.md`

---

**Last Updated:** 2024  
**Version:** 1.0  
**Status:** ✅ Production Ready
