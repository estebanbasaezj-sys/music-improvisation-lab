// Explicación automática de un solo transcrito: qué escala o modo usa (en general y sobre cada acorde),
// qué recursos aparecen (notas guía, aproximaciones cromáticas, encierros, arpegios, escalas, blue notes,
// tensiones, secuencias, anticipaciones…), cómo son sus frases y qué practicar a partir de él.
// Es un análisis por reglas sobre las notas detectadas y los acordes estimados: describe lo que se mide,
// no "adivina" intenciones, y cada afirmación lleva los compases donde ocurre para poder comprobarla de oído.
import { ChordEvent } from './progressions';
import { AnnotatedNote, LineNote, analyzeLine, chordStarts } from './line';
import { Chord } from './chords';
import { Note, Pitch, pc, pitchFromMidi } from './notes';

export interface SoloNames { note: (n: Note) => string; chord: (c: Chord) => string }
export interface SoloDevice { id: string; name: string; count: number; bars: number[]; text: string }
export interface SoloPhrase { fromBar: number; toBar: number; notes: number; text: string }
export interface ChordUsage { bars: string; chord: string; scale: string; coverage: number; notes: number; comment: string }
export interface SoloReport {
  summary: string[];
  overall: { scale: string; coverage: number } | null;
  perChord: ChordUsage[];
  devices: SoloDevice[];
  phrases: SoloPhrase[];
  practice: string[];
  annotated: AnnotatedNote[];
}

// conjuntos de semitonos desde la fundamental
const SC: Record<string, { name: string; set: number[] }> = {
  ionian: { name: 'jónico (escala mayor)', set: [0, 2, 4, 5, 7, 9, 11] },
  dorian: { name: 'dórico', set: [0, 2, 3, 5, 7, 9, 10] },
  phrygian: { name: 'frigio', set: [0, 1, 3, 5, 7, 8, 10] },
  lydian: { name: 'lidio', set: [0, 2, 4, 6, 7, 9, 11] },
  mixolydian: { name: 'mixolidio', set: [0, 2, 4, 5, 7, 9, 10] },
  aeolian: { name: 'eólico (menor natural)', set: [0, 2, 3, 5, 7, 8, 10] },
  locrian: { name: 'locrio', set: [0, 1, 3, 5, 6, 8, 10] },
  harmonicMinor: { name: 'menor armónica', set: [0, 2, 3, 5, 7, 8, 11] },
  melodicMinor: { name: 'menor melódica', set: [0, 2, 3, 5, 7, 9, 11] },
  pentMinor: { name: 'pentatónica menor', set: [0, 3, 5, 7, 10] },
  pentMajor: { name: 'pentatónica mayor', set: [0, 2, 4, 7, 9] },
  blues: { name: 'escala de blues', set: [0, 3, 5, 6, 7, 10] },
  bluesMajor: { name: 'blues mayor', set: [0, 2, 3, 4, 7, 9] },
  bebopDominant: { name: 'bebop dominante', set: [0, 2, 4, 5, 7, 9, 10, 11] },
  dimHW: { name: 'disminuida semitono-tono', set: [0, 1, 3, 4, 6, 7, 9, 10] },
  altered: { name: 'alterada (superlocria)', set: [0, 1, 3, 4, 6, 8, 10] },
  lydianDominant: { name: 'lidia dominante', set: [0, 2, 4, 6, 7, 9, 10] },
  phrygianDominant: { name: 'frigia dominante', set: [0, 1, 4, 5, 7, 8, 10] },
};
const BY_QUALITY: Record<string, string[]> = {
  maj: ['ionian', 'lydian', 'pentMajor', 'mixolydian'], '6': ['ionian', 'pentMajor', 'lydian'], maj7: ['ionian', 'lydian', 'pentMajor'], maj9: ['ionian', 'lydian'],
  m: ['dorian', 'aeolian', 'pentMinor', 'blues', 'phrygian'], m6: ['dorian', 'melodicMinor', 'pentMinor'], m7: ['dorian', 'aeolian', 'pentMinor', 'blues', 'phrygian'], m9: ['dorian', 'aeolian'],
  mMaj7: ['melodicMinor', 'harmonicMinor'],
  '7': ['mixolydian', 'blues', 'bebopDominant', 'lydianDominant', 'dimHW', 'altered', 'phrygianDominant'], '9': ['mixolydian', 'blues', 'lydianDominant'], '13': ['mixolydian', 'lydianDominant', 'dimHW'],
  '7b9': ['phrygianDominant', 'dimHW', 'altered'], '7#9': ['blues', 'altered', 'dimHW'], '7sus4': ['mixolydian', 'dorian'], sus4: ['mixolydian'], sus2: ['mixolydian'],
  m7b5: ['locrian', 'melodicMinor'], dim: ['locrian', 'dimHW'], dim7: ['dimHW'], aug: ['lydianDominant'],
};
const OVERALL = ['ionian', 'dorian', 'mixolydian', 'aeolian', 'lydian', 'phrygian', 'pentMinor', 'pentMajor', 'blues', 'bluesMajor', 'harmonicMinor', 'melodicMinor'];

