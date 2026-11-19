// Repertorio tipo «Real Book»: lista filtrable de temas clásicos y página de práctica de cada tema
// (cifrado por instrumento, melodía, solos de ejemplo, base para improvisar y grabación original).
import { useEffect, useMemo, useState } from 'react';
import { LINKS_CHECKED, TAG_LABEL, TUNES, Tune, TuneTag, parseMelody, tuneById } from '../content/repertoire';
import { IDEAS, IdeaId, generateSolo } from '../theory/improv';
import { ChordEvent, keyInterval, parseChart, transposeEvents } from '../theory/progressions';
import { parseNote } from '../theory/notes';
import { LineNote } from '../theory/line';
import { fitLine } from '../theory/section';
import { INSTRUMENT_LABEL, InstrumentId, concertKeyToWritten } from '../theory/instruments';
import { STYLE_LABEL } from '../audio/backing';
import { useAppState } from '../progress/store';
import { Card, Segmented, soloRange, useNames, useTransposer } from '../components/common';
import { KeySelect } from '../components/ExerciseRunner';
import { SoloPlayer, PlayerPhrase } from '../components/SoloPlayer';
import { BackingPanel } from '../components/BackingPanel';
import { YouTubeEmbed } from '../components/YouTubeEmbed';
import { ImprovAnalyzer } from '../learn/ImprovAnalyzer';
import { FREE_TUNES } from '../product/plans';
import { ProBadge, ProNote } from '../components/ProNote';
import { trackFeature } from '../telemetry/telemetry';

/** En el plan gratuito, los primeros temas del repertorio están completos. */
export const tuneLocked = (plan: string, id: string) => plan !== 'pro' && TUNES.findIndex((t) => t.id === id) >= FREE_TUNES;

const LEVEL_NAME = ['', 'Inicial', 'Intermedio', 'Avanzado', 'Experto'];
const keyRootOf = (k: string) => k.replace(/m$/, '');
const isMinor = (k: string) => k.endsWith('m');

function useKeyLabel() {
  const t = useTransposer();
  const names = useNames();
  return (key: string) => {
    const root = parseNote(keyRootOf(key));
    const m = isMinor(key) ? ' menor' : ' mayor';
    if (!t.isSax) return `${names(root)}${m}`;
    return `${names(concertKeyToWritten(root, t.sax, isMinor(key)))}${m} (escrito) · ${names(root)}${m} concierto`;
  };
}

function Level({ n }: { n: number }) {
  return <span className="lvl" title={`Nivel ${LEVEL_NAME[n]}`}>{[1, 2, 3, 4].map((i) => <i key={i} className={i <= n ? 'on' : ''} />)}</span>;
}

export function RepertoirePage() {
  const s = useAppState();
  const inst = s.instrument;
  const keyLabel = useKeyLabel();
  const [q, setQ] = useState('');
  const [tag, setTag] = useState<TuneTag | 'all'>('all');
  const [lvl, setLvl] = useState(0);
  const [mine, setMine] = useState(false);
  const tags = Array.from(new Set(TUNES.flatMap((t) => t.tags))) as TuneTag[];
  const list = TUNES.filter((t) =>
    (tag === 'all' || t.tags.includes(tag)) && (!lvl || t.level === lvl) && (!mine || t.classicFor.includes(inst)) &&
    (!q || `${t.title} ${t.composer} ${t.recording.artist}`.toLowerCase().includes(q.toLowerCase())));
  return (
    <div className="page repertoire">
      <div className="page-hero rep-hero">
        <div>
          <h1>Repertorio</h1>
          <p className="lead">{TUNES.length} temas clásicos para tocar y seguir: cifrado completo para {INSTRUMENT_LABEL[inst].toLowerCase()}, melodía, solos de ejemplo, base a cualquier velocidad para improvisar encima y la grabación original.</p>
        </div>
      </div>
      <details className="note-box">
        <summary>¿Qué melodía suena? (derechos de autor)</summary>
        <p className="small">La armonía de un tema no está protegida, así que el cifrado es completo. Las melodías y los solos grabados de temas con derechos <b>no se reproducen</b>: en su lugar la app genera una <b>melodía de estudio original</b> sobre la misma armonía y <b>solos de ejemplo explicados</b>, y enlaza la grabación oficial para escuchar el tema real. Los temas tradicionales de dominio público (como «When the Saints») incluyen su melodía real.</p>
      </details>
      <div className="rep-filters">
        <input className="search" placeholder="Buscar tema, compositor o intérprete…" value={q} onChange={(e) => setQ(e.target.value)} />
        <div className="chip-row">
          <button className={`chip ${tag === 'all' ? 'on' : ''}`} onClick={() => setTag('all')}>Todos</button>
          {tags.map((g) => <button key={g} className={`chip ${tag === g ? 'on' : ''}`} onClick={() => setTag(g)}>{TAG_LABEL[g]}</button>)}
        </div>
        <div className="chip-row">
          {[0, 1, 2, 3].map((l) => <button key={l} className={`chip ${lvl === l ? 'on' : ''}`} onClick={() => setLvl(l)}>{l ? LEVEL_NAME[l] : 'Cualquier nivel'}</button>)}
          <button className={`chip ${mine ? 'on' : ''}`} onClick={() => setMine(!mine)}>⭐ Clásicos de {INSTRUMENT_LABEL[inst].toLowerCase()}</button>
        </div>
      </div>
      <div className="tune-grid">
        {list.map((t) => (
          <a key={t.id} className={`tune-card st-${t.style} ${tuneLocked(s.settings.plan, t.id) ? 'locked' : ''}`} href={`#/tema/${t.id}`}>
            <div className="tc-top">
              <span className="tc-style">{STYLE_LABEL[t.style].split(' (')[0]}{tuneLocked(s.settings.plan, t.id) && <> <ProBadge /></>}</span>
              <Level n={t.level} />
            </div>
            <h3>{t.title}</h3>
            <p className="tc-by">{t.composer} · {t.year}</p>
            <p className="tc-key">{keyLabel(t.key)}</p>
            <div className="tc-tags">
              <span className="pill">{t.form.split(',')[0]}</span>
              {t.melody && <span className="pill pd">Melodía real</span>}
              {t.classicFor.includes(inst) && <span className="pill star">⭐ {INSTRUMENT_LABEL[inst]}</span>}
            </div>
            <span className="tc-go">Tocar ›</span>
          </a>
        ))}
        {!list.length && <p className="muted">No hay temas con esos filtros.</p>}
      </div>
    </div>
  );
}

