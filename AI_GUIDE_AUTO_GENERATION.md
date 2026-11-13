# AI Extraction Guide - Auto-Generation Feature

**Date:** November 13, 2024
**Feature:** Automatic AI Extraction Guide Generation
**Status:** ✅ Implemented

---

## 📋 Overview

The FormVoiceGuidelinesEditor component now includes an **auto-generation feature** that intelligently creates AI Extraction Guides based on the form's structure.

### What It Does
- ✨ Analyzes form questions and field configurations
- 📝 Extracts field names, labels, types, and options
- 🤖 Generates a structured guide for the LLM
- 👁️ Shows a preview before applying
- ✅ Allows refinement and customization

---

## 🎯 Key Features

### 1. **Smart Auto-Generation**
Automatically creates guides that include:
- Field names (machine-friendly identifiers)
- Field labels (user-friendly descriptions)
- Data types (text, number, email, phone, date, select, checkbox)
- Expected formats (e.g., YYYY-MM-DD for dates)
- Dropdown options (for select fields)
- Extraction examples and rules

### 2. **Live Preview**
- Shows generated guide before applying
- Allows user to review quality
- Easy to discard and regenerate

### 3. **Smart Type Detection**
Handles different field types:

| Type | Generation | Example |
|------|-----------|---------|
| **text** | String extraction | "natural text response from interview" |
| **textarea** | Multi-line text | "natural text response from interview" |
| **number** | Numeric conversion | "42 years old" → 42 |
| **email** | Email validation | "valid email address" |
| **phone** | Phone parsing | Extract digits and format |
| **date** | Date conversion | "last Monday" → 2024-11-11 (YYYY-MM-DD) |
| **select/dropdown** | Option matching | "one of: Option1, Option2, Option3" |
| **checkbox** | Boolean conversion | "true/false based on user confirmation" |

### 4. **Extraction Rules**
Auto-generated guide includes rules:
- Map interviewer questions to form fields
- Use predefined options for dropdowns
- Convert dates to YYYY-MM-DD format
- Extract numeric values from text
- Handle field corrections
- Score confidence (0-1)
- Preserve capitalization
- Handle multi-part answers
- Process acronyms based on context

---

## 🔧 Implementation Details

### Component Updates

**File:** `components/FormVoiceGuidelinesEditor.tsx`

**Props Added:**
```typescript
interface FormVoiceGuidelinesEditorProps {
    formId?: number;
    activityId?: number;
    formDefinition?: any;  // ✨ NEW: Form structure with questions
    onSave?: () => void;
    onClose?: () => void;
}
```

**State Added:**
```typescript
const [showGeneratedPreview, setShowGeneratedPreview] = useState(false);
```

**Function Added:**
```typescript
const generateAIGuide = () => {
    // Analyzes formDefinition.questions
    // Extracts field info: name, label, type, options
    // Generates structured guide with extraction rules
    // Returns formatted string
}
```

### Integration with BuildFormPage

**Usage in BuildFormPage.tsx:**
```typescript
<FormVoiceGuidelinesEditor
    activityId={activityId}
    formDefinition={formDef}  // ✨ Pass form structure
    onSave={() => { /* ... */ }}
    onClose={() => { /* ... */ }}
/>
```

---

## 💡 How It Works

### Step-by-Step Process

```
1. User opens Voice Guidelines modal in Form Builder
2. User sees "Auto-Generate" button next to "AI Extraction Guide"
3. User clicks "Auto-Generate" button
4. System analyzes form structure:
   - Iterates through all sections
   - For each question, extracts:
     • Field name (from fieldName or id)
     • Label (from questionText or label)
     • Type (from elementType or type)
     • Options (from options or answers array)
5. Generates structured guide with:
   - Field descriptions with types
   - Expected values and formats
   - Extraction rules
   - Confidence scoring instructions
6. Shows preview in blue box
7. User reviews preview and clicks "Use This" or "Hide"
8. If "Use This": Guide is populated in textarea
9. User can refine manually
10. User saves guidelines
```

### Example Generated Guide

