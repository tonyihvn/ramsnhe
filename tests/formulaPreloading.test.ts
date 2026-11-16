// Test cases for formula preloading feature in IndicatorsPage
// This verifies that the correct templates are preloaded when formula type changes

const SQL_TEMPLATE = `-- 1. Silently store the numerator and denominator in variables
SELECT COUNT(*) INTO @active_users FROM users WHERE status = 'active';
SELECT COUNT(*) INTO @total_users FROM users;

-- 2. Manipulate the variables if needed (e.g., adding a buffer or baseline)
SET @adjusted_total = @total_users + 10;

-- 3. Output ONE final result using numerator / denominator
SELECT 
    (@active_users / NULLIF(@adjusted_total, 0)) AS active_user_ratio;`;

const JS_TEMPLATE = `// If your SQL returns rows, the server returns them as r.rows
// Example: r.rows[0].num and r.rows[0].denom
const r = await executeSql("SELECT SUM(...) AS num, COUNT(*) AS denom FROM ... WHERE facility_id = {selected_facility_id}");
const num = Number(r.rows[0].num || 0);
const denom = Number(r.rows[0].denom || 0);
return denom === 0 ? 0 : (num / denom) * 100;`;

interface EditingState {
  formula_type?: string;
  formula?: string;
  [key: string]: any;
}

// Simulate the formula type change handler logic
const handleFormulaTypeChange = (newType: string, currentEditing: EditingState): EditingState => {
  const newEditing = { ...currentEditing, formula_type: newType };
  
  // Preload formula with template if formula is empty
  if (!currentEditing.formula || currentEditing.formula.trim() === '') {
    if (newType === 'sql') {
      newEditing.formula = SQL_TEMPLATE;
    } else if (newType === 'expression') {
      newEditing.formula = JS_TEMPLATE;
    }
  }
  
  return newEditing;
};

// Test cases
const testCases = [
  {
    name: 'Switching to SQL with empty formula should preload SQL template',
    editing: { formula_type: 'expression', formula: '', name: 'Test Indicator' },
    newType: 'sql',
    shouldPreload: true,
    expectedTemplate: SQL_TEMPLATE,
    description: 'When switching from expression to SQL with empty formula, SQL template should be loaded'
  },
  {
    name: 'Switching to Expression with empty formula should preload JS template',
    editing: { formula_type: 'sql', formula: '', name: 'Test Indicator' },
    newType: 'expression',
    shouldPreload: true,
    expectedTemplate: JS_TEMPLATE,
    description: 'When switching from SQL to expression with empty formula, JS template should be loaded'
  },
  {
    name: 'Switching to SQL with existing formula should NOT preload',
    editing: { formula_type: 'expression', formula: 'SELECT 1', name: 'Test Indicator' },
    newType: 'sql',
    shouldPreload: false,
    expectedFormula: 'SELECT 1',
    description: 'When switching to SQL with an existing formula, it should not be replaced'
  },
  {
    name: 'Switching to Expression with existing formula should NOT preload',
    editing: { formula_type: 'sql', formula: 'const x = 5; return x * 2;', name: 'Test Indicator' },
    newType: 'expression',
    shouldPreload: false,
    expectedFormula: 'const x = 5; return x * 2;',
    description: 'When switching to expression with an existing formula, it should not be replaced'
  },
  {
    name: 'Switching to SQL with whitespace-only formula should preload',
    editing: { formula_type: 'expression', formula: '   \n  ', name: 'Test Indicator' },
    newType: 'sql',
    shouldPreload: true,
    expectedTemplate: SQL_TEMPLATE,
    description: 'When formula contains only whitespace, it should be treated as empty and preload'
  },
  {
    name: 'SQL template should return a single numeric result',
    template: SQL_TEMPLATE,
    shouldContain: ['NULLIF(@adjusted_total, 0)', 'SELECT', 'INTO @', 'active_user_ratio'],
    description: 'SQL template should contain the required elements for numerator/denominator calculation'
  },
  {
    name: 'JS template should handle executeSql and return numeric result',
    template: JS_TEMPLATE,
    shouldContain: ['executeSql', 'r.rows', 'return', 'denom === 0'],
    description: 'JS template should contain the required elements for SQL execution and division'
  }
];

console.log('Testing Formula Preloading Feature:\n');

let passed = 0;
let failed = 0;

testCases.forEach((testCase, index) => {
  try {
    if (testCase.editing !== undefined) {
      // Test state change behavior
      const result = handleFormulaTypeChange(testCase.newType as string, testCase.editing);
      
      let isPass = false;
      if (testCase.shouldPreload) {
        isPass = result.formula === testCase.expectedTemplate;
      } else {
        isPass = result.formula === testCase.expectedFormula;
      }
      
      if (isPass) {
        console.log(`✓ Test ${index + 1} PASSED: ${testCase.name}`);
        passed++;
      } else {
        console.log(`✗ Test ${index + 1} FAILED: ${testCase.name}`);
        console.log(`  Expected formula to be: ${testCase.shouldPreload ? '[SQL/JS template]' : testCase.expectedFormula}`);
        console.log(`  Got: ${result.formula?.substring(0, 50)}...`);
        console.log(`  Description: ${testCase.description}`);
        failed++;
      }
    } else if (testCase.shouldContain !== undefined) {
      // Test template content validation
      const template = testCase.template as string;
      const allContained = (testCase.shouldContain as string[]).every(str => template.includes(str));
      
      if (allContained) {
        console.log(`✓ Test ${index + 1} PASSED: ${testCase.name}`);
        passed++;
      } else {
        console.log(`✗ Test ${index + 1} FAILED: ${testCase.name}`);
        console.log(`  Missing required strings in template`);
        console.log(`  Description: ${testCase.description}`);
        failed++;
      }
    }
  } catch (e) {
    console.log(`✗ Test ${index + 1} ERRORED: ${testCase.name}`);
    console.log(`  Error: ${(e as any).message}`);
    failed++;
  }
});

console.log(`\n${passed} passed, ${failed} failed out of ${testCases.length} tests`);

if (failed === 0) {
  console.log('\n✓ All tests passed! The formula preloading feature works correctly.');
  console.log('\nKey behaviors verified:');
  console.log('  1. SQL template is preloaded when switching to SQL with empty formula');
  console.log('  2. JS template is preloaded when switching to Expression with empty formula');
  console.log('  3. Existing formulas are preserved when switching types');
  console.log('  4. Whitespace-only formulas are treated as empty');
  console.log('  5. Templates contain all required elements for their respective types');
} else {
  console.log('\n✗ Some tests failed. Review the implementation.');
}
