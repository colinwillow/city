// npm run glsl -- PRINT THE SHADER THAT WOULD REACH THE PHONE.
//
// Every effect in this game is a STRING SPLICED INTO THREE'S SHADER SOURCE, and a string is the
// one thing neither gate checks: `check:syntax` parses the JavaScript around it and `check:boot`
// has no GPU, so it never compiles one. A broken splice is therefore invisible here and is an
// object that silently does not draw on his phone. So the text gets printed and read.
// It also catches the backtick-in-a-comment fault twice over (c136, c145): the whole block is a
// template literal and one backtick inside it ends the string early.
import fs from 'fs';
const src = fs.readFileSync('index.html', 'utf8');
const want = process.argv[2] || 'wreckPatch';
const fnRe = new RegExp('function ' + want + '\\([^)]*\\) \\{[\\s\\S]*?\\n\\}');
const m = src.match(fnRe);
if (!m) { console.error('no ' + want + ' in index.html'); process.exit(1); }
// THE CONSTANTS COME OUT OF THE FILE TOO. A printer with its own copy of the numbers is the
// `normals.mjs` mistake in miniature -- it would happily print a shader the game never builds.
const consts = {};
for (const name of ['WRECK', 'PAINT', 'PAL', 'HOLE', 'TOON', 'POST']) {
  const c = src.match(new RegExp('const ' + name + ' = \\{[\\s\\S]*?\\n\\};'));
  if (!c) continue;
  try { consts[name] = new Function('return ' + c[0].replace('const ' + name + ' = ', '').replace(/;\s*$/, ''))(); } catch (e) {}
}
const args = Object.keys(consts);
const fn = new Function(...args, 'THREE', 'return ' + m[0])(...args.map(k => consts[k]), { Vector3: class {} });
const sh = { uniforms: {}, vertexShader: 'void main() {\n#include <begin_vertex>\n}\n',
             fragmentShader: 'void main() {\n#include <color_fragment>\n}\n' };
fn(sh, { uBreak: { value: 0 }, uT: { value: 0 } });
console.log('--- vertex ---\n' + sh.vertexShader);
if (/#include <color_fragment>/.test(sh.fragmentShader) && sh.fragmentShader.length > 60)
  console.log('--- fragment ---\n' + sh.fragmentShader);
console.log('uniforms attached: ' + Object.keys(sh.uniforms).join(', '));