```
Extract the following fields from the transcribed interview conversation:

- patient_name: Patient Full Name (string, required)
  Expected: natural text response from interview

- patient_age: Patient Age (number)
  Expected: numeric value (e.g., "42 years old" → 42)

- appointment_date: Appointment Date (date, YYYY-MM-DD format)
  Expected: date (convert verbal descriptions like "last Monday" to YYYY-MM-DD)

- hiv_status: HIV Status (string, select from options)
  Expected: one of: "Positive", "Negative", "Unknown"

IMPORTANT EXTRACTION RULES:
1. Map each interviewer question and responder answer to the corresponding form field above
2. For select/dropdown fields, only use values from the predefined options
3. For dates, always convert to YYYY-MM-DD format (e.g., "3/15/2024" → "2024-03-15")
4. For numbers, extract numeric values even if embedded in text
5. If a field cannot be confidently extracted, mark confidence as 0
... (8 more rules)
```

---

## 🎨 UI Components

### "Auto-Generate" Button
- Location: Next to "AI Extraction Guide" label
- Icon: ✨ Sparkles
- Behavior: Toggle preview on/off
- Text: "Auto-Generate" or "Hide"
- Color: Primary color text

### Preview Box
- Background: Light blue (blue-50)
- Border: Blue border
- Header: "✨ Auto-Generated Guide Preview"
- "Use This" Button: Blue button to apply
- Content: Monospace font, scrollable, max-height: 20rem (80px)

### Integration
```
┌─────────────────────────────────────────────┐
│  🤖 AI Extraction Guide    [✨ Auto-Generate]  │
│  This guide helps the LLM...                │
├─────────────────────────────────────────────┤
│  ┌─────────────────────────────────────────┐│
│  │ ✨ Auto-Generated Guide Preview  [Use]  ││
│  │                                         ││
│  │ Extract the following fields...         ││
│  │ - patient_name: ...                     ││
│  │ - patient_age: ...                      ││
│  │ ...                                     ││
│  │ (scrollable max-height)                 ││
│  └─────────────────────────────────────────┘│
├─────────────────────────────────────────────┤
│  [Textarea with AI Guide - empty or filled] │
│                                             │
│                                             │
└─────────────────────────────────────────────┘
```

---

## 🔄 User Workflow

### Scenario 1: Using Auto-Generation

1. Form Builder → Create form with fields:
   - patient_name (text)
   - patient_age (number)
   - appointment_date (date)
   - hiv_status (select: Positive/Negative/Unknown)

2. Click "Voice Guidelines" button

3. Check "Enable Voice Capture"

4. Click "Auto-Generate" next to AI Extraction Guide

5. Review preview:
   ```
   - patient_name: Patient Name (string, required)
   - patient_age: Age (number)
   - appointment_date: Date (date, YYYY-MM-DD format)
   - hiv_status: HIV Status (string, select from options)
     one of: "Positive", "Negative", "Unknown"
   ```

6. Click "Use This" to populate textarea

7. Optionally refine the guide:
   - Add domain-specific terminology
   - Add special handling rules
   - Add context about expected values

8. Save Guidelines

9. Users now use form with:
   - Interviewer guide displayed during recording
   - AI guide used for LLM extraction
   - Better extraction accuracy

### Scenario 2: Manual Refinement

1. Follow steps 1-6 above

2. Edit generated guide in textarea:
   - Add: "For HIV status, accept abbreviations like 'HIV+' for 'Positive'"
   - Add: "If patient says 'unsure', map to 'Unknown'"
   - Add: "For age, if patient gives age range, use the lower bound"

3. Save refined Guidelines

4. LLM now uses refined guide for extraction

---

## 📊 Generated Guide Structure

Every auto-generated guide includes:

### Section 1: Field Definitions
```
Extract the following fields from the transcribed interview conversation:

- [field_name]: [Field Label] ([type_description])
  Expected: [value_description]

- [field_name]: [Field Label] ([type_description])
  Expected: [value_description]
```

### Section 2: Extraction Rules
```
IMPORTANT EXTRACTION RULES:
1. Map each interviewer question and responder answer...
2. For select/dropdown fields, only use values...
3. For dates, always convert to YYYY-MM-DD format...
4. For numbers, extract numeric values even if...
5. If a field cannot be confidently extracted...
6. Return confidence scores (0-1) for each...
7. Preserve original spelling and capitalization...
8. For multi-part answers, try to extract...
9. If the interviewer corrects a previous answer...
10. Handle acronyms and abbreviations based on...
```

---

## 🛡️ Error Handling

### No Form Questions
**Condition:** `formDefinition` is null or has no questions
**Behavior:** 
- "Auto-Generate" button hidden
- Error message: "No form questions found. Please add questions to the form first."
- User can still manually enter AI guide

