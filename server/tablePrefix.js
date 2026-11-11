// Table name prefix configuration
// These are the table names used throughout the application
// Using constants here makes it easy to maintain and update table references

// Get the TABLE_PREFIX from environment, defaulting to 'dqai_'
const TABLE_PREFIX = (process.env.TABLE_PREFIX || 'dqai_').toString().trim();

// Helper function to apply prefix to table name
const prefixTable = (tableName) => `${TABLE_PREFIX}${tableName}`;

export const tables = {
  ACTIVITIES: prefixTable('activities'),
  ACTIVITY_REPORTS: prefixTable('activity_reports'),
  ACTIVITY_ROLES: prefixTable('activity_roles'),
  ACTUAL_TABLE_ROWS: prefixTable('actual_table_rows'),
  ACTUAL_TABLES: prefixTable('actual_tables'),
  ANSWERS: prefixTable('answers'),
  API_CONNECTORS: prefixTable('api_connectors'),
  API_INGESTS: prefixTable('api_ingests'),
  AUDIT_BATCHES: prefixTable('audit_batches'),
  AUDIT_EVENTS: prefixTable('audit_events'),
  BUSINESSES: prefixTable('businesses'),
  DATASET_CONTENT: prefixTable('dataset_content'),
  DATASETS: prefixTable('datasets'),
  EMAIL_VERIFICATIONS: prefixTable('email_verifications'),
  FACILITIES: prefixTable('facilities'),
  FEEDBACK_MESSAGES: prefixTable('feedback_messages'),
  FORM_SCHEMAS: prefixTable('form_schemas'),
  INDICATORS: prefixTable('indicators'),
  LANDING_PAGE_CONFIG: prefixTable('landing_page_config'),
  LLM_PROVIDERS: prefixTable('llm_providers'),
  PAGE_PERMISSIONS: prefixTable('page_permissions'),
  PASSWORD_RESETS: prefixTable('password_resets'),
  PERMISSIONS: prefixTable('permissions'),
  PLAN_ASSIGNMENTS: prefixTable('plan_assignments'),
  PLANS: prefixTable('plans'),
  PROGRAMS: prefixTable('programs'),
  QUESTIONS: prefixTable('questions'),
  RAG_CHROMA_IDS: prefixTable('rag_chroma_ids'),
  RAG_SCHEMAS: prefixTable('rag_schemas'),
  REPORT_TEMPLATES: prefixTable('report_templates'),
  REPORTS_POWERBI: prefixTable('reports_powerbi'),
  ROLE_PERMISSIONS: prefixTable('role_permissions'),
  ROLES: prefixTable('roles'),
  SETTINGS: prefixTable('settings'),
  UPLOADED_DOCS: prefixTable('uploaded_docs'),
  USER_APPROVALS: prefixTable('user_approvals'),
  USER_PERMISSIONS: prefixTable('user_permissions'),
  USER_PREFERENCES: prefixTable('user_preferences'),
  USER_ROLES: prefixTable('user_roles'),
  USERS: prefixTable('users')
};
