/**
 * Safely evaluates a conditional expression with the given context variables
 * @param expression - The expression to evaluate (e.g., "dept === 'HR'" or "org_size > 50")
 * @param context - Object containing variable names and values from the form
 * @returns true if expression evaluates to true, false otherwise
 */
export const evaluateCondition = (expression: string | undefined, context: Record<string, any>): boolean => {
  if (!expression || expression.trim() === '') {
    return true; // No condition means show by default
  }

  try {
    // Extract field names that are referenced in the expression
    // but exclude identifiers inside string literals
    const referencedFields = new Set<string>();
    const stringLiteralPattern = /"(?:\\.|[^"\\])*"|'(?:\\.|[^'\\])*'/g;
    
    // Remove all string literals temporarily to avoid extracting identifiers from within them
    let exprWithoutStrings = expression;
    const stringLiterals: string[] = [];
    exprWithoutStrings = exprWithoutStrings.replace(stringLiteralPattern, (match) => {
      stringLiterals.push(match);
      return `__STRING_${stringLiterals.length - 1}__`;
    });
    
    // Now extract field names from the expression without string literals
    const fieldNamePattern = /\b[a-zA-Z_][a-zA-Z0-9_]*\b/g;
    let match;
    while ((match = fieldNamePattern.exec(exprWithoutStrings)) !== null) {
      const fieldName = match[0];
      // Skip JavaScript keywords
      if (!/^(true|false|null|undefined|return|new|typeof|instanceof|in|of|context)$/.test(fieldName)) {
        referencedFields.add(fieldName);
      }
    }
    
    // Build formula with field references using context object notation
    let safeFormula = expression;
    
    // For each referenced field, replace it with context['fieldName']
    for (const field of referencedFields) {
      const regex = new RegExp(`\\b${field.replace(/[.*+?^${}()|[\]\\]/g, '\\$&')}\\b`, 'g');
      safeFormula = safeFormula.replace(regex, (match, offset) => {
        // Don't replace if this match is inside a string literal
        // Check if this position is within a quoted string
        let inString = false;
        let quoteChar = '';
        for (let i = 0; i < offset; i++) {
          if ((expression[i] === '"' || expression[i] === "'") && expression[i - 1] !== '\\') {
            if (!inString) {
              inString = true;
              quoteChar = expression[i];
            } else if (expression[i] === quoteChar) {
              inString = false;
            }
          }
        }
        
        if (inString) {
          return match; // Don't replace if inside a string literal
        }
        return `context['${field}']`;
      });
    }

    // Create function with context object instead of individual parameters
    // eslint-disable-next-line no-new-func
    const evaluateFn = new Function('context', `try { return (${safeFormula}); } catch(e) { return false; }`);
    const result = evaluateFn(context);

    return Boolean(result);
  } catch (error) {
    console.error(`[evaluateCondition] Failed to evaluate: "${expression}"`, (error as any)?.message);
    // If evaluation fails, show the option by default for safety
    return true;
  }
};

/**
 * Filters options based on their showif conditions
 * @param options - Array of options with optional showif property
 * @param context - Form context with field values
 * @returns Filtered array of visible options
 */
export const filterOptionsByCondition = (
  options: Array<{ label: string; value: string; score?: number; showif?: string }>,
  context: Record<string, any>
): Array<{ label: string; value: string; score?: number; showif?: string }> => {
  return options.filter(option => evaluateCondition(option.showif, context));
};
