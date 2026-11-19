// Ilustraciones e íconos propios (SVG dibujado para la app): instrumentos con personaje, íconos de los
// nodos del camino y de la navegación. Sin dependencias ni recursos externos.
import type { InstrumentId } from '../theory/instruments';

type Mood = 'happy' | 'wow' | 'sad' | 'none';

function Face({ x, y, gap = 16, r = 4.4, mood = 'happy' }: { x: number; y: number; gap?: number; r?: number; mood?: Mood }) {
  if (mood === 'none') return null;
  const lx = x - gap / 2;
  const rx = x + gap / 2;
  return (
    <g className="face">
      <g className="eyes">
        <ellipse cx={lx} cy={y} rx={r} ry={r * 1.15} fill="#fff" />
        <ellipse cx={rx} cy={y} rx={r} ry={r * 1.15} fill="#fff" />
        <circle cx={lx + r * 0.2} cy={y + r * 0.15} r={r * 0.62} fill="#1d1f2b" />
        <circle cx={rx + r * 0.2} cy={y + r * 0.15} r={r * 0.62} fill="#1d1f2b" />
        <circle cx={lx + r * 0.45} cy={y - r * 0.2} r={r * 0.22} fill="#fff" />
        <circle cx={rx + r * 0.45} cy={y - r * 0.2} r={r * 0.22} fill="#fff" />
      </g>
      <ellipse cx={lx - r * 0.6} cy={y + r * 2} rx={r * 0.9} ry={r * 0.5} fill="#ff7a8a" opacity=".45" />
      <ellipse cx={rx + r * 0.6} cy={y + r * 2} rx={r * 0.9} ry={r * 0.5} fill="#ff7a8a" opacity=".45" />
      {mood === 'happy' && <path d={`M${x - r * 1.1} ${y + r * 1.7} q ${r * 1.1} ${r * 1.3} ${r * 2.2} 0`} stroke="#1d1f2b" strokeWidth={r * 0.42} fill="none" strokeLinecap="round" />}
      {mood === 'wow' && <ellipse cx={x} cy={y + r * 2.1} rx={r * 0.65} ry={r * 0.8} fill="#1d1f2b" />}
      {mood === 'sad' && <path d={`M${x - r} ${y + r * 2.5} q ${r} ${-r * 1.1} ${r * 2} 0`} stroke="#1d1f2b" strokeWidth={r * 0.42} fill="none" strokeLinecap="round" />}
    </g>
  );
}

function Sax({ mood }: { mood: Mood }) {
  return (
    <g>
      {/* boquilla y tudel */}
      <path d="M70 6 l12 -3 l3 9 l-12 3 z" fill="#2b2d3a" />
      <path d="M76 12 C 70 18, 64 20, 61 30" stroke="#d9a032" strokeWidth="7" fill="none" strokeLinecap="round" />
      {/* cuerpo */}
      <path d="M60 30 L 55 78 C 53 104, 90 108, 94 84 L 96 70" stroke="#c78a1d" strokeWidth="26" fill="none" strokeLinecap="round" />
      <path d="M60 30 L 55 78 C 53 104, 90 108, 94 84 L 96 70" stroke="#f4b63b" strokeWidth="21" fill="none" strokeLinecap="round" />
      <path d="M57 36 L 53 76" stroke="#ffd77a" strokeWidth="4" fill="none" strokeLinecap="round" opacity=".8" />
      {/* campana */}
      <ellipse cx="99" cy="62" rx="17" ry="10" transform="rotate(-28 99 62)" fill="#c78a1d" />
      <ellipse cx="99.5" cy="61" rx="13" ry="7" transform="rotate(-28 99.5 61)" fill="#8a5a10" />
      {/* llaves */}
      {[40, 50, 60].map((y, i) => <circle key={y} cx={66 - i * 0.4} cy={y} r="3.6" fill="#fff3cf" stroke="#b07a18" strokeWidth="1.4" />)}
      <path d="M68 40 L 70 62" stroke="#b07a18" strokeWidth="1.6" />
      <Face x={74} y={88} gap={15} r={4.2} mood={mood} />
    </g>
  );
}

