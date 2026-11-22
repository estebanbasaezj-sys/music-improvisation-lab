// «Estilos de los grandes»: rasgos de cada músico, grabaciones para escuchar y libros oficiales con sus
// solos transcritos. La app NO reproduce sus frases (los solos y las transcripciones tienen derechos de
// autor): genera frases originales con los recursos característicos de cada uno y enlaza a fuentes legales
// para estudiar las frases reales. Enlaces comprobados en el sitio de la editorial el 2026-11-22.

export type Clef = 'C' | 'Bb' | 'Eb';
export interface Book { label: string; url: string; clef?: Clef; note?: string }
export interface Great {
  id: 'parker' | 'coltrane' | 'miles' | 'lester' | 'rollins' | 'cannonball' | 'bbking';
  name: string;
  nickname?: string;
  instrument: string;
  era: string;
  traits: string[];
  /** grabaciones para escuchar (títulos de temas y discos) */
  listen: string[];
  books: Book[];
}

export const GREATS_CHECKED = '2026-11-22';

const OMNIBOOKS: Book = { label: 'Serie Omnibook (Hal Leonard): todos los títulos y claves', url: 'https://www.halleonard.com/series/OMNIBK' };

export const GREATS: Great[] = [
  {
    id: 'parker', name: 'Charlie Parker', nickname: 'Bird', instrument: 'saxo alto', era: 'bebop (años 40–50)',
    traits: ['Corcheas largas y rápidas con las notas del acorde en los tiempos fuertes', 'Enclosures (rodear la nota de llegada) y aproximaciones cromáticas', 'Arpegio 3-5-b7-b9 sobre el V7 que resuelve en la 5ª del acorde siguiente', 'Lenguaje del blues dentro del bebop'],
    listen: ['«Now’s the Time»', '«Billie’s Bounce»', '«Confirmation»', '«Ko-Ko»', '«Donna Lee»'],
    books: [
      { label: 'Charlie Parker Omnibook (Do: piano, guitarra)', url: 'https://www.halleonard.com/product/4002/charlie-parker-omnibook', clef: 'C' },
      { label: 'Charlie Parker Omnibook vol. 1 (Si♭: saxo tenor)', url: 'https://www.halleonard.com/product/284777/charlie-parker-omnibook-volume-1', clef: 'Bb' },
      { label: 'Charlie Parker Omnibook (Mi♭: saxo alto)', url: 'https://www.halleonard.com/product/4001/charlie-parker-omnibook', clef: 'Eb' },
    ],
  },
  {
    id: 'coltrane', name: 'John Coltrane', nickname: 'Trane', instrument: 'saxo tenor y soprano', era: 'hard bop y jazz modal (años 50–60)',
    traits: ['Patrones digitales como 1-2-3-5 trasladados a cada acorde', 'Pentatónicas superpuestas y sonido modal', '«Sheets of sound»: líneas muy densas que recorren el acorde', 'Notas cercanas entre sí, más que grandes arpegios'],
    listen: ['«Giant Steps» (disco Giant Steps, 1960)', '«Blue Train» (1958)', '«My Favorite Things» (1961)', '«Impressions»'],
    books: [
      { label: 'John Coltrane Omnibook (Mi♭)', url: 'https://www.halleonard.com/product/307392/john-coltrane-omnibook', clef: 'Eb' },
      { ...OMNIBOOKS, note: 'Coltrane también tiene ediciones en Do y Si♭' },
    ],
  },
  {
    id: 'miles', name: 'Miles Davis', instrument: 'trompeta', era: 'bebop, cool, modal y más (años 40–90)',
    traits: ['Pocas notas, bien elegidas: el silencio como parte de la frase', 'Registro medio y notas largas con tensiones (9ª, 13ª)', 'Melodías cantables y motivos cortos que se repiten', 'Sonido modal: el dórico de «So What»'],
    listen: ['«So What» y «Freddie Freeloader» (Kind of Blue, 1959)', '«Walkin’»', '«Blues by Five»', '«All Blues»'],
    books: [
      { label: 'Miles Davis Omnibook (Do)', url: 'https://www.halleonard.com/product/122266/miles-davis-omnibook', clef: 'C' },
      { label: 'Miles Davis Omnibook (Si♭)', url: 'https://www.halleonard.com/product/viewproduct.action?itemid=00122260', clef: 'Bb' },
      { ...OMNIBOOKS, note: 'también hay edición en Mi♭' },
    ],
  },
  {
    id: 'lester', name: 'Lester Young', nickname: 'Prez', instrument: 'saxo tenor', era: 'swing (años 30–40)',
    traits: ['Pensamiento «horizontal»: la tonalidad más que cada acorde', 'Frases relajadas que entran después del tiempo', 'Notas repetidas y melodías cantables en el registro medio', 'Sonido liviano; gran influencia en el cool y en Parker'],
    listen: ['«Lester Leaps In» (con Count Basie, 1939)', '«Taxi War Dance»', 'Sus grabaciones con Billie Holiday'],
    books: [
      { label: 'The Lester Young Collection (saxo tenor)', url: 'https://www.halleonard.com/product/672524/the-lester-young-collection', clef: 'Bb' },
      { label: 'Great Tenor Sax Solos (incluye «Lester Leaps In»)', url: 'https://www.halleonard.com/product/673254/great-tenor-sax-solos', clef: 'Bb' },
    ],
  },
  {
    id: 'rollins', name: 'Sonny Rollins', instrument: 'saxo tenor', era: 'hard bop (años 50 en adelante)',
    traits: ['Improvisación temática: un motivo que se repite, se varía y se desarrolla', 'Humor, citas y ritmo muy marcado', 'Frases que juegan con el desplazamiento rítmico'],
    listen: ['«Blue 7» y «St. Thomas» (Saxophone Colossus, 1956)', 'The Bridge (1962)'],
    books: [{ label: 'Great Tenor Sax Solos (incluye solos de Rollins)', url: 'https://www.halleonard.com/product/673254/great-tenor-sax-solos', clef: 'Bb' }],
  },
  {
    id: 'cannonball', name: 'Cannonball Adderley', instrument: 'saxo alto', era: 'hard bop y soul jazz (años 50–70)',
    traits: ['Bebop lleno de blues: líneas rápidas que terminan en frases de blues', 'Sonido brillante y alegre', 'Mezcla de escala blues y cromatismo bebop'],
    listen: ['Somethin’ Else (1958)', '«Mercy, Mercy, Mercy» (1966)', 'Kind of Blue (con Miles Davis, 1959)'],
    books: [
      { label: 'Saxophone Omnibook (Mi♭; incluye solos de Adderley)', url: 'https://www.halleonard.com/product/345963/saxophone-omnibook-for-e-flat-instruments', clef: 'Eb' },
      { label: 'Saxophone Omnibook (Si♭)', url: 'https://www.halleonard.com/product/345954/saxophone-omnibook-for-b-flat-instruments', clef: 'Bb' },
    ],
  },
  {
    id: 'bbking', name: 'B.B. King', instrument: 'guitarra', era: 'blues (años 50 en adelante)',
    traits: ['Economía: pocas notas con mucha expresión', 'Pregunta y respuesta con la voz (y con la banda)', 'La 3ª que «se dobla» de menor a mayor', 'Frases que respiran: tanto silencio como notas'],
    listen: ['Live at the Regal (1965)', '«The Thrill Is Gone» (1969)', '«Every Day I Have the Blues»'],
    books: [],
  },
];
export const greatById = (id: Great['id']) => GREATS.find((g) => g.id === id)!;

/** Recursos generales para aprender frases de los grandes (comprobados el 2026-11-22). */
export const LICK_SOURCES: Book[] = [
  { label: 'Jazzadvice: «10 Brilliant Jazz Solos And What You Can Learn From Them» (Miles, Coltrane…)', url: 'https://www.jazzadvice.com/lessons/10-brilliant-jazz-solos-and-what-you-can-learn-from-them/' },
  { label: 'Jazzadvice: guía para transcribir solos (parte de pago)', url: 'https://www.jazzadvice.com/lessons/how-to-master-jazz-transcription-premium/' },
  OMNIBOOKS,
  { label: 'Jazz Guitar Omnibook (Do; varios guitarristas)', url: 'https://www.halleonard.com/product/274203/', clef: 'C' },
];
