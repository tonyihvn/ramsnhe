# AI Extraction Guide - Quick Start

## ⚡ What's New

The Voice Guidelines editor now has an **"Auto-Generate" button** that creates AI extraction guides automatically based on your form structure!

---

## 🎯 How to Use (30 seconds)

### Step 1: Open Voice Guidelines
```
Form Builder → Click "Voice Guidelines" button
```

### Step 2: Click "Auto-Generate"
```
Next to "AI Extraction Guide" label
Look for: ✨ Auto-Generate button
```

### Step 3: Review Preview
```
A blue box appears showing:
- All form field names
- Field types (text, number, date, select, etc.)
- Expected values for dropdowns
- Extraction rules for the LLM
```

### Step 4: Click "Use This"
```
The AI guide textarea is populated with the generated guide
```

### Step 5: (Optional) Refine
```
Edit the textarea to add:
- Domain-specific terminology
- Special handling rules
- Context about expected values
```

### Step 6: Save
```
Click "Save Guidelines"
```

---

## 📋 What Gets Generated

For a form with these fields:

| Field | Type | Options |
|-------|------|---------|
| patient_name | text | - |
| patient_age | number | - |
| appointment_date | date | - |
| hiv_status | select | Positive, Negative, Unknown |

### Generated Guide:
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
6. Return confidence scores (0-1) for each extracted field
7. Preserve original spelling and capitalization for names and text fields
8. For multi-part answers, try to extract all relevant information
9. If the interviewer corrects a previous answer, use the final answer
10. Handle acronyms and abbreviations based on context
```

---

## 🎨 UI Walkthrough

```
┌──────────────────────────────────────────────────────────────┐
│ 🎤 Voice Capture Guidelines                                  │
├──────────────────────────────────────────────────────────────┤
│                                                              │
│  ☑ Enable Voice Capture for This Form                       │
│     When enabled, users will see...                         │
│                                                              │
│  📋 Interviewer's Guide                                      │
│     [TextArea with interviewer instructions]                │
│                                                              │
│  🤖 AI Extraction Guide    [✨ Auto-Generate]  ← Click here │
│     This guide helps the LLM...                             │
│                                                              │
│  ┌──────────────────────────────────────────────────────┐  │
│  │ ✨ Auto-Generated Guide Preview    [Use This]        │  │
│  │                                                      │  │
│  │ Extract the following fields...                      │  │
│  │ - patient_name: Patient Name (string, required)     │  │
│  │   Expected: natural text response                   │  │
│  │ - patient_age: Age (number)                         │  │
│  │   Expected: numeric value (e.g., "42")             │  │
│  │ ...                                                 │  │
│  │ IMPORTANT EXTRACTION RULES:                         │  │
│  │ 1. Map each interviewer question...                │  │
│  │ ...                                                 │  │
│  └──────────────────────────────────────────────────────┘  │
│                                                              │
│  [TextArea for manual editing - populated after "Use This"] │
│  [Full textarea for refinement]                            │
│                                                              │
│  ⚙️ Custom Extraction Prompt (Optional)                     │
│     [TextArea for advanced customization]                  │
│                                                              │
│  [Cancel]  [Save Guidelines]                               │
└──────────────────────────────────────────────────────────────┘
```

---

## ✨ Smart Field Type Handling

The generator understands these field types:

### Text Fields
```
- name: Person Name (string, required)
  Expected: natural text response from interview
```

### Numbers
```
- age: Age (number)
  Expected: numeric value (e.g., "42 years old" → 42)
```

### Emails
```
- email: Email Address (string, email format)
  Expected: valid email address
```

### Phones
```
- phone: Phone Number (string, phone format)
  Expected: phone number (extract digits and format)
```

### Dates
```
- dob: Date of Birth (date, YYYY-MM-DD format)
  Expected: date (convert verbal descriptions like "last Monday" to YYYY-MM-DD)
```

### Dropdowns/Selects
```
- status: HIV Status (string, select from options)
  Expected: one of: "Positive", "Negative", "Unknown"
```

### Checkboxes
```
- consents: Consented (boolean)
  Expected: true/false based on user confirmation
```

---

## 💡 Usage Examples

### Example 1: Health Survey Form
**Form has:**
- Patient Name (text)
- Age (number)
- Symptoms (textarea)
- Visit Date (date)
- Tested For HIV? (select: Yes/No/Unknown)

**Auto-generates:**
```
Extract the following fields...
- patient_name: Patient Name (string, required)
  Expected: natural text response
- age: Age (number)
  Expected: numeric value
- symptoms: Symptoms (string, required)
  Expected: natural text response
- visit_date: Visit Date (date, YYYY-MM-DD format)
  Expected: date conversion
- tested_for_hiv: Tested For HIV (string, select)
  Expected: one of: "Yes", "No", "Unknown"

