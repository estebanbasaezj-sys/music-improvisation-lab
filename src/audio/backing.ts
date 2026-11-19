// Generador de acompañamientos (piano/Rhodes/guitarra, contrabajo, batería) a partir de una progresión.
// La generación es una función pura y determinista (semilla) para poder testearla; el reproductor la
// agenda en Tone.Transport en ticks, por lo que cambiar el tempo durante la reproducción mantiene la sincronía.
import { Chord, chordNotes, voicing } from '../theory/chords';
import { ChordEvent } from '../theory/progressions';
import { IV, midi, pc, transposeNote } from '../theory/notes';
import { rng } from './rng';
import { DrumHit, Tone, Voice, click, endActivity, ensureAudio, getMix, registerActivity, swingBeat, swingRatio, triggerDrum, triggerNotes } from './engine';

export type BackingStyle = 'swing' | 'blues' | 'ballad' | 'bossa' | 'funk';
export type CompInstrument = 'piano' | 'rhodes';
export const STYLE_LABEL: Record<BackingStyle, string> = {
  swing: 'Swing (walking)',
  blues: 'Blues shuffle',
  ballad: 'Balada (escobillas)',
  bossa: 'Bossa nova',
  funk: 'Funk / soul jazz (corcheas rectas)',
};
export const COMP_LABEL: Record<CompInstrument, string> = { piano: 'Piano de cola', rhodes: 'Rhodes' };

export interface BackingNote {
  part: 'comp' | 'gtr' | 'bass' | 'drum' | 'melody'; // comp = teclado (piano/Rhodes), gtr = guitarra
  beat: number; // tiempo dentro del chorus (sin swing aplicado)
  dur: number;
  midis: number[];
  vel: number;
  hit?: DrumHit;
  idx?: number; // índice de nota de melodía
}

export { rng };

const BASS_LO = 28; // E1
const BASS_HI = 50; // D3

function nearestInRange(pitchClass: number, target: number, lo = BASS_LO, hi = BASS_HI): number {
  let best = lo;
  let bd = Infinity;
  for (let m = lo; m <= hi; m++) if (((m % 12) + 12) % 12 === pitchClass && Math.abs(m - target) < bd) { bd = Math.abs(m - target); best = m; }
  return best;
}
function chordTonePc(c: Chord, deg: string): number {
  const i = c.quality.degrees.indexOf(deg);
  if (i >= 0) return pc(chordNotes(c)[i]);
  return pc(transposeNote(c.root, IV[deg]));
}
const fifthPc = (c: Chord) => chordTonePc(c, c.quality.degrees.find((g) => g === '5' || g === 'b5' || g === '#5') ?? '5');
const thirdPc = (c: Chord) => chordTonePc(c, c.quality.degrees.find((g) => g === '3' || g === 'b3' || g === '4') ?? '3');
const seventhPc = (c: Chord) => chordTonePc(c, c.quality.degrees.find((g) => g === 'b7' || g === '7' || g === 'bb7' || g === '6') ?? 'b7');
const secondPc = (c: Chord) => chordTonePc(c, c.quality.id === 'm7b5' || c.quality.id === 'dim7' || c.quality.id === '7b9' ? 'b2' : '2');

const fold = (m: number) => { while (m < BASS_LO) m += 12; while (m > BASS_HI) m -= 12; return m; };

