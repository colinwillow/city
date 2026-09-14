// ~1s gate: pulls every <script type="module"> out of index.html and parses it.
import fs from 'fs'; import { execFileSync } from 'child_process'; import os from 'os'; import path from 'path';
const html = fs.readFileSync(process.argv[2] || 'index.html', 'utf8');
const re = /<script type="module">([\s\S]*?)<\/script>/g; let m, n = 0, bad = 0;
while ((m = re.exec(html))) {
  const f = path.join(os.tmpdir(), `city-syntax-${n++}.mjs`); fs.writeFileSync(f, m[1]);
  try { execFileSync(process.execPath, ['--check', f], { stdio: 'pipe' }); }
  catch (e) { bad++; console.error(e.stderr.toString()); }
}
console.log(bad ? 'SYNTAX FAIL' : `syntax ok (${n} module script${n === 1 ? '' : 's'})`); process.exit(bad ? 1 : 0);
