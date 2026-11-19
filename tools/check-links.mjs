// Comprueba con el servicio oEmbed de YouTube que cada video del repertorio existe y permite insertarse.
// Uso: node tools/check-links.mjs   (requiere curl y acceso de red a www.youtube.com)
import { readFileSync } from 'node:fs';
import { execFileSync } from 'node:child_process';
const src = readFileSync(new URL('../src/content/repertoire.ts', import.meta.url), 'utf8');
const ids = [...src.matchAll(/yt\('([A-Za-z0-9_-]{11})'/g)].map((m) => m[1]);
let bad = 0;
for (const id of ids) {
  let out = '';
  try {
    out = execFileSync('curl', ['-s', '-m', '15', '-w', '\n%{http_code}', `https://www.youtube.com/oembed?url=https://www.youtube.com/watch?v=${id}&format=json`], { encoding: 'utf8' });
  } catch (e) { out = `\n${e.status ?? 'error'}`; }
  const nl = out.lastIndexOf('\n');
  const code = out.slice(nl + 1).trim();
  if (code === '200') {
    const j = JSON.parse(out.slice(0, nl));
    console.log(`OK   ${id}  ${j.title} — ${j.author_name}`);
  } else {
    bad++;
    console.log(`FAIL ${id}  HTTP ${code} (401/403: no permite insertarse; 404/400: eliminado o privado)`);
  }
}
console.log(`\n${ids.length - bad}/${ids.length} enlaces válidos`);
process.exit(bad ? 1 : 0);
