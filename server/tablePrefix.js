/**
 * Table Prefix Utility
 * Dynamically generates table names using the TABLE_PREFIX environment variable
 * Default prefix: 'dqai_'
 */

// Get the current table prefix (evaluate at runtime, not at import time)
function getPrefix() {
    return (process.env.TABLE_PREFIX || 'dqai_').toString().trim();
}

// Use a Proxy to make table names dynamic at runtime
export const tables = new Proxy({}, {
    get(target, prop) {
        const prefix = getPrefix();
        const tableNames = {
            USERS: 'users',
            PROGRAMS: 'programs',
            FACILITIES: 'facilities',
            ACTIVITIES: 'activities',
            ACTIVITY_REPORTS: 'activity_reports',
            QUESTIONS: 'questions',
            ANSWERS: 'answers',
            UPLOADED_DOCS: 'uploaded_docs',
            DATASETS: 'datasets',
            DATASET_CONTENT: 'dataset_content',
            REPORT_TEMPLATES: 'report_templates',
            SETTINGS: 'settings',
            BUSINESSES: 'businesses',
            LANDING_PAGE_CONFIG: 'landing_page_config',
            FEEDBACK_MESSAGES: 'feedback_messages',
            AUDIT_LOGS: 'audit_logs',
            USER_APPROVALS: 'user_approvals',
            PAGE_PERMISSIONS: 'page_permissions',
            FORM_SCHEMAS: 'form_schemas',
            RAG_SCHEMAS: 'rag_schemas',
            LLM_PROVIDERS: 'llm_providers',
            PLANS: 'plans',
            PLAN_ASSIGNMENTS: 'plan_assignments',
            REPORTS_POWERBI: 'reports_powerbi',
            API_CONNECTORS: 'api_connectors',
            API_INGESTS: 'api_ingests',
            ROLES: 'roles',
            PERMISSIONS: 'permissions',
            ROLE_PERMISSIONS: 'role_permissions',
            USER_ROLES: 'user_roles',
            RAG_CHROMA_IDS: 'rag_chroma_ids',
            AUDIT_BATCHES: 'audit_batches',
            EMAIL_VERIFICATIONS: 'email_verifications',
            INDICATORS: 'indicators',
            PASSWORD_RESETS: 'password_resets',
            AUDIT_EVENTS: 'audit_events',
        };
        
        if (tableNames[prop]) {
            return `${prefix}${tableNames[prop]}`;
        }
        return target[prop];
    }
});

/**
 * Get table name with prefix
 * @param {string} tableName - The base table name (without prefix)
 * @returns {string} - The full table name with prefix
 */
export function getTableName(tableName) {
    const prefix = getPrefix();
    return `${prefix}${tableName}`;
}

/**
 * Get the current table prefix
 * @returns {string} - The TABLE_PREFIX environment variable value
 */
export function getTablePrefix() {
    return getPrefix();
}

export default {
    tables,
    getTableName,
    getTablePrefix,
    getPrefix,
};
