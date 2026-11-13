# Voice Capture - Quick Reference Guide

## 🎯 The Fix
**File:** `hooks/useVoiceApi.ts:187`
**Change:** Removed wrapper object from API payload
**Result:** Guidelines now save successfully ✅

```typescript
// BEFORE (BROKEN)
await axios.post(`/api/voice-capture/form/${formId}/guidelines`, {
    guidelines  // ❌ Wrapped
});

// AFTER (FIXED)
await axios.post(`/api/voice-capture/form/${formId}/guidelines`, guidelines);
// ✅ Direct pass
```

---

## 🔄 Complete Voice Capture Workflow

```
┌──────────────────┐
│  Form Builder    │
│  Page            │
└────────┬─────────┘
         │
         ▼
┌──────────────────────┐
│ Click              │
│ "Voice Guidelines" │
└────────┬────────────┘
         │
         ▼
┌────────────────────────────────────┐
│ FormVoiceGuidelinesEditor Opens    │
├────────────────────────────────────┤
│ ☑ Enable Voice Capture             │
│                                    │
│ 📋 Interviewer Guide:              │
│ [textarea] Ask for name, age...   │
│                                    │
│ 🤖 AI Guide:                       │
│ [textarea] Extract to fields...   │
│                                    │
│ ⚙️ Custom Prompt (optional):       │
│ [textarea] Advanced LLM prompt...  │
│                                    │
│ [Cancel] [Save Guidelines]         │
└────────┬─────────────────────────┘
         │
         │ Submits guidelines object
         │ {is_enabled, ai_guide_text,
         │  interviewer_guide_text,
         │  extraction_prompt_override}
         ▼
┌───────────────────────────────────────────┐
│ POST /api/voice-capture/form/{id}/guidelines
│ ✅ FIXED: Passes guidelines directly      │
└───────────┬─────────────────────────────┘
            │
            ▼
┌─────────────────────────────────────┐
│ Backend saves to database           │
│ dqatb_form_voice_guidelines         │
└───────────┬─────────────────────────┘
            │
            ▼
┌─────────────────────┐
│ ✅ Saved message    │
└─────────────────────┘


┌──────────────────┐
│   Form Fill      │
│   Page           │
└────────┬─────────┘
         │
         ▼
┌─────────────────────────────┐
│ Click                       │
│ "Start Voice Capture"       │
└────────┬────────────────────┘
         │
         ▼
┌──────────────────────────────────┐
│ Show Interviewer Guide           │
│ "Ask patient for name, age..."   │
│                                  │
│ 🎤 Recording...                  │
│ [Stop Voice Capture]             │
└────────┬─────────────────────────┘
         │
         ▼
┌──────────────────────────────┐
│ Speech-to-Text Service       │
│ (OpenAI Whisper, Google, etc)│
└────────┬─────────────────────┘
         │
         ▼
┌──────────────────────────────┐
│ Transcribed Text:            │
│ "My name is John, age 42"   │
└────────┬─────────────────────┘
         │
         │ Sends: recording_id, form_id,
         │        form_fields
         ▼
┌────────────────────────────────────────────┐
│ POST /api/voice-capture/extract-and-map    │
├────────────────────────────────────────────┤
│ Fetches:                                   │
│ ✅ Transcribed text                        │
│ ✅ Form voice guidelines ← (NOW WORKS!)    │
│ ✅ Form fields (type, options)             │
│ ✅ AI context (if configured)              │
└────────┬─────────────────────────────────┘
         │
         │ Builds LLM prompt with:
         │ - Guidelines
         │ - Form structure
         │ - Transcription
         ▼
┌────────────────────────────────────────────┐
│ LLM (GPT, Ollama, etc)                      │
│ Extracts and maps data intelligently       │
└────────┬─────────────────────────────────┘
         │
         ▼
┌────────────────────────────────────────────┐
│ Extracted Data:                            │
│ {                                          │
│   "name": "John",                          │
│   "age": 42,                               │
│   confidence_scores: {...}                 │
│ }                                          │
└────────┬─────────────────────────────────┘
         │
         ▼
┌──────────────────────────────────────┐
│ Auto-populate Form Fields            │
│ [Name: John]                         │
│ [Age: 42]                            │
│ [...]                                │
│                                      │
│ User Reviews/Edits ← Can modify!     │
│                                      │
│ [Cancel] [Save Activity]             │
└──────────────────────────────────────┘
```

---

## 📊 What Each Field Does

### Enable Voice Capture Checkbox
- ✅ Checked: Form users see "Start Voice Capture" button
- ❌ Unchecked: Voice capture disabled for this form

### Interviewer Guide (📋)
**Shown to interviewer BEFORE recording starts**

Example:
```
Please ask the respondent:
1. Their full name
2. Their age in years
3. When symptoms started
4. What symptoms they have

Listen for specific details and ask 
follow-up questions if needed.
```

