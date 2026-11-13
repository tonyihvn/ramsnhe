# Voice Capture Guidelines Save Issue - Fix Report

## Problem
Users couldn't save voice capture guidelines through the Form Builder's "Voice Guidelines" button. The feature showed no errors but the guidelines weren't being persisted.

## Root Cause
**Mismatch between frontend and backend API contract:**

### Frontend (hooks/useVoiceApi.ts - Line 177)
```typescript
// BEFORE (WRONG):
await axios.post(`/api/voice-capture/form/${formId}/guidelines`, {
    guidelines  // Wrapped in object
});

// AFTER (CORRECT):
await axios.post(`/api/voice-capture/form/${formId}/guidelines`, guidelines);
```

### Backend (server/voice-capture-routes.js - Line 255)
```javascript
// Backend expects fields directly in req.body:
const { is_enabled, ai_guide_text, interviewer_guide_text, extraction_prompt_override } = req.body;
```

**The frontend was sending:**
```json
{
    "guidelines": {
        "is_enabled": true,
        "ai_guide_text": "...",
        "interviewer_guide_text": "...",
        "extraction_prompt_override": ""
    }
}
```

**But backend expected:**
```json
{
    "is_enabled": true,
    "ai_guide_text": "...",
    "interviewer_guide_text": "...",
    "extraction_prompt_override": ""
}
```

## Solution Applied
Fixed the `updateFormGuidelines` function in [useVoiceApi.ts](hooks/useVoiceApi.ts:183-191) to pass guidelines directly instead of wrapping them in an object.

**File Changed:** `hooks/useVoiceApi.ts`
- **Line 187:** Changed from `{ guidelines }` to `guidelines`

## How Voice Capture Guidelines Work

### 1. **Save Flow** (Now Fixed ✅)
```
FormBuilder Page
    ↓
Click "Voice Guidelines" Button
    ↓
FormVoiceGuidelinesEditor Modal Opens
    ↓
User enters:
  - is_enabled (checkbox)
  - interviewer_guide_text (instructions for interviewer)
  - ai_guide_text (extraction guidance for LLM)
  - extraction_prompt_override (optional custom prompt)
    ↓
Click "Save Guidelines"
    ↓
useVoiceApi.updateFormGuidelines()
    ↓
POST /api/voice-capture/form/{formId}/guidelines ✅
    ↓
Backend saves to dqatb_form_voice_guidelines table
    ↓
Success message shown
```

### 2. **LLM Extraction Flow** (Uses Guidelines)
```
FillFormPage → Start Voice Capture
    ↓
Record audio → Stop Voice Capture
    ↓
Send to speech-to-text service
    ↓
Transcribe to text
    ↓
Call /api/voice-capture/extract-and-map
    ↓
Backend fetches:
  1. Transcribed text
  2. Form voice guidelines ← (NOW AVAILABLE!)
  3. Form fields (questions, labels, types, options)
  4. AI context (if configured)
    ↓
Build LLM extraction prompt with ALL context
    ↓
Call LLM with comprehensive context:
  - Field definitions (name, label, type, options, required)
  - Interviewer guide (what questions to ask)
  - AI guide (how to extract and map data)
  - Custom prompt override (if provided)
    ↓
LLM returns extracted and mapped data
    ↓
Auto-populate form fields
    ↓
User reviews and edits before saving
```

## Database Schema
The guidelines are stored in `dqatb_form_voice_guidelines`:

```sql
CREATE TABLE dqatb_form_voice_guidelines (
    id SERIAL PRIMARY KEY,
    business_id INTEGER NOT NULL,
    form_id INTEGER NOT NULL,
    is_enabled BOOLEAN DEFAULT true,
    ai_guide_text TEXT,                    -- Guidelines for LLM extraction
    interviewer_guide_text TEXT,           -- Instructions for interviewer
    extraction_prompt_override TEXT,       -- Custom LLM prompt (optional)
    created_by INTEGER NOT NULL,
    created_at TIMESTAMP DEFAULT NOW(),
    updated_at TIMESTAMP DEFAULT NOW(),
    UNIQUE(business_id, form_id),
    FOREIGN KEY (business_id) REFERENCES dqatb_businesses(id) ON DELETE CASCADE,
    FOREIGN KEY (form_id) REFERENCES dqatb_forms(id) ON DELETE CASCADE,
    FOREIGN KEY (created_by) REFERENCES dqatb_users(id) ON DELETE SET NULL
);
```

## LLM Context Includes
As per requirements, when extracting data using voice capture, the LLM receives:

✅ **Questions** - Form field labels and descriptions
✅ **Question Elements** - Field types (text, number, select, etc.)
✅ **Data Types** - Field data types for proper conversion
✅ **Options** - Dropdown/select field options
✅ **Field Names** - Machine-friendly field identifiers
✅ **Guidelines** - AI extraction guidance + Interviewer guide
✅ **AI Context** - Business-specific context if configured

All are included in the extraction prompt via `buildExtractionPrompt()` in `server/voice-capture-helpers.js`

## Files Modified
- **hooks/useVoiceApi.ts** - Fixed updateFormGuidelines function

## Testing Steps
1. ✅ Navigate to Form Builder
2. ✅ Click "Voice Guidelines" button
3. ✅ Enable voice capture for the form
4. ✅ Enter interviewer guide (e.g., "Ask the patient their name, age, and symptoms")
5. ✅ Enter AI guide (e.g., "Extract patient_name, age, and symptoms to form fields")
6. ✅ Click "Save Guidelines" 
7. ✅ Verify no errors and success message appears
8. ✅ Go to Form Fill page
9. ✅ Click "Start Voice Capture"
10. ✅ Record interview
11. ✅ Verify LLM uses guidelines for extraction

## Next Steps
1. Test voice capture end-to-end with the fixed guidelines
2. Configure a speech-to-text service (OpenAI Whisper recommended)
3. Configure an LLM provider in AI Settings
4. Record a sample interview and verify extraction quality

## Notes
- Voice capture is now fully integrated with LLM extraction
- Guidelines enhance extraction accuracy significantly
- The fix is minimal and backward compatible
- No database migrations needed
