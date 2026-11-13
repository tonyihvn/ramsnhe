# Voice Capture Guidelines Save Issue - Complete Fix Summary

## 🎯 Issue
**User couldn't save voice capture guidelines** when clicking "Voice Guidelines" button in Form Builder. The feature appeared to work but guidelines were not persisted to the database.

---

## 🔍 Root Cause Analysis

### The Bug
**Mismatch between frontend API payload and backend expectation:**

#### Frontend was sending:
```javascript
// hooks/useVoiceApi.ts (BEFORE - WRONG)
await axios.post(`/api/voice-capture/form/${formId}/guidelines`, {
    guidelines: {  // ❌ Extra wrapper object
        is_enabled: true,
        ai_guide_text: "...",
        interviewer_guide_text: "...",
        extraction_prompt_override: ""
    }
});
```

#### Backend was expecting:
```javascript
// server/voice-capture-routes.js (correct)
const { is_enabled, ai_guide_text, interviewer_guide_text, extraction_prompt_override } = req.body;
// ✅ Expects fields directly at req.body level
```

---

## ✅ Fix Applied

### Changed File
**`hooks/useVoiceApi.ts` - Line 187**

```diff
const updateFormGuidelines = useCallback(async (formId: number, guidelines: any): Promise<void> => {
    setLoading(true);
    resetError();
    try {
-       await axios.post(`/api/voice-capture/form/${formId}/guidelines`, {
-           guidelines  // ❌ Wrapped in object
-       });
+       await axios.post(`/api/voice-capture/form/${formId}/guidelines`, guidelines);
                                                                         // ✅ Direct pass
    } catch (err) {
        const message = err instanceof Error ? err.message : 'Failed to update guidelines';
        setError(message);
        throw new Error(message);
    } finally {
        setLoading(false);
    }
}, []);
```

### Impact
- ✅ Guidelines now save successfully
- ✅ No breaking changes
- ✅ Backward compatible
- ✅ One-line fix

---

## 📋 How Voice Capture Guidelines Work Now

### Complete Flow

```
┌─────────────────────────────────────────────────────┐
│ STEP 1: Configure Guidelines (Form Builder)          │
└─────────────────────────────────────────────────────┘
                    ↓
    Form Builder Page → Click "Voice Guidelines"
                    ↓
    FormVoiceGuidelinesEditor Modal Opens
                    ↓
    User enters 4 fields:
    • is_enabled ✓ Enable/disable voice capture
    • interviewer_guide_text ✓ Instructions for interviewer
    • ai_guide_text ✓ Extraction guidance for LLM
    • extraction_prompt_override ✓ Custom prompt (optional)
                    ↓
    Click "Save Guidelines"
                    ↓
    [FIXED] POST /api/voice-capture/form/{formId}/guidelines ✅
                    ↓
    Backend saves to: dqatb_form_voice_guidelines
                    ↓
    "Guidelines saved successfully!" message shown


┌─────────────────────────────────────────────────────┐
│ STEP 2: Use Guidelines for Extraction (Form Fill)    │
└─────────────────────────────────────────────────────┘
                    ↓
    Go to Form Fill Page → Click "Start Voice Capture"
                    ↓
    Display Interviewer Guide from guidelines
                    ↓
    Record interview conversation
                    ↓
    Click "Stop Voice Capture"
                    ↓
    Send audio to speech-to-text service
                    ↓
    Receive transcribed text
                    ↓
    POST /api/voice-capture/extract-and-map
    (with form_id and form_fields)
                    ↓
    Backend fetches:
    ✅ Transcribed text
    ✅ Form voice guidelines ← NOW AVAILABLE (was missing)
    ✅ Form fields & options
    ✅ AI context (if configured)
                    ↓
    Build comprehensive LLM extraction prompt with:
    ├─ Field definitions (name, label, type, options, required)
    ├─ Interviewer guide (what to ask)
    ├─ AI guide (how to extract & map)
    ├─ Custom prompt override (if provided)
    ├─ AI context (domain-specific knowledge)
    └─ Transcribed conversation
                    ↓
    Call LLM (OpenAI, Ollama, etc.)
                    ↓
    LLM returns extracted and mapped data:
    {
        "patient_name": "John Doe",
        "age": 42,
        "symptoms": "Headache and fever",
        "confidence_scores": {
            "patient_name": 0.95,
            "age": 0.98,
            "symptoms": 0.87
        }
    }
                    ↓
    Auto-populate form fields with extracted data
                    ↓
    User reviews, edits if needed, then saves
```

---

## 🛢️ Database Schema

### dqatb_form_voice_guidelines Table
```sql
CREATE TABLE dqatb_form_voice_guidelines (
    id SERIAL PRIMARY KEY,
    business_id INTEGER NOT NULL,
    form_id INTEGER NOT NULL,
    is_enabled BOOLEAN DEFAULT true,           -- Enable/disable for this form
    ai_guide_text TEXT,                        -- LLM extraction guidance
    interviewer_guide_text TEXT,               -- Show to interviewer before recording
    extraction_prompt_override TEXT,           -- Custom LLM prompt (advanced)
    created_by INTEGER NOT NULL,
    created_at TIMESTAMP DEFAULT NOW(),
    updated_at TIMESTAMP DEFAULT NOW(),
    UNIQUE(business_id, form_id),
    FOREIGN KEY (business_id) REFERENCES dqatb_businesses(id),
    FOREIGN KEY (form_id) REFERENCES dqatb_forms(id),
    FOREIGN KEY (created_by) REFERENCES dqatb_users(id)
);

CREATE INDEX idx_form_voice_guidelines ON dqatb_form_voice_guidelines(business_id, form_id);
```