/** Consejos específicos del instrumento a partir del tipo de tema. */
function instrumentTips(t: Tune, inst: InstrumentId): string[] {
  const out: string[] = [];
  const has = (g: TuneTag) => t.tags.includes(g);
  if (inst === 'sax') {
    out.push('Lee el cifrado escrito para tu saxo (ya está transpuesto) y toca primero las fundamentales en redondas para aprender la forma.');
    if (has('blues')) out.push('Articulación: liga de a dos corcheas y acentúa el contratiempo (doo-BAH).');
    if (has('balada')) out.push('Sonido: notas largas con vibrato al final; respira cada 2 compases.');
    if (has('modal')) out.push('Patrones de 4 notas y pentatónicas desplazadas por la escala del modo.');
  } else if (inst === 'guitar') {
    out.push('Comping: shells de 3 notas (1-3-7) en las cuerdas 6-4-3 y 5-4-3; cambia de acorde con el mínimo movimiento.');
    if (has('latin')) out.push('Bossa: pulgar en las fundamentales (tiempos 1 y 3) y acordes sincopados con los dedos.');
    if (has('blues')) out.push('Solo: pentatónica menor en la posición de la tónica y busca la 3ª de cada acorde dentro de esa caja.');
    if (has('modal')) out.push('Voicings por cuartas que suben por la escala del modo.');
  } else {
    out.push('Mano izquierda: voicings sin fundamental (3-5-7-9 o 7-9-3-5); la mano derecha improvisa.');
    if (has('blues')) out.push('Prueba el «crushed note» del blues: Mi♭ y Mi a la vez sobre C7, soltando el Mi♭.');
    if (has('modal')) out.push('Voicing «So What»: tres cuartas y una tercera mayor, moviéndolo por la escala.');
    if (has('balada')) out.push('Toca la fundamental con la izquierda y deja sonar el pedal entre acordes.');
  }
  return out;
}

type Tab = 'tema' | 'solos' | 'improvisa';

