// Ficha de un músico: rasgos de su lenguaje, qué escuchar y dónde estudiar sus frases reales (libros
// oficiales, en la clave de tu instrumento). La app no reproduce sus solos: las frases que genera son
// originales, construidas con estos recursos.
import { Clef, GREATS_CHECKED, Great, LICK_SOURCES, greatById } from '../content/greats';
import { useAppState } from '../progress/store';

export function clefFor(instrument: string, sax: 'tenor' | 'alto'): Clef {
  return instrument === 'sax' ? (sax === 'tenor' ? 'Bb' : 'Eb') : 'C';
}
const CLEF_LABEL: Record<Clef, string> = { C: 'Do', Bb: 'Si♭', Eb: 'Mi♭' };

export function GreatPanel({ id, compact }: { id: Great['id']; compact?: boolean }) {
  const app = useAppState();
  const g = greatById(id);
  const clef = clefFor(app.instrument, app.settings.saxType);
  const books = [...g.books].sort((a, b) => Number(b.clef === clef) - Number(a.clef === clef));
  return (
    <div className="great">
      <div className="great-head">
        <b>{g.name}</b>{g.nickname && <span className="muted"> «{g.nickname}»</span>}
        <span className="muted small"> · {g.instrument} · {g.era}</span>
      </div>
      <div className={compact ? '' : 'grid2'}>
        <div>
          <h4>Rasgos de su lenguaje</h4>
          <ul className="small">{g.traits.map((t) => <li key={t}>{t}</li>)}</ul>
        </div>
        <div>
          <h4>🎧 Escucha</h4>
          <ul className="small">{g.listen.map((t) => <li key={t}>{t}</li>)}</ul>
        </div>
      </div>
      <h4>📚 Sus frases reales, de forma legal</h4>
      {books.length ? (
        <ul className="small great-books">
          {books.map((b) => (
            <li key={b.url}><a href={b.url} target="_blank" rel="noopener noreferrer">{b.label}</a>{b.clef === clef && <span className="badge"> para tu instrumento ({CLEF_LABEL[clef]})</span>}{b.note && <span className="muted"> · {b.note}</span>}</li>
          ))}
        </ul>
      ) : <p className="small muted">Transcribe sus frases de las grabaciones con «Sacar solos» (velocidad lenta, bucle y separación del instrumento).</p>}
      <p className="small muted">Las frases que toca la app son originales, construidas con estos recursos: no son transcripciones (sus solos y los libros que los transcriben tienen derechos de autor). Enlaces comprobados el {GREATS_CHECKED}.</p>
    </div>
  );
}

export function LickSources() {
  return (
    <ul className="small great-books">
      {LICK_SOURCES.map((b) => <li key={b.url}><a href={b.url} target="_blank" rel="noopener noreferrer">{b.label}</a></li>)}
    </ul>
  );
}