/** Walking bass: fundamental en el tiempo 1, notas del acorde o de paso, aproximación al siguiente acorde. */
export function walkingBass(evts: ChordEvent[], seed = 7): BackingNote[] {
  const r = rng(seed);
  const out: BackingNote[] = [];
  let beat = 0;
  let prev = 36;
  evts.forEach((e, i) => {
    const next = evts[(i + 1) % evts.length].chord;
    const root = nearestInRange(pc(e.chord.root), prev);
    const nextRoot = nearestInRange(pc(next.root), root);
    const up = nextRoot >= root;
    const approachOpts = [nextRoot + (up ? -1 : 1), nextRoot + (up ? 1 : -1), nearestInRange((pc(next.root) + 7) % 12, nextRoot + (up ? -5 : 5))];
    const approach = approachOpts[r() < 0.6 ? 0 : r() < 0.6 ? 1 : 2];
    const third = nearestInRange(thirdPc(e.chord), root + (up ? 4 : -8));
    const fifth = nearestInRange(fifthPc(e.chord), root + (up ? 7 : -5));
    const second = nearestInRange(secondPc(e.chord), root + 2);
    const seventh = nearestInRange(seventhPc(e.chord), root - 2);
    const line: number[] = [];
    if (e.beats >= 4) {
      const patterns = up ? [[root, third, fifth], [root, second, third], [root, fifth, third], [root, root + 12 <= BASS_HI ? root + 12 : fifth, fifth]] : [[root, seventh, fifth], [root, fifth, third], [root, third, second]];
      line.push(...patterns[Math.floor(r() * patterns.length)], approach);
      for (let b = 4; b < e.beats; b++) line.splice(line.length - 1, 0, b % 2 ? fifth : third);
    } else if (e.beats >= 2) {
      line.push(root, approach);
      for (let b = 2; b < e.beats; b++) line.splice(1, 0, fifth);
    } else line.push(root);
    line.forEach((m, k) => out.push({ part: 'bass', beat: beat + k, dur: 0.95, midis: [fold(m)], vel: k === 0 ? 0.95 : 0.8 + r() * 0.1 }));
    prev = line[line.length - 1];
    beat += e.beats;
  });
  return out;
}

/** Voicings sin fundamental (A/B) para el acompañante, con conducción de voces. */
export function compVoicings(evts: ChordEvent[]): number[][] {
  let prevCentroid = 60;
  return evts.map((e) => {
    const isSeventh = e.chord.quality.degrees.length >= 4;
    const cands = isSeventh
      ? [voicing(e.chord, 'rootlessA', 50), voicing(e.chord, 'rootlessB', 50), voicing(e.chord, 'rootlessA', 56), voicing(e.chord, 'rootlessB', 56)]
      : [voicing(e.chord, 'root', 55), voicing(e.chord, 'inv1', 55), voicing(e.chord, 'inv2', 52)];
    let best = cands[0].map(midi);
    let bd = Infinity;
    for (const c of cands) {
      const ms = c.map(midi);
      if (ms[ms.length - 1] > 74 || ms[0] < 50) continue;
      const cen = ms.reduce((a, b) => a + b, 0) / ms.length;
      const d = Math.abs(cen - prevCentroid) + Math.abs(cen - 61) * 0.3;
      if (d < bd) { bd = d; best = ms; }
    }
    prevCentroid = best.reduce((a, b) => a + b, 0) / best.length;
    return best;
  });
}
/** Shells de guitarra (1-3-7 / 1-7-3) en registro medio-grave, para comping estilo Freddie Green. */
function guitarShell(c: Chord): number[] {
  const root = nearestInRange(pc(c.root), 45, 40, 52);
  const t = nearestInRange(thirdPc(c), root + 10, root + 3, root + 16);
  const s = nearestInRange(seventhPc(c), root + 10, root + 8, root + 16);
  return [root, Math.min(t, s), Math.max(t, s)];
}

const SWING_COMP = [[0, 1.5], [1.5, 3], [0, 2.5], [1, 2.5], [0.5, 2], [-0.5, 1.5]];

/**
 * Genera un chorus de acompañamiento. Siempre incluye teclado (`comp`) y guitarra (`gtr`) por separado,
 * para que el mezclador global pueda hacer sonar uno, otro o ambos sin regenerar.
 */