function Guitar({ mood }: { mood: Mood }) {
  return (
    <g>
      {/* clavijero y mástil */}
      <rect x="52" y="2" width="16" height="15" rx="4" fill="#6b3f22" />
      {[5, 9.5, 14].map((y) => <g key={y}><circle cx="49" cy={y} r="2.2" fill="#e9d8b4" /><circle cx="71" cy={y} r="2.2" fill="#e9d8b4" /></g>)}
      <rect x="55" y="15" width="10" height="40" fill="#4a2a17" />
      {[22, 29, 36, 43, 50].map((y) => <line key={y} x1="55" x2="65" y1={y} y2={y} stroke="#c9b48a" strokeWidth="1" />)}
      {/* cuerpo */}
      <path d="M60 46 C 76 46, 83 56, 79 67 C 77 73, 90 77, 88 94 C 86 111, 72 117, 60 117 C 48 117, 34 111, 32 94 C 30 77, 43 73, 41 67 C 37 56, 44 46, 60 46 Z" fill="#b9622a" />
      <path d="M60 49 C 74 49, 80 57, 76 67 C 74 74, 86 78, 85 94 C 83 108, 71 113, 60 113 C 49 113, 37 108, 35 94 C 34 78, 46 74, 44 67 C 40 57, 46 49, 60 49 Z" fill="#ec9445" />
      <ellipse cx="50" cy="60" rx="5" ry="8" fill="#ffc07a" opacity=".55" />
      {/* boca (agujero) como boca del personaje */}
      <circle cx="60" cy="86" r="8" fill="#3b2416" />
      <circle cx="60" cy="86" r="10" fill="none" stroke="#7a4524" strokeWidth="1.6" />
      <rect x="50" y="101" width="20" height="4" rx="1.5" fill="#4a2a17" />
      {[57, 59, 61, 63].map((x) => <line key={x} x1={x} x2={x} y1="15" y2="103" stroke="#f5e6c8" strokeWidth=".7" opacity=".8" />)}
      {mood !== 'none' && <Face x={60} y={68} gap={18} r={4.4} mood="none" />}
      {mood !== 'none' && (
        <g>
          <ellipse cx="51" cy="68" rx="4.4" ry="5" fill="#fff" /><ellipse cx="69" cy="68" rx="4.4" ry="5" fill="#fff" />
          <circle cx="52" cy="68.6" r="2.7" fill="#1d1f2b" /><circle cx="70" cy="68.6" r="2.7" fill="#1d1f2b" />
          <circle cx="53" cy="67" r="1" fill="#fff" /><circle cx="71" cy="67" r="1" fill="#fff" />
          <ellipse cx="45" cy="77" rx="4" ry="2.2" fill="#ff7a8a" opacity=".5" /><ellipse cx="75" cy="77" rx="4" ry="2.2" fill="#ff7a8a" opacity=".5" />
          {mood === 'sad' && <path d="M46 61 l8 2 M74 61 l-8 2" stroke="#4a2a17" strokeWidth="1.8" strokeLinecap="round" />}
        </g>
      )}
    </g>
  );
}

function Piano({ mood }: { mood: Mood }) {
  return (
    <g>
      <rect x="14" y="14" width="92" height="13" rx="6" fill="#262a40" />
      <rect x="18" y="22" width="84" height="80" rx="14" fill="#3d4466" />
      <rect x="18" y="22" width="84" height="80" rx="14" fill="none" stroke="#2b3050" strokeWidth="3" />
      <rect x="26" y="28" width="68" height="34" rx="9" fill="#4a5280" opacity=".7" />
      {/* teclado */}
      <rect x="20" y="70" width="80" height="24" rx="4" fill="#fdfcf7" />
      {[30, 40, 50, 60, 70, 80, 90].map((x) => <line key={x} x1={x} x2={x} y1="70" y2="94" stroke="#c9c6bb" strokeWidth="1.2" />)}
      {[27, 37, 57, 67, 77].map((x) => <rect key={x} x={x} y="70" width="6" height="14" rx="1.5" fill="#1e2133" />)}
      <rect x="20" y="68" width="80" height="4" rx="2" fill="#262a40" />
      <rect x="24" y="100" width="9" height="14" rx="3" fill="#262a40" />
      <rect x="87" y="100" width="9" height="14" rx="3" fill="#262a40" />
      <Face x={60} y={43} gap={22} r={5.4} mood={mood} />
    </g>
  );
}

/** Ilustración del instrumento; con `mood` distinto de "none" es el personaje (mascota) de la app. */
export function InstrumentArt({ inst, size = 64, mood = 'none', className = '' }: { inst: InstrumentId; size?: number; mood?: Mood; className?: string }) {
  return (
    <svg className={`inst-art ${className}`} viewBox="0 0 120 120" width={size} height={size} aria-hidden="true">
      {inst === 'sax' ? <Sax mood={mood} /> : inst === 'guitar' ? <Guitar mood={mood} /> : <Piano mood={mood} />}
    </svg>
  );
}

/** Mascota animada (cambia con el instrumento activo) con un globo de diálogo opcional. */
export function Mascot({ inst, size = 96, mood = 'happy', say }: { inst: InstrumentId; size?: number; mood?: Mood; say?: React.ReactNode }) {
  return (
    <div className={`mascot-art ${mood}`}>
      <InstrumentArt inst={inst} size={size} mood={mood} className="bob" />
      {say && <div className="bubble">{say}</div>}
    </div>
  );
}

