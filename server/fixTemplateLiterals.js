#!/usr/bin/env node
/**
 * Script to fix SQL queries to use template literals with TABLE_PREFIX
 * This ensures ${tables.X} syntax will work correctly
 */

import fs from 'fs';
import path from 'path';
import { fileURLToPath } from 'url';

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);

function fixFile(filePath) {
    try {
        console.log(`🔧 Processing: ${filePath}`);
        
        let content = fs.readFileSync(filePath, 'utf-8');
        let updated = content;
        let changeCount = 0;

        // Find and fix SQL queries that have ${tables but are not in template literals
        // This regex finds 'SELECT ... FROM ${tables' patterns and converts them to `SELECT ... FROM ${tables`
        const patterns = [
            {
                // 'SELECT' or similar patterns with ${tables
                regex: /'((?:[^'\\]|\\.)*?\$\{tables\.[A-Z_]+\}(?:[^'\\]|\\.)*?)'/g,
                replacement: (match, p1) => {
                    // Count if this is not already a template literal continuation
                    return '`' + p1 + '`';
                }
            },
            {
                // 'INSERT' patterns with ${tables
                regex: /'(INSERT[^']*?\$\{tables\.[A-Z_]+\}[^']*?)'/g,
                replacement: (match, p1) => '`' + p1 + '`'
            },
            {
                // 'UPDATE' patterns with ${tables
                regex: /'(UPDATE[^']*?\$\{tables\.[A-Z_]+\}[^']*?)'/g,
                replacement: (match, p1) => '`' + p1 + '`'
            },
            {
                // 'DELETE' patterns with ${tables
                regex: /'(DELETE[^']*?\$\{tables\.[A-Z_]+\}[^']*?)'/g,
                replacement: (match, p1) => '`' + p1 + '`'
            },
            {
                // 'CREATE' patterns with ${tables
                regex: /'(CREATE[^']*?\$\{tables\.[A-Z_]+\}[^']*?)'/g,
                replacement: (match, p1) => '`' + p1 + '`'
            },
            {
                // 'ALTER' patterns with ${tables
                regex: /'(ALTER[^']*?\$\{tables\.[A-Z_]+\}[^']*?)'/g,
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
            console.log(`✅ Fixed ${filePath}: ${changeCount} SQL queries converted to template literals`);
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
        path.join(__dirname, 'superAdminRoutes.js'),
        path.join(__dirname, 'index.js'),
        path.join(__dirname, 'scripts', 'seed_activity.js'),
    ];

    console.log('\n🔄 Converting SQL queries to template literals...\n');
    
    let successCount = 0;
    for (const file of filesToUpdate) {
        if (fs.existsSync(file)) {
            if (fixFile(file)) {
                successCount++;
            }
        } else {
            console.log(`⚠️  File not found: ${file}`);
        }
    }

    console.log(`\n✨ Complete! Fixed ${successCount} files`);
}

main().catch(console.error);
