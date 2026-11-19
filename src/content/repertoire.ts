// Repertorio tipo «Real Book»: cifrados completos (la armonía no está protegida por derechos de autor),
// forma, secciones, consejos de improvisación y enlaces a grabaciones oficiales.
//
// Derechos de autor: NO se reproducen melodías ni solos grabados de temas protegidos. Para esos temas la app
// genera una «melodía de estudio» original sobre la armonía y solos de ejemplo explicados, y enlaza la
// grabación oficial para escuchar el tema real. Solo los temas tradicionales de dominio público incluyen
// su melodía real.
//
// Enlaces: cada video se comprobó con el servicio oEmbed de YouTube (existe y permite insertarse) en la
// fecha LINKS_CHECKED con `node tools/check-links.mjs`. Además, la app vuelve a comprobarlo cada vez que
// lo abre (si YouTube devuelve error, prueba el siguiente y si no, muestra búsquedas alternativas).
import type { BackingStyle } from '../audio/backing';
import type { InstrumentId } from '../theory/instruments';
import { SONGS } from './songs';

export const LINKS_CHECKED = '2026-11-19';

export interface Recording {
  artist: string;
  album: string;
  year: number;
  /**
   * Videos oficiales en orden de preferencia, con el título y canal que devolvió YouTube. `embed: false`
   * cuando el sello no permite reproducirlo dentro de otras páginas (error 150 del reproductor): solo se
   * ofrece abrirlo en YouTube.
   */
  youtube: { id: string; title: string; channel: string; embed: boolean; note?: string }[];
}

export type TuneTag = 'blues' | 'standard' | 'bebop' | 'modal' | 'latin' | 'balada' | 'funk' | 'rhythm changes' | 'tradicional' | 'menor';

export interface Tune {
  id: string;
  title: string;
  composer: string;
  year: number;
  key: string; // tonalidad de concierto; termina en "m" si es menor
  style: BackingStyle;
  tempo: number; // tempo de la grabación de referencia (aprox.)
  practiceTempo: number; // tempo sugerido para empezar
  form: string;
  chart: string; // compases separados por «|»
  sections: { label: string; fromBar: number; toBar: number }[];
  level: 1 | 2 | 3 | 4;
  tags: TuneTag[];
  /** instrumentos para los que es un clásico de referencia (por la grabación o por tradición) */
  classicFor: InstrumentId[];
  about: string;
  tips: string[];
  recording: Recording;
  versionNote?: string;
  songId?: string; // ficha de análisis ampliada en «Canciones»
  /** melodía real, solo para temas de dominio público. Formato: «Nota+octava:tiempos» o «r:tiempos», compases con «|» */
  melody?: { notes: string; source: string };
}

const song = (id: string) => {
  const s = SONGS.find((x) => x.id === id);
  if (!s) throw new Error(`Canción ${id} no encontrada`);
  return s;
};
const AABA = (n = 8) => [
  { label: 'A', fromBar: 0, toBar: n - 1 }, { label: 'A', fromBar: n, toBar: 2 * n - 1 },
  { label: 'B', fromBar: 2 * n, toBar: 3 * n - 1 }, { label: 'A', fromBar: 3 * n, toBar: 4 * n - 1 },
];
const BLUES12 = [{ label: 'Blues (12)', fromBar: 0, toBar: 11 }];
const yt = (id: string, title: string, channel: string) => ({ id, title, channel, embed: false });
/** video oficial que SÍ se puede reproducir dentro de la app (comprobado con el reproductor insertado) */
const ytIn = (id: string, title: string, channel: string, note?: string) => ({ id, title, channel, embed: true, note });

