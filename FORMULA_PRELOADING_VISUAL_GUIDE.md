# Formula Preloading Feature - Visual Guide

## User Experience

### Scenario 1: Creating a New SQL Indicator

**Step 1: Create New Indicator**
```
[New Indicator] button clicked
↓
Form appears with empty fields
```

**Step 2: Select SQL Formula Type**
```
Formula Type dropdown:
  ○ Expression (JS-like)
  ◉ SQL (SELECT)         ← User selects this
```

**Step 3: Formula Field Auto-Populated**
```
Formula text area now shows:
──────────────────────────────────────────
-- 1. Silently store the numerator and denominator in variables
SELECT COUNT(*) INTO @active_users FROM users WHERE status = 'active';
SELECT COUNT(*) INTO @total_users FROM users;

-- 2. Manipulate the variables if needed (e.g., adding a buffer or baseline)
SET @adjusted_total = @total_users + 10;

-- 3. Output ONE final result using numerator / denominator
SELECT 
    (@active_users / NULLIF(@adjusted_total, 0)) AS active_user_ratio;
──────────────────────────────────────────
```

**Step 4: User Edits Template**
- User modifies the SQL to match their actual table names and logic
- Example modification:
```sql
-- Original
SELECT COUNT(*) INTO @active_users FROM users WHERE status = 'active';

-- Modified
SELECT COUNT(*) INTO @active_users FROM participants WHERE completion_date IS NOT NULL;
```

---

### Scenario 2: Creating a New Expression (JS-like) Indicator

**Step 1: Create New Indicator**
```
[New Indicator] button clicked
↓
Form appears with empty fields
```

**Step 2: Select Expression Formula Type**
```
Formula Type dropdown:
  ◉ Expression (JS-like)  ← User selects this
  ○ SQL (SELECT)
```

**Step 3: Formula Field Auto-Populated**
```
Formula text area now shows:
──────────────────────────────────────────
// If your SQL returns rows, the server returns them as r.rows
// Example: r.rows[0].num and r.rows[0].denom
const r = await executeSql("SELECT SUM(...) AS num, COUNT(*) AS denom FROM ... WHERE facility_id = {selected_facility_id}");
const num = Number(r.rows[0].num || 0);
const denom = Number(r.rows[0].denom || 0);
return denom === 0 ? 0 : (num / denom) * 100;
──────────────────────────────────────────
```

**Step 4: User Edits Template**
- User modifies the SQL query
- User adjusts the calculation logic
- Example modification:
```javascript
const r = await executeSql("SELECT SUM(amount) AS num, COUNT(*) AS denom FROM transactions WHERE status = 'completed' AND facility_id = {selected_facility_id}");
const num = Number(r.rows[0].num || 0);
const denom = Number(r.rows[0].denom || 0);
return denom === 0 ? 0 : num / denom;  // Return actual ratio, not percentage
```

---

### Scenario 3: Editing Existing Indicator (No Preloading)

**Step 1: Edit Existing Indicator**
```
Click [Edit] button on existing indicator
↓
Form appears with existing data
```

**Step 2: Change Formula Type**
```
Original: Formula Type = "SQL (SELECT)", Formula = "SELECT SUM(...) FROM table"
↓
User changes to: Formula Type = "Expression (JS-like)"
↓
Formula field KEEPS existing content (does NOT get replaced with JS template)
```

**Why?** Existing formulas should never be replaced to prevent accidental data loss.

---

## Template Structure

### SQL Template Analysis

```
┌─────────────────────────────────────────────────────────────────┐
│ SQL_TEMPLATE Structure                                          │
├─────────────────────────────────────────────────────────────────┤
│                                                                  │
│ Part 1: Comments explaining the 3-step process                │
│   └─ // 1. Silently store the numerator...                    │
│   └─ // 2. Manipulate the variables...                        │
│   └─ // 3. Output ONE final result...                         │
│                                                                  │
│ Part 2: Calculate numerator into variable @active_users       │
│   └─ SELECT COUNT(*) INTO @active_users FROM ...              │
│                                                                  │
│ Part 3: Calculate denominator into variable @total_users      │
│   └─ SELECT COUNT(*) INTO @total_users FROM ...               │
│                                                                  │
│ Part 4: Optional manipulation of variables                    │
│   └─ SET @adjusted_total = @total_users + 10;                │
│                                                                  │
│ Part 5: Final output - returns single numeric value           │
│   └─ SELECT (@active_users / NULLIF(@adjusted_total, 0)) AS result;  │
│   └─ Uses NULLIF to prevent division by zero                 │
│                                                                  │
└─────────────────────────────────────────────────────────────────┘
```

**Key Elements:**
- ✓ Comments guide the user
- ✓ Uses variables for clarity
- ✓ Allows manipulation before final calculation
- ✓ Returns ONE value
- ✓ Handles division by zero

### JavaScript Template Analysis

