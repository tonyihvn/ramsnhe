import fs from 'fs';

const files = [
    'server/index.js',
    'server/superAdminRoutes.js'
];

const tableMap = {
    'dqai_answers': '${tables.ANSWERS}',
    'dqai_users': '${tables.USERS}',
    'dqai_questions': '${tables.QUESTIONS}',
    'dqai_activity_reports': '${tables.ACTIVITY_REPORTS}',
    'dqai_page_permissions': '${tables.PAGE_PERMISSIONS}',
    'dqai_programs': '${tables.PROGRAMS}',
    'dqai_activities': '${tables.ACTIVITIES}',
    'dqai_facilities': '${tables.FACILITIES}',
    'dqai_uploaded_docs': '${tables.UPLOADED_DOCS}',
    'dqai_datasets': '${tables.DATASETS}',
    'dqai_dataset_content': '${tables.DATASET_CONTENT}',
    'dqai_report_templates': '${tables.REPORT_TEMPLATES}',
    'dqai_settings': '${tables.SETTINGS}',
    'dqai_businesses': '${tables.BUSINESSES}',
    'dqai_landing_page_config': '${tables.LANDING_PAGE_CONFIG}',
    'dqai_feedback_messages': '${tables.FEEDBACK_MESSAGES}',
    'dqai_audit_logs': '${tables.AUDIT_LOGS}',
    'dqai_user_approvals': '${tables.USER_APPROVALS}',
    'dqai_form_schemas': '${tables.FORM_SCHEMAS}',
    'dqai_rag_schemas': '${tables.RAG_SCHEMAS}',
    'dqai_llm_providers': '${tables.LLM_PROVIDERS}',
    'dqai_plans': '${tables.PLANS}',
    'dqai_plan_assignments': '${tables.PLAN_ASSIGNMENTS}',
    'dqai_reports_powerbi': '${tables.REPORTS_POWERBI}',
    'dqai_api_connectors': '${tables.API_CONNECTORS}',
    'dqai_api_ingests': '${tables.API_INGESTS}',
    'dqai_roles': '${tables.ROLES}',
    'dqai_permissions': '${tables.PERMISSIONS}',
    'dqai_role_permissions': '${tables.ROLE_PERMISSIONS}',
    'dqai_user_roles': '${tables.USER_ROLES}',
    'dqai_rag_chroma_ids': '${tables.RAG_CHROMA_IDS}',
    'dqai_audit_batches': '${tables.AUDIT_BATCHES}',
    'dqai_email_verifications': '${tables.EMAIL_VERIFICATIONS}',
    'dqai_indicators': '${tables.INDICATORS}',
    'dqai_password_resets': '${tables.PASSWORD_RESETS}',
    'dqai_audit_events': '${tables.AUDIT_EVENTS}',
};

files.forEach(file => {
    try {
        let content = fs.readFileSync(file, 'utf-8');
        let modified = false;

        // Replace all table name occurrences
        for (const [oldName, newName] of Object.entries(tableMap)) {
            const regex = new RegExp(oldName, 'g');
            if (regex.test(content)) {
                content = content.replace(regex, newName);
                modified = true;
            }
        }

        // Convert single-quoted queries to template literals if they contain table references
        // Pattern: 'SELECT ... FROM ${tables.' -> `SELECT ... FROM ${tables.`
        content = content.replace(/'(SELECT[^']*\$\{tables\.[^}]*\}[^']*)'/g, '`$1`');
        content = content.replace(/'(INSERT INTO[^']*\$\{tables\.[^}]*\}[^']*)'/g, '`$1`');
        content = content.replace(/'(UPDATE[^']*\$\{tables\.[^}]*\}[^']*)'/g, '`$1`');
        content = content.replace(/'(DELETE FROM[^']*\$\{tables\.[^}]*\}[^']*)'/g, '`$1`');

        if (modified) {
            fs.writeFileSync(file, content, 'utf-8');
            console.log(`✓ Updated ${file}`);
        } else {
            console.log(`- No changes needed in ${file}`);
        }
    } catch (error) {
        console.error(`✗ Error processing ${file}:`, error.message);
    }
});

console.log('Done!');