const mod12 = (x: number) => ((x % 12) + 12) % 12;
const pct = (x: number) => `${Math.round(x * 100)} %`;
const onBeat = (b: number) => Math.abs(b - Math.round(b)) < 0.05;

function fitScale(hist: number[], root: number, ids: string[]) {
  const total = hist.reduce((a, b) => a + b, 0) || 1;
  let best = { id: ids[0], coverage: 0, score: -1 };
  ids.forEach((id, k) => {
    const set = SC[id].set.map((s) => mod12(root + s));
    const cov = set.reduce((a, p) => a + hist[p], 0) / total;
    const used = set.filter((p) => hist[p] > 0).length / set.length;
    // cubrir las notas manda; a igualdad, la escala más usada por completo y la de la lista preferida primero
    const score = cov * 1 + used * 0.08 - k * 0.004 - (set.length - 5) * 0.004;
    if (score > best.score) best = { id, coverage: cov, score };
  });
  return best;
}

/** Analiza el solo (notas en tiempos desde el inicio del primer compás) sobre los acordes dados. */
export function analyzeSolo(notes: LineNote[], evts: ChordEvent[], opts: { keyRoot: Note; minor: boolean; blues?: boolean; names: SoloNames; firstBar?: number; rangeName?: (midi: number) => string }): SoloReport {
  const first = opts.firstBar ?? 1;
  const sorted = [...notes].sort((a, b) => a.start - b.start).filter((n) => n.dur > 0);
  const empty: SoloReport = { summary: ['No hay notas suficientes para analizar: transcribe un fragmento con el instrumento más presente.'], overall: null, perChord: [], devices: [], phrases: [], practice: [], annotated: [] };
  if (sorted.length < 4 || !evts.length) return empty;
  const an = analyzeLine(sorted, evts, { keyRoot: opts.keyRoot, blues: opts.blues, names: opts.names });
  const starts = chordStarts(evts);
  const barOf = (beat: number) => Math.floor(beat / 4 + 1e-9) + first;
  const nm = (m: number): string => opts.names.note(pitchFromMidi(m) as Note & Pitch);
  const nmo = (m: number): string => opts.rangeName?.(m) ?? `${nm(m)}${Math.floor(m / 12) - 1}`;
  const DEG: Record<string, string> = { '1': 'fundamental', b3: '3ª menor', '3': '3ª', '4': '4ª', b5: '5ª disminuida', '5': '5ª', '#5': '5ª aumentada', '6': '6ª', b7: '7ª', '7': '7ª mayor', bb7: '7ª disminuida' };
  const degName = (d: string) => DEG[d] ?? d;
  // las notas de adorno (aproximaciones, cromatismos) no cuentan para decidir la escala
  const decor = (a: AnnotatedNote) => a.role === 'approach' || a.role === 'chromatic';
  const total = evts.reduce((a, e) => a + e.beats, 0);
  const bars = Math.ceil(total / 4);

  // ---------------------------------------------------------------- resumen
  const lo = Math.min(...sorted.map((n) => n.midi));
  const hi = Math.max(...sorted.map((n) => n.midi));
  const iois = sorted.slice(1).map((n, i) => n.start - sorted[i].start).filter((d) => d > 0.05);
  const share = (f: (d: number) => boolean) => (iois.length ? iois.filter(f).length / iois.length : 0);
  const eighths = share((d) => Math.abs(d - 0.5) < 0.08);
  const sixteenths = share((d) => d < 0.33);
  const triplets = share((d) => Math.abs(d - 1 / 3) < 0.06 || Math.abs(d - 2 / 3) < 0.06);
  const density = sorted.length / Math.max(1, total);
  const strong = an.filter((a) => onBeat(a.start));
  const strongCT = strong.filter((a) => a.role === 'guide' || a.role === 'chord').length / Math.max(1, strong.length);
  const allCT = an.filter((a) => a.role === 'guide' || a.role === 'chord').length / an.length;
  const rhythm = sixteenths > 0.3 ? 'muchas semicorcheas (pasajes rápidos)' : triplets > 0.25 ? 'tresillos frecuentes' : eighths > 0.45 ? 'líneas de corcheas, el ritmo típico del jazz' : density < 0.8 ? 'notas largas y mucho espacio' : 'mezcla de negras y corcheas';
  const summary = [
    `${sorted.length} notas en ${bars} compás(es) (c. ${first}–${first + bars - 1}), entre ${nmo(lo)} y ${nmo(hi)} (${hi - lo} semitonos de registro).`,
    `Ritmo: ${rhythm}; densidad de ${density.toFixed(1)} notas por tiempo.`,
    `${pct(allCT)} de las notas son notas del acorde que suena, y en los tiempos fuertes ${pct(strongCT)}: ${strongCT >= 0.7 ? 'el solo «dibuja» la armonía con claridad' : strongCT >= 0.45 ? 'equilibrio entre notas del acorde y tensiones o notas de paso' : 'usa mucha tensión o notas de paso en los tiempos fuertes (sonido más libre o "fuera")'}.`,
  ];

  // ---------------------------------------------------------------- escala general
  const hist = Array(12).fill(0);
  an.forEach((n) => { if (!decor(n)) hist[mod12(n.midi)] += Math.min(n.dur, 2); });
  const tonic = pc(opts.keyRoot);
  let overall: SoloReport['overall'] = null;
  {
    let best = { root: tonic, id: 'ionian', coverage: 0, score: -1 };
    for (let r = 0; r < 12; r++) {
      const f = fitScale(hist, r, OVERALL);
      const score = f.score + (r === tonic ? 0.04 : 0) + (opts.minor && ['aeolian', 'dorian', 'pentMinor', 'blues', 'harmonicMinor', 'melodicMinor'].includes(f.id) && r === tonic ? 0.02 : 0);
      if (score > best.score) best = { root: r, id: f.id, coverage: f.coverage, score };
    }
    const rootName = nm(60 + best.root);
    overall = { scale: `${rootName} ${SC[best.id].name}`, coverage: best.coverage };
    summary.push(`Material melódico general: ${pct(best.coverage)} de las notas pertenecen a ${rootName} ${SC[best.id].name}${best.coverage < 0.75 ? ', aunque hay bastante cromatismo o cambios de escala según el acorde (mira el detalle por acorde)' : ''}.`);
  }

  // ---------------------------------------------------------------- por acorde (agrupando acordes repetidos)
  const perChord: ChordUsage[] = [];
  let g = 0;
  while (g < evts.length) {
    let h = g;
    while (h + 1 < evts.length && pc(evts[h + 1].chord.root) === pc(evts[g].chord.root) && evts[h + 1].chord.quality.id === evts[g].chord.quality.id) h++;
    const a0 = starts[g];
    const a1 = starts[h] + evts[h].beats;
    const inside = an.filter((n) => n.start >= a0 - 1e-9 && n.start < a1 - 1e-9);
    const c = evts[g].chord;
    if (inside.length >= 2) {
      const hh = Array(12).fill(0);
      inside.forEach((n) => { if (!decor(n)) hh[mod12(n.midi)] += Math.min(n.dur, 2); });
      const cands = BY_QUALITY[c.quality.id] ?? ['ionian'];
      const f = fitScale(hh, pc(c.root), cands);
      const degs = new Set(inside.filter((n) => !decor(n)).map((n) => n.degree));
      const alt = ['b9', '#9', '#11', 'b13', 'b5', '#5'].filter((d) => degs.has(d));
      const guides = inside.filter((n) => n.role === 'guide').length;
      const bits: string[] = [];
      if (guides) bits.push(`${guides} nota(s) guía (3ª/7ª)`);
      if (alt.length && ['7', '9', '13', '7b9', '7#9'].includes(c.quality.id)) bits.push(`tensiones alteradas ${alt.join(', ')} (color de dominante alterado)`);
      else if (alt.length) bits.push(`notas de color ${alt.join(', ')}`);
      const ten = [...degs].filter((d) => ['9', '11', '13'].includes(d));
      if (ten.length) bits.push(`tensiones ${ten.join(', ')}`);
      if (inside.some((n) => n.role === 'blue')) bits.push('blue notes');
      perChord.push({
        bars: barOf(a0) === barOf(a1 - 0.01) ? `c. ${barOf(a0)}` : `c. ${barOf(a0)}–${barOf(a1 - 0.01)}`,
        chord: opts.names.chord(c), scale: `${opts.names.note(c.root)} ${SC[f.id].name}`, coverage: f.coverage, notes: inside.length,
        comment: bits.join('; '),
      });
    }
    g = h + 1;
  }

  // ---------------------------------------------------------------- recursos
  const dev = new Map<string, SoloDevice>();
  const add = (id: string, name: string, beat: number, text: string) => {
    const d = dev.get(id) ?? { id, name, count: 0, bars: [], text };
    d.count++;
    const b = barOf(beat);
    if (!d.bars.includes(b)) d.bars.push(b);
    dev.set(id, d);
  };
  const isCT = (a: AnnotatedNote) => a.role === 'guide' || a.role === 'chord';
  for (let i = 0; i < an.length; i++) {
    const a = an[i];
    // nota guía al cambiar de acorde
    if (a.role === 'guide' && starts.some((s) => Math.abs(a.start - s) < 0.3)) add('guide', 'Notas guía en el cambio de acorde', a.start, 'Llega a la 3ª o la 7ª justo cuando cambia el acorde: es lo que hace que el solo "suene a los cambios".');
    // aproximación cromática a nota del acorde en tiempo fuerte
    const b = an[i + 1];
    if (b && Math.abs(b.midi - a.midi) === 1 && !isCT(a) && isCT(b) && onBeat(b.start)) add('chromatic', 'Aproximación cromática', a.start, 'Una nota a medio tono que resuelve en una nota del acorde en el tiempo fuerte.');
    // encierro: arriba y abajo (o al revés) del objetivo, luego el objetivo
    const c = an[i + 2];
    if (b && c && isCT(c) && onBeat(c.start) && Math.sign(a.midi - c.midi) === -Math.sign(b.midi - c.midi) && a.midi !== c.midi && b.midi !== c.midi
      && Math.abs(a.midi - c.midi) <= 2 && Math.abs(b.midi - c.midi) <= 2 && c.start - a.start <= 1.6) add('enclosure', 'Encierro (enclosure)', a.start, 'Rodea la nota objetivo con la nota de arriba y la de abajo antes de tocarla: recurso clásico del bebop.');
    if (a.role === 'blue') add('blue', 'Blue notes', a.start, 'b3 o b5 de la tonalidad sobre acordes mayores o dominantes: el sonido del blues.');
    if (a.role === 'tension' && a.dur >= 0.75) add('tension', 'Tensiones sostenidas', a.start, 'Notas largas en 9ª, 11ª o 13ª del acorde: color moderno sobre la armonía.');
    if (a.anticipation) add('anticipation', 'Anticipaciones', a.start, 'Toca una nota del acorde siguiente medio tiempo antes de que llegue: la frase "empuja" hacia adelante.');
    if (b && Math.abs(b.midi - a.midi) >= 8 && b.start - a.start <= 1) add('leap', 'Saltos amplios', a.start, 'Intervalos de sexta o más dentro de la frase: rompen la línea y dan carácter.');
  }
  // arpegios: 3+ notas del mismo acorde por terceras en la misma dirección
  for (let i = 0; i + 2 < an.length; i++) {
    let j = i;
    while (j + 1 < an.length && an[j + 1].chordIdx === an[i].chordIdx && isCT(an[j]) && isCT(an[j + 1])
      && [3, 4, 5].includes(Math.abs(an[j + 1].midi - an[j].midi)) && Math.sign(an[j + 1].midi - an[j].midi) === Math.sign(an[i + 1].midi - an[i].midi) && an[j + 1].start - an[j].start <= 1.01) j++;
    if (j - i >= 2) {
      const ch = evts[an[i].chordIdx].chord;
      add('arpeggio', 'Arpegios', an[i].start, `Recorre el acorde nota por nota (por ejemplo ${opts.names.chord(ch)} desde su ${degName(an[i].degree)}).`);
      i = j;
    }
  }
  // escalas: 5+ notas por grado conjunto en una dirección
  for (let i = 0; i + 4 < sorted.length; i++) {
    let j = i;
    const dir = Math.sign(sorted[i + 1].midi - sorted[i].midi);
    while (j + 1 < sorted.length && dir !== 0 && [1, 2].includes((sorted[j + 1].midi - sorted[j].midi) * dir) && sorted[j + 1].start - sorted[j].start <= 1.01) j++;
    if (j - i >= 4) { add('scale', 'Pasajes de escala', sorted[i].start, `Corre por la escala ${dir > 0 ? 'subiendo' : 'bajando'} por grados conjuntos.`); i = j; }
  }
  // corcheas seguidas (líneas bebop)
  for (let i = 0; i < sorted.length; i++) {
    let j = i;
    while (j + 1 < sorted.length && Math.abs(sorted[j + 1].start - sorted[j].start - 0.5) < 0.08) j++;
    if (j - i >= 7) { add('eighths', 'Líneas largas de corcheas', sorted[i].start, 'Ocho o más corcheas seguidas: la línea continua típica del bebop.'); i = j; }
  }
  // secuencias y motivos: el mismo dibujo de 3 intervalos repetido
  const ints = sorted.slice(1).map((n, i) => n.midi - sorted[i].midi);
  const seen = new Map<string, number>();
  for (let i = 0; i + 3 <= ints.length; i++) {
    const key = ints.slice(i, i + 3).join(',');
    if (ints.slice(i, i + 3).every((x) => x === 0)) continue;
    const prev = seen.get(key);
    if (prev !== undefined && i - prev >= 3) {
      const same = sorted[i].midi === sorted[prev].midi;
      add(same ? 'motif' : 'sequence', same ? 'Motivo repetido' : 'Secuencias', sorted[i].start, same ? 'Repite un mismo dibujo melódico: da unidad al solo.' : 'Repite el mismo dibujo empezando en otra nota (secuencia): desarrolla una idea en vez de inventar una nueva.');
      seen.set(key, i);
    } else if (prev === undefined) seen.set(key, i);
  }
  const devices = [...dev.values()].sort((x, y) => y.count - x.count);

  // ---------------------------------------------------------------- frases (separadas por silencios de 1 tiempo o más)
  const phrases: SoloPhrase[] = [];
  let p0 = 0;
  for (let i = 1; i <= sorted.length; i++) {
    const gap = i < sorted.length ? sorted[i].start - (sorted[i - 1].start + sorted[i - 1].dur) : Infinity;
    if (gap >= 0.99) {
      const ph = an.slice(p0, i);
      if (ph.length >= 2) {
        const f = ph[0], l = ph[ph.length - 1];
        const top = Math.max(...ph.map((x) => x.midi));
        const contour = l.midi > f.midi + 2 ? (top > l.midi + 2 ? 'sube y vuelve a bajar un poco' : 'ascendente') : l.midi < f.midi - 2 ? (top > f.midi + 2 ? 'en arco (sube y baja)' : 'descendente') : top > f.midi + 3 ? 'en arco' : 'más bien horizontal';
        const startTxt = onBeat(f.start) ? 'empieza en tiempo' : 'empieza a contratiempo';
        const endChord = opts.names.chord(evts[l.chordIdx].chord);
        const endTxt = isCT(l) ? `termina en la ${degName(l.degree)} de ${endChord}${l.role === 'guide' ? ' (nota guía: final muy claro)' : ''}` : `termina en la ${l.degree} de ${endChord} (final abierto, en tensión)`;
        phrases.push({ fromBar: barOf(f.start), toBar: barOf(l.start), notes: ph.length, text: `${ph.length} notas, ${startTxt}, contorno ${contour}; ${endTxt}.` });
      }
      p0 = i;
    }
  }

  // ---------------------------------------------------------------- qué practicar
  const practice: string[] = [];
  if (overall) practice.push(`Toca ${overall.scale} sobre la base de este fragmento antes de copiar el solo: es el "idioma" que usa.`);
  const top = devices.slice(0, 2);
  top.forEach((d) => practice.push(`${d.name} (c. ${d.bars.slice(0, 4).join(', ')}): aísla ese momento con el loop, cántalo y tócalo al 70 % de velocidad.`));
  if (phrases.length) {
    const best = [...phrases].sort((a, b) => b.notes - a.notes)[0];
    practice.push(`Aprende de memoria la frase de los compases ${best.fromBar}–${best.toBar} y guárdala en Mi vocabulario para practicarla en las 12 tonalidades.`);
  }
  if (strongCT < 0.5) practice.push('Haz una versión simplificada: toca solo las notas de los tiempos fuertes que son notas del acorde, y luego vuelve a añadir las demás.');
  practice.push('Toca encima del fragmento con el instrumento elegido silenciado («todo menos el instrumento»): imita primero, después improvisa con las mismas ideas.');

  return { summary, overall, perChord, devices, phrases, practice, annotated: an };
}