export const TUNES: Tune[] = [
  // ------------------------------------------------------------------ blues
  {
    id: 'nows-the-time', title: "Now's the Time", composer: 'Charlie Parker', year: 1945, key: 'F', style: 'swing', tempo: 190, practiceTempo: 110,
    form: 'Blues de 12 compases', chart: 'F7 | Bb7 | F7 | Cm7 F7 | Bb7 | Bb7 | F7 | Am7 D7 | Gm7 | C7 | F7 D7 | Gm7 C7 |', sections: BLUES12,
    level: 1, tags: ['blues', 'bebop'], classicFor: ['sax'],
    about: 'Un riff de blues de Charlie Parker: la puerta de entrada al bebop. Ideal para aprender a mezclar escala blues y notas del acorde.',
    tips: ['Compases 1–4: escala blues de Fa; en el compás 5 apunta a la 3ª de Bb7 (Re).', 'En Am7–D7 (compás 8) marca el Fa♯ (3ª de D7): es el sonido que lleva a Gm7.', 'Copia la idea del riff: una frase corta repetida con pequeñas variaciones.'],
    recording: { artist: 'Charlie Parker', album: "Now's the Time (Savoy)", year: 1945, youtube: [ytIn('0f3zsTtj2Sg', "Charlie Parker - Now's The Time (Official Audio)", 'Miles Davis')] },
  },
  {
    id: 'billies-bounce', title: "Billie's Bounce", composer: 'Charlie Parker', year: 1945, key: 'F', style: 'swing', tempo: 170, practiceTempo: 110,
    form: 'Blues de 12 compases (cambios bebop)', chart: 'F7 | Bb7 | F7 | Cm7 F7 | Bb7 | Bdim7 | F7 | Am7 D7 | Gm7 | C7 | F7 D7 | Gm7 C7 |', sections: BLUES12,
    level: 2, tags: ['blues', 'bebop'], classicFor: ['sax'],
    about: 'El blues de Parker con los cambios típicos del bebop: ii-V hacia el IV, disminuido de paso y turnaround.',
    tips: ['Bdim7 (compás 6): arpegio disminuido desde la 3ª de Bb7 = sonido de Bb7♭9.', 'Turnaround F7–D7–Gm7–C7: practica solo las notas guía (La–Fa♯–Fa–Mi).', 'Alterna 2 compases de frase y 2 de silencio para escuchar la base.'],
    recording: { artist: 'Charlie Parker', album: 'Birdsong (comp.)', year: 1945, youtube: [ytIn('89jYv-h7OJA', "Charlie Parker - Billie's Bounce (Official Audio)", 'Miles Davis'), yt('ZsH8tFtRoxE', "Billie's Bounce (Original)", 'Charlie Parker - Topic')] },
  },
  {
    id: 'bags-groove', title: "Bags' Groove", composer: 'Milt Jackson', year: 1952, key: 'F', style: 'swing', tempo: 140, practiceTempo: 100,
    form: 'Blues de 12 compases', chart: 'F7 | Bb7 | F7 | F7 | Bb7 | Bb7 | F7 | D7 | Gm7 | C7 | F7 D7 | Gm7 C7 |', sections: BLUES12,
    level: 1, tags: ['blues'], classicFor: ['piano', 'guitar'],
    about: 'Blues medio y relajado. En la grabación de 1954 tocan Miles Davis, Milt Jackson (vibráfono) y Thelonious Monk (piano).',
    tips: ['Tempo cómodo para trabajar el espacio: frases de 2 compases y respuestas.', 'Pianistas y guitarristas: comping en 2 y 4 con shells; deja huecos para el solista.', 'Usa la 6ª (Re) sobre F7 para un sonido más dulce que la escala blues.'],
    recording: { artist: 'Miles Davis', album: "Bags' Groove", year: 1957, youtube: [ytIn('qsXPmlOSzlw', "Miles Davis - Bags' Groove (Take 1) (Official Audio)", 'Miles Davis'), ytIn('LEBNm8HJQ_g', "Miles Davis Sextet - Bags' Groove (Take 2) (Official Audio)", 'Miles Davis')] },
  },
  {
    id: 'straight-no-chaser', title: 'Straight, No Chaser', composer: 'Thelonious Monk', year: 1951, key: 'F', style: 'swing', tempo: 180, practiceTempo: 110,
    form: 'Blues de 12 compases', chart: 'F7 | Bb7 | F7 | Cm7 F7 | Bb7 | Bdim7 | F7 | Am7 D7 | Gm7 | C7 | F7 D7 | Gm7 C7 |', sections: BLUES12,
    level: 2, tags: ['blues'], classicFor: ['piano'],
    about: 'Un motivo de Monk que se desplaza por el compás: la mejor lección sobre desplazamiento rítmico.',
    tips: ['Inventa un motivo de 4–5 notas y empiézalo cada vez en un tiempo distinto.', 'Monk usa intervalos amplios y segundas menores: prueba Mi–Fa sobre F7 como «choque» intencionado.'],
    recording: { artist: 'Thelonious Monk', album: 'Straight, No Chaser', year: 1967, youtube: [yt('7naC7TF9OU0', 'Straight, No Chaser', 'Thelonious Monk - Topic'), yt('H-XaNW8x9FM', 'Straight, No Chaser', 'Thelonious Monk - Topic')] },
  },
  {
    id: 'tenor-madness', title: 'Tenor Madness', composer: 'Sonny Rollins', year: 1956, key: 'Bb', style: 'swing', tempo: 190, practiceTempo: 110,
    form: 'Blues de 12 compases', chart: 'Bb7 | Eb7 | Bb7 | Fm7 Bb7 | Eb7 | Edim7 | Bb7 | G7 | Cm7 | F7 | Bb7 G7 | Cm7 F7 |', sections: BLUES12,
    level: 2, tags: ['blues'], classicFor: ['sax'],
    about: 'Blues en Si♭ (la tonalidad de los vientos). En la grabación original Rollins y Coltrane intercambian solos de tenor.',
    tips: ['Saxo tenor: en escrito es un blues en Do; aprende el arpegio de C7 y F7 escritos.', 'Practica «trading fours»: 4 compases tocas tú, 4 compases deja sonar la batería sola (mezclador → solo batería).'],
    recording: { artist: 'Sonny Rollins Quartet (con John Coltrane)', album: 'Tenor Madness', year: 1956, youtube: [ytIn('WpN1dt7n_jw', 'Sonny Rollins Quartet - Tenor Madness (Official Audio)', 'Sonny Rollins')] },
  },
  {
    id: 'c-jam-blues', title: 'C Jam Blues', composer: 'Duke Ellington', year: 1942, key: 'C', style: 'swing', tempo: 160, practiceTempo: 100,
    form: 'Blues de 12 compases', chart: 'C7 | F7 | C7 | C7 | F7 | F7 | C7 | C7 | G7 | F7 | C7 | G7 |', sections: BLUES12,
    level: 1, tags: ['blues'], classicFor: ['sax', 'guitar', 'piano'],
    about: 'El tema de jam por excelencia: el motivo usa solo dos notas. Perfecto para tu primer solo sobre un blues.',
    tips: ['Primer reto: improvisa usando solo 2 notas (Sol y Do) jugando con el ritmo.', 'Después añade la pentatónica menor de Do y la 3ª de F7 (La) en el compás 5.'],
    recording: { artist: 'Duke Ellington and His Famous Orchestra', album: 'Never No Lament: The Blanton-Webster Band', year: 1942, youtube: [yt('kq2zDGRgTz4', 'The "C" Jam Blues (1999 Remastered)', 'Duke Ellington - Topic')] },
  },
  {
    id: 'blue-monk', title: 'Blue Monk', composer: 'Thelonious Monk', year: 1954, key: 'Bb', style: 'swing', tempo: 120, practiceTempo: 100,
    form: 'Blues de 12 compases', chart: song('blue-monk').chart, sections: song('blue-monk').sections, songId: 'blue-monk',
    level: 1, tags: ['blues'], classicFor: ['piano'],
    about: 'Blues de Monk con un disminuido de paso (Edim7) que le da su color. Aquí, la versión de piano solo.',
    tips: ['Edim7 entre Eb7 y Bb7: toca su arpegio (Mi–Sol–Si♭–Re♭) como enlace cromático.', 'Imita el humor de Monk: notas repetidas, silencios largos y segundas menores.'],
    recording: { artist: 'Thelonious Monk', album: 'Thelonious Alone in San Francisco', year: 1959, youtube: [ytIn('KY1ijOi1Mqw', 'Thelonious Monk - Blue Monk | Film: Jazz On A Summers Day (1959)', 'New Wave Films', 'En vivo en el festival de Newport, 1958 (película «Jazz on a Summer\'s Day»)'), yt('x8qAmm9Zj60', 'Blue Monk (Remastered 2026)', 'Thelonious Monk - Topic'), yt('gu4aVkgTmUo', 'Blue Monk (Remastered)', 'Thelonious Monk - Topic')] },
  },
  {
    id: 'mr-pc', title: 'Mr. P.C.', composer: 'John Coltrane', year: 1959, key: 'Cm', style: 'swing', tempo: 250, practiceTempo: 120,
    form: 'Blues menor de 12 compases', chart: 'Cm7 | Cm7 | Cm7 | Cm7 | Fm7 | Fm7 | Cm7 | Cm7 | Ab7 | G7 | Cm7 | G7 |', sections: BLUES12,
    level: 2, tags: ['blues', 'menor'], classicFor: ['sax'],
    about: 'Blues menor rápido dedicado al contrabajista Paul Chambers. La base perfecta para el dórico y la pentatónica menor.',
    tips: ['Compases 1–8: Do dórico o pentatónica menor de Do.', 'Ab7 → G7: baja por semitono buscando la 3ª de G7 (Si).', 'Empieza a 120 y sube 10 bpm cada semana.'],
    recording: { artist: 'John Coltrane', album: 'Giant Steps', year: 1960, youtube: [ytIn('wshER0xNhtg', "Mr PC by John Coltrane from 'The Paris Concert'", 'John Coltrane', 'Versión en vivo (París, 1962), canal oficial de John Coltrane'), yt('PttNMqbNMOI', 'Mr. P.C. (2020 Remaster)', 'John Coltrane - Topic'), yt('oHDsywpCHj4', 'Mr. P.C. (Mono)', 'John Coltrane - Topic')] },
  },
  {
    id: 'watermelon-man', title: 'Watermelon Man', composer: 'Herbie Hancock', year: 1962, key: 'F', style: 'funk', tempo: 130, practiceTempo: 100,
    form: 'Blues de 16 compases', chart: 'F7 | F7 | F7 | F7 | Bb7 | Bb7 | F7 | F7 | C7 | Bb7 | C7 | Bb7 | C7 | Bb7 | F7 | F7 |',
    sections: [{ label: 'I7', fromBar: 0, toBar: 3 }, { label: 'IV–I', fromBar: 4, toBar: 7 }, { label: 'V–IV (×3)', fromBar: 8, toBar: 13 }, { label: 'Final', fromBar: 14, toBar: 15 }],
    level: 1, tags: ['blues', 'funk'], classicFor: ['piano', 'sax'],
    about: 'Blues de 16 compases con groove de soul jazz en corcheas rectas. La sección C7–Bb7 se repite tres veces.',
    tips: ['Corcheas rectas (sin swing): piensa en funk, no en walking.', 'Pentatónica menor de Fa con la 3ª mayor (La) como nota de color.', 'En C7–Bb7 usa notas comunes: Mi→Re (3ª de C7 → 3ª de Bb7).'],
    recording: { artist: 'Herbie Hancock', album: 'Takin\' Off', year: 1962, youtube: [ytIn('FoekQZ1Qqlo', 'Watermelon Man - Herbie Hancock | The Midnight Special', 'The Midnight Special', 'Versión en vivo de Herbie Hancock (programa The Midnight Special)'), yt('2t0n4VQrOzE', 'Watermelon Man', 'Herbie Hancock - Topic')] },
  },
  // ------------------------------------------------------------------ standards
  {
    id: 'autumn-leaves', title: 'Autumn Leaves', composer: 'Joseph Kosma', year: 1945, key: 'Gm', style: 'swing', tempo: 135, practiceTempo: 110,
    form: 'AABC, 32 compases', chart: song('autumn-leaves').chart, sections: song('autumn-leaves').sections, songId: 'autumn-leaves',
    level: 1, tags: ['standard', 'menor'], classicFor: ['sax', 'guitar', 'piano'],
    about: 'El primer standard de casi todos: ii-V-I en mayor (Si♭) y en menor (Sol menor) alternados.',
    tips: ['ii-V-I mayor (Cm7–F7–Bbmaj7) y menor (Am7b5–D7–Gm): mismas notas guía con distinto color.', 'Sobre D7 usa la 3ª (Fa♯) para que se oiga la llegada a Gm.'],
    recording: { artist: 'Cannonball Adderley (con Miles Davis)', album: 'Somethin\' Else', year: 1958, youtube: [yt('CpB7-8SGlJ0', 'Autumn Leaves', 'Cannonball Adderley - Topic')] },
  },
  {
    id: 'all-of-me', title: 'All of Me', composer: 'Gerald Marks, Seymour Simons', year: 1931, key: 'C', style: 'swing', tempo: 130, practiceTempo: 110,
    form: 'ABAC, 32 compases',
    chart: 'C6 | C6 | E7 | E7 | A7 | A7 | Dm7 | Dm7 | E7 | E7 | Am7 | Am7 | D7 | D7 | Dm7 | G7 | C6 | C6 | E7 | E7 | A7 | A7 | Dm7 | Dm7 | F6 | Fm6 | Em7 | A7 | Dm7 | G7 | C6 Ebdim7 | Dm7 G7 |',
    sections: [{ label: 'A', fromBar: 0, toBar: 7 }, { label: 'B', fromBar: 8, toBar: 15 }, { label: 'A', fromBar: 16, toBar: 23 }, { label: 'C', fromBar: 24, toBar: 31 }],
    level: 1, tags: ['standard'], classicFor: ['guitar', 'sax'],
    about: 'Cadena de dominantes secundarios (E7, A7, D7) con dos compases por acorde: perfecto para aprender a «oír» cada cambio.',
    tips: ['Cada dominante dura 2 compases: arpegia 1-3-5-7 y luego busca la 3ª del siguiente.', 'F6 → Fm6 (compases 25–26): el La♭ es la nota que lo cuenta todo.'],
    recording: { artist: 'Billie Holiday', album: 'Lady Day (Columbia)', year: 1941, youtube: [yt('5J18k5Sx3Dw', 'Billie Holiday - All of Me (Official Audio)', 'BillieHolidayVEVO')] },
  },
  {
    id: 'fly-me-to-the-moon', title: 'Fly Me to the Moon', composer: 'Bart Howard', year: 1954, key: 'C', style: 'swing', tempo: 120, practiceTempo: 100,
    form: 'ABAB\', 32 compases',
    chart: 'Am7 | Dm7 | G7 | Cmaj7 C7 | Fmaj7 | Bm7b5 | E7 | Am7 A7 | Dm7 | G7 | Cmaj7 | Am7 | Dm7 | G7 | Cmaj7 | Bm7b5 E7 | Am7 | Dm7 | G7 | Cmaj7 C7 | Fmaj7 | Bm7b5 | E7 | Am7 A7 | Dm7 | G7 | Em7 A7 | Dm7 | G7 | Cmaj7 | Bm7b5 | E7 |',
    sections: [{ label: 'A', fromBar: 0, toBar: 7 }, { label: 'B', fromBar: 8, toBar: 15 }, { label: 'A', fromBar: 16, toBar: 23 }, { label: 'B\'', fromBar: 24, toBar: 31 }],
    level: 1, tags: ['standard'], classicFor: ['sax', 'piano'],
    about: 'Ciclo de quintas casi completo (Am–Dm–G–C–F–Bø–E): la escuela del movimiento armónico por cuartas.',
    tips: ['Practica la línea de 3ªs y 7ªs: cada nota guía baja medio tono o se mantiene.', 'Bm7b5–E7–Am7 es un ii-V-i menor dentro de Do mayor.'],
    recording: { artist: 'Frank Sinatra con Count Basie', album: 'It Might as Well Be Swing', year: 1964, youtube: [ytIn('Y2rDb4Ur2dw', 'Frank Sinatra - Fly Me To The Moon (Live At The Kiel Opera House, 1965)', 'Frank Sinatra', 'En vivo, 1965, canal oficial de Frank Sinatra'), yt('ZEcqHA7dbwM', 'Fly Me To The Moon (2008 Remastered)', 'Frank Sinatra - Topic')] },
  },
  {
    id: 'satin-doll', title: 'Satin Doll', composer: 'Duke Ellington, Billy Strayhorn', year: 1953, key: 'C', style: 'swing', tempo: 120, practiceTempo: 100,
    form: 'AABA, 32 compases', chart: song('satin-doll').chart, sections: song('satin-doll').sections, songId: 'satin-doll',
    level: 2, tags: ['standard'], classicFor: ['guitar', 'piano'],
    about: 'ii-V que suben por tonos (Dm7–G7, Em7–A7…): el mejor ejercicio para tocar ii-V en varias tonalidades.',
    tips: ['Toca la misma frase de ii-V y trasládala un tono arriba.', 'Puente: dos ii-V largos (Gm7–C7 y Am7–D7) para frases más largas.'],
    recording: { artist: 'Duke Ellington', album: 'Satin Doll', year: 1953, youtube: [ytIn('wTFPV1pk654', 'Duke Ellington - Satin Doll (1962)  [official video]', 'StoryvilleRecords', 'Duke Ellington y su orquesta, 1962 (video oficial de Storyville Records)'), ytIn('BlBp7YEZgv0', 'Duke Ellington "Satin Doll & Things Ain\'t What They Used To Be" on The Ed Sullivan Show', 'The Ed Sullivan Show'), yt('KNSvjq24QAI', 'Satin Doll', 'Duke Ellington - Topic')] },
  },
  {
    id: 'take-the-a-train', title: 'Take the "A" Train', composer: 'Billy Strayhorn', year: 1939, key: 'C', style: 'swing', tempo: 170, practiceTempo: 110,
    form: 'AABA, 32 compases',
    chart: 'C6 | C6 | D7 | D7 | Dm7 | G7 | C6 | Dm7 G7 | C6 | C6 | D7 | D7 | Dm7 | G7 | C6 | C6 | Fmaj7 | Fmaj7 | Fmaj7 | Fmaj7 | D7 | D7 | Dm7 | G7 | C6 | C6 | D7 | D7 | Dm7 | G7 | C6 | Dm7 G7 |',
    sections: AABA(), level: 1, tags: ['standard'], classicFor: ['piano', 'sax'],
    about: 'El tema de Ellington. El D7 (II7) con su 4ª aumentada (Sol♯) es el sonido característico.',
    tips: ['Sobre D7 prueba Re lidio dominante: el Sol♯ (#11) es la nota del tema.', 'Puente en Fmaj7: cuatro compases para frases largas y relajadas.'],
    recording: { artist: 'Duke Ellington and His Famous Orchestra', album: 'Take the "A" Train', year: 1941, youtube: [ytIn('D6mFGy4g_n8', 'Duke Ellington and his Orchestra - Take The A Train (1962) [Official Video]', 'StoryvilleRecords', 'Duke Ellington y su orquesta, 1962 (video oficial de Storyville Records)'), yt('r2G1fKYFgVU', 'Duke Ellington and His Famous Orchestra - Take the "A" Train (Audio)', 'DukeEllingtonVEVO')] },
  },
  {
    id: 'never-another-you', title: 'There Will Never Be Another You', composer: 'Harry Warren', year: 1942, key: 'Eb', style: 'swing', tempo: 160, practiceTempo: 120,
    form: 'ABAC, 32 compases', chart: song('never-another-you').chart, sections: song('never-another-you').sections, songId: 'never-another-you',
    level: 2, tags: ['standard'], classicFor: ['sax'],
    about: 'Standard muy tocado en jam sessions: ii-V hacia el IV y hacia el vi, con un iv menor (Abm7–Db7).',
    tips: ['Abm7–Db7 → Ebmaj7: «iv menor», sonido de Ellington y del bebop.', 'Chet Baker canta y toca: escucha cómo su solo sigue la melodía.'],
    recording: { artist: 'Chet Baker', album: 'Chet Baker Sings', year: 1954, youtube: [yt('ytHMBYLwgVU', 'There Will Never Be Another You (Vocal Version)', 'Chet Baker - Topic')] },
  },
  {
    id: 'all-the-things', title: 'All the Things You Are', composer: 'Jerome Kern', year: 1939, key: 'Ab', style: 'swing', tempo: 180, practiceTempo: 110,
    form: 'AABA\', 36 compases',
    chart: 'Fm7 | Bbm7 | Eb7 | Abmaj7 | Dbmaj7 | G7 | Cmaj7 | Cmaj7 | Cm7 | Fm7 | Bb7 | Ebmaj7 | Abmaj7 | D7 | Gmaj7 | Gmaj7 | Am7 | D7 | Gmaj7 | Gmaj7 | F#m7b5 | B7 | Emaj7 | C7 | Fm7 | Bbm7 | Eb7 | Abmaj7 | Dbmaj7 | Dbm7 | Cm7 | Bdim7 | Bbm7 | Eb7 | Abmaj7 | Gm7b5 C7 |',
    sections: [{ label: 'A', fromBar: 0, toBar: 7 }, { label: 'A', fromBar: 8, toBar: 15 }, { label: 'B', fromBar: 16, toBar: 23 }, { label: 'A\'', fromBar: 24, toBar: 35 }],
    level: 3, tags: ['standard'], classicFor: ['piano', 'sax', 'guitar'],
    about: 'Modula por cuartas a cinco tonalidades: el examen de armonía del jazz.',
    tips: ['Localiza las tonalidades: La♭, Do, Mi♭, Sol, Mi y vuelta a La♭.', 'G7 → Cmaj7 y D7 → Gmaj7: practica solo esas llegadas a la 3ª.'],
    recording: { artist: 'Bill Evans Trio', album: 'All the Things You Are (album version)', year: 1962, youtube: [ytIn('DiDt5LNXsMY', 'Shai Maestro & Chris Potter - All The Things You Are', 'Shai Maestro', 'Versión actual de Shai Maestro (piano) y Chris Potter (saxo tenor), canal oficial'), yt('XJocj5T9qIY', 'All The Things You Are (Album Version)', 'Bill Evans Trio - Topic')] },
  },
  {
    id: 'stella', title: 'Stella by Starlight', composer: 'Victor Young', year: 1944, key: 'Bb', style: 'swing', tempo: 140, practiceTempo: 100,
    form: 'ABCD, 32 compases',
    chart: 'Em7b5 | A7 | Cm7 | F7 | Fm7 | Bb7 | Ebmaj7 | Ab7 | Bbmaj7 | Em7b5 A7 | Dm7 | Bbm7 Eb7 | Fmaj7 | Em7b5 A7 | Am7b5 | D7 | G7 | G7 | Cm7 | Cm7 | Ab7 | Ab7 | Bbmaj7 | Bbmaj7 | Em7b5 | A7 | Dm7b5 | G7 | Cm7b5 | F7 | Bbmaj7 | Bbmaj7 |',
    sections: [{ label: 'A', fromBar: 0, toBar: 7 }, { label: 'B', fromBar: 8, toBar: 15 }, { label: 'C', fromBar: 16, toBar: 23 }, { label: 'D', fromBar: 24, toBar: 31 }],
    level: 3, tags: ['standard'], classicFor: ['sax', 'piano'],
    about: 'Muchos ii-V menores (m7b5 – 7) y un iv menor (Fm7–Bb7 → Ebmaj7, Ab7). Exigente pero muy formativo.',
    tips: ['Sobre cada m7b5 usa el locrio o, más fácil, el arpegio desde la b3.', 'Al final, Em7b5–A7–Dm7b5–G7–Cm7b5–F7: una cadena de ii-V menores que baja por tonos.'],
    recording: { artist: 'Miles Davis', album: 'Stella by Starlight (official audio)', year: 1958, youtube: [yt('XGx1HvLV_NQ', 'Miles Davis - Stella by Starlight (Official Audio)', 'MilesDavisVEVO')] },
  },
  {
    id: 'lady-bird', title: 'Lady Bird', composer: 'Tadd Dameron', year: 1939, key: 'C', style: 'swing', tempo: 160, practiceTempo: 110,
    form: '16 compases',
    chart: 'Cmaj7 | Cmaj7 | Fm7 | Bb7 | Cmaj7 | Cmaj7 | Bbm7 | Eb7 | Abmaj7 | Abmaj7 | Am7 | D7 | Dm7 | G7 | Cmaj7 Ebmaj7 | Abmaj7 Dbmaj7 |',
    sections: [{ label: 'Primera mitad', fromBar: 0, toBar: 7 }, { label: 'Segunda mitad + turnaround', fromBar: 8, toBar: 15 }],
    level: 3, tags: ['standard', 'bebop'], classicFor: ['sax'],
    about: 'Tema bebop corto con el famoso turnaround «Lady Bird» (Cmaj7–Ebmaj7–Abmaj7–Dbmaj7).',
    tips: ['Fm7–Bb7 en Do mayor: «iv–bVII», préstamo del modo menor.', 'Turnaround: los cuatro maj7 bajan por terceras/cuartas; toca la 3ª de cada uno.'],
    recording: { artist: 'Fats Navarro y Tadd Dameron', album: 'Fats Navarro Memorial Album', year: 1948, youtube: [ytIn('_cIGwusTEw0', 'Lady Bird - Chad LB Standard Sessions #21 (Holger Marjamaa, Ben Tiberio, John Cavalier)', 'Chad LB', 'Versión actual de Chad LB (saxo tenor), canal oficial'), yt('iWQHoLqB8U8', 'Lady Bird', 'Fats Navarro - Topic'), yt('N94naN1RL_4', 'Lady Bird (Remastered)', 'Fats Navarro - Topic')] },
  },
  {
    id: 'tune-up', title: 'Tune Up', composer: 'Miles Davis (atrib.)', year: 1953, key: 'D', style: 'swing', tempo: 200, practiceTempo: 110,
    form: '16 compases',
    chart: 'Em7 | A7 | Dmaj7 | Dmaj7 | Dm7 | G7 | Cmaj7 | Cmaj7 | Cm7 | F7 | Bbmaj7 | Bbmaj7 | Em7 | A7 | Dmaj7 | Em7 A7 |',
    sections: [{ label: 'ii-V-I en Re', fromBar: 0, toBar: 3 }, { label: 'en Do', fromBar: 4, toBar: 7 }, { label: 'en Si♭', fromBar: 8, toBar: 11 }, { label: 'vuelta a Re', fromBar: 12, toBar: 15 }],
    level: 2, tags: ['standard', 'bebop'], classicFor: ['sax', 'guitar'],
    about: 'Tres ii-V-I que bajan por tonos (Re, Do, Si♭): el ejercicio de ii-V-I convertido en tema.',
    tips: ['Aprende UNA frase de ii-V-I y tócala en Re, Do y Si♭.', 'Cada I dura 2 compases: apóyate en la 3ª y la 7ª mayor.'],
    recording: { artist: 'Miles Davis', album: 'Blue Haze', year: 1953, youtube: [ytIn('1ezOYc3UEts', 'Miles Davis - Tune Up (Official Audio)', 'Miles Davis'), ytIn('8KiM-yxrWGw', 'The Miles Davis Quintet - Tune-Up / When Lights Are Low (Prestige Records/Official Audio)', 'Prestige Records')] },
  },
  {
    id: 'solar', title: 'Solar', composer: 'Miles Davis (atrib.)', year: 1954, key: 'Cm', style: 'swing', tempo: 180, practiceTempo: 110,
    form: '12 compases',
    chart: 'CmMaj7 | CmMaj7 | Gm7 | C7 | Fmaj7 | Fmaj7 | Fm7 | Bb7 | Ebmaj7 | Ebm7 Ab7 | Dbmaj7 | Dm7b5 G7 |',
    sections: [{ label: 'Solar (12)', fromBar: 0, toBar: 11 }],
    level: 3, tags: ['standard', 'menor'], classicFor: ['guitar', 'sax'],
    about: 'Doce compases que no se quedan quietos: ii-V hacia Fa, Mi♭ y Re♭ y vuelta a Do menor.',
    tips: ['CmMaj7: menor melódica de Do (la 7ª mayor, Si, es la nota clave).', 'Cada ii-V cambia de tonalidad: piensa en tres «mini temas» enlazados.'],
    recording: { artist: 'Miles Davis', album: 'Walkin\'', year: 1954, youtube: [ytIn('maxpKVoXo58', "Miles Davis - Solar (Official Visualizer) - from MILES '54: The Prestige Recordings", 'Miles Davis'), yt('GmdDg_0hqq0', 'Solar (Remastered 2025)', 'Miles Davis - Topic'), yt('CwycRa_F-KY', 'Solar (Rudy Van Gelder Remaster)', 'Miles Davis - Topic')] },
  },
  {
    id: 'oleo', title: 'Oleo', composer: 'Sonny Rollins', year: 1954, key: 'Bb', style: 'swing', tempo: 240, practiceTempo: 120,
    form: 'Rhythm changes AABA, 32 compases',
    chart: 'Bb6 G7 | Cm7 F7 | Dm7 G7 | Cm7 F7 | Fm7 Bb7 | Ebmaj7 Ab7 | Dm7 G7 | Cm7 F7 | Bb6 G7 | Cm7 F7 | Dm7 G7 | Cm7 F7 | Fm7 Bb7 | Ebmaj7 Ab7 | Cm7 F7 | Bb6 | D7 | D7 | G7 | G7 | C7 | C7 | F7 | F7 | Bb6 G7 | Cm7 F7 | Dm7 G7 | Cm7 F7 | Fm7 Bb7 | Ebmaj7 Ab7 | Cm7 F7 | Bb6 |',
    sections: AABA(), level: 3, tags: ['rhythm changes', 'bebop'], classicFor: ['sax'],
    about: 'Los «rhythm changes» (la armonía de I Got Rhythm) son, tras el blues, la forma más tocada del jazz.',
    tips: ['Secciones A: piensa en Si♭ mayor con ii-V rápidos; empieza tocando solo Si♭ mayor pentatónica.', 'Puente: dominantes por quintas (D7–G7–C7–F7), dos compases cada uno: arpegios y notas guía.'],
    recording: { artist: 'Miles Davis (con Sonny Rollins)', album: 'Bags\' Groove', year: 1954, youtube: [ytIn('hwiHf2blSa0', "Miles Davis - Oleo (Official Visualizer) - from MILES '54: The Prestige Recordings", 'Miles Davis'), ytIn('x_cQHeWwSBQ', "The Miles Davis Quintet -  Oleo from Relaxin' With The Miles Davis Quintet", 'Miles Davis'), ytIn('aflCJy8NY1c', "Oleo by Sonny Rollins from 'The Complete Prestige Recordings' Disc 3", 'Sonny Rollins'), yt('AebiaEIAJFc', 'Oleo (RVG Remastered 2008)', 'Miles Davis - Topic')] },
  },
  {
    id: 'misty', title: 'Misty', composer: 'Erroll Garner', year: 1954, key: 'Eb', style: 'ballad', tempo: 66, practiceTempo: 66,
    form: 'AABA, 32 compases', chart: song('misty').chart, sections: song('misty').sections, songId: 'misty',
    level: 2, tags: ['balada', 'standard'], classicFor: ['piano'],
    about: 'La balada de Garner: ii-V hacia el IV y un puente que modula. Grabación de referencia: el propio Garner al piano.',
    tips: ['En balada cada nota cuenta: frases largas, notas largas, dinámica.', 'Prueba doble tiempo (corcheas rápidas) solo en un ii-V y vuelve a la calma.'],
    recording: { artist: 'Erroll Garner', album: 'Contrasts', year: 1955, youtube: [ytIn('w2fQ5TOZ_Dg', 'Erroll Garner - Misty (Official Audio)', 'Mack Avenue')] },
  },
  {
    id: 'summertime', title: 'Summertime', composer: 'George Gershwin', year: 1935, key: 'Am', style: 'swing', tempo: 90, practiceTempo: 90,
    form: '16 compases',
    chart: 'Am6 E7 | Am6 E7 | Am6 E7 | Am6 | Dm7 | Dm7 | Bm7b5 | E7 | Am6 E7 | Am6 E7 | Am6 E7 | Am6 | C6 | Am6 | Bm7b5 E7 | Am6 E7 |',
    sections: [{ label: 'A', fromBar: 0, toBar: 7 }, { label: 'A\'', fromBar: 8, toBar: 15 }],
    level: 1, tags: ['standard', 'menor'], classicFor: ['sax', 'guitar', 'piano'],
    about: 'Tema menor de 16 compases, lento y muy cantable. Perfecto para empezar con la pentatónica menor de La.',
    tips: ['Pentatónica menor de La todo el tema; en E7 usa el Sol♯ (3ª) como nota de tensión.', 'Deja respirar la melodía: frases de 2 compases.'],
    versionNote: 'Cifrado de práctica simplificado; las ediciones varían (también se toca en Re menor).',
    recording: { artist: 'Ella Fitzgerald y Louis Armstrong', album: 'Porgy and Bess', year: 1958, youtube: [yt('2HJCN3upMHE', 'Louis Armstrong, Ella Fitzgerald - Summertime (Audio)', 'EllaFitzgeraldVEVO')] },
  },
  // ------------------------------------------------------------------ modal
  {
    id: 'so-what', title: 'So What', composer: 'Miles Davis', year: 1959, key: 'Dm', style: 'swing', tempo: 136, practiceTempo: 120,
    form: 'AABA modal, 32 compases',
    chart: Array(16).fill('Dm7').concat(Array(8).fill('Ebm7'), Array(8).fill('Dm7')).join(' | ') + ' |',
    sections: [{ label: 'A (Re dórico)', fromBar: 0, toBar: 7 }, { label: 'A', fromBar: 8, toBar: 15 }, { label: 'B (Mi♭ dórico)', fromBar: 16, toBar: 23 }, { label: 'A', fromBar: 24, toBar: 31 }],
    level: 1, tags: ['modal'], classicFor: ['sax', 'piano', 'guitar'],
    about: 'El tema que definió el jazz modal (Kind of Blue): 16 compases de Re dórico, 8 de Mi♭ dórico y vuelta.',
    tips: ['Re dórico = notas blancas del piano desde Re. El Si natural es la nota característica.', 'Para cambiar a Mi♭ dórico basta con subir todo medio tono: practica ese salto.', 'Piano y guitarra: voicings por cuartas (Mi–La–Re–Sol–Si).'],
    recording: { artist: 'Miles Davis', album: 'Kind of Blue', year: 1959, youtube: [ytIn('1UBKkEunz1k', 'So What - Jazz Orchestra of the Concertgebouw (Miles Davis) - Live at the Royal Concertgebouw', 'Jazz Orchestra of the Concertgebouw', 'Versión en vivo de la Jazz Orchestra of the Concertgebouw (canal oficial); la grabación de Miles no permite verse dentro de otras apps'), yt('ylXk1LBvIqU', 'Miles Davis - So What (Audio) (Official Audio)', 'MilesDavisVEVO')] },
  },
  {
    id: 'impressions', title: 'Impressions', composer: 'John Coltrane', year: 1961, key: 'Dm', style: 'swing', tempo: 280, practiceTempo: 140,
    form: 'AABA modal, 32 compases',
    chart: Array(16).fill('Dm7').concat(Array(8).fill('Ebm7'), Array(8).fill('Dm7')).join(' | ') + ' |',
    sections: [{ label: 'A (Re dórico)', fromBar: 0, toBar: 7 }, { label: 'A', fromBar: 8, toBar: 15 }, { label: 'B (Mi♭ dórico)', fromBar: 16, toBar: 23 }, { label: 'A', fromBar: 24, toBar: 31 }],
    level: 3, tags: ['modal'], classicFor: ['sax'],
    about: 'La misma forma que So What, pero rápido: Coltrane explora pentatónicas, patrones y cuartas.',
    tips: ['Pentatónicas sobre Re dórico: Re menor, Mi menor y La menor pentatónica suenan «dentro».', 'Patrones de 4 notas (1-2-3-5) desplazados por la escala.'],
    recording: { artist: 'John Coltrane', album: 'Impressions', year: 1963, youtube: [ytIn('VT8MeD_FVXA', 'John Coltrane - Impressions (Official Audio)', 'John Coltrane')] },
  },
  {
    id: 'maiden-voyage', title: 'Maiden Voyage', composer: 'Herbie Hancock', year: 1965, key: 'D', style: 'funk', tempo: 120, practiceTempo: 100,
    form: 'AABA, 32 compases (acordes sus)',
    chart: [...Array(4).fill('D7sus4'), ...Array(4).fill('F7sus4'), ...Array(4).fill('D7sus4'), ...Array(4).fill('F7sus4'), ...Array(4).fill('Eb7sus4'), ...Array(4).fill('Db7sus4'), ...Array(4).fill('D7sus4'), ...Array(4).fill('F7sus4')].join(' | ') + ' |',
    sections: AABA(), level: 2, tags: ['modal'], classicFor: ['piano'],
    about: 'Cuatro acordes suspendidos con un ostinato rítmico: espacio para pensar en color, no en cambios rápidos.',
    tips: ['Sobre cada 7sus4 usa el mixolidio (o el dórico de la 5ª: D7sus4 = La dórico).', 'Piano: voicing «Am7 sobre Re» para D7sus4.'],
    versionNote: 'Groove en corcheas rectas; la base funk de la app es una aproximación al ostinato original.',
    recording: { artist: 'Herbie Hancock', album: 'Maiden Voyage', year: 1965, youtube: [ytIn('G3in_Ewqu_g', 'Herbie Hancock, Ravi Coltrane, Zakir Hussain: "Maiden Voyage" | International Jazz Day 2022', 'International Jazz Day', 'Herbie Hancock en vivo, 2022 (International Jazz Day)'), yt('EWC5x9G45yo', 'Maiden Voyage (Remastered 1999/Rudy Van Gelder Edition)', 'Herbie Hancock - Topic')] },
  },
  {
    id: 'cantaloupe-island', title: 'Cantaloupe Island', composer: 'Herbie Hancock', year: 1964, key: 'Fm', style: 'funk', tempo: 112, practiceTempo: 100,
    form: '16 compases',
    chart: 'Fm7 | Fm7 | Fm7 | Fm7 | Db7 | Db7 | Db7 | Db7 | Dm7 | Dm7 | Dm7 | Dm7 | Fm7 | Fm7 | Fm7 | Fm7 |',
    sections: [{ label: 'Fm7', fromBar: 0, toBar: 3 }, { label: 'Db7', fromBar: 4, toBar: 7 }, { label: 'Dm7', fromBar: 8, toBar: 11 }, { label: 'Fm7', fromBar: 12, toBar: 15 }],
    level: 1, tags: ['modal', 'funk'], classicFor: ['piano', 'sax', 'guitar'],
    about: 'Tres acordes de 4 compases y un groove irresistible: el mejor primer tema modal.',
    tips: ['Fm7: Fa dórico o pentatónica menor de Fa. Db7: Re♭ mixolidio. Dm7: Re dórico.', 'Practica el paso Db7 → Dm7: sube medio tono todo lo que tocas.'],
    recording: { artist: 'Herbie Hancock', album: 'Empyrean Isles', year: 1964, youtube: [ytIn('5KNL0_sis1k', '“Cantaloupe Island” (Live, 1990)', 'Herbie Hancock', 'En vivo, 1990, canal oficial de Herbie Hancock'), ytIn('Yjue2puI--Y', 'Herbie Hancock  - Cantaloupe Island | Glastonbury 2022', 'BBC Music'), yt('otFVFLtRF_s', 'Cantaloupe Island (Remastered 1999/Rudy Van Gelder Edition)', 'Herbie Hancock - Topic')] },
  },
  // ------------------------------------------------------------------ latin
  {
    id: 'blue-bossa', title: 'Blue Bossa', composer: 'Kenny Dorham', year: 1963, key: 'Cm', style: 'bossa', tempo: 150, practiceTempo: 120,
    form: '16 compases', chart: song('blue-bossa').chart, sections: song('blue-bossa').sections, songId: 'blue-bossa',
    level: 1, tags: ['latin', 'menor'], classicFor: ['sax', 'guitar', 'piano'],
    about: 'Bossa menor con una modulación a Re♭: ii-V-i menor y ii-V-I mayor en el mismo tema.',
    tips: ['Compases 1–8: Do menor (dórico/eólico); 9–12: Re♭ mayor.', 'Practica la llegada a Dbmaj7: Fa (3ª) desde Mi♭ o Sol♭.'],
    recording: { artist: 'Joe Henderson', album: 'Page One', year: 1963, youtube: [ytIn('5tG1HRBuhtM', 'Joe Henderson - Blue Bossa (Live in Tokyo, 1971) (Official Audio)', 'Joe Henderson', 'En vivo en Tokio, 1971, canal oficial de Joe Henderson'), ytIn('6ugsYcyc7-g', 'Joe Henderson - Blue Bossa - Live in Hermosa Beach, CA, 1970 (Official Audio)', 'Joe Henderson'), yt('EUxv3AAaK_Y', 'Blue Bossa (Remastered)', 'Joe Henderson Quintet - Topic')] },
  },
  {
    id: 'girl-from-ipanema', title: 'The Girl from Ipanema', composer: 'Antônio Carlos Jobim', year: 1962, key: 'F', style: 'bossa', tempo: 130, practiceTempo: 110,
    form: 'AABA, 40 compases (puente de 16)',
    chart: 'Fmaj7 | Fmaj7 | G7 | G7 | Gm7 | Gb7 | Fmaj7 | Gb7 | Fmaj7 | Fmaj7 | G7 | G7 | Gm7 | Gb7 | Fmaj7 | Fmaj7 | Gbmaj7 | Gbmaj7 | B7 | B7 | F#m7 | F#m7 | D7 | D7 | Gm7 | Gm7 | Eb7 | Eb7 | Am7 | D7 | Gm7 | C7 | Fmaj7 | Fmaj7 | G7 | G7 | Gm7 | Gb7 | Fmaj7 | Gb7 |',
    sections: [{ label: 'A', fromBar: 0, toBar: 7 }, { label: 'A', fromBar: 8, toBar: 15 }, { label: 'B (16)', fromBar: 16, toBar: 31 }, { label: 'A', fromBar: 32, toBar: 39 }],
    level: 2, tags: ['latin'], classicFor: ['sax', 'guitar'],
    about: 'La bossa más famosa. Stan Getz (saxo tenor) y João Gilberto (guitarra) en la grabación de referencia.',
    tips: ['G7 es un II7 (lidio dominante); Gb7 es la sustitución tritonal de C7.', 'Puente: modula a Sol♭ y vuelve por ii-V; toca primero solo las fundamentales para orientarte.'],
    recording: { artist: 'Stan Getz y João Gilberto', album: 'Getz/Gilberto', year: 1964, youtube: [ytIn('s61-e29Vr6Q', 'Stan Getz feat. Astrud Gilberto - The Girl From Ipanema (Official Video)', 'Verve Records'), yt('N-TKOh0zsvU', 'The Girl From Ipanema', 'Stan Getz - Topic')] },
  },
  {
    id: 'manha-de-carnaval', title: 'Manhã de Carnaval', composer: 'Luiz Bonfá', year: 1959, key: 'Am', style: 'bossa', tempo: 120, practiceTempo: 100,
    form: 'ABAC, 32 compases',
    chart: 'Am7 | Bm7b5 E7 | Am7 | Bm7b5 E7 | Am7 | Dm7 G7 | Cmaj7 | Cmaj7 | Dm7 | G7 | Cmaj7 | Fmaj7 | Bm7b5 | E7 | Am7 | Bm7b5 E7 | Am7 | Bm7b5 E7 | Am7 | Bm7b5 E7 | Em7b5 | A7 | Dm7 | Dm7 | Dm7 | G7 | Cmaj7 | Fmaj7 | Bm7b5 | E7 | Am7 | Bm7b5 E7 |',
    sections: [{ label: 'A', fromBar: 0, toBar: 7 }, { label: 'B', fromBar: 8, toBar: 15 }, { label: 'A', fromBar: 16, toBar: 23 }, { label: 'C', fromBar: 24, toBar: 31 }],
    level: 2, tags: ['latin', 'menor'], classicFor: ['guitar'],
    about: 'Bossa menor de la película Orfeo Negro; un clásico de la guitarra brasileña.',
    tips: ['ii-V-i menor (Bm7b5–E7–Am7) una y otra vez: usa La menor armónica sobre E7.', 'Guitarra: arpegios con pulgar en las fundamentales, como un bajo de bossa.'],
    versionNote: 'Cifrado de práctica; las ediciones varían en los compases 21–28.',
    recording: { artist: 'Luiz Bonfá', album: 'Manhã de Carnaval', year: 1959, youtube: [yt('FNK-OaWhwGU', 'Manhã de Carnaval', 'Luiz Bonfá - Topic'), yt('Aqtr3VPjqcQ', 'Manhã de Carnaval (from Black Orpheus)', 'Luiz Bonfá - Topic')] },
  },
  {
    id: 'song-for-my-father', title: 'Song for My Father', composer: 'Horace Silver', year: 1964, key: 'Fm', style: 'bossa', tempo: 120, practiceTempo: 100,
    form: 'AAB, 24 compases',
    chart: 'Fm7 | Fm7 | Eb7 | Eb7 | Db7 | C7 | Fm7 | Fm7 | Fm7 | Fm7 | Eb7 | Eb7 | Db7 | C7 | Fm7 | Fm7 | Eb7 | Eb7 | Fm7 | Fm7 | Eb7 | Db7 | C7 | Fm7 |',
    sections: [{ label: 'A', fromBar: 0, toBar: 7 }, { label: 'A', fromBar: 8, toBar: 15 }, { label: 'B', fromBar: 16, toBar: 23 }],
    level: 1, tags: ['latin', 'menor'], classicFor: ['piano', 'sax'],
    about: 'Groove brasileño de Horace Silver con una bajada Eb7–Db7–C7 muy fácil de escuchar.',
    tips: ['Pentatónica menor de Fa sirve casi todo el tema.', 'Db7 → C7: baja medio tono y apunta a Mi (3ª de C7) para volver a Fm.'],
    versionNote: 'Cifrado de práctica; contrasta la sección B con tu edición.',
    recording: { artist: 'Horace Silver Quintet', album: 'Song for My Father', year: 1965, youtube: [ytIn('XjRLk0mpql0', 'Horace Silver - Song for my Father | WDR Big Band', 'ARD Jazz', 'Versión de la WDR Big Band (canal oficial de ARD)'), yt('mKf1x3CALAE', 'Song For My Father', 'Horace Silver - Topic')] },
  },
  // ------------------------------------------------------------------ tradicional (dominio público)
  {
    id: 'saints', title: 'When the Saints Go Marching In', composer: 'Tradicional (gospel)', year: 1900, key: 'F', style: 'swing', tempo: 160, practiceTempo: 100,
    form: '16 compases',
    chart: 'F6 | F6 | F6 | F6 | F6 | F6 | F6 | C7 | F6 | F6 | F7 | Bb6 Bbm6 | F6 | F6 | C7 | F6 |',
    sections: [{ label: 'Primera frase', fromBar: 0, toBar: 7 }, { label: 'Segunda frase', fromBar: 8, toBar: 15 }],
    level: 1, tags: ['tradicional'], classicFor: ['sax', 'guitar', 'piano'],
    about: 'Himno tradicional convertido en clásico de Nueva Orleans. Es de dominio público: aquí tienes su melodía real.',
    tips: ['Primero toca la melodía tal cual; luego varíala: cambia el ritmo, añade notas de paso.', 'Bb6 → Bbm6: el Re♭ (b3 del acorde) es el momento más expresivo.'],
    melody: {
      source: 'Melodía tradicional (dominio público), versión simplificada en Fa.',
      notes: 'r:1 F4:1 A4:1 Bb4:1 | C5:4 | r:1 F4:1 A4:1 Bb4:1 | C5:4 | r:1 F4:1 A4:1 Bb4:1 | C5:2 A4:2 | F4:2 A4:2 | G4:4 | r:1 A4:1 A4:1 G4:1 | F4:3 F4:1 | A4:2 C5:2 | C5:2 Bb4:2 | A4:1 Bb4:1 C5:2 | A4:2 F4:2 | G4:4 | F4:4 |',
    },
    recording: { artist: 'Louis Armstrong and the All-Stars', album: 'When the Saints Go Marching In', year: 1955, youtube: [ytIn('2eUzdTF3P2M', 'Louis Armstrong "When The Saints Go Marching In" on The Ed Sullivan Show', 'The Ed Sullivan Show', 'Louis Armstrong en vivo en The Ed Sullivan Show'), yt('USpYJB6rdRs', 'When The Saints Go Marching In', 'Louis Armstrong And The All-Stars - Topic')] },
  },
];

