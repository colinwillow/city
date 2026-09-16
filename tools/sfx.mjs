// npm run sfx [file ...] -- DOES THIS RECORDING START ON ITS OWN EVENT?
//
// *"The push sound is offset from the push."* Half of that was `SFX.edge` opening on ROOM TONE:
// it looked for the first sample over an absolute floor, and on a real recording that is the room
// and the shoe moving through the air, not the scrape. A hundred milliseconds bolted to the front
// of a sound is exactly the thing that note says nothing on the trigger side can fix, and it is
// invisible from a phone -- so it gets measured here instead of argued about.
//
// IT RUNS THE SHIPPED `SFX.edge`, lifted between the `EDGE:` markers, and the shipped `hit`/`pre`
// beside it. A tool with its own copy of the rule is this repo's oldest mistake.
import fs from 'fs';
let dec;
try { dec = (await import('mpg123-decoder')).MPEGDecoder; }
catch (e) { console.error('needs a decoder:  npm i -D mpg123-decoder'); process.exit(1); }

const html = fs.readFileSync('index.html', 'utf8');
const src = html.split('/* EDGE:START */')[1].split('/* EDGE:END */')[0];
const num = k => +(html.match(new RegExp('\\n\\s*' + k + ':\\s*([.\\d]+)')) || [])[1];
const SFX = { hit: num('hit'), pre: num('pre') };
SFX.edge = new Function('return ({' + src + '}).edge')().bind(SFX);
console.log('shipped SFX.hit = ' + SFX.hit + '   SFX.pre = ' + SFX.pre + '\n');

const walk = d => fs.readdirSync(d, { withFileTypes: true }).flatMap(e =>
  e.isDirectory() ? walk(d + '/' + e.name) : (/\.mp3$/i.test(e.name) ? [d + '/' + e.name] : []));
const files = process.argv.slice(2).length ? process.argv.slice(2)
  : walk('audio').filter(f => !/song/i.test(f));        // a song is STREAMED and never edged at all
// A LOOP IS JUDGED DIFFERENTLY. "half the peak" is an onset test and a continuous roll or burn
// has no onset -- its loudest moment is somewhere in the middle of it, which reads here as a
// enormous "dead air" and means nothing. Named so the report says so rather than crying wolf.
const LOOPS = /riding|ongoing|charge/i;

console.log('file'.padEnd(42) + '  dur    plays      event    dead air  peak');
for (const f of files) {
  const D = new dec(); await D.ready;
  let raw = fs.readFileSync(f);
  if (raw[0] === 0x49 && raw[1] === 0x44 && raw[2] === 0x33) {
    const sz = ((raw[6] & 127) << 21) | ((raw[7] & 127) << 14) | ((raw[8] & 127) << 7) | (raw[9] & 127);
    raw = raw.subarray(10 + sz);
  }
  const { channelData: cd, sampleRate: sr } = D.decode(new Uint8Array(raw));
  const n = cd[0].length;
  // the shape three hands `edge`: length, sampleRate, duration, numberOfChannels, getChannelData
  const buf = { length: n, sampleRate: sr, duration: n / sr, numberOfChannels: cd.length,
    getChannelData: i => cd[i] };
  SFX.edge(buf);
  let pk = 0, on = 0;
  for (let k = 0; k < n; k++) { let v = 0; for (const ch of cd) v = Math.max(v, Math.abs(ch[k])); if (v > pk) { pk = v; } }
  for (let k = 0; k < n; k++) { let v = 0; for (const ch of cd) v = Math.max(v, Math.abs(ch[k])); if (v >= pk * .5) { on = k / sr; break; } }
  const dead = on - buf._lead;
  console.log(f.replace('audio/', '').padEnd(42) + (n / sr).toFixed(2).padStart(6)
    + (buf._lead.toFixed(3) + '-' + buf._end.toFixed(3)).padStart(14)
    + on.toFixed(3).padStart(9) + (dead * 1000).toFixed(0).padStart(9) + 'ms'
    + pk.toFixed(2).padStart(6)
    + (LOOPS.test(f) ? '   (a loop -- no onset to be late for)' : dead > .06 ? '   <-- it starts late' : ''));
  D.free();
}
console.log('\n"event" is the first sample at half the file\'s peak; "dead air" is how long after');
console.log('the sound STARTS PLAYING that lands. Past about 60 ms it is audible as a delay.');
process.exit(0);
