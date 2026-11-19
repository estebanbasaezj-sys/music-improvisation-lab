# Music Improvisation Lab

Entrenador de improvisación para **saxofón, guitarra y piano**: una sola aplicación web instalable (PWA) con una base común de teoría aplicada, una ruta específica para cada instrumento y progreso independiente por instrumento.

## Publicación

Cada push a `main` ejecuta los tests, compila y publica la app en **GitHub Pages** (`.github/workflows/deploy.yml`). Configuración única: *Settings → Pages → Source: GitHub Actions*. La dirección será `https://<usuario>.github.io/music-improvisation-lab/`. Ahí funcionan el micrófono en vivo y la instalación como app.

## Ejecutar

```bash
npm install
npm run dev        # desarrollo en http://localhost:5173
npm test           # 39 tests de validación musical y lógica
npm run build      # build de producción en dist/ (estático, funciona sin conexión)
npm run preview    # servir el build
```

Para usarla en el teléfono, sirve `dist/` por HTTPS (cualquier hosting estático) y usa «Añadir a pantalla de inicio». El micrófono requiere HTTPS o `localhost`.

## Arquitectura

```
src/
  theory/       Motor musical común (sin UI): notas con ortografía, intervalos, escalas, modos,
                acordes, voicings, conducción de voces, notas guía, progresiones, análisis ii-V,
                transposición de saxo (Si♭/Mi♭), afinación y formas de acordes de guitarra.
  audio/        Reproductor (Tone.js, síntesis sin muestras externas) y generador de
                acompañamientos: walking bass, comping con voicings sin fundamental, batería
                swing / shuffle / balada / bossa, metrónomo, cuenta previa y frase guía.
  content/      Contenido pedagógico estructurado: módulos y lecciones (teoría compartida +
                3 rutas), frases originales, standards (solo armonía), diagnóstico, quizzes,
                recursos y el generador de la sesión diaria (profesor virtual).
  progress/     Estado y progreso por instrumento (matriz de habilidades con evidencias,
                lecciones, repetición espaciada). Adaptador de almacenamiento intercambiable
                (localStorage hoy; nube en el futuro).
  recording/    Grabación (MediaRecorder + IndexedDB) y detección de altura monofónica (YIN).
  instruments/  Diapasón, teclado, pentagrama y diagramas de acordes (SVG propios).
  components/   Vistas reutilizables: escala, acordes, panel de acompañamiento, ejercicios,
                quiz, grabadora, comprobación de notas.
  pages/        Hoy, Mi ruta / Lección, Laboratorio, Teoría, Canciones, Recursos,
                Grabaciones, Progreso, Diagnóstico.
```

El contenido nunca duplica lógica musical: una lección declara «escala X en tonalidad Y» o «frase Z», y el motor la genera para el instrumento activo (con la transposición correcta para el saxo).

## Aprendizaje por niveles (estilo Duolingo)

- **Camino** por instrumento con 6 niveles: 0 Primeros pasos (desde cero) → 1 Fundamentos → 2 Blues e improvisación → 3 Lenguaje del jazz → 4 Standards y bebop → 5 Maestría. Cada unidad tiene nodos *Aprende* (consejos + ejercicios fáciles), *Practica*, *Toca* (taller, acompañamiento, canción o estudio) y *Desafío* (3 vidas). Se puede **saltar con prueba** a cualquier unidad.
- **Ejercicios cortos con respuesta inmediata**: escuchar y elegir, leer notas, encontrar notas en el teclado o diapasón, digitación de saxo, tocar notas y secuencias **con el micrófono**, tocar ritmos (medidos con el reloj de audio), construir acordes, ordenar escalas, emparejar y teoría. Los errores vuelven al final de la lección y quedan en *Repasar errores*.
- **XP, meta diaria, racha con protectores, estrellas y logros**.
- **Prueba de nivel adaptativa**: preguntas, ejercicios reales de cada nivel (sube si aciertas, se detiene si fallas) e improvisación grabada opcional, analizada por el micrófono (notas en la escala, notas del acorde, registro y frases).

## Estudio de transcripción

Carga un archivo (o un enlace directo con permiso CORS, o una de tus grabaciones), cambia la velocidad sin cambiar el tono y el tono sin cambiar la velocidad (SoundTouch, MPL-2.0), repite un fragmento A-B, y obtén **tonalidad, tempo, acordes en cifrado americano** (editables) y la **melodía en partitura** de tu instrumento (Basic Pitch de Spotify, Apache-2.0, ejecutado en el dispositivo). Después puedes improvisar sobre esa armonía en el taller o guardar la frase en tu vocabulario. Son estimaciones: funcionan mejor con un solo instrumento o voz.

## Sonido