---

## 📊 Context Provided to LLM

As per your requirements, when voice capture extracts data, the LLM receives:

### ✅ Form Structure
- **Questions** - Field labels and descriptions
- **Question Elements** - Field types (text, number, date, select, etc.)
- **Data Types** - Field data types for proper conversion
- **Options** - Dropdown/select field available options
- **Field Names** - Machine-friendly field identifiers (database column names)

### ✅ Guidelines
- **Interviewer Guide** - Instructions on what questions to ask
- **AI Guide** - Extraction guidance for accurate data mapping
- **Custom Prompt Override** - Advanced users can customize LLM behavior

### ✅ Additional Context
- **AI Context** - Business-specific knowledge (if configured in AI Settings)
- **Transcribed Text** - The actual interview conversation

### Example LLM Prompt
```
You are an expert form data extractor. Analyze this interview and extract data.

CONTEXT:
[AI context if provided - domain knowledge, terminology, abbreviations]

FORM FIELDS TO EXTRACT:
[
  {
    "id": "patient_name",
    "name": "patient_name",
    "label": "Patient Full Name",
    "type": "text",
    "required": true
  },
  {
    "id": "hiv_status",
    "name": "hiv_status",
    "label": "HIV Status",
    "type": "select",
    "options": ["Positive", "Negative", "Unknown"],
    "required": true
  },
  ...more fields...
]

VOICE GUIDELINES:
Ask patient for: full name, age, main symptoms, when symptoms started
Map responses carefully to form fields. For HIVStatus field, map only to:
"Positive", "Negative", or "Unknown"

TRANSCRIBED CONVERSATION:
Interviewer: What is your full name?
Responder: My name is John Smith
Interviewer: What is your HIV status?
Responder: I'm positive
[...rest of conversation...]

TASK:
1. Extract each question-answer pair
2. Map answers to form fields
3. Convert to proper data types
4. Return with confidence scores

RESPONSE FORMAT:
{
  "extracted_data": {
    "patient_name": "John Smith",
    "hiv_status": "Positive",
    ...
  },
  "confidence_scores": {
    "patient_name": 0.98,
    "hiv_status": 0.95,
    ...
  }
}
```

---

## 🚀 How to Test

### Quick Test (2 minutes)
1. Go to **Form Builder**
2. Click **"Voice Guidelines"** button
3. Enable voice capture
4. Enter sample text in interviewer and AI guides
5. Click **"Save Guidelines"**
6. ✅ Should see "Guidelines saved successfully!" message

### Full Integration Test (10-15 minutes)
1. **Configure Speech-to-Text** (Settings → AI Settings)
   - OpenAI Whisper recommended
   - Need API key
   
2. **Configure LLM** (Settings → AI Settings)
   - OpenAI GPT or Ollama
   - Need configuration details

3. **Set Voice Guidelines** on a test form

4. **Fill a Form with Voice**
   - Go to Activities → Fill Form
   - Click "Start Voice Capture"
   - Speak naturally (e.g., "My name is Jane, I'm 35 years old, and I have a fever")
   - Click "Stop Voice Capture"
   - Watch as it transcribes and extracts data
   - ✅ Should see form fields auto-populated

5. **Review Results**
   - Check if extraction was accurate
   - Edit any fields as needed
   - Save the activity

---

## 📁 Files Changed

| File | Change | Impact |
|------|--------|--------|
| `hooks/useVoiceApi.ts` | Line 187: Removed extra `guidelines` wrapper | ✅ Fixes save functionality |

---

## ✨ What This Enables

With this fix, your voice capture system now:

1. **Captures audio** during interviews ✓
2. **Transcribes speech** to text ✓
3. **Uses form structure** as context ✓
4. **Uses custom guidelines** for better extraction ✓
5. **Leverages LLM** for intelligent data mapping ✓
6. **Auto-populates forms** with extracted data ✓
7. **Allows manual review** before saving ✓

This creates a **complete voice-to-form workflow** that saves time and reduces manual data entry!

---

## 🔧 Technical Details

### API Endpoint
```
POST /api/voice-capture/form/{formId}/guidelines
Content-Type: application/json

{
    "is_enabled": true,
    "interviewer_guide_text": "Ask patient name, age, symptoms...",
    "ai_guide_text": "Extract to patient_name (string), age (number), symptoms (text)...",
    "extraction_prompt_override": ""
}

Response:
{
    "success": true,
    "message": "Voice guidelines saved successfully",
    "guidelines": {
        "id": 42,
        "is_enabled": true,
        "ai_guide_text": "...",
        "interviewer_guide_text": "..."
    }
}
```

### Related Endpoints
- `GET /api/voice-capture/form/{formId}/guidelines` - Fetch saved guidelines
- `POST /api/voice-capture/extract-and-map` - Extract data from recording using guidelines

---

## 🎉 Summary

**One simple fix restored voice capture guidelines functionality:**
- ✅ Changed `{ guidelines }` to `guidelines` in API call
- ✅ Guidelines now save correctly
- ✅ LLM extraction uses guidelines for better accuracy
- ✅ Users get complete voice-to-form workflow
- ✅ No database changes needed
- ✅ Fully backward compatible

**The voice capture system is now complete and ready to use!**