export function generateBacking(evts: ChordEvent[], style: BackingStyle, seed = 11): BackingNote[] {
  const r = rng(seed);
  const out: BackingNote[] = [];
  const total = evts.reduce((s, e) => s + e.beats, 0);
  const voices = compVoicings(evts);
  if (style === 'swing') out.push(...walkingBass(evts, seed));
  let beat = 0;
  evts.forEach((e, i) => {
    const root = nearestInRange(pc(e.chord.root), 38);
    const fifth = nearestInRange(fifthPc(e.chord), root + 7);
    const third = nearestInRange(thirdPc(e.chord), root + 4);
    const v = voices[i];
    const nextV = voices[(i + 1) % evts.length];
    const g = guitarShell(e.chord);
    const at = (p: number) => ((beat + p) % total + total) % total;
    const pushComp = (p: number, dur: number, vel: number, notes = v) => out.push({ part: 'comp', beat: at(p), dur, midis: notes, vel });
    const pushGtr = (p: number, dur: number, vel: number, notes = g) => out.push({ part: 'gtr', beat: at(p), dur, midis: notes, vel });
    if (style === 'blues') {
      const six = nearestInRange(chordTonePc(e.chord, '6'), root + 9);
      const b7 = nearestInRange(chordTonePc(e.chord, 'b7'), root + 10);
      const pattern = e.bar % 2 === 0 ? [root, third, fifth, six] : [b7, six, fifth, third];
      for (let b = 0; b < e.beats; b++) out.push({ part: 'bass', beat: beat + b, dur: 0.85, midis: [pattern[b % 4]], vel: 0.85 });
      for (let b = 0; b < e.beats; b++) if (b % 2 === 1) pushComp(b, 0.35, 0.55 + r() * 0.1);
      // guitarra: shells cortos en los cuatro tiempos, acento en 2 y 4
      for (let b = 0; b < e.beats; b++) pushGtr(b, 0.3, b % 2 ? 0.6 : 0.42);
    } else if (style === 'ballad') {
      for (let b = 0; b < e.beats; b += 2) out.push({ part: 'bass', beat: beat + b, dur: 1.9, midis: [b === 0 ? root : fifth], vel: 0.8 });
      pushComp(0, e.beats * 0.95, 0.45);
      if (e.beats >= 4) pushComp(2.5, 1.4, 0.3, [v[v.length - 1] + 12 <= 84 ? v[v.length - 1] + 12 : v[v.length - 1]]);
      // guitarra: acorde arpegiado suave al inicio de cada acorde (y a mitad si dura 4)
      pushGtr(0, Math.min(e.beats, 2) * 0.95, 0.4);
      if (e.beats >= 4) pushGtr(2, 1.9, 0.32);
    } else if (style === 'bossa') {
      for (let b = 0; b < e.beats; b += 2) {
        out.push({ part: 'bass', beat: beat + b, dur: 1.4, midis: [root], vel: 0.85 });
        out.push({ part: 'bass', beat: beat + b + 1.5, dur: 0.45, midis: [fifth - 12 >= BASS_LO ? fifth - 12 : fifth], vel: 0.7 });
      }
      // guitarra: el patrón sincopado de la bossa; teclado: colchón sostenido más discreto
      const pat = e.bar % 2 === 0 ? [0, 1.5, 3] : [0.5, 2];
      pat.filter((p) => p < e.beats).forEach((p) => pushGtr(p, 0.9, 0.5));
      pushComp(0, e.beats * 0.9, 0.32);
    } else if (style === 'funk') {
      // bajo sincopado (fundamental, octava, 5ª y aproximación), teclado y guitarra en golpes cortos
      const oct = root + 12 <= BASS_HI ? root + 12 : root;
      const b7 = nearestInRange(chordTonePc(e.chord, 'b7'), root + 10);
      const bassPat: [number, number, number][] = e.beats >= 4
        ? [[0, root, 0.9], [1.5, root, 0.4], [2, oct, 0.4], [2.75, fifth, 0.25], [3.5, e.chord.quality.id === 'maj7' ? fifth : b7, 0.4]]
        : [[0, root, 0.9], [1.5, oct, 0.4]];
      bassPat.forEach(([p, m, d]) => out.push({ part: 'bass', beat: beat + p, dur: d, midis: [m], vel: p === 0 ? 0.9 : 0.72 }));
      [1.5, 3].filter((p) => p < e.beats).forEach((p) => pushComp(p, 0.3, 0.5 + r() * 0.1));
      [0.5, 1.75, 2.5, 3.5].filter((p) => p < e.beats).forEach((p) => pushGtr(p, 0.18, 0.45));
    } else {
      // swing: guitarra a cuatro (estilo Freddie Green) + piano con comping rítmico y anticipaciones
      for (let b = 0; b < e.beats; b++) pushGtr(b, 0.45, b % 2 ? 0.55 : 0.65);
      const pat = e.beats >= 4 ? SWING_COMP[Math.floor(r() * SWING_COMP.length)] : [r() < 0.3 ? -0.5 : 0];
      // -0.5 = anticipación: el acorde llega medio tiempo antes (se toca el voicing del acorde siguiente)
      pat.forEach((p) => (p < 0 ? pushComp(p, 0.9, 0.55, v) : pushComp(p, p % 1 ? 0.4 : 0.8, 0.45 + r() * 0.15)));
      if (e.beats >= 4 && r() < 0.25) pushComp(3.5, 0.9, 0.5, nextV); // empuje al siguiente acorde
    }
    beat += e.beats;
  });
  // ---- batería ----
  const D = (b: number, hit: DrumHit, vel: number) => out.push({ part: 'drum', beat: b, dur: 0.1, midis: [], vel, hit });
  for (let b = 0; b < total; b++) {
    const inBar = b % 4;
    const lastBar = b >= total - 4;
    if (style === 'swing') {
      D(b, inBar % 2 ? 'ride' : 'ride_soft', inBar % 2 ? 0.8 : 0.65);
      if (inBar % 2 === 1) D(b + 0.5, 'ride_soft', 0.5);
      if (inBar % 2 === 1) D(b, 'hh_pedal', 0.7);
      D(b, 'kick_soft', 0.22);
      if (r() < 0.12) D(b + 0.5, 'snare_ghost', 0.35 + r() * 0.2);
      if (lastBar && inBar === 3) D(b + 0.5, 'snare', 0.6);
    } else if (style === 'blues') {
      D(b, 'hh_closed', 0.7);
      D(b + 0.5, 'hh_closed', 0.45);
      if (inBar % 2 === 0) D(b, 'kick', 0.7);
      else D(b, 'snare', 0.75);
      if (r() < 0.15) D(b + 0.5, 'snare_ghost', 0.3);
    } else if (style === 'ballad') {
      if (inBar % 2 === 0) out.push({ part: 'drum', beat: b, dur: 1.9, midis: [], vel: 0.5, hit: 'brush_swirl' });
      else D(b, 'brush_tap', 0.55);
      if (inBar % 2 === 1) D(b, 'hh_pedal', 0.5);
      if (inBar === 0) D(b, 'kick_soft', 0.3);
    } else if (style === 'funk') {
      D(b, 'hh_closed', 0.6);
      D(b + 0.5, 'hh_closed', 0.4);
      if (inBar === 0) D(b, 'kick', 0.85);
      if (inBar === 1) D(b + 0.5, 'kick', 0.6);
      if (inBar === 2 && r() < 0.6) D(b + 0.5, 'kick', 0.55);
      if (inBar % 2 === 1) D(b, 'snare', 0.85);
      if (r() < 0.2) D(b + 0.75, 'snare_ghost', 0.3);
      if (lastBar && inBar === 3) D(b + 0.5, 'hh_open', 0.5);
    } else {
      D(b, 'hh_closed', 0.45);
      D(b + 0.5, 'hh_closed', 0.3);
      if (inBar === 0 || inBar === 2) D(b, 'kick_soft', 0.6);
      if (inBar === 1 || inBar === 3) D(b + 0.5, 'kick_soft', 0.45);
      const barIdx = Math.floor(b / 4);
      const rim = barIdx % 2 === 0 ? [0, 1.5, 3] : [1, 2.5];
      if (rim.includes(inBar)) D(b, 'stick', 0.55);
      if (rim.includes(inBar + 0.5)) D(b + 0.5, 'stick', 0.55);
    }
  }
  return out;
}