export const tuneById = (id: string) => TUNES.find((t) => t.id === id);

export const TAG_LABEL: Record<TuneTag, string> = {
  blues: 'Blues', standard: 'Standard', bebop: 'Bebop', modal: 'Modal', latin: 'Latin / bossa', balada: 'Balada', funk: 'Funk / soul jazz',
  'rhythm changes': 'Rhythm changes', tradicional: 'Tradicional', menor: 'Menor',
};

const NOTE_RE = /^([A-G])(#|b)?(-?\d)$/;
const LETTER_PC: Record<string, number> = { C: 0, D: 2, E: 4, F: 5, G: 7, A: 9, B: 11 };

/** Convierte la melodía compacta en notas (MIDI de concierto, tiempo en negras). Valida que cada compás sume 4. */
export function parseMelody(src: string): { midi: number; start: number; dur: number }[] {
  const out: { midi: number; start: number; dur: number }[] = [];
  const bars = src.split('|').map((b) => b.trim()).filter(Boolean);
  bars.forEach((bar, bi) => {
    let t = 0;
    for (const tok of bar.split(/\s+/)) {
      const [p, d] = tok.split(':');
      const dur = Number(d);
      if (!(dur > 0)) throw new Error(`Duración inválida «${tok}» en el compás ${bi + 1}`);
      if (p !== 'r') {
        const m = NOTE_RE.exec(p);
        if (!m) throw new Error(`Nota inválida «${tok}»`);
        const midi = (Number(m[3]) + 1) * 12 + LETTER_PC[m[1]] + (m[2] === '#' ? 1 : m[2] === 'b' ? -1 : 0);
        out.push({ midi, start: bi * 4 + t, dur });
      }
      t += dur;
    }
    if (Math.abs(t - 4) > 1e-9) throw new Error(`El compás ${bi + 1} suma ${t} tiempos`);
  });
  return out;
}

export const youtubeWatchUrl = (id: string) => `https://www.youtube.com/watch?v=${id}`;
export const youtubeSearchUrl = (q: string) => `https://www.youtube.com/results?search_query=${encodeURIComponent(q)}`;
export const spotifySearchUrl = (q: string) => `https://open.spotify.com/search/${encodeURIComponent(q)}`;
