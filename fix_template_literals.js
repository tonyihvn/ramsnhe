import fs from 'fs';

const file = 'server/index.js';
let content = fs.readFileSync(file, 'utf-8');

// Fix: Convert all lines with tables.X inside quotes to use backticks
// Pattern: 'text ${tables.X} text' -> `text ${tables.X} text`
// We need to be careful to only convert when the content has tables

// Convert arrays with table references from single quotes to backticks
content = content.replace(/\['(\${tables\.[^}]+})'\s*[,\)]*/g, (match) => {
    return match.replace(/'/g, '`');
});

// Convert strings in console.log/error with table references
content = content.replace(/console\.(log|error)\('([^']*\${tables\.[^}]+}[^']*)'/g, (match) => {
    return match.replace(/'/g, '`');
});

// Convert ALTER TABLE statements with single quotes
content = content.replace(/await pool\.query\('(ALTER TABLE.*\${tables\.[^}]+}[^']*)'/g, (match) => {
    return match.replace(/'/g, '`');
});

// Convert SELECT statements with double quotes containing table references
content = content.replace(/pool\.query\("(SELECT[^"]*\${tables\.[^}]+}[^"]*)"/g, (match) => {
    return match.replace(/"/g, '`');
});

// Fix the specific problematic line with table_name
content = content.replace(/SELECT column_name FROM information_schema\.columns WHERE table_name='(\${tables\.\w+})'/g, 
    'SELECT column_name FROM information_schema.columns WHERE table_name=$1');

// Convert array literals that contain ${tables...
content = content.replace(/\[\s*'(\${tables\.[^}]+})'\s*,\s*'(\${tables\.[^}]+})'\s*,\s*'(\${tables\.[^}]+})'\s*\]/g,
    '[$1, $2, $3]');

// Another pattern for arrays  
content = content.replace(/\[\s*'(\${tables\.[^']+}[^']*)',\s*'(\${tables\.[^']+}[^']*)',\s*'(\${tables\.[^']+}[^']*)'/g,
    '[`$1`, `$2`, `$3`');

fs.writeFileSync(file, content, 'utf-8');
console.log('✓ Fixed template literal issues in index.js');