export const isSwung = (s: BackingStyle) => s === 'swing' || s === 'blues';
export { swingBeat };

// ---------------- Reproductor ----------------

export interface BackingOptions {
  style: BackingStyle;
  bpm: number;
  countIn: boolean;
  metronome: boolean;
  /** silencios locales (además del mezclador global), p.ej. sin piano cuando el alumno toca el piano */
  mute?: { piano?: boolean; guitar?: boolean; bass?: boolean; drums?: boolean };
  /** se llama siempre que el acompañamiento se detiene, también desde el botón global «Detener» */
  onStop?: () => void;
  onChord?: (index: number) => void;
  onBeat?: (beatInChorus: number, chorus: number) => void;
  onMelodyNote?: (index: number) => void;
  melodyVoice?: Voice;
  melodyOn?: boolean;
  humanize?: boolean;
}

export class BackingPlayer {
  private part: Tone.Part | null = null;
  private countIds: number[] = [];
  opts: BackingOptions;
  playing = false;

  constructor(opts: BackingOptions) {
    this.opts = opts;
  }

  setTempo(bpm: number) {
    this.opts.bpm = bpm;
    Tone.getTransport().bpm.rampTo(bpm, 0.05);
  }

  async start(evts: ChordEvent[], melody: { beat: number; dur: number; midi: number }[] = []) {
    await ensureAudio();
    this.stop(true);
    registerActivity('transport', this.stopper);
    own('transport', this.stopper);
    const tr = Tone.getTransport();
    tr.cancel();
    tr.bpm.value = this.opts.bpm;
    tr.position = 0;
    const PPQ = tr.PPQ;
    const total = evts.reduce((s, e) => s + e.beats, 0);
    const notes = generateBacking(evts, this.opts.style, Math.floor(Math.random() * 1e6));
    melody.forEach((m, i) => notes.push({ part: 'melody', beat: m.beat, dur: m.dur, midis: [m.midi], vel: 0.85, idx: i }));
    const swung = isSwung(this.opts.style);
    const ratio = swingRatio(this.opts.bpm);
    const tick = (beat: number) => `${Math.round((swung ? swingBeat(beat, ratio) : beat) * PPQ)}i`;
    type Ev = { time: string; n?: BackingNote; chordIdx?: number; beat?: number; jitter: number };
    const human = this.opts.humanize !== false;
    const events: Ev[] = notes.map((n) => ({ time: tick(n.beat), n, jitter: human && n.part !== 'melody' ? (Math.random() - 0.5) * 0.012 : 0 }));
    let acc = 0;
    evts.forEach((e, i) => { events.push({ time: tick(acc), chordIdx: i, jitter: 0 }); acc += e.beats; });
    for (let b = 0; b < total; b++) events.push({ time: tick(b), beat: b, jitter: 0 });
    let chorus = 0;
    const offset = this.opts.countIn ? 4 * PPQ : 0;
    const kit = this.opts.style === 'ballad' ? 'brush' : 'jazz';
    this.part = new Tone.Part((time, ev: Ev) => {
      const spb = 60 / tr.bpm.value;
      const t = Math.max(Tone.now(), time + ev.jitter);
      if (ev.n) {
        const n = ev.n;
        const d = n.dur * spb;
        const m = this.opts.mute ?? {};
        const { layers: L, keys } = getMix();
        const v = human ? Math.min(1, n.vel * (0.9 + Math.random() * 0.2)) : n.vel;
        if (n.part === 'melody') {
          if (this.opts.melodyOn !== false && L.melody) triggerNotes(this.opts.melodyVoice ?? 'sax', n.midis, d * 0.95, t, n.vel, 'melody');
          const idx = n.idx!;
          Tone.getDraw().schedule(() => this.opts.onMelodyNote?.(idx), time);
        } else if (n.part === 'comp') { if (L.piano && !m.piano) triggerNotes(keys, n.midis, d, t, L.guitar ? v * 0.85 : v, 'comp'); }
        else if (n.part === 'gtr') { if (L.guitar && !m.guitar) triggerNotes('guitar', n.midis, d, t, L.piano ? v * 0.8 : v, 'comp'); }
        else if (n.part === 'bass') { if (L.bass && !m.bass) triggerNotes('bass', n.midis, d, t, v, 'comp'); }
        else if (n.part === 'drum' && L.drums && !m.drums && n.hit) triggerDrum(n.hit, t, v, kit);
      }
      if (ev.chordIdx !== undefined) {
        const idx = ev.chordIdx;
        if (idx === 0 && this.playing) chorus++;
        Tone.getDraw().schedule(() => this.opts.onChord?.(idx), time);
      }
      if (ev.beat !== undefined) {
        const b = ev.beat;
        if (this.opts.metronome || getMix().layers.click) click(time, b % 4 === 0);
        const c = chorus;
        Tone.getDraw().schedule(() => this.opts.onBeat?.(b, c), time);
      }
    }, events);
    this.part.loop = true;
    this.part.loopStart = 0;
    this.part.loopEnd = `${total * PPQ}i`;
    this.part.start(`${offset}i`);
    if (this.opts.countIn) {
      for (let b = 0; b < 4; b++) {
        this.countIds.push(tr.schedule((time) => {
          click(time, b === 0);
          if (b === 0 || b === 2) triggerDrum('hh_pedal', time, 0.6);
          Tone.getDraw().schedule(() => this.opts.onBeat?.(-4 + b, 0), time);
        }, `${b * PPQ}i`));
      }
    }
    this.playing = true;
    tr.start('+0.1');
  }