export function TunePage({ id }: { id: string }) {
  const tune = tuneById(id);
  const s = useAppState();
  const t = useTransposer();
  const names = useNames();
  const keyLabel = useKeyLabel();
  const [key, setKey] = useState(tune ? keyRootOf(tune.key) : 'C');
  const [sec, setSec] = useState<number | null>(null);
  const [tab, setTab] = useState<Tab>('tema');
  const [idea, setIdea] = useState<IdeaId>(tune?.tags.includes('blues') ? 'blues' : 'targets');
  const [level, setLevel] = useState<1 | 2 | 3>(2);
  const [seed, setSeed] = useState(1);
  const range = soloRange(t.instrument, s.settings.saxType);

  const full = useMemo<ChordEvent[]>(() => {
    if (!tune) return [];
    const base = parseChart(tune.chart);
    return transposeEvents(base, keyInterval(parseNote(keyRootOf(tune.key)), parseNote(key)));
  }, [tune, key]);
  const semis = tune ? keyInterval(parseNote(keyRootOf(tune.key)), parseNote(key)).semitones : 0;
  const bars = tune?.sections[tune.sections.length - 1].toBar ?? 0;
  const win = sec === null || !tune ? null : tune.sections[sec];
  const events = useMemo(() => (win ? full.filter((e) => e.bar >= win.fromBar && e.bar <= win.toBar).map((e) => ({ ...e, bar: e.bar - win.fromBar })) : full), [full, win]);
  const keyRoot = parseNote(key);
  const minor = tune ? isMinor(tune.key) : false;
  const blues = tune ? tune.tags.includes('blues') : false;
  const from = win ? win.fromBar * 4 : 0;
  const to = win ? (win.toBar + 1) * 4 : (bars + 1) * 4;

  // melodía real (dominio público) o melodía de estudio generada
  const melody = useMemo(() => {
    if (!tune) return { notes: [] as LineNote[], phrases: [] as PlayerPhrase[], real: false, summary: '' };
    if (tune.melody) {
      const all = fitLine(parseMelody(tune.melody.notes).map((n) => ({ ...n, midi: n.midi + semis })), range);
      const notes = all.filter((n) => n.start >= from - 1e-9 && n.start < to - 1e-9).map((n) => ({ ...n, start: n.start - from }));
      const phrases = tune.sections.filter((x) => !win || x === win).map((x) => ({ start: x.fromBar * 4 - from, end: (x.toBar + 1) * 4 - from, title: `${x.label}`, text: 'Melodía real del tema. Tócala tal cual y después varíala: cambia el ritmo, adorna las notas largas o responde a cada frase.' }));
      return { notes, phrases, real: true, summary: tune.melody.source };
    }
    const solo = generateSolo({ events, keyRoot, minor, blues, range, level: 2, seed: [...tune.id].reduce((a, c) => a + c.charCodeAt(0), 0), idea: 'guide', names: { note: t.noteName, chord: t.chordName } });
    return { notes: solo.notes, phrases: solo.phrases, real: false, summary: 'Melodía de estudio ORIGINAL generada por la app sobre la armonía del tema (no es la melodía del tema). Sirve para aprender la forma y oír cada acorde; escucha la grabación oficial para conocer la melodía real.' };
  }, [tune, events, key, range.lo, range.hi, t.instrument, t.sax, s.settings.noteNames]); // eslint-disable-line react-hooks/exhaustive-deps

  const avail = IDEAS.filter((i) => blues || !i.needsBlues);
  const solo = useMemo(() => (tune ? generateSolo({ events, keyRoot, minor, blues, range, level, seed, idea, names: { note: t.noteName, chord: t.chordName } }) : null), [tune, events, key, level, seed, idea, range.lo, range.hi, t.instrument, t.sax, s.settings.noteNames]); // eslint-disable-line react-hooks/exhaustive-deps

  useEffect(() => { if (tune) trackFeature('tema', { id: tune.id }); }, [tune?.id]); // eslint-disable-line react-hooks/exhaustive-deps
  if (!tune) return <div className="page"><a className="back" href="#/repertorio">← Repertorio</a><p>Tema no encontrado.</p></div>;
  if (tuneLocked(s.settings.plan, tune.id)) return (
    <div className="page tune-page">
      <a href="#/repertorio" className="back">← Repertorio</a>
      <h1>{tune.title}</h1>
      <p className="lead">{tune.composer} · {tune.year} · {tune.form}</p>
      <ProNote feature="repertorio-completo" reason={`El plan gratuito incluye ${FREE_TUNES} temas completos. «${tune.title}» es parte del repertorio Pro.`} />
    </div>
  );
  const secLabel = win ? ` · ${win.label} (c. ${win.fromBar + 1}–${win.toBar + 1})` : '';
  const query = `${tune.title} ${tune.recording.artist}`;
  return (
    <div className="page tune-page">
      <a href="#/repertorio" className="back">← Repertorio</a>
      <div className={`tune-head st-${tune.style}`}>
        <div className="th-main">
          <span className="tc-style">{STYLE_LABEL[tune.style]}</span>
          <h1>{tune.title}</h1>
          <p className="lead">{tune.composer} · {tune.year} · {tune.form}</p>
          <div className="th-facts">
            <span><small>Tonalidad</small>{keyLabel(tune.key)}</span>
            <span><small>Tempo original</small>♩ ≈ {tune.tempo}</span>
            <span><small>Nivel</small><Level n={tune.level} /> {LEVEL_NAME[tune.level]}</span>
          </div>
        </div>
      </div>
      <p>{tune.about}</p>
      {tune.versionNote && <p className="warn small">ℹ {tune.versionNote}</p>}

      <Card title="🎧 Grabación original" className="listen-card">
        <p className="small">{tune.recording.artist} — <i>{tune.recording.album}</i> ({tune.recording.year}). Escúchala primero; después tócala aquí a tu velocidad.</p>
        <YouTubeEmbed key={tune.id} videos={tune.recording.youtube} query={query} checked={LINKS_CHECKED} />
      </Card>

      <div className="tune-controls">
        <KeySelect value={key} onChange={setKey} />
        <label className="field inline"><span>Sección</span>
          <select value={sec ?? 'all'} onChange={(e) => setSec(e.target.value === 'all' ? null : Number(e.target.value))}>
            <option value="all">Tema completo ({bars + 1} compases)</option>
            {tune.sections.map((x, i) => <option key={i} value={i}>{x.label} · c. {x.fromBar + 1}–{x.toBar + 1}</option>)}
          </select>
        </label>
        {t.isSax && <span className="pill">Cifrado y partitura escritos para saxo {s.settings.saxType}</span>}
      </div>

      <Segmented value={tab} onChange={setTab} options={[{ value: 'tema', label: melody.real ? '🎼 Tema (melodía real)' : '🎼 Tema (melodía de estudio)' }, { value: 'solos', label: '✨ Solos de ejemplo' }, { value: 'improvisa', label: '🎷 Improvisa tú' }]} />

      {tab === 'tema' && (
        <Card>
          <p className={melody.real ? 'hint small' : 'teacher small'}>{melody.summary}</p>
          {melody.notes.length > 0 ? (
            <SoloPlayer key={`${tune.id}-${key}-${sec}-${t.instrument}`} events={events} notes={melody.notes} keyRoot={keyRoot} blues={blues} style={tune.style} bpm={tune.practiceTempo}
              phrases={melody.phrases} title={`${tune.title}${secLabel}`} source={`Repertorio: ${tune.title}`} />
          ) : <p className="muted">No hay melodía para esta sección.</p>}
          <p className="muted small">Pulsa «Base (tocas tú)» para que suene solo el acompañamiento y toques la melodía o improvises. Usa la barra de tempo para practicar lento y subir poco a poco. El botón <b>Mezcla</b> de arriba elige qué instrumentos suenan.</p>
        </Card>
      )}

      {tab === 'solos' && solo && (
        <Card>
          <p className="small">Solos originales generados sobre la armonía de «{tune.title}», explicados nota a nota. Cambia la idea o pide otro ejemplo; guarda en tu vocabulario las frases que te gusten.</p>
          <div className="chip-row">{avail.map((i) => <button key={i.id} className={`chip ${idea === i.id ? 'on' : ''}`} onClick={() => { setIdea(i.id); setSeed(1); }} title={i.short}>{i.name}</button>)}</div>
          <div className="row gap wrap">
            <Segmented size="sm" value={level} onChange={setLevel} options={[{ value: 1, label: 'Sencillo' }, { value: 2, label: 'Medio' }, { value: 3, label: 'Avanzado' }]} />
            <button className="btn" onClick={() => setSeed(seed + 1)}>🎲 Otro ejemplo</button>
          </div>
          <SoloPlayer key={`${tune.id}-${key}-${sec}-${idea}-${level}-${seed}-${t.instrument}`} events={events} notes={solo.notes} keyRoot={keyRoot} blues={blues} style={tune.style} bpm={tune.practiceTempo}
            phrases={solo.phrases} title={solo.title} summary={solo.summary} source={`Repertorio: ${tune.title}`} />
        </Card>
      )}

      {tab === 'improvisa' && (
        <Card>
          <p className="small">Base completa para improvisar encima: elige velocidad, estilo y qué instrumentos suenan. El cifrado está en tu transposición y se ilumina el acorde que suena.</p>
          <BackingPanel key={`${tune.id}-${key}-${sec}`} events={events} style={tune.style} bpm={tune.practiceTempo} display="scales" showAnalysis={!win} sections={win ? undefined : tune.sections} />
          <details className="mic-analyze">
            <summary>🎤 Grabarme y analizar mi improvisación</summary>
            <ImprovAnalyzer events={events} keyRoot={keyRoot} blues={blues} style={tune.style} bpm={tune.practiceTempo} />
          </details>
        </Card>
      )}

      <div className="grid2">
        <Card title="Claves para improvisar">
          <ul>{tune.tips.map((x) => <li key={x}>{x}</li>)}</ul>
        </Card>
        <Card title={`En tu ${INSTRUMENT_LABEL[t.instrument].toLowerCase()}`}>
          <ul>{instrumentTips(tune, t.instrument).map((x) => <li key={x}>{x}</li>)}</ul>
          {tune.songId && <a className="btn" href={`#/cancion/${tune.songId}`}>📘 Análisis completo y tareas</a>}
        </Card>
      </div>
      <span className="hidden">{names(keyRoot)}</span>
    </div>
  );
}