### Empty Form Definition
**Condition:** Form has sections but no questions
**Behavior:** 
- Empty guide generated (just rules)
- User can still accept or manual enter

### Missing Field Information
**Condition:** Field missing fieldName or type
**Behavior:**
- Uses fallback: `field_${question.id}` for name
- Uses "text" as default type
- Continues generation

---

## 🔍 Field Type Mapping

| Form Element Type | Type Description | Example Output |
|------------------|-----------------|-----------------|
| text | (string, required) | natural text response |
| textarea | (string, required) | natural text response |
| number | (number) | numeric value (e.g., "42") |
| email | (string, email format) | valid email address |
| phone | (string, phone format) | phone number |
| date | (date, YYYY-MM-DD format) | convert "last Monday" |
| select | (string, select from options) | "one of: Option1, Option2" |
| dropdown | (string, select from options) | "one of: Option1, Option2" |
| checkbox | (boolean) | true/false confirmation |

---

## ✨ Benefits

### For Users
✅ **Saves Time** - No manual typing of field descriptions
✅ **Reduces Errors** - Consistent format based on form structure
✅ **Better Extraction** - LLM gets complete context
✅ **Easy Refinement** - Generated guide as starting point

### For LLM
✅ **Clear Instructions** - Knows exact fields to extract
✅ **Type Information** - Knows how to convert values
✅ **Options Context** - Knows valid values for dropdowns
✅ **Extraction Rules** - Knows how to handle edge cases

### For Data Quality
✅ **Accuracy** - Better field mapping
✅ **Consistency** - All forms have complete guidelines
✅ **Confidence Scores** - LLM returns confidence metrics
✅ **Traceability** - Clear extraction rules

---

## 📝 Customization Examples

### Example 1: Medical Form
**Generated:**
```
- patient_weight: Patient Weight (number)
  Expected: numeric value (e.g., "75 kg" → 75)
```

**User Refines:**
```
- patient_weight: Patient Weight in kilograms (number)
  Expected: numeric value (e.g., "75 kg" → 75)
  Note: If patient gives weight in pounds, convert to kg (1 lb = 0.453592 kg)
```

### Example 2: Multi-Language Support
**Generated:**
```
- patient_name: Patient Full Name (string, required)
  Expected: natural text response from interview
```

**User Refines:**
```
- patient_name: Patient Full Name (string, required)
  Expected: natural text response from interview
  Note: Patient may provide name in Yoruba, English, or Pidgin - 
  extract as-is without translation
```

### Example 3: Conditional Fields
**Generated:**
```
- hiv_status: HIV Status (string, select from options)
  Expected: one of: "Positive", "Negative", "Unknown"
```

**User Refines:**
```
- hiv_status: HIV Status (string, select from options)
  Expected: one of: "Positive", "Negative", "Unknown"
  Note: If patient declines to answer, use "Unknown"
  Accept common abbreviations: "HIV+" for "Positive", "HIV-" for "Negative"
```

---

## 🚀 Deployment

### Files Changed
- `components/FormVoiceGuidelinesEditor.tsx` - Added auto-generation feature

### Backward Compatibility
✅ **Fully Compatible**
- New props are optional (`formDefinition` can be undefined)
- Auto-generate button only shows if formDefinition is provided
- Existing guidelines still work as before
- No database changes needed

### Testing Checklist
- [ ] Form Builder opens with Voice Guidelines
- [ ] Auto-Generate button appears when form has questions
- [ ] Auto-Generate button hidden when no questions
- [ ] Preview shows correct field information
- [ ] "Use This" button populates textarea
- [ ] Guide can be manually edited after generation
- [ ] Hide button closes preview
- [ ] Generated guide can be saved successfully
- [ ] Saved guidelines contain generated text
- [ ] Form fill uses saved guidelines for extraction

---

## 📚 Related Documentation

- VOICE_CAPTURE_FIX_SUMMARY.md - Complete voice capture system
- VOICE_CAPTURE_QUICK_REFERENCE.md - Quick reference guide
- FormVoiceGuidelinesEditor.tsx - Component implementation

---

## 🎉 Summary

The AI Extraction Guide Auto-Generation feature:
- ✨ Automatically creates intelligent guides from form structure
- 👁️ Shows preview before applying
- ✏️ Allows manual refinement
- 🤖 Improves LLM extraction accuracy
- ⏱️ Saves configuration time
- 🔄 Maintains backward compatibility

**Users can now:** Configure voice capture in seconds, not minutes!