Instrumentos sampleados (no síntesis): piano **Salamander Grand Piano V3** (Alexander Holm, CC-BY 3.0); saxo tenor y alto, contrabajo pizzicato, guitarra jazz, Rhodes y baterías de jazz y de escobillas renderizados desde **MuseScore General** (S. Christian Collins, MIT). Se regeneran con:

```bash
sudo apt-get install -y fluidsynth ffmpeg musescore-general-soundfont-lossless
python3 tools/render_samples.py /usr/share/sounds/sf2/MuseScore_General_Full.sf2 <carpeta salamander de github.com/Tonejs/audio> public/samples
```

Cada instrumento es un único mp3 «sprite» (unos 6,4 MB en total) que la app recorta al cargarlo. Los acompañamientos tienen humanización (tiempo y dinámica), swing que se ajusta al tempo, walking bass variado, comping con voicings sin fundamental y anticipaciones. **Salida MIDI** opcional para usar tus propios plugins (Pianoteq, Kontakt, un DAW…): Progreso → Sonido → Avanzado.

## Taller de improvisación

Generador de solos de ejemplo **originales y explicados** sobre cualquier progresión y tonalidad, con siete ideas: notas guía, líneas a notas objetivo, arpegios desde la 3ª, motivo y desarrollo, pregunta-respuesta de blues, ritmo y espacio, y bebop. Cada nota se analiza respecto al acorde que suena (nota guía, nota del acorde, tensión, blue note, aproximación, nota de paso) y se colorea en la partitura. Flujo: escuchar → repetir después de la base → transformar (desplazar, cambiar el final…) → tu turno con un reto → grabarte → guardar en **Mi vocabulario** y practicarlo en las 12 tonalidades con repaso espaciado.

**Profesor IA**: cuando la app se abre dentro de Claude (claude.ai), Claude puede escribir solos de ejemplo y responder preguntas. La app valida y analiza cada nota que propone la IA; fuera de Claude esta pestaña se oculta y todo lo demás funciona sin conexión.

## Metodología

Cada lección responde a seis preguntas (qué, para qué, cómo suena, cómo se toca en tu instrumento, en qué canciones, cómo improvisar con ello). Sus ejercicios siguen la secuencia Escuchar → Imitar → Comprender → Visualizar → Aplicar → Crear → Evaluar → Consolidar.

## Estado de funciones (honesto)

| Función | Estado |
|---|---|
| Selección de instrumento, saxo tenor/alto, progreso separado por instrumento | ✅ |
| Diagnóstico (cuestionario + pruebas) y matriz de habilidades | ✅ (las pruebas de ejecución son autoevaluadas; las de teoría y oído se corrigen) |
| Teoría común (niveles 1–4) y rutas de saxo, guitarra y piano | ✅ fase 1; módulos de fase 2–3 con lecciones iniciales |
| Escalas, modos, acordes, inversiones, voicings y conducción de voces | ✅ |
| Diapasón, teclado y pentagrama transpuesto interactivos | ✅ |
| Acompañamientos (swing, shuffle, balada, bossa) en 12 tonalidades, tempo en vivo | ✅ |
| Sesión diaria de 10/20/30/45 min con repetición espaciada | ✅ |
| Grabación, reproducción, comparación, comentarios y autoevaluación | ✅ |
| Instrumentos sampleados, mezclador y salida MIDI | ✅ |
| Taller: solos de ejemplo explicados, repite después de mí, transformar, retos, vocabulario | ✅ |
| Profesor IA (solo dentro de Claude) | ✅ con validación de notas |
| Detección de notas individuales y comparación de alturas en frases | 🟡 beta (solo alturas, monofónico) |
| Medición de precisión rítmica, reconocimiento de arpegios y acordes por micrófono | ⏳ no implementado: la app lo indica, no lo simula |
| Biblioteca de standards (progresiones + análisis + tareas por instrumento) | ✅ 9 temas; sin melodías por derechos de autor |
| Recursos externos | ✅ enlaces a páginas principales, marcados como «no verificados» hasta que el usuario los confirme |

## Validación musical

`src/theory/theory.test.ts`, `src/content/content.test.ts` y `src/audio/backing.test.ts` comprueban, entre otras cosas:
- ortografía de escalas en las 12 tonalidades y modos derivados de su escala madre;
- construcción de acordes, voicings A/B, conducción de voces del ii-V-I y notas guía;
- **todas** las formas de acordes de guitarra producen exactamente notas del acorde en las 12 tonalidades;
- transposición de saxo tenor (+9ª mayor) y alto (+6ª mayor), incluida la octava;
- progresiones y standards con el número correcto de compases;
- acompañamientos: el bajo toca la fundamental en el tiempo 1 de cada acorde y el piano solo toca notas del acorde o tensiones 9/13;
- detección de altura con señales sintéticas.
