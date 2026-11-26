# Questions Dropdown Fix - Interactive Stats Settings Modal

## Problem
The questions were not showing in the question dropdown on the Interactive Stats Settings Modal. The dropdown was showing "Choose a question..." but no options appeared, and the stats card displayed "Unknown" for question names.

## Root Causes Identified & Fixed

### 1. **API Response Wrapping** 
- The `/api/questions?activityId=...` endpoint might return data wrapped in an object (e.g., `{ data: [...] }` or `{ questions: [...] }`) instead of a plain array
- **Fix**: Updated the API response handler to unwrap the data if needed:
  ```typescript
  let questionsData = await qRes.json() || [];
  if (questionsData && typeof questionsData === 'object' && !Array.isArray(questionsData)) {
    questionsData = questionsData.data || questionsData.questions || [];
  }
  if (!Array.isArray(questionsData)) questionsData = [];
  ```

### 2. **Missing Field Name Fallback**
- The question object might have different field names (`question_text`, `text`, `name`) depending on the API response
- **Fix**: Added fallback chain for all question display locations:
  ```typescript
  q?.question_text || q?.text || q?.name || `Question ${q.id}`
  ```

### 3. **Added Diagnostic Logging**
- Added console.log to confirm when questions are successfully loaded
- Existing console.warn for empty questions array helps with debugging

## Files Modified

### C:\Users\Ogochukwu\Desktop\PROJECTS\REACTJS\oneapp\pages\ReportViewPage.tsx

#### Change 1: API Response Handler (lines ~678-695)
**Before:**
```typescript
if (qRes.ok) {
  const questionsData = await qRes.json() || [];
  if (questionsData.length === 0) {
    console.warn(`⚠️ NO QUESTIONS FOUND...`);
  }
  if (questionsData.length > 0) {
    // Sample question structure noted
  }
  setQuestions(questionsData);
}
```

**After:**
```typescript
if (qRes.ok) {
  let questionsData = await qRes.json() || [];
  // Handle both array response and wrapped response (e.g., { data: [...] })
  if (questionsData && typeof questionsData === 'object' && !Array.isArray(questionsData)) {
    questionsData = questionsData.data || questionsData.questions || [];
  }
  if (!Array.isArray(questionsData)) questionsData = [];
  
  if (questionsData.length === 0) {
    console.warn(`⚠️ NO QUESTIONS FOUND...`);
  } else {
    console.log(`✓ Loaded ${questionsData.length} questions for activity_id=${jr.activity_id}`);
  }
  setQuestions(questionsData);
}
```

#### Change 2: Main Question Dropdown (line ~3581)
**Before:**
```typescript
{questions.map((q: any) => (
  <option key={q.id} value={q.id}>{q.question_text}</option>
))}
```

**After:**
```typescript
{questions.map((q: any) => (
  <option key={q.id} value={q.id}>{q.question_text || q.text || q.name || `Question ${q.id}`}</option>
))}
```

#### Change 3: WHERE Clause Question Dropdown (line ~3610)
**Before:**
```typescript
{questions.map((q: any) => (
  <option key={q.id} value={q.id}>{q.question_text}</option>
))}
```

**After:**
```typescript
{questions.map((q: any) => (
  <option key={q.id} value={q.id}>{q.question_text || q.text || q.name || `Question ${q.id}`}</option>
))}
```

#### Change 4: Stats Card Display (line ~1479 & ~1484)
**Before:**
```typescript
<div className="text-xs text-gray-500 mt-1 line-clamp-2">{q?.question_text || 'Unknown'}</div>
{stat.aggregateType === 'count' && stat.conditions.length > 0 && (
  <div className="text-xs text-gray-500 mt-2">
    WHERE {stat.conditions.map((c, cIdx) => {
      const cq = questions.find((qq: any) => String(qq.id) === c.questionId);
      return `${cIdx > 0 ? ' AND ' : ''}${cq?.question_text || c.questionId} ${c.operator} "${c.value}"`;
    }).join('')}
  </div>
)}
```

**After:**
```typescript
<div className="text-xs text-gray-500 mt-1 line-clamp-2">{q?.question_text || q?.text || q?.name || `Question ${stat.questionId}`}</div>
{stat.aggregateType === 'count' && stat.conditions.length > 0 && (
  <div className="text-xs text-gray-500 mt-2">
    WHERE {stat.conditions.map((c, cIdx) => {
      const cq = questions.find((qq: any) => String(qq.id) === c.questionId);
      return `${cIdx > 0 ? ' AND ' : ''}${cq?.question_text || cq?.text || cq?.name || c.questionId} ${c.operator} "${c.value}"`;
    }).join('')}
  </div>
)}
```

## Testing Instructions

### 1. **Verify Questions Load**
1. Navigate to `/reports/{id}` page
2. Open browser DevTools (F12)
3. Look for console messages:
   - If successful: `✓ Loaded X questions for activity_id=...`
   - If error: `❌ Questions API failed:` with status code
   - If empty: `⚠️ NO QUESTIONS FOUND for activity_id=...`

### 2. **Test Question Dropdown in Modal**
1. Click the settings gear icon on the Interactive Stats card
2. The "Select Question" dropdown should now show:
   - List of available questions with their text/name
   - If still empty, check console for "NO QUESTIONS FOUND" warning

### 3. **Test Question Display in Stats Card**
1. Create an interactive stat (select a question and aggregate type)
2. Click "Save"
3. The stats card should display the question name (not "Unknown")

### 4. **Test WHERE Clause Questions** (if using COUNT aggregate)
1. Create a COUNT stat with conditions
2. Add WHERE clauses
3. The question names in WHERE conditions should display correctly (not question IDs)

## Fallback Behavior

If questions fail to load or have missing fields, the UI will:
- **In dropdown**: Still show options with fallback names like "Question 123"
- **In stats card**: Display "Question {id}" instead of "Unknown"
- **In WHERE clause**: Display question ID if name is missing

## Debugging

If questions still don't appear:

1. **Check API Response**: 
   - Open Network tab in DevTools
   - Look for `/api/questions?activityId=...` request
   - Check if response is array or wrapped object

2. **Check Question Fields**:
   - In Network tab, examine the response body
   - Verify field names match one of: `question_text`, `text`, `name`

3. **Check Activity ID**:
   - Verify the report's `activity_id` is correct
   - Confirm that activity has questions in the database

## Notes
- Changes are backward-compatible with existing interactive stats configurations
- No database migrations needed
- All changes are purely UI/data-handling improvements
- Fallback logic ensures graceful degradation if data is missing
