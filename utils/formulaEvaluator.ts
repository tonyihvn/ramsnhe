/**
 * Formula Evaluator Utility
 * Handles evaluation of formulas with cell references across multiple documents
 * 
 * Cell Reference Format:
 * - Same document: report1_H_H1 (reportId_abbreviation_cellLocation)
 * - Cross-document: report1.doc2_H_H1 (reportId.docId_abbreviation_cellLocation)
 */

export interface CellValue {
    value: any;
    refvalue: string;
}

export interface DocumentData {
    id?: number | string;
    reportId?: number | string;
    report_id?: number | string;
    file_content?: any[];
    formulas?: Record<string, any>;
    filename?: string;
    fileName?: string;
}

export interface FormulasContext {
    [docId: string]: {
        formulas: Record<string, any>;
        fileContent: any[];
        filename: string;
    };
}

/**
 * Resolve a cell reference to its value
 * Format: reportId_abbreviation_cellLocation or reportId.docId_abbreviation_cellLocation
 */
export const resolveCellReferenceFromContext = (
    cellRef: string,
    context: FormulasContext
): any => {
    try {
        // Parse cell reference: reportId[.docId]_abbr_LETTER+NUMBER
        const match = cellRef.match(/^(report\d+(?:\.\d+)?)_[A-Z]{1,3}_([A-Z]+)(\d+)$/);
        if (!match) {
            return undefined;
        }

        const [, docIdentifier, letters, rowStr] = match;
        const rowIndex = Number(rowStr) - 1;

        // Convert letters to column index (A=0, B=1, ..., Z=25, AA=26, etc.)
        let colIndex = 0;
        for (let i = 0; i < letters.length; i++) {
            colIndex = colIndex * 26 + (letters.charCodeAt(i) - 64);
        }
        colIndex--;

        // Get the document data
        const docData = context[docIdentifier];
        if (!docData || !docData.fileContent) {
            return undefined;
        }

        const rows = Array.isArray(docData.fileContent) ? docData.fileContent : [];
        if (rowIndex < 0 || rowIndex >= rows.length) {
            return undefined;
        }

        const row = rows[rowIndex];
        const keys = Object.keys(row || {});
        if (colIndex < 0 || colIndex >= keys.length) {
            return undefined;
        }

        const value = row[keys[colIndex]];

        // Convert to number if it's a numeric string
        if (typeof value === 'string') {
            const numValue = Number(value);
            const result = isNaN(numValue) ? value : numValue;
            return result;
        }
        return value;
    } catch (e) {
        console.error('Error resolving cell reference:', cellRef, e);
        return undefined;
    }
};

/**
 * Evaluate a formula with cell references from multiple documents
 * Returns both the calculated value and a reference value showing substitutions
 */
export const evaluateFormulaWithContext = (
    expression: string,
    context: FormulasContext
): CellValue => {
    try {
        // Pattern for cell references: reportId[.docId]_abbr_LETTER+NUMBER
        const cellRefPattern = /report\d+(?:\.\d+)?_[A-Z]{1,3}_[A-Z]+\d+/g;
        const matches = expression.match(cellRefPattern) || [];
        const resolvedContext: Record<string, any> = {};
        const refMap: Record<string, any> = {};

        for (const cellRef of matches) {
            const resolvedValue = resolveCellReferenceFromContext(cellRef, context);
            resolvedContext[cellRef] = resolvedValue;
            refMap[cellRef] = resolvedValue;
        }

        // If the expression is just a single cell reference
        if (matches.length === 1 && matches[0] === expression.trim()) {
            const value = resolvedContext[matches[0]];
            return {
                value: value,
                refvalue: `${value}`
            };
        }

        // Evaluate the expression
        const func = new Function(
            ...Object.keys(resolvedContext),
            `return ${expression}`
        );
        const result = func(...Object.values(resolvedContext));

        // Handle NaN
        if (typeof result === 'number' && isNaN(result)) {
            return {
                value: null,
                refvalue: 'NaN'
            };
        }

        // Create refvalue by replacing cell references with their values
        let refvalue = expression;
        for (const [cellRef, cellValue] of Object.entries(refMap)) {
            const escapedRef = cellRef.replace(/[.*+?^${}()|[\]\\]/g, '\\$&');
            const replacement = String(cellValue);
            refvalue = refvalue.replace(new RegExp(escapedRef, 'g'), replacement);
        }

        return {
            value: result,
            refvalue: refvalue
        };
    } catch (e) {
        console.error('Expression evaluation error:', e, 'Expression:', expression);
        return {
            value: null,
            refvalue: 'Error'
        };
    }
};

/**
 * Build a formulas context from multiple uploaded documents
 * Used to enable cross-document cell references in formulas
 */
export const buildFormulasContext = (
    documents: DocumentData[],
    reportId?: number | string
): FormulasContext => {
    const context: FormulasContext = {};

    for (const doc of documents) {
        const docId = doc.id || doc.reportId || doc.report_id;
        const filename = doc.filename || doc.fileName || `document_${docId}`;

        if (reportId) {
            // Format: report{reportId}.doc{docId}
            const key = `report${reportId}.${docId}`;
            context[key] = {
                formulas: doc.formulas || {},
                fileContent: Array.isArray(doc.file_content) ? doc.file_content : [],
                filename: filename
            };
        } else {
            // Direct reference by doc ID
            const key = String(docId);
            context[key] = {
                formulas: doc.formulas || {},
                fileContent: Array.isArray(doc.file_content) ? doc.file_content : [],
                filename: filename
            };
        }
    }

    return context;
};

