# AI Context Tab - Quick Visual Guide

**Status:** ✅ Implementation Complete  
**Date:** November 12, 2026

---

## What You're Getting

A new **AI Context** tab in Settings for admins to enter system prompts that enhance RAG responses.

---

## Visual Layout

### Settings Page Tabs (Horizontal Navigation)

```
┌──────────────────────────────────────────────────────────────────┐
│ Settings                                                         │
├──────────────────────────────────────────────────────────────────┤
│ Database | DBMS | LLM | RAG | [AI Context] ← NEW TAB!            │
│           |      |     |     Theme | Colors | App | Email...     │
└──────────────────────────────────────────────────────────────────┘
```

### AI Context Tab Content

```
┌─────────────────────────────────────────────────────────────────────────┐
│ AI Context Settings                                                     │
├─────────────────────────────────────────────────────────────────────────┤
│                                                                         │
│ System Context for RAG Responses                                        │
│ Enter context information that will be used to help shape RAG responses.
│ This text provides background knowledge and instructions to improve...  │
│                                                                         │
│ ┌───────────────────────────────────────────────────────────────────┐   │
│ │ You are an expert data analyst. Focus on accuracy and completeness  │   │
│ │ Always provide context for your recommendations. Consider both    │   │
│ │ quantitative and qualitative factors...                          │   │
│ │                                                                   │   │
│ │ (12 rows, scrollable)                                            │   │
│ │                                                                   │   │
│ └───────────────────────────────────────────────────────────────────┘   │
│                                                                         │
│ ℹ️ Usage Guidelines                                                     │
│ • This context will be included with every RAG query                   │
│ • Be specific about expertise, tone, and approach                      │
│ • Include relevant domain knowledge and business rules                 │
│ • Avoid extremely long contexts for better performance                 │
│ • Update context when business requirements change                     │
│                                                                         │
│ [Save Context]  [Clear Context]                                        │
│                                                                         │
│ 📊 Character Count                                                      │
│ Current: 1,234 characters                                              │
│                                                                         │
└─────────────────────────────────────────────────────────────────────────┘
```

---

## Step-by-Step Usage

### Step 1: Access AI Context Tab
```
1. Click "Settings" in main navigation
2. Look for "AI Context" tab (between RAG and Theme)
3. Click "AI Context"
```

### Step 2: Enter Your Context
```
1. Click in the large textarea
2. Clear placeholder text if needed
3. Type your system context/prompt
4. Watch the character counter update
```

### Step 3: Save Your Context
```
1. Click "[Save Context]" button
2. See success notification: "Context Saved"
3. Context is now active
```

### Optional: Clear Context
```
1. Click "[Clear Context]" button
2. See confirmation: "Context Cleared"
3. Textarea becomes empty
```

---

## Example Contexts

### Quick Copy-Paste: Healthcare
```
You are a healthcare analytics expert. When analyzing patient data and 
responses, consider: Patient confidentiality (HIPAA compliance), Medical 
best practices and evidence-based medicine, Population health factors and 
demographics, Ethical considerations in data interpretation. Always 
provide citations for clinical recommendations. Focus on accuracy and 
safety in all responses.
```

### Quick Copy-Paste: Business
```
You are a business intelligence expert. When analyzing business metrics 
and responses: Focus on actionable insights, Consider market context and 
competition, Identify trends and patterns, Provide ROI implications. 
Always recommend next steps based on data. Support recommendations with 
specific evidence.
```

### Quick Copy-Paste: Operations
```
You are an operations analyst for a service delivery organization. Focus on: 
Process efficiency and bottlenecks, Resource utilization rates, Service 
delivery times, Quality metrics and standards, Cost implications. Always 
provide actionable recommendations.
```

---

## Key Features

| Feature | Description |
|---------|-------------|
| 📝 **Large Textarea** | 12 rows, expandable for long contexts |
| 🎯 **System Prompt** | Direct text entry for RAG system instruction |
| 💡 **Guidelines** | Blue info box with 5 best practices |
| 💾 **Save Button** | Persists context to database |
| 🗑️ **Clear Button** | Resets context to empty |
| 📊 **Character Count** | Real-time counter to monitor length |
| ✨ **Auto-save** | As you type, updates tracked |
| 🔐 **Admin Only** | Settings page restricted to admins |

---

## Where Context Is Used

```
Settings → AI Context
    ↓
Store in: settings.aiContextText
    ↓
When RAG queries process:
    ├─ Include in system prompt
    ├─ Prepend to LLM context
    └─ Influence response generation
    ↓
LLM generates better, more relevant responses
```