// ------------------------------------------------------------- íconos de línea
const P: Record<string, string> = {
  book: 'M3 5.5c3-1.4 6-1.2 9 .8v13c-3-2-6-2.2-9-.8z M21 5.5c-3-1.4-6-1.2-9 .8v13c3-2 6-2.2 9-.8z',
  dumbbell: 'M2.5 10v4 M5.5 7v10 M18.5 7v10 M21.5 10v4 M5.5 12h13',
  trophy: 'M7 4h10v5a5 5 0 0 1-10 0z M7 6H4.5a2.5 2.5 0 0 0 2.5 4 M17 6h2.5a2.5 2.5 0 0 1-2.5 4 M12 14v3 M8.5 20.5h7 M10 17h4v3.5h-4z',
  lock: 'M6 11h12v9.5H6z M8.5 11V8a3.5 3.5 0 0 1 7 0v3 M12 15v2',
  note: 'M9 18V6.5l10-2.2v11.5 M9 18a2.5 2.5 0 1 1-5 0a2.5 2.5 0 0 1 5 0z M19 15.8a2.5 2.5 0 1 1-5 0a2.5 2.5 0 0 1 5 0z',
  check: 'M5 12.5l4.5 4.5L19 7.5',
  sun: 'M12 8a4 4 0 1 1 0 8a4 4 0 0 1 0-8z M12 2.5v2 M12 19.5v2 M2.5 12h2 M19.5 12h2 M5.3 5.3l1.4 1.4 M17.3 17.3l1.4 1.4 M5.3 18.7l1.4-1.4 M17.3 6.7l1.4-1.4',
  route: 'M6 3.5a2 2 0 1 1 0 4a2 2 0 0 1 0-4z M18 16.5a2 2 0 1 1 0 4a2 2 0 0 1 0-4z M8 5.5h6.5a3.25 3.25 0 0 1 0 6.5h-5a3.25 3.25 0 0 0 0 6.5H16',
  sliders: 'M6 4v16 M12 4v16 M18 4v16 M4 14h4 M10 8h4 M16 16h4',
  headphones: 'M4 15v-3a8 8 0 0 1 16 0v3 M4 15h3.5v5.5H5.5a1.5 1.5 0 0 1-1.5-1.5z M20 15h-3.5v5.5h2a1.5 1.5 0 0 0 1.5-1.5z',
  books: 'M4 4h4v16H4z M10 4h4v16h-4z M16 5.2l3.4-.9 3.1 15.4-3.4.9z M4 8h4 M10 16h4',
  cards: 'M8 3.5h10.5a2 2 0 0 1 2 2V16 M4 7.5h11a2 2 0 0 1 2 2V19a2 2 0 0 1-2 2H6a2 2 0 0 1-2-2z M7.5 12h6 M7.5 15.5h4',
  theory: 'M5 4.5h11a3 3 0 0 1 3 3v13H8a3 3 0 0 1-3-3z M5 17.5a3 3 0 0 1 3-3h11',
  mic: 'M9 5.5a3 3 0 0 1 6 0v6a3 3 0 0 1-6 0z M5.5 11a6.5 6.5 0 0 0 13 0 M12 17.5v3.5 M9 21h6',
  link: 'M10 14a4 4 0 0 0 5.7 0l3-3a4 4 0 0 0-5.7-5.7l-1 1 M14 10a4 4 0 0 0-5.7 0l-3 3a4 4 0 0 0 5.7 5.7l1-1',
  chart: 'M4 20h16 M7 16.5v-5 M12 16.5V7 M17 16.5V9.5',
  flame: 'M12 3c1 3.5 5.5 6 5.5 11a5.5 5.5 0 0 1-11 0c0-2.5 1.5-3.8 2-5.5c.8 1.6.8 2.8 2 3.5c0-3.5.7-6.3 1.5-9z',
  bolt: 'M13 2.5L5.5 13.5h5.5l-1 8L18.5 10.5H13z',
};

export type IconName = keyof typeof P;

export function Icon({ name, size = 22, stroke = 2, className = '' }: { name: IconName; size?: number; stroke?: number; className?: string }) {
  return (
    <svg className={`ico-svg ${className}`} viewBox="0 0 24 24" width={size} height={size} fill="none" stroke="currentColor" strokeWidth={stroke} strokeLinecap="round" strokeLinejoin="round" aria-hidden="true">
      <path d={P[name]} />
    </svg>
  );
}

/** Ícono de nodo del camino (blanco sobre el círculo de color). */
export function NodeGlyph({ kind, inst, locked, done }: { kind: string; inst: InstrumentId; locked: boolean; done: boolean }) {
  if (locked) return <Icon name="lock" size={34} stroke={2.6} />;
  if (kind === 'play') return <InstrumentArt inst={inst} size={46} />;
  if (done && kind !== 'challenge') return <Icon name="check" size={36} stroke={3.4} />;
  return <Icon name={kind === 'learn' ? 'book' : kind === 'practice' ? 'dumbbell' : 'trophy'} size={34} stroke={2.6} />;
}
