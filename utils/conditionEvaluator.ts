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
    // Extract all variable names from the expression using a regex
    // Matches identifiers that are not quoted and not part of property access
    const variablePattern = /\b([a-zA-Z_$][a-zA-Z0-9_$]*)\b(?!['")\].])/g;
    const variableSet = new Set<string>();
    let match;
    while ((match = variablePattern.exec(expression)) !== null) {
      const varName = match[1];
      // Skip JavaScript keywords
      const keywords = new Set(['true', 'false', 'null', 'undefined', 'return', 'new', 'instanceof', 'typeof', 'void', 'delete', 'in', 'of', 'and', 'or', 'not', 'if', 'else', 'for', 'while', 'do', 'switch', 'case', 'break', 'continue', 'try', 'catch', 'finally', 'throw']);
      if (!keywords.has(varName)) {
        variableSet.add(varName);
      }
    }

    // Build variable declarations for all found variables, initializing undefined ones to undefined
    const variableDeclarations = Array.from(variableSet)
      .map(varName => `const ${varName} = (typeof __ctx !== 'undefined' && __ctx.hasOwnProperty('${varName}')) ? __ctx['${varName}'] : undefined;`)
      .join('\n');

    // eslint-disable-next-line no-new-func
    const evaluateFn = new Function('__ctx', `
      ${variableDeclarations}
      return (${expression});
    `);

    const result = evaluateFn(context || {});
    
    // Debug logging: always log for visibility
    console.log(`[CONDITION] "${expression}" → ${result} | Context: ${JSON.stringify(context)}`);
    
    return Boolean(result);
  } catch (error) {
    // Suppress the warning for ReferenceError about undefined variables
    // and return true (show by default) for safety
    if (error instanceof ReferenceError) {
      // Silent fail - just return true to show the option by default
      return true;
    }
    // Only log non-ReferenceError exceptions
    console.debug(`Condition evaluation warning: "${expression}"`, error);
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
  if (options && options.length > 0) {
    const hasConditions = options.some(o => o.showif);
    if (hasConditions) {
      console.log(`[FILTER_OPTIONS] Filtering ${options.length} options with context:`, context);
    }
  }
  return options.filter(option => evaluateCondition(option.showif, context));
};