```
┌─────────────────────────────────────────────────────────────────┐
│ JS_TEMPLATE Structure                                           │
├─────────────────────────────────────────────────────────────────┤
│                                                                  │
│ Part 1: Comments explaining the pattern                       │
│   └─ // If your SQL returns rows...                          │
│   └─ // Example: r.rows[0].num and r.rows[0].denom          │
│                                                                  │
│ Part 2: Execute SQL and get results into 'r'                 │
│   └─ const r = await executeSql("SELECT ...");              │
│   └─ Supports {selected_facility_id} placeholder            │
│                                                                  │
│ Part 3: Extract numerator safely                            │
│   └─ const num = Number(r.rows[0].num || 0);               │
│   └─ Handles null/undefined with || 0                       │
│                                                                  │
│ Part 4: Extract denominator safely                          │
│   └─ const denom = Number(r.rows[0].denom || 0);           │
│   └─ Handles null/undefined with || 0                       │
│                                                                  │
│ Part 5: Return final result with safety check               │
│   └─ return denom === 0 ? 0 : (num / denom) * 100;         │
│   └─ Returns 0 if denominator is 0 (prevents Infinity)      │
│   └─ Multiplies by 100 for percentage                       │
│                                                                  │
└─────────────────────────────────────────────────────────────────┘
```

**Key Elements:**
- ✓ Comments explain the pattern
- ✓ Uses await executeSql()
- ✓ Handles null/undefined values
- ✓ Prevents division by zero
- ✓ Converts to percentage (multiply by 100)
- ✓ Returns numeric value

---

## Helper Elements Available

### Placeholder Buttons
Below the formula textarea, these quick-insert buttons are available:

```
{selected_facility_id}  {selected_state}  {selected_lga}  {selected_user_id}
```

**Click any button to insert it at cursor position in the formula**

Example: User clicks `{selected_facility_id}` → Inserts at cursor
```javascript
const r = await executeSql("SELECT SUM(...) AS num FROM ... WHERE facility_id = {selected_facility_id}");
                                                                                      ↑ Inserted here
```

### DB Schema Browser
A collapsible panel on the right shows:
- **Tables List**: All available database tables
- **Columns List**: Columns for the selected table
- **Insert Buttons**: Click to insert `table.column` references

Example: 
```
Click table "users" → Shows columns
  id              Insert
  name            Insert
  email           Insert
```

Click "Insert" next to "email" → Inserts `users.email` at cursor

---

## State Management

### Component State Variables Used

```typescript
const [editing, setEditing] = useState<any | null>(null);
// Stores the current indicator being edited
// Structure: { id?, name, formula, formula_type, ... }

const textareaRef = useRef<HTMLTextAreaElement | null>(null);
// Reference to the formula textarea for cursor manipulation
```

### Formula Type Change Handler

```typescript
onChange={e => {
  const newType = e.target.value;
  const newEditing = { ...editing, formula_type: newType };
  
  // Preload formula with template if formula is empty
  if (!editing.formula || editing.formula.trim() === '') {
    if (newType === 'sql') {
      newEditing.formula = SQL_TEMPLATE;
    } else if (newType === 'expression') {
      newEditing.formula = JS_TEMPLATE;
    }
  }
  
  setEditing(newEditing);
}}
```

**Logic Flow:**
1. User changes dropdown value
2. Create new state object with updated formula_type
3. Check if current formula is empty or whitespace-only
4. If empty: Set formula to appropriate template
5. If not empty: Keep existing formula unchanged
6. Update component state

---

## Best Practices for Users

### Creating SQL Indicators

1. **Start with the template**
   - The template provides a safe, tested pattern
   - Shows how to handle division by zero with NULLIF

2. **Replace table names**
   - Change `users` to your actual table name
   - Update column names in WHERE clauses

3. **Update the condition**
   - Modify `WHERE status = 'active'` to your logic
   - Use actual column names from your schema

4. **Test your formula**
   - Use the test button to verify it returns a number
   - Check error messages if it fails

### Creating Expression (JS-like) Indicators

1. **Start with the template**
   - Shows how to call executeSql properly
   - Demonstrates safe null/undefined handling

2. **Write your SQL query**
   - Replace `SELECT SUM(...) AS num, COUNT(*) AS denom` with your query
   - Ensure column aliases match the JavaScript code (`AS num`, `AS denom`)
   - Use `{selected_facility_id}` for dynamic filtering

3. **Adjust the calculation**
   - The template uses `* 100` for percentage
   - Remove if you want the raw ratio instead
   - Modify the formula as needed

4. **Test your formula**
   - Verify it returns a number
   - Check the test results

### Common Mistakes to Avoid

❌ **Returning multiple rows in SQL**
```sql
-- WRONG - Returns multiple rows
SELECT COUNT(*) FROM users;
SELECT SUM(salary) FROM employees;
```

✓ **Correct - Returns single value**
```sql
-- CORRECT - Last SELECT returns one value
SELECT COUNT(*) INTO @count FROM users;
SELECT @count;
```

❌ **Forgetting to multiply by 100 in percentage calculation**
```javascript
// Returns 0.75 instead of 75%
return num / denom;
```

✓ **Correct - Percentage**
```javascript
// Returns 75 (for 75%)
return (num / denom) * 100;
```

❌ **Missing NULLIF in SQL division**
```sql
-- Will error if @denominator is 0
SELECT @numerator / @denominator;
```

✓ **Correct - Safe division**
```sql
-- Returns NULL if denominator is 0
SELECT @numerator / NULLIF(@denominator, 0);
```
