// ~1s gate: pulls every <script type="module"> out of index.html and parses it.
import fs from 'fs'; import { execFileSync } from 'child_process'; import os from 'os'; import path from 'path';
const html = fs.readFileSync(process.argv[2] || 'index.html', 'utf8');
const re = /<script type="module">([\s\S]*?)<\/script>/g; let m, n = 0, bad = 0;
while ((m = re.exec(html))) {
  const f = path.join(os.tmpdir(), `city-syntax-${n++}.mjs`); fs.writeFileSync(f, m[1]);
  try { execFileSync(process.execPath, ['--check', f], { stdio: 'pipe' }); }
  catch (e) { bad++; console.error(e.stderr.toString()); }
}
// A STATE THAT POSES HIM MUST ALSO HAVE SET HIS CLIP WEIGHTS (c167).
// `stepPlayer`'s bar branches called `poseColin` and returned, so `colinAnim` -- the one
// function that sets weights -- was skipped for the whole time he was on a bar. The mixer keeps
// whatever it last had, which is `idle_neutral` at 1: he hangs in the idle pose, the bar clips
// never reach weight, and `BAR.mark`'s hand pair gets measured at his HIPS. Every offline tool
// passed, because each one poses the clip ITSELF and so measures a path the game never takes.
// This is the cheapest possible guard against the class and it is a source shape, so it costs
// nothing and always runs: a line that poses and returns has to have animated first.
{
  let miss = 0;
  html.split('\n').forEach((ln, i) => {
    if (!/poseColin\s*\(/.test(ln) || !/\breturn\b/.test(ln)) return;
    if (/colinAnim\s*\(/.test(ln) || /colinSet\s*\(/.test(ln)) return;
    miss++; console.error('line ' + (i + 1) + ': poses and returns without setting clip weights\n  ' + ln.trim());
  });
  if (miss) { console.error('POSE WITHOUT ANIM -- see c167'); bad++; }
}
console.log(bad ? 'SYNTAX FAIL' : `syntax ok (${n} module script${n === 1 ? '' : 's'})`); process.exit(bad ? 1 : 0);