### AI Guide (🤖)
**Helps LLM extract and map data correctly**

Example:
```
Extract the following from the conversation:
- name: Full name (string, required)
- age: Age in years (number, 0-150)
- symptom_date: When symptoms started (date, YYYY-MM-DD)
- symptoms: What symptoms they have (text, max 500 chars)

If a value is mentioned multiple times, use the most recent.
For dates, convert verbal descriptions to YYYY-MM-DD format.
```

### Custom Extraction Prompt (⚙️) - Optional
**Advanced: Override the default LLM system prompt**

Only use if you know what you're doing!

---

## 🎛️ Configuration Checklist

Before using voice capture, configure:

- [ ] **Speech-to-Text Service**
  - Settings → AI Settings → Speech-to-Text
  - Recommend: OpenAI Whisper
  - Requires API key

- [ ] **LLM Provider**
  - Settings → AI Settings → LLM Provider
  - Options: OpenAI GPT, Ollama, other
  - Requires configuration/API key

- [ ] **Form Voice Guidelines** (this feature)
  - Form Builder → Voice Guidelines
  - Set is_enabled = true
  - Enter interviewer and AI guides

- [ ] **Optional: AI Context**
  - Settings → AI Settings → Prompt Contexts
  - Domain-specific knowledge for better extraction

---

## 🧪 Testing Checklist

### Phase 1: Save Guidelines
- [ ] Go to Form Builder
- [ ] Click "Voice Guidelines"
- [ ] Enable voice capture
- [ ] Enter sample text
- [ ] Click "Save"
- [ ] See success message
- [ ] Refresh page → guidelines still there

### Phase 2: Record Interview
- [ ] Go to Fill Form page
- [ ] Click "Start Voice Capture"
- [ ] See interviewer guide displayed
- [ ] Record 30 seconds of natural speech
- [ ] Click "Stop"

### Phase 3: Transcription
- [ ] See "Transcribing..." message
- [ ] Wait for transcription to complete
- [ ] See transcribed text (check accuracy)

### Phase 4: LLM Extraction
- [ ] See "Extracting data..." message
- [ ] Wait for LLM processing
- [ ] Form fields auto-populated
- [ ] Review extracted data

### Phase 5: Save
- [ ] Edit any incorrect fields
- [ ] Click "Save Activity"
- [ ] ✅ Complete!

---

## 🚨 Troubleshooting

| Problem | Solution |
|---------|----------|
| Guidelines won't save | ✅ Update with this fix |
| No interviewer guide shown | Check if form has guidelines configured |
| Transcription fails | Verify speech-to-text service configured |
| Data extraction fails | Check LLM provider configured |
| Extraction is inaccurate | Improve AI guide text |
| Extracted data is wrong type | Check field types in form definition |

---

## 📱 Component Hierarchy

```
BuildFormPage
├── FormBuilder (edit fields)
├── [Voice Guidelines button]
└── Modal (showVoiceGuidelinesModal)
    └── FormVoiceGuidelinesEditor ← Uses useVoiceApi

FillFormPage
├── Form (with fields)
├── [Start Voice Capture button]
└── Modal (showVoiceCaptureModal)
    └── VoiceCapturePanel ← Uses useVoiceApi
```

---

## 🔌 API Endpoints Used

| Endpoint | Method | Purpose |
|----------|--------|---------|
| `/api/voice-capture/form/{id}/guidelines` | GET | Load guidelines |
| `/api/voice-capture/form/{id}/guidelines` | POST | ✅ **FIXED: Save guidelines** |
| `/api/voice-capture/recordings` | POST | Create recording |
| `/api/voice-capture/upload-audio` | POST | Upload audio file |
| `/api/voice-capture/transcribe` | POST | Transcribe audio |
| `/api/voice-capture/extract-and-map` | POST | Extract data with LLM |

---

## 💡 Pro Tips

1. **Write clear guides** → Better extraction accuracy
2. **Include examples** in AI guide → LLM learns better
3. **Test with sample recording** → Validate quality
4. **Use consistent terminology** → Fewer extraction errors
5. **Keep interviews natural** → More natural responses
6. **Review before saving** → Catch extraction errors

---

## 📞 Next Steps

1. ✅ Apply this fix (if not already applied)
2. Configure speech-to-text service
3. Configure LLM provider
4. Set guidelines on a test form
5. Run Phase 1-5 tests
6. Adjust guidelines based on results
7. Deploy to users!

---

## 📚 Related Documentation

- VOICE_CAPTURE_FIX_SUMMARY.md - Detailed technical summary
- VOICE_CAPTURE_ARCHITECTURE.md - System architecture
- VOICE_CAPTURE_IMPLEMENTATION_GUIDE.md - Implementation details