IMPORTANT EXTRACTION RULES:
...
```

### Example 2: Business Contact Form
**Form has:**
- Company Name (text)
- Phone (phone)
- Email (email)
- Industry (select: Tech/Finance/Other)

**Auto-generates:**
```
Extract the following fields...
- company_name: Company Name (string, required)
- phone: Phone (string, phone format)
- email: Email (string, email format)
- industry: Industry (string, select)
  Expected: one of: "Tech", "Finance", "Other"

IMPORTANT EXTRACTION RULES:
...
```

---

## 🔄 When to Use Auto-Generate

### ✅ Use Auto-Generate When:
- You have a form structure defined
- You want a quick starting point
- You need standard extraction for most fields
- You plan to refine based on domain knowledge

### ❌ Don't Need When:
- You have no form questions yet
- You prefer completely custom guides
- You have very specialized extraction rules

---

## ✏️ Refining the Generated Guide

After clicking "Use This", you can edit to add:

### Domain Terminology
```
Before:
- patient_name: Patient Name (string, required)

After:
- patient_name: Patient Full Name - first, middle, last (string, required)
  Note: Some patients give only first name, in which case leave middle/last empty
```

### Special Handling
```
Before:
- status: HIV Status (string, select)
  Expected: one of: "Positive", "Negative", "Unknown"

After:
- status: HIV Status (string, select)
  Expected: one of: "Positive", "Negative", "Unknown"
  Note: Accept abbreviations: "+" for "Positive", "-" for "Negative"
  If patient declines to answer, use "Unknown"
```

### Conditional Logic
```
Before:
- visit_reason: Reason for Visit (string, required)

After:
- visit_reason: Reason for Visit (string, required)
  Note: If patient mentions multiple reasons, list all separated by semicolons
  Most important reason should be listed first
```

---

## 🚀 Time Savings

### Before (Manual Guide Writing)
1. Open form builder: 30 seconds
2. Click Voice Guidelines: 10 seconds
3. Manually type field descriptions: 5-10 minutes
4. Add type information: 2-3 minutes
5. Add extraction rules: 2-3 minutes
**Total: ~12-16 minutes**

### After (With Auto-Generation)
1. Open form builder: 30 seconds
2. Click Voice Guidelines: 10 seconds
3. Click "Auto-Generate": 5 seconds
4. Click "Use This": 5 seconds
5. Optionally refine: 0-5 minutes
**Total: ~1-6 minutes (85% time savings!)**

---

## ⚡ Features at a Glance

| Feature | Benefit |
|---------|---------|
| **Auto-Detection** | Detects field types automatically |
| **Options Extraction** | Includes dropdown options in guide |
| **Format Specification** | Specifies format (e.g., YYYY-MM-DD for dates) |
| **Extraction Rules** | Includes 10 extraction best practices |
| **Preview First** | Review before applying |
| **Refinable** | Edit after generation |
| **One-Click Apply** | "Use This" populates textarea |
| **Completeness** | All fields included automatically |

---

## 🎯 Best Practices

### 1. Start with Auto-Generation
```
Don't start from scratch - let the generator create the base
```

### 2. Review the Preview
```
Check if field types and options are correctly identified
```

### 3. Add Domain Knowledge
```
Enhance with terminology specific to your domain
```

### 4. Test with Real Data
```
After saving, test with a real interview recording
```

### 5. Refine Based on Results
```
If extraction accuracy is low, update the guide based on what went wrong
```

---

## 🔧 Technical Details

**Location:** Form Builder → Voice Guidelines modal
**Component:** FormVoiceGuidelinesEditor
**Trigger:** "Auto-Generate" button (✨ icon)
**Behavior:** Shows preview, applies with "Use This"
**Customization:** Edit textarea after application

---

## 📞 Troubleshooting

### Problem: "Auto-Generate" button not visible
**Solution:** Form must have questions. Add questions to form first.

### Problem: Generated guide looks incomplete
**Solution:** Check form has all fields with proper types set

### Problem: Options missing for dropdown
**Solution:** Ensure dropdown field has options defined

### Problem: Want to regenerate after edit
**Solution:** Click "Auto-Generate" again (shows preview of fresh generation)

---

## 💡 Pro Tips

1. **Use with Default Guides** - Generate, keep as-is, or refine
2. **Compare Multiple Forms** - See how different structures generate different guides
3. **Use as Template** - Generate once, then copy patterns for similar forms
4. **Version Your Guides** - Keep notes on what extracted well
5. **Test Early** - Generate and test with a recording before full rollout

---

## 🎉 Summary

The AI Extraction Guide Auto-Generation feature:
- ✨ Creates guides automatically from form structure
- 👁️ Shows preview for review
- ✏️ Allows refinement and customization
- ⏱️ Saves 85% of guide creation time
- 🤖 Improves LLM extraction accuracy
- 🎯 Best for structured forms with defined fields

**Result:** Better voice capture with less effort!