  private stopper = () => this.stop();

  /** `restarting`: se va a volver a arrancar enseguida, así que no avisa a la interfaz. */
  stop(restarting = false) {
    const was = this.playing;
    const tr = Tone.getTransport();
    tr.stop();
    this.countIds.forEach((id) => tr.clear(id));
    this.countIds = [];
    this.part?.dispose();
    this.part = null;
    this.playing = false;
    endActivityIf('transport', this.stopper);
    if (was && !restarting) this.opts.onStop?.();
  }
}

// ---------------- Metrónomo independiente ----------------
let metroLoop: Tone.Loop | null = null;
let metroOnStop: (() => void) | undefined;
const metroStopper = () => stopMetronome();
export async function startMetronome(bpm: number, beatsPerBar = 4, onBeat?: (b: number) => void, onStop?: () => void) {
  await ensureAudio();
  if (metroLoop) { metroLoop.dispose(); metroLoop = null; }
  registerActivity('transport', metroStopper);
  own('transport', metroStopper);
  metroOnStop = onStop;
  const tr = Tone.getTransport();
  tr.cancel();
  tr.bpm.value = bpm;
  let b = 0;
  metroLoop = new Tone.Loop((time) => {
    const beat = b % beatsPerBar;
    click(time, beat === 0);
    Tone.getDraw().schedule(() => onBeat?.(beat), time);
    b++;
  }, '4n').start(0);
  tr.start('+0.05');
}
export function stopMetronome() {
  const was = !!metroLoop;
  metroLoop?.dispose();
  metroLoop = null;
  if (!was) return;
  Tone.getTransport().stop();
  endActivityIf('transport', metroStopper);
  const cb = metroOnStop;
  metroOnStop = undefined;
  cb?.();
}

// el transporte es compartido: solo se borra el registro si sigue siendo nuestro
const owners = new Map<string, () => void>();
function endActivityIf(id: string, fn: () => void) {
  if (owners.get(id) === fn) { owners.delete(id); endActivity(id); }
}
function own(id: string, fn: () => void) { owners.set(id, fn); }
export function setTransportBpm(bpm: number) {
  Tone.getTransport().bpm.value = bpm;
}