---

## Common Scenarios

### Scenario 1: Survey Analysis Organization
**Goal:** Better insights from survey responses  
**Action:**
1. Go to Settings → AI Context
2. Enter context about survey expertise
3. Include guidance on statistical significance
4. Save
5. RAG queries now include this guidance

### Scenario 2: Data Collection Platform
**Goal:** Consistent analytical tone  
**Action:**
1. Develop organization-wide context
2. Enter in Settings → AI Context
3. All users' RAG queries benefit
4. Easy to update if approach changes

### Scenario 3: Compliance Organization
**Goal:** Risk-focused analysis  
**Action:**
1. Highlight compliance priorities
2. Include audit trail requirements
3. Add red flags to watch for
4. Save as system context
5. All analyses include compliance focus

---

## Tips & Best Practices

✅ **DO:**
- Be specific (not generic)
- Include domain expertise
- Mention key priorities
- Specify tone (formal, casual, technical, simple)
- Include constraints (HIPAA, GDPR, etc.)
- Update when needs change
- Keep under 5,000 characters

❌ **DON'T:**
- Include passwords or API keys
- Make it extremely long (>5,000 chars)
- Use overly technical jargon alone
- Leave empty if you have requirements
- Include sensitive customer data
- Use it for off-topic instructions

---

## Technical Overview

### Data Storage
```
Database Table: settings (or theme)
Column: value (JSON)
Property: aiContextText
Type: String (unlimited length, but <5000 recommended)
```

### Where It's Retrieved
```
Frontend: 
  const { settings } = useTheme();
  const context = settings.aiContextText;

Backend:
  SELECT value FROM settings WHERE key='theme' 
  AND business_id = ?
```

### How It's Used in RAG
```typescript
// Backend code (example)
const context = await getSettings();
const systemPrompt = `${context.aiContextText}

[Original RAG prompt here]`;

// Send to LLM with context prepended
const response = await callLLM(systemPrompt);
```

---

## Character Counter Reference

| Characters | Assessment |
|-----------|------------|
| 0-500 | ✅ Short & focused |
| 500-2000 | ✅ Good length |
| 2000-5000 | ⚠️ Long (OK for detailed) |
| 5000+ | ⚠️ Very long (may impact performance) |

---

## FAQs

**Q: Can multiple users have different contexts?**  
A: Currently, context is org/business-wide (one per business). Future versions could support user-level contexts.

**Q: When is the context applied?**  
A: Every time RAG processes a query, the context is prepended to the system prompt.

**Q: Can I use markdown or code?**  
A: Yes! Monospace font is used, so you can include code blocks or formatted text.

**Q: Is context applied to non-RAG queries?**  
A: Depends on implementation. If enabled in Vanna.AI or LLM integrations, it applies there too.

**Q: Can I have multiple contexts for different purposes?**  
A: Currently one context. Future version could support templates or multiple contexts.

**Q: What happens if context is empty?**  
A: RAG queries proceed without the custom context (default behavior).

**Q: Can I preview how context affects responses?**  
A: Future feature. Currently save and test with actual queries.

---

## Testing the Feature

### Quick Test
1. ✅ Navigate to Settings → AI Context
2. ✅ Enter: "You are an expert analyst focused on accuracy."
3. ✅ Click "Save Context"
4. ✅ See success notification
5. ✅ Refresh page → text persists
6. ✅ Go to RAG and test queries
7. ✅ Verify responses are different/improved

### Performance Test
1. ✅ Enter 1,000 characters
2. ✅ Monitor character counter
3. ✅ Test RAG performance (should be similar)
4. ✅ Enter 5,000 characters
5. ✅ Test again (small impact expected)

---

## Support

**Issue: Context not saving?**  
- Check for error notifications
- Try clicking "Save Context" again
- Refresh page and verify persistence

**Issue: Context not affecting responses?**  
- Verify context is saved (check character count)
- Ensure RAG module is reading context
- Test with different RAG queries
- Check backend implementation includes context

**Issue: Textarea not working?**  
- Try different browser
- Clear browser cache
- Disable browser extensions
- Check browser console for errors

---

## Next Steps

1. ✅ Test AI Context tab in Settings
2. ✅ Enter appropriate context for your organization
3. ✅ Save and verify persistence
4. ✅ Test RAG queries with context
5. ✅ Monitor response quality improvements
6. ✅ Refine context based on results
7. ✅ Train team on usage

---

**Status:** Ready to use! 🚀

All setup complete. Admins can now use Settings → AI Context to manage system prompts for RAG responses.
