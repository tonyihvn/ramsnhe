# Formula Preloading Feature for Indicators Page

## Overview
The Indicators page now automatically preloads formula templates when users select a formula type. This feature makes it easier for users to create new indicators by providing ready-to-use templates.

## Implementation Details

### Templates

#### SQL Template (for "SQL (SELECT)" type)
When a user selects "SQL (SELECT)" as the formula type with an empty formula field, the following template is preloaded:

```sql
-- 1. Silently store the numerator and denominator in variables
SELECT COUNT(*) INTO @active_users FROM users WHERE status = 'active';
SELECT COUNT(*) INTO @total_users FROM users;

-- 2. Manipulate the variables if needed (e.g., adding a buffer or baseline)
SET @adjusted_total = @total_users + 10;

-- 3. Output ONE final result using numerator / denominator
SELECT 
    (@active_users / NULLIF(@adjusted_total, 0)) AS active_user_ratio;
```

**Key Features:**
- Uses variables to store numerator and denominator
- Allows manipulation of variables before final calculation
- Returns a single numeric result
- Uses `NULLIF` to handle division by zero
- Includes comments explaining each step

#### JavaScript Template (for "Expression (JS-like)" type)
When a user selects "Expression (JS-like)" as the formula type with an empty formula field, the following template is preloaded:

```javascript
// If your SQL returns rows, the server returns them as r.rows
// Example: r.rows[0].num and r.rows[0].denom
const r = await executeSql("SELECT SUM(...) AS num, COUNT(*) AS denom FROM ... WHERE facility_id = {selected_facility_id}");
const num = Number(r.rows[0].num || 0);
const denom = Number(r.rows[0].denom || 0);
return denom === 0 ? 0 : (num / denom) * 100;
```

**Key Features:**
- Uses `executeSql` function to run SQL queries
- Shows how to access results via `r.rows`
- Demonstrates handling of null/undefined values
- Includes division by zero protection
- Calculates percentage (multiply by 100)
- Supports dynamic `{selected_facility_id}` placeholder

## Behavior

### When Preloading Occurs
- User changes the formula type dropdown
- AND the formula field is currently empty or contains only whitespace

### When Preloading Does NOT Occur
- User already has a formula written in the formula field
- Existing formulas are preserved to prevent accidental data loss

### User Flow

1. User clicks "New Indicator" to create a new indicator
2. User selects a formula type from the dropdown:
   - If "SQL (SELECT)" is selected → SQL template is preloaded
   - If "Expression (JS-like)" is selected → JavaScript template is preloaded
3. User can:
   - Edit the template directly
   - Use helper buttons to insert placeholders like `{selected_facility_id}`
   - Use the DB Schema Browser to insert table/column names
   - Delete and write their own formula from scratch

## Important Notes

### SQL Formula Return Value
The SQL formula **must return exactly ONE numeric value**. The system only captures the last SELECT statement's result. For example:

```sql
-- ✓ CORRECT - Returns one numeric value
SELECT COUNT(*) INTO @count FROM table;
SELECT @count;

-- ✗ INCORRECT - Returns multiple rows
SELECT COUNT(*) FROM table;
SELECT COUNT(*) FROM another_table;
```

### JavaScript Formula Return Value
The JavaScript formula must return a numeric value. The final `return` statement determines the output. For example:

```javascript
// ✓ CORRECT - Returns numeric value
return num / denom;

// ✗ INCORRECT - Returns non-numeric value
return "The ratio is " + (num / denom);
```

### Placeholders Available
Both SQL and JavaScript templates can use these placeholders:
- `{selected_facility_id}` - Current facility ID
- `{selected_state}` - Current state
- `{selected_lga}` - Current LGA
- `{selected_user_id}` - Current user ID

These are replaced at runtime with actual values.

## Testing

A comprehensive test suite is included in `tests/formulaPreloading.test.ts` that verifies:

1. SQL template is preloaded when switching to SQL with empty formula
2. JS template is preloaded when switching to Expression with empty formula
3. Existing formulas are preserved when switching types
4. Whitespace-only formulas are treated as empty
5. Templates contain all required elements

Run tests with:
```bash
node tests/formulaPreloading.test.ts
```

## Related Files

- **Implementation:** `pages/IndicatorsPage.tsx`
  - Lines 73-95: Template definitions
  - Lines 304-327: Formula type change handler
  
- **Tests:** `tests/formulaPreloading.test.ts`

## Future Enhancements

Possible improvements could include:
- Additional template options for common calculations
- Template selection UI (choose from multiple SQL/JS templates)
- Save custom templates for reuse
- Quick template snippets for common patterns (sum, average, ratio, etc.)
- Syntax highlighting in formula editor
- Real-time formula validation and error reporting
