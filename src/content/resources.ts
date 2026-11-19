// Recursos externos. IMPORTANTE: los enlaces apuntan a la página principal del sitio o canal
// (no a vídeos concretos) porque no se ha podido comprobar automáticamente cada enlace desde el
// entorno de desarrollo. La app los marca como "no verificado" hasta que el usuario confirme que
// abre correctamente; también puede añadir vídeos propios (reproductor oficial de YouTube).
import { InstrumentId } from '../theory/instruments';

export interface Resource {
  id: string;
  title: string;
  url: string;
  type: 'canal' | 'sitio' | 'app';
  instruments: (InstrumentId | 'all')[];
  levels: (1 | 2 | 3)[];
  concepts: string[]; // ids de conceptos compartidos o temas
  styles: string[];
  why: string; // relación con los objetivos
  searchHint?: string; // qué buscar dentro del recurso
  cost: 'gratis' | 'freemium' | 'pago';
}

export const RESOURCES: Resource[] = [
  { id: 'bettersax', title: 'BetterSax (YouTube)', url: 'https://www.youtube.com/@BetterSax', type: 'canal', instruments: ['sax'], levels: [1, 2, 3], concepts: ['pentatonicas', 'escala-blues', 'notas-guia', 'iiVI', 'cromatismo', 'bebop'], styles: ['jazz', 'blues'], why: 'Lecciones de saxofón centradas en improvisación, sonido y vocabulario.', searchHint: 'blues scale, ii V I, enclosures', cost: 'freemium' },
  { id: 'jalc', title: 'Jazz at Lincoln Center (YouTube)', url: 'https://www.youtube.com/@jazzatlincolncenter', type: 'canal', instruments: ['all'], levels: [1, 2, 3], concepts: ['swing', 'blues', 'jazz-blues'], styles: ['jazz', 'swing'], why: 'Grabaciones y clases de swing y lenguaje tradicional para escuchar referencias.', searchHint: 'jazz academy, swing', cost: 'gratis' },
  { id: 'justinguitar', title: 'JustinGuitar', url: 'https://www.justinguitar.com/', type: 'sitio', instruments: ['guitar'], levels: [1, 2], concepts: ['pentatonicas', 'escala-blues', 'blues'], styles: ['blues', 'rock'], why: 'Curso estructurado de blues y pentatónicas para guitarra.', searchHint: 'blues lead guitar, minor pentatonic', cost: 'freemium' },
  { id: 'jenslarsen', title: 'Jens Larsen (YouTube)', url: 'https://www.youtube.com/@JensLarsen', type: 'canal', instruments: ['guitar'], levels: [2, 3], concepts: ['iiVI', 'septimas', 'notas-guia', 'modos', 'acorde-escala'], styles: ['jazz'], why: 'Armonía jazz aplicada a guitarra: shells, arpegios, standards.', searchHint: 'shell voicings, Autumn Leaves, arpeggios', cost: 'gratis' },
  { id: 'openstudio', title: 'Open Studio Jazz', url: 'https://www.openstudiojazz.com/', type: 'sitio', instruments: ['piano', 'all'], levels: [2, 3], concepts: ['tensiones', 'inversiones', 'iiVI', 'jazz-blues'], styles: ['jazz'], why: 'Voicings, comping y standards en piano (y otros instrumentos).', searchHint: 'rootless voicings, comping', cost: 'freemium' },
  { id: 'pianogroove', title: 'PianoGroove', url: 'https://www.pianogroove.com/', type: 'sitio', instruments: ['piano'], levels: [1, 2, 3], concepts: ['inversiones', 'tensiones', 'iiVI'], styles: ['jazz', 'balada'], why: 'Cursos de piano jazz por standard (armonía y arreglos).', searchHint: 'shell voicings, standards', cost: 'freemium' },
  { id: 'musictheory', title: 'musictheory.net', url: 'https://www.musictheory.net/', type: 'sitio', instruments: ['all'], levels: [1], concepts: ['intervalos', 'escala-mayor', 'escala-menor', 'triadas', 'septimas'], styles: [], why: 'Lecciones y ejercicios interactivos de teoría básica (intervalos, acordes, lectura).', cost: 'gratis' },
  { id: 'teoria', title: 'teoria.com', url: 'https://www.teoria.com/', type: 'sitio', instruments: ['all'], levels: [1, 2], concepts: ['intervalos', 'triadas', 'septimas', 'modos'], styles: [], why: 'Entrenamiento auditivo y teoría (disponible en español).', cost: 'gratis' },
  { id: 'learnjazzstandards', title: 'Learn Jazz Standards', url: 'https://www.learnjazzstandards.com/', type: 'sitio', instruments: ['all'], levels: [1, 2, 3], concepts: ['iiVI', 'notas-guia'], styles: ['jazz'], why: 'Guías de standards e improvisación para todos los instrumentos.', searchHint: 'Autumn Leaves, Blue Bossa', cost: 'freemium' },
  { id: 'irealpro', title: 'iReal Pro', url: 'https://www.irealpro.com/', type: 'app', instruments: ['all'], levels: [1, 2, 3], concepts: ['blues', 'iiVI', 'jazz-blues'], styles: ['jazz', 'blues', 'bossa'], why: 'Acompañamientos de formas completas (intros, finales, muchos estilos). Úsalo cuando ya domines el tema por secciones aquí.', cost: 'pago' },
];

export const resourcesFor = (instrument: InstrumentId, concept?: string) =>
  RESOURCES.filter((r) => (r.instruments.includes(instrument) || r.instruments.includes('all')) && (!concept || r.concepts.includes(concept)));

/** Extrae el id de un vídeo de YouTube de una URL pegada por el usuario. */
export function youtubeId(url: string): string | null {
  const m = /(?:youtube\.com\/(?:watch\?v=|embed\/|shorts\/)|youtu\.be\/)([A-Za-z0-9_-]{11})/.exec(url);
  return m ? m[1] : null;
}
