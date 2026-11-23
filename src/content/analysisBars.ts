// A qué compases se refiere cada frase del análisis de una canción («Compases 8–10…», «Sección C…»,
// «Cm7–F7–Bbmaj7…»), para ofrecer «Practicar estos compases».
import type { Song } from './songs';

const LETTER: Record<string, number> = { C: 0, D: 2, E: 4, F: 5, G: 7, A: 9, B: 11 };
const CHORD_RE = /\b([A-G])(b|#)?(maj7|m7b5|m7|m6|m9|7b9|7|6|9|13|dim7|m)?(?![a-zñáéíóú])/g;

type Sig = { root: number; fam: string };
function sig(sym: string): Sig | null {
  const m = /^([A-G])(b|#)?(.*)$/.exec(sym.trim());
  if (!m) return null;
  const root = (LETTER[m[1]] + (m[2] === 'b' ? -1 : m[2] === '#' ? 1 : 0) + 12) % 12;
  const q = m[3] ?? '';
  const fam = /m7b5|ø/.test(q) ? 'hd' : /dim|°/.test(q) ? 'dim' : /^m(?!aj)/.test(q) ? 'min' : /maj/.test(q) ? 'maj' : /^(7|9|13)/.test(q) ? 'dom' : 'maj';
  return { root, fam };
}
const same = (a: Sig | null, b: Sig | null) => !!a && !!b && a.root === b.root && a.fam === b.fam;

/** [primer compás, último compás] (base 0) o null si la frase habla del tema entero. */
export function barsForAnalysis(text: string, song: Song): [number, number] | null {
  const total = song.bars;
  const block = (a: number, b: number): [number, number] => {
    a = Math.max(0, a); b = Math.min(total - 1, b);
    if (b - a + 1 >= 4) return [a, b];
    const s0 = Math.floor(a / 4) * 4;
    return b <= s0 + 3 ? [s0, Math.min(total - 1, s0 + 3)] : [a, Math.min(total - 1, a + 3)];
  };
  if (/toda la canci[oó]n|todo el tema|sobre los tres acordes/i.test(text)) return null;
  const cs = /compases?\s+(\d+)\s*[–-]\s*(\d+)/i.exec(text);
  if (cs) return block(+cs[1] - 1, +cs[2] - 1);
  const c1 = /comp[aá]s\s+(\d+)/i.exec(text);
  if (c1) return block(+c1[1] - 1, +c1[1] - 1);
  const sec = /secci[oó]n\s+([A-D])\b/i.exec(text);
  const bridge = /^\s*puente/i.test(text);
  const label = sec ? sec[1].toUpperCase() : bridge ? 'B' : null;
  if (label) {
    const s = song.sections.find((x) => x.label === label || x.label.startsWith(`${label} `));
    if (s) return [s.fromBar, s.toBar];
  }
  // secuencia de acordes nombrada en el texto: se busca en orden dentro de 8 compases
  const toks = [...text.matchAll(CHORD_RE)].map((m) => sig(m[0])).filter((x): x is Sig => !!x);
  if (!toks.length) return null;
  const chart: { bar: number; s: Sig | null }[] = [];
  song.chart.split('|').map((b) => b.trim()).filter(Boolean).forEach((b, bi) => b.split(/\s+/).forEach((sym) => chart.push({ bar: bi, s: sig(sym) })));
  const found: [number, number][] = [];
  for (let i = 0; i < chart.length; i++) {
    if (!same(chart[i].s, toks[0])) continue;
    let j = i;
    let ok = true;
    for (let k = 1; k < toks.length; k++) {
      let n = j + 1;
      while (n < chart.length && !same(chart[n].s, toks[k]) && chart[n].bar - chart[i].bar < 8) n++;
      if (n >= chart.length || !same(chart[n].s, toks[k])) { ok = false; break; }
      j = n;
    }
    if (ok) found.push([chart[i].bar, chart[j].bar]);
  }
  // la primera vez que suena de forma compacta (≤ 4 compases); si no, el tramo más corto
  const best = found.find(([a, b]) => b - a <= 3) ?? [...found].sort((x, y) => x[1] - x[0] - (y[1] - y[0]))[0];
  if (best) return block(best[0], best[1]);
  // si la secuencia completa no aparece, al menos el primer acorde
  const first = chart.find((c) => same(c.s, toks[0]));
  return first ? block(first.bar, first.bar) : null;
}
