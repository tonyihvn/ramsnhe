#!/usr/bin/env node
/**
 * Final cleanup script to replace remaining dqai_ table references
 */

import fs from 'fs';
import path from 'path';
import { fileURLToPath } from 'url';

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);

// Additional tables that were missed
const additionalReplacements = [
    { old: 'dqai_reports_powerbi', new: '${tables.REPORTS_POWERBI}' },
    { old: 'dqai_api_connectors', new: '${tables.API_CONNECTORS}' },
    { old: 'dqai_api_ingests', new: '${tables.API_INGESTS}' },
    { old: 'dqai_roles', new: '${tables.ROLES}' },
    { old: 'dqai_permissions', new: '${tables.PERMISSIONS}' },
    { old: 'dqai_role_permissions', new: '${tables.ROLE_PERMISSIONS}' },
    { old: 'dqai_user_roles', new: '${tables.USER_ROLES}' },
    { old: 'dqai_rag_chroma_ids', new: '${tables.RAG_CHROMA_IDS}' },
    { old: 'dqai_audit_batches', new: '${tables.AUDIT_BATCHES}' },
    { old: 'dqai_email_verifications', new: '${tables.EMAIL_VERIFICATIONS}' },
    { old: 'dqai_indicators', new: '${tables.INDICATORS}' },
    { old: 'dqai_password_resets', new: '${tables.PASSWORD_RESETS}' },
    { old: 'dqai_audit_events', new: '${tables.AUDIT_EVENTS}' },
];

function updateFile(filePath) {
    try {
        console.log(`📝 Processing: ${filePath}`);
        
        let content = fs.readFileSync(filePath, 'utf-8');
        let updated = content;
        let changeCount = 0;

        // Replace all table references
        for (const replacement of additionalReplacements) {
            const regex = new RegExp(replacement.old, 'g');
            const newContent = updated.replace(regex, replacement.new);
            if (newContent !== updated) {
                changeCount += (updated.match(regex) || []).length;
                updated = newContent;
            }
        }

        // Also convert these to template literals if in quotes
        const patterns = [
            {
                regex: /'((?:[^'\\]|\\.)*?\$\{tables\.[A-Z_]+\}(?:[^'\\]|\\.)*?)'/g,
                replacement: (match, p1) => '`' + p1 + '`'
            }
        ];

        for (const pattern of patterns) {
            const matches = updated.match(pattern.regex);
            if (matches) {
                changeCount += matches.length;
                updated = updated.replace(pattern.regex, pattern.replacement);
            }
        }

        if (changeCount > 0) {
            fs.writeFileSync(filePath, updated, 'utf-8');
            console.log(`✅ Updated ${filePath}: ${changeCount} replacements made`);
            return true;
        } else {
            console.log(`⏭️  No changes needed for ${filePath}`);
            return false;
        }
    } catch (error) {
        console.error(`❌ Error processing ${filePath}:`, error.message);
        return false;
    }
}

async function main() {
    const filesToUpdate = [
        path.join(__dirname, 'index.js'),
    ];

    console.log('\n🔄 Replacing additional table references...\n');
    
    let successCount = 0;
    for (const file of filesToUpdate) {
        if (fs.existsSync(file)) {
            if (updateFile(file)) {
                successCount++;
            }
        } else {
            console.log(`⚠️  File not found: ${file}`);
        }
    }

    console.log(`\n✨ Complete! Updated ${successCount} files with additional table references`);
}

main().catch(console.error);