/**
 * Resolve field score references in formula
 * Format: fieldname->score
 * Returns the score value from field answers that have {value: ..., score: ...} structure
 */
export const resolveScoreReferences = (
    formula: string,
    fieldMap: Record<string, any>
): string => {
    // Pattern to match fieldname->score references
    const scoreRefPattern = /([a-z_][a-z0-9_]*)\s*->\s*score/gi;
    
    let processedFormula = formula;
    let match;
    
    // Create a regex to track matches
    const regex = new RegExp(scoreRefPattern);
    
    while ((match = regex.exec(formula)) !== null) {
        const fieldName = match[1];
        const fieldValue = fieldMap[fieldName];
        
        // Extract score from field value
        let scoreValue = 'null';
        if (fieldValue && typeof fieldValue === 'object' && 'score' in fieldValue) {
            scoreValue = String(fieldValue.score);
        } else if (typeof fieldValue === 'number') {
            // If field value itself is a number, treat it as the score
            scoreValue = String(fieldValue);
        }
        
        // Replace the reference with the score value
        const fullMatch = match[0];
        const escapedMatch = fullMatch.replace(/[.*+?^${}()|[\]\\]/g, '\\$&');
        processedFormula = processedFormula.replace(new RegExp(escapedMatch, 'g'), scoreValue);
    }
    
    return processedFormula;
};

/**
 * Extract field names from formula to build complete variable map
 * Handles both regular field names and score references
 */
export const extractFieldNamesFromFormula = (formula: string): Set<string> => {
    const fieldNames = new Set<string>();
    
    // Match regular field names: word characters that aren't reserved keywords
    const identifierPattern = /\b([a-zA-Z_][a-zA-Z0-9_]*)\b/g;
    const reserved = new Set(['true', 'false', 'null', 'undefined', 'age', 'parseDate', 'diffDays', 'try', 'return', 'catch', 'e', 'if', 'else', 'function']);
    
    let match;
    const regex = new RegExp(identifierPattern);
    while ((match = regex.exec(formula)) !== null) {
        const name = match[1];
        if (!reserved.has(name)) {
            fieldNames.add(name);
        }
    }
    
    return fieldNames;
};

/**
 * Evaluate formulas for computed fields in forms
 * This integrates with existing field values and cell references
 * Supports score references via fieldname->score syntax
 */
export const evaluateFormulasForForm = (
    formula: string,
    fieldMap: Record<string, any>,
    formulasContext: FormulasContext
): any => {
    if (!formula || typeof formula !== 'string') return null;

    try {
        let processedFormula = formula;

        // First, resolve score references (fieldname->score)
        processedFormula = resolveScoreReferences(processedFormula, fieldMap);

        // Then, resolve cell references using the context
        const cellRefPattern = /report\d+(?:\.\d+)?_[A-Z]{1,3}_[A-Z]+\d+/g;
        const cellMatches = processedFormula.match(cellRefPattern) || [];

        for (const cellRef of cellMatches) {
            const cellValue = resolveCellReferenceFromContext(cellRef, formulasContext);
            if (cellValue !== undefined && cellValue !== null) {
                const replacement: string = typeof cellValue === 'number' ? String(cellValue) : JSON.stringify(cellValue);
                processedFormula = processedFormula.replace(
                    new RegExp('\\b' + cellRef.replace(/[.*+?^${}()|[\]\\]/g, '\\$&') + '\\b', 'g'),
                    replacement as any
                );
            }
        }

        // Extract field names from processed formula
        const fieldNames = Array.from(extractFieldNamesFromFormula(processedFormula));
        
        // Build arguments for function execution
        const args = fieldNames.map(n => {
            const v = fieldMap[n];
            // Extract value from {value: ..., score: ...} objects
            let actualValue = v;
            if (v && typeof v === 'object' && 'value' in v && !('score' in v && Object.keys(v).length === 2)) {
                actualValue = v.value;
            }
            // Try to coerce numeric strings to numbers
            if (typeof actualValue === 'string' && /^-?\d+(?:\.\d+)?$/.test(actualValue)) return Number(actualValue);
            return actualValue;
        });

        // Helper functions for date calculations
        const age = (dob: any) => {
            if (!dob) return null;
            const birth = new Date(dob);
            const today = new Date();
            let years = today.getFullYear() - birth.getFullYear();
            const monthDiff = today.getMonth() - birth.getMonth();
            if (monthDiff < 0 || (monthDiff === 0 && today.getDate() < birth.getDate())) {
                years--;
            }
            return years;
        };

        const parseDate = (dateStr: any) => {
            if (!dateStr) return null;
            return new Date(dateStr);
        };

        const diffDays = (date1: any, date2: any) => {
            if (!date1 || !date2) return null;
            const d1 = new Date(date1);
            const d2 = new Date(date2);
            const diffTime = Math.abs(d2.getTime() - d1.getTime());
            return Math.ceil(diffTime / (1000 * 60 * 60 * 24));
        };

        const fn = new Function(
            ...fieldNames,
            'age',
            'parseDate',
            'diffDays',
            `try { return ${processedFormula}; } catch(e){ return null; }`
        );

        return fn(...args, age, parseDate, diffDays);
    } catch (err) {
        console.error('Error evaluating formula', formula, err);
        return null;
    }
};
