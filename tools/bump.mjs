// Bumps BUILD and writes version.json. Run before every push: npm run bump
//
// Two places have to agree or the badge lies: the BUILD constant the game reports,
// and the markup it is stamped into so the number is on screen before a single line
// of the module has run. version.json is the third, and it is what a running copy
// polls to find out that it is now the old build.
import fs from 'fs';
const F = 'index.html';
let s = fs.readFileSync(F, 'utf8');
const m = s.match(/const BUILD = '([A-Za-z]*)(\d+)';/);
if (!m) { console.error('no BUILD line in ' + F); process.exit(1); }
const next = process.argv[2] || m[1] + (parseInt(m[2], 10) + 1);
s = s.replace(/const BUILD = '[^']*';/, `const BUILD = '${next}';`);
s = s.replace(/<b id="buildN">[^<]*<\/b>/, `<b id="buildN">${next}</b>`);
fs.writeFileSync(F, s);
fs.writeFileSync('version.json', JSON.stringify({ build: next, time: new Date().toISOString() }) + '\n');
console.log('BUILD ' + m[1] + m[2] + ' -> ' + next);
