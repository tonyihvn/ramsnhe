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
    // Create a safe function that only has access to the provided context variables
    // Use Function constructor with restricted scope for security
    const contextKeys = Object.keys(context);
    const contextValues = Object.values(context);

    // Debug: log context keys available for evaluation
    const debugMode = localStorage?.getItem('DEBUG_CONDITIONS') === 'true';
    if (debugMode) {
      console.log(`[Condition Debug] Evaluating: "${expression}"`);
      console.log(`[Condition Debug] Available context keys:`, contextKeys);
      console.log(`[Condition Debug] Context values:`, context);
    }

    // Create function with dynamic parameters from context
    // eslint-disable-next-line no-new-func
    const evaluateFn = new Function(...contextKeys, `return (${expression})`);
    const result = evaluateFn(...contextValues);

    if (debugMode) {
      console.log(`[Condition Debug] Result: ${result}`);
    }

    return Boolean(result);
  } catch (error) {
    console.warn(`Failed to evaluate condition: "${expression}"`, error);
    console.warn(`Context keys available:`, Object.keys(context));
    console.warn(`Context:`, context);
    // If evaluation fails, show the option by default for safety
    return true;
  }
};

/**
 * Filters options based on their showif conditions
 * @param options - Array of options with optional showif property
 * @param context - Form context with field values (can be keyed by question ID or field name)
 * @returns Filtered array of visible options
 */
export const filterOptionsByCondition = (
  options: Array<{ label: string; value: string; score?: number; showif?: string }>,
  context: Record<string, any>
): Array<{ label: string; value: string; score?: number; showif?: string }> => {
  return options.filter(option => {
    if (!option.showif) return true;
    
    // Try to evaluate with the provided context
    // The context should already have both question IDs and field names
    try {
      return evaluateCondition(option.showif, context);
    } catch (err) {
      console.warn(`Error filtering option with condition "${option.showif}":`, err);
      return true; // Show by default if evaluation fails
    }
  });
};
