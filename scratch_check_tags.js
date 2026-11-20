const fs = require('fs');

const content = fs.readFileSync('client/src/pages/admin/AdminFinance.tsx', 'utf-8');
const lines = content.split('\n');

// Check line 1240 to 3105
const sub = lines.slice(1239, 3100).join('\n');

// Let's count open/close tags
const tagRegex = /<\/?([a-zA-Z0-9]+)[^>]*\/?>/g;
let match;
const stack = [];

// Simplified parser
for (let i = 1239; i < 3100; i++) {
  const line = lines[i];
  // remove string literals and comments
  const clean = line.replace(/\{(\/\*[\s\S]*?\*\/)\}/g, '').replace(/"[^"]*"/g, '""').replace(/'[^']*'/g, "''");
  const tags = clean.match(/<\/?([a-zA-Z0-9]+)(\s[^>]*)?(\/?)>/g);
  if (tags) {
    for (const t of tags) {
      if (t.startsWith('<!--')) continue;
      if (t.endsWith('/>')) continue; // self closing
      const m = t.match(/^<\/?([a-zA-Z0-9]+)/);
      if (!m) continue;
      const tag = m[1];
      if (['input', 'img', 'br', 'hr'].includes(tag)) continue;
      if (t.startsWith('</')) {
        // closing
        const top = stack.pop();
        if (!top || top.tag !== tag) {
          console.log(`Mismatch at L${i + 1}: expected </${top?.tag}> (from L${top?.line}), got </${tag}>`);
        }
      } else {
        stack.push({ tag, line: i + 1, text: t.substring(0, 30) });
      }
    }
  }
}

console.log('Unclosed tags at L3100:', stack);
