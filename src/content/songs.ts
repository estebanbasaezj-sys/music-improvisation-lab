// Biblioteca de standards. Solo se incluyen progresiones armónicas (no protegidas por derechos de autor)
// y análisis propio. No se reproducen melodías, letras, partituras ni grabaciones.
// Las versiones de los cifrados varían entre ediciones: se indica cuando conviene contrastar con otra fuente.

export interface Song {
  id: string;
  title: string;
  composer: string;
  key: string; // tonalidad de concierto tal como se escribe la tónica ("Gm" o "Bb")
  style: 'swing' | 'bossa' | 'ballad' | 'blues';
  tempo: number;
  form: string;
  bars: number;
  /** compases separados por |; dos acordes en un compás = 2 tiempos cada uno */
  chart: string;
  sections: { label: string; fromBar: number; toBar: number }[];
  level: 1 | 2 | 3;
  overview: string;
  analysis: string[];
  versionNote?: string;
  tasks: { sax: string[]; guitar: string[]; piano: string[] };
  practiceWith: string;
  externalSearch: string; // término sugerido para buscar grabaciones
}

export const SONGS: Song[] = [
  {
    id: 'blues-f', title: 'Blues en Fa (jazz blues)', composer: 'Forma tradicional', key: 'F', style: 'swing', tempo: 120,
    form: '12 compases', bars: 12, level: 1,
    chart: 'F7 | Bb7 | F7 | Cm7 F7 | Bb7 | Bdim7 | F7 | Am7 D7 | Gm7 | C7 | F7 D7 | Gm7 C7 |',
    sections: [{ label: 'Blues', fromBar: 0, toBar: 11 }],
    overview: 'La forma de blues que usan los jazzistas en jam sessions (Fa es la tonalidad más común con vientos).',
    analysis: [
      'Compases 1–4: I7 – IV7 – I7 y un ii-V (Cm7–F7) hacia el IV.',
      'Compás 6: Bdim7 es un disminuido de paso que conecta Bb7 con F7/C.',
      'Compases 8–10: dominante secundario D7 (V7 de Gm7) → ii-V hacia F.',
      'Compases 11–12: turnaround I–VI7–ii–V que devuelve al principio.',
    ],
    tasks: {
      sax: ['Toca solo las 3ªs de cada acorde, una redonda por compás.', 'Improvisa usando la escala blues de Fa en los compases 1–4 y notas guía en 8–12.'],
      guitar: ['Comping con shells (1-7-3) de 6ª y 5ª cuerda, ritmo Charleston.', 'Solo: pentatónica menor de Fa, luego apunta a la 3ª de Bb7 (D) en el compás 5.'],
      piano: ['Mano izquierda: shells; mano derecha: escala blues.', 'Prueba voicings sin fundamental A/B sobre F7 y Bb7.'],
    },
    practiceWith: 'Acompañamiento del laboratorio (swing) o iReal Pro ("Jazz Blues").', externalSearch: 'jazz blues in F play along',
  },
  {
    id: 'minor-blues-c', title: 'Blues menor en Do', composer: 'Forma tradicional', key: 'Cm', style: 'swing', tempo: 110,
    form: '12 compases', bars: 12, level: 1,
    chart: 'Cm7 | Cm7 | Cm7 | Cm7 | Fm7 | Fm7 | Cm7 | Cm7 | Ab7 | G7 | Cm7 | G7 |',
    sections: [{ label: 'Blues menor', fromBar: 0, toBar: 11 }],
    overview: 'Excelente para trabajar el dórico vs. eólico y el color de bVI7–V7.',
    analysis: ['i m7 y iv m7 como en un blues, pero menores.', 'Compás 9: Ab7 (bVI7) es un dominante que baja por semitono al G7: sustitución de tritono de D7 (V/V).', 'G7 puede tocarse como G7b9 (menor armónica de Do).'],
    tasks: {
      sax: ['Compara Do dórico (La natural) vs. Do eólico (La♭) en los compases 1–4.', 'En Ab7 → G7 apunta a Si (3ª de G7).'],
      guitar: ['Pentatónica menor de Do en posición 1 (traste 8).', 'Acordes: Cm7 drop 3 y Ab7 → G7 con shells.'],
      piano: ['Mano izquierda: Cm7 y Fm7 en voicings sin fundamental.', 'Mano derecha: escala blues de Do.'],
    },
    practiceWith: 'Acompañamiento del laboratorio o iReal Pro ("Minor Blues").', externalSearch: 'minor blues in C play along',
  },
  {
    id: 'autumn-leaves', title: 'Autumn Leaves', composer: 'Joseph Kosma', key: 'Gm', style: 'swing', tempo: 130,
    form: 'AABC, 32 compases', bars: 32, level: 2,
    chart:
      'Cm7 | F7 | Bbmaj7 | Ebmaj7 | Am7b5 | D7 | Gm6 | Gm6 |' +
      'Cm7 | F7 | Bbmaj7 | Ebmaj7 | Am7b5 | D7 | Gm6 | Gm6 |' +
      'Am7b5 | D7 | Gm6 | Gm6 | Cm7 | F7 | Bbmaj7 | Ebmaj7 |' +
      'Am7b5 | D7 | Gm7 Gb7 | Fm7 E7 | Ebmaj7 | Am7b5 D7 | Gm6 | Gm6 |',
    sections: [{ label: 'A', fromBar: 0, toBar: 7 }, { label: 'A', fromBar: 8, toBar: 15 }, { label: 'B', fromBar: 16, toBar: 23 }, { label: 'C', fromBar: 24, toBar: 31 }],
    overview: 'El standard ideal para aprender: casi todo son ii-V-I mayores (hacia Bb) y menores (hacia Gm) en la misma tonalidad.',
    analysis: [
      'Cm7–F7–Bbmaj7: ii-V-I mayor en Si♭ (la relativa mayor).',
      'Ebmaj7: IV de Si♭ que conecta con el ii-V menor (a través del bVI de Sol menor).',
      'Am7b5–D7–Gm: ii-V-i menor en Sol menor.',
      'Sección C: Gm7–Gb7–Fm7–E7 es una cadena cromática de dominantes/ii-V que baja a Ebmaj7.',
      'Toda la canción cabe en Sol menor / Si♭ mayor (mismas notas) salvo el D7 (F#) y la cadena cromática.',
    ],
    versionNote: 'Los compases 27–28 tienen variantes según la edición. Contrasta con tu fuente o con iReal Pro.',
    tasks: {
      sax: ['Identifica cada ii-V-I mayor y menor del cifrado.', 'Toca la línea de notas guía (3ª y 7ª) que muestra el laboratorio.', 'Improvisa 8 compases usando solo arpegios de los acordes.', 'Construye un solo: motivo en A, desarrollo en B, clímax en C.'],
      guitar: ['Aprende la forma con shells de 6ª/5ª cuerda sin moverte más de 5 trastes.', 'Practica Cm7→F7→Bbmaj7 en el traste 8–10.', 'Comping en negras (estilo Freddie Green) y luego Charleston.', 'Arpegios de cada acorde en una sola posición.', 'Improvisa: Sol menor pentatónica + apuntar a la 3ª de D7 (F#).'],
      piano: ['Mano izquierda: voicings A/B alternados (conducción mínima).', 'Practica los ii-V-I en 1ª y 2ª inversión.', 'Acompañamiento: shells en mano izquierda con ritmo Charleston.', 'Mano derecha improvisa con notas guía como objetivo en tiempo 1.'],
    },
    practiceWith: 'Acompañamiento del laboratorio, o iReal Pro para la forma completa con intro y final.', externalSearch: 'Autumn Leaves jazz standard lesson',
  },
  {
    id: 'blue-bossa', title: 'Blue Bossa', composer: 'Kenny Dorham', key: 'Cm', style: 'bossa', tempo: 140,
    form: '16 compases', bars: 16, level: 2,
    chart: 'Cm7 | Cm7 | Fm7 | Fm7 | Dm7b5 | G7b9 | Cm7 | Cm7 | Ebm7 | Ab7 | Dbmaj7 | Dbmaj7 | Dm7b5 | G7b9 | Cm7 | Dm7b5 G7b9 |',
    sections: [{ label: 'A (Do menor)', fromBar: 0, toBar: 7 }, { label: 'B (modulación a Re♭)', fromBar: 8, toBar: 11 }, { label: 'Vuelta', fromBar: 12, toBar: 15 }],
    overview: 'Bossa en Do menor con una modulación momentánea a Re♭ mayor: perfecta para practicar cambios de tonalidad.',
    analysis: ['Cm7–Fm7: i–iv en Do menor.', 'Dm7b5–G7b9–Cm7: ii-V-i menor.', 'Ebm7–Ab7–Dbmaj7: ii-V-I mayor en Re♭ (sube medio tono). Cambia de "caja" de notas.', 'Vuelta con ii-V-i menor a Do.'],
    tasks: {
      sax: ['Do dórico en los compases 1–4; Re♭ mayor en 9–12.', 'Conecta Cm7 → Ebm7 cambiando solo una nota (Mi♭ es común; Sol → Sol♭).'],
      guitar: ['Ritmo de bossa con acordes de 5ª cuerda.', 'Improvisa con Do menor pentatónica y cambia a Re♭ mayor pentatónica en el puente.'],
      piano: ['Ritmo de bossa: bajo en 1 y 3, acordes sincopados.', 'Conducción de voces Ebm7–Ab7–Dbmaj7.'],
    },
    practiceWith: 'Acompañamiento de bossa del laboratorio.', externalSearch: 'Blue Bossa jazz standard lesson',
  },
  {
    id: 'blue-monk', title: 'Blue Monk', composer: 'Thelonious Monk', key: 'Bb', style: 'swing', tempo: 120,
    form: 'Blues de 12 compases', bars: 12, level: 1,
    chart: 'Bb7 Eb7 | Bb7 | Eb7 Edim7 | Bb7 | Eb7 | Edim7 | Bb7 | G7 | C7 | F7 | Bb7 Eb7 | Bb7 F7 |',
    sections: [{ label: 'Blues', fromBar: 0, toBar: 11 }],
    overview: 'Un blues en Si♭ con el sabor de Monk: disminuidos de paso y G7 como dominante secundario.',
    analysis: ['Base de blues I7–IV7–V7 en Si♭.', 'Edim7 entre Eb7 y Bb7: disminuido de paso cromático.', 'G7–C7–F7–Bb7: cadena de dominantes por quintas (V/V/V…).'],
    versionNote: 'Hay varias versiones del cifrado (Monk mismo variaba la armonía). Usa este como base y contrasta con grabaciones.',
    tasks: {
      sax: ['Usa la escala blues de Si♭ (concierto) y luego apunta a las 3ªs de G7, C7, F7.'],
      guitar: ['Shells de dominante subiendo y bajando por el mástil.', 'Improvisa con Si♭ blues + B natural sobre G7.'],
      piano: ['Mano izquierda shells; mano derecha frases de blues con 2as menores (sonido Monk).'],
    },
    practiceWith: 'Acompañamiento de swing del laboratorio.', externalSearch: 'Blue Monk Thelonious Monk',
  },
  {
    id: 'satin-doll', title: 'Satin Doll', composer: 'Duke Ellington, Billy Strayhorn', key: 'C', style: 'swing', tempo: 120,
    form: 'AABA, 32 compases', bars: 32, level: 2,
    chart:
      'Dm7 G7 | Dm7 G7 | Em7 A7 | Em7 A7 | Am7 D7 | Abm7 Db7 | Cmaj7 | Cmaj7 |' +
      'Dm7 G7 | Dm7 G7 | Em7 A7 | Em7 A7 | Am7 D7 | Abm7 Db7 | Cmaj7 | Cmaj7 |' +
      'Gm7 C7 | Gm7 C7 | Fmaj7 | Fmaj7 | Am7 D7 | Am7 D7 | Dm7 | G7 |' +
      'Dm7 G7 | Dm7 G7 | Em7 A7 | Em7 A7 | Am7 D7 | Abm7 Db7 | Cmaj7 | Cmaj7 |',
    sections: [{ label: 'A', fromBar: 0, toBar: 7 }, { label: 'A', fromBar: 8, toBar: 15 }, { label: 'B', fromBar: 16, toBar: 23 }, { label: 'A', fromBar: 24, toBar: 31 }],
    overview: 'Un curso de ii-V en sí mismo: ii-V que suben por tonos y un ii-V cromático (Abm7–Db7) hacia Cmaj7.',
    analysis: ['Dm7–G7 y Em7–A7: ii-V que no resuelven, suben un tono.', 'Am7–D7 → Abm7–Db7: ii-V que bajan cromáticamente; Db7 es sustituto tritonal de G7.', 'Puente: ii-V hacia Fa (Gm7–C7–Fmaj7) y ii-V hacia Sol (Am7–D7) que vuelve con Dm7–G7.'],
    tasks: {
      sax: ['Practica cada ii-V aislado con notas guía.', 'Transpón una misma frase de ii-V a Dm7–G7, Em7–A7, Am7–D7.'],
      guitar: ['Shells de ii-V moviendo la misma forma un tono arriba.', 'Comping en 2 y 4.'],
      piano: ['Voicings A/B en mano izquierda para cada ii-V.', 'Nota cómo Db7 y G7 comparten el tritono (F–B/Cb).'],
    },
    practiceWith: 'Acompañamiento del laboratorio; iReal Pro para la forma AABA completa.', externalSearch: 'Satin Doll jazz standard lesson',
  },
  {
    id: 'misty', title: 'Misty', composer: 'Erroll Garner', key: 'Eb', style: 'ballad', tempo: 66,
    form: 'AABA, 32 compases', bars: 32, level: 3,
    chart:
      'Ebmaj7 | Bbm7 Eb7 | Abmaj7 | Abm7 Db7 | Ebmaj7 Cm7 | Fm7 Bb7 | Gm7 C7 | Fm7 Bb7 |' +
      'Ebmaj7 | Bbm7 Eb7 | Abmaj7 | Abm7 Db7 | Ebmaj7 Cm7 | Fm7 Bb7 | Eb6 | Eb6 |' +
      'Bbm7 | Eb7 | Abmaj7 | Abmaj7 | Am7 | D7 | Fm7 | Bb7 |' +
      'Ebmaj7 | Bbm7 Eb7 | Abmaj7 | Abm7 Db7 | Ebmaj7 Cm7 | Fm7 Bb7 | Eb6 | Eb6 |',
    sections: [{ label: 'A', fromBar: 0, toBar: 7 }, { label: 'A', fromBar: 8, toBar: 15 }, { label: 'B', fromBar: 16, toBar: 23 }, { label: 'A', fromBar: 24, toBar: 31 }],
    overview: 'Balada lenta: el reto es el fraseo, el sonido y conectar acordes con calma.',
    analysis: ['Bbm7–Eb7–Abmaj7: ii-V-I hacia el IV.', 'Abm7–Db7: iv menor (ii-V hacia Gb, "intercambio modal") que vuelve a Ebmaj7.', 'Ebmaj7–Cm7–Fm7–Bb7: I–vi–ii–V.', 'Puente: ii-V hacia Ab y Am7–D7 (ii-V hacia G) que regresa por Fm7–Bb7.'],
    versionNote: 'Existen variantes en los compases 7–8 y en el puente. Compara con tu edición.',
    tasks: {
      sax: ['Toca notas largas sobre la 3ª o la 9ª de cada acorde: sonido y afinación.', 'Frases cortas con mucho espacio.'],
      guitar: ['Acordes de 4 notas (drop 2/3) con notas largas, arpegiados.', 'Melodía de acordes: solo con permiso/edición autorizada; aquí trabaja solo la armonía.'],
      piano: ['Voicings abiertos con ambas manos (1-7 en izquierda, 3-5-9 en derecha).', 'Introducción: I–vi–ii–V con voicings A/B.'],
    },
    practiceWith: 'Acompañamiento de balada del laboratorio (tempo 60–70).', externalSearch: 'Misty Erroll Garner',
  },
  {
    id: 'never-another-you', title: 'There Will Never Be Another You', composer: 'Harry Warren', key: 'Eb', style: 'swing', tempo: 160,
    form: 'ABAC, 32 compases', bars: 32, level: 3,
    chart:
      'Ebmaj7 | Ebmaj7 | Dm7b5 | G7b9 | Cm7 | Cm7 | Bbm7 | Eb7 |' +
      'Abmaj7 | Db7 | Ebmaj7 | Cm7 | F7 | F7 | Fm7 | Bb7 |' +
      'Ebmaj7 | Ebmaj7 | Dm7b5 | G7b9 | Cm7 | Cm7 | Bbm7 | Eb7 |' +
      'Abmaj7 | Db7 | Gm7 | C7 | Fm7 | Bb7 | Eb6 | Fm7 Bb7 |',
    sections: [{ label: 'A', fromBar: 0, toBar: 7 }, { label: 'B', fromBar: 8, toBar: 15 }, { label: 'A', fromBar: 16, toBar: 23 }, { label: 'C', fromBar: 24, toBar: 31 }],
    overview: 'Standard de tempo medio-rápido, típico de jam sessions bebop.',
    analysis: ['Dm7b5–G7b9–Cm7: ii-V-i menor hacia el vi.', 'Bbm7–Eb7–Abmaj7: ii-V-I hacia el IV.', 'Db7 (bVII7, "backdoor dominant") resuelve a Ebmaj7.', 'F7: dominante secundario (V/V) → Fm7–Bb7 → Eb.'],
    versionNote: 'Los compases 25–32 varían según la versión. Verifica con tu fuente.',
    tasks: {
      sax: ['Enclosures hacia la 3ª de cada acorde nuevo.', 'Línea bebop sobre Bbm7–Eb7.'],
      guitar: ['Comping a tempo medio con shells.', 'Arpegios de 4 notas en una posición (traste 5–8).'],
      piano: ['Voicings sin fundamental a tempo rápido: solo cambia 1–2 notas por acorde.'],
    },
    practiceWith: 'Laboratorio a tempo lento (100) y luego iReal Pro a tempo real.', externalSearch: 'There Will Never Be Another You jazz standard',
  },
  {
    id: 'blues-a-shuffle', title: 'Blues shuffle en La', composer: 'Forma tradicional', key: 'A', style: 'blues', tempo: 96,
    form: '12 compases', bars: 12, level: 1,
    chart: 'A7 | D7 | A7 | A7 | D7 | D7 | A7 | A7 | E7 | D7 | A7 | E7 |',
    sections: [{ label: 'Blues', fromBar: 0, toBar: 11 }],
    overview: 'El blues de guitarra por excelencia (posición de pentatónica en el traste 5).',
    analysis: ['I7–IV7–V7 con cambio rápido al IV.', 'Sobre los tres acordes funciona La pentatónica menor/blues.', 'Para sonar más "dentro", cambia a La mayor pentatónica en A7 y apunta a la 3ª de D7 (F#).'],
    tasks: {
      sax: ['Pregunta y respuesta: 2 compases de frase, 2 de silencio.'],
      guitar: ['Riff de shuffle con quintas (power chords 5-6).', 'Solo con La pentatónica menor, bends de 4→5 y b3→3.'],
      piano: ['Mano izquierda boogie (1-3-5-6-b7-6-5-3); derecha acordes en 2 y 4.'],
    },
    practiceWith: 'Acompañamiento "blues shuffle" del laboratorio.', externalSearch: 'blues shuffle in A backing track',
  },
];

export const songById = (id: string) => SONGS.find((s) => s.id === id);
