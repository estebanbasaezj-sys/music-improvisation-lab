# Music Improvisation Lab

Entrenador de improvisación para **saxofón, guitarra y piano**: una sola aplicación web instalable (PWA) con una base común de teoría aplicada, una ruta específica para cada instrumento y progreso independiente por instrumento.

## Publicación

Cada push a `main` ejecuta los tests, compila y publica la app en **GitHub Pages** (`.github/workflows/deploy.yml`). Configuración única: *Settings → Pages → Source: GitHub Actions*. La dirección será `https://<usuario>.github.io/music-improvisation-lab/`. Ahí funcionan el micrófono en vivo y la instalación como app.

## Ejecutar

```bash
npm install
npm run dev        # desarrollo en http://localhost:5173
npm test           # tests de validación musical y lógica
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

## Sacar solos (estudio tipo Transcribe! / Amazing Slow Downer + separación con IA)

1. **Abrir un audio**: archivo de audio o video (se usa su audio), enlace directo, una grabación tuya o un proyecto guardado. Con un **enlace de YouTube** el video se reproduce dentro de la app y puedes **capturar su audio mientras suena** (o capturar cualquier otra pestaña): la app no descarga nada de YouTube, graba en tu equipo lo que suena, para estudio personal.
2. **Elegir el instrumento** que quieres sacar: saxo, trompeta, voz, guitarra, piano, bajo, batería o «instrumento principal».
3. **Editor**: onda con zoom y vista general, loop A-B, marcas, velocidad de 25 % a 150 % sin cambiar el tono, tono ±12 semitonos (botón «afinar a mi saxo»), volumen y atajos de teclado (espacio, [ ], L, M, flechas).
4. **Separar instrumentos con IA** en el navegador: modelo **SCNet** (Tong et al., ICASSP 2024; pesos con licencia MIT) mediante `@audio/neural-separate` y ONNX Runtime Web, en la tarjeta gráfica (WebGPU) o en el procesador. Pistas: voz/solista, batería, bajo y resto (piano, guitarra…). La primera vez descarga ≈13 MB desde Hugging Face (comprobados por SHA-256) y quedan en caché. Mezclador por pista (volumen, silencio, solo, WAV) y combinaciones: solo el instrumento, instrumento al frente o **todo menos el instrumento** para tocar encima. También hay una separación sin IA (centro/lados del estéreo) y un **realce de la melodía** que, con las notas transcritas, deja pasar solo los armónicos del solo.
5. **Armonía y tempo** del acompañamiento (sin el solista), con acordes editables.
6. **Partitura** del loop desde la pista del instrumento (Basic Pitch), filtrada a su registro y en la notación de tu instrumento.
7. **Explicación del solo**: escala general y escala sobre cada acorde, notas guía, aproximaciones cromáticas, encierros, arpegios, pasajes de escala, blue notes, tensiones, secuencias y motivos, frase por frase y qué practicar, siempre con los compases donde ocurre.

Los proyectos (audio, pistas, loop, marcas y ajustes) se guardan en el navegador (IndexedDB). Separar un tema entero puede tardar varios minutos: conviene marcar el solo con el loop y separar solo esa parte.

## Para todas las edades, planes y administración

- **¿Quién va a practicar?** Niño (6–12), adolescente (13–17) o adulto. Los perfiles de niño y adolescente usan el **menú simple** (lo esencial + «Más»), los niños tienen lecciones más cortas, meta de 10 XP y controles más grandes. Se cambia en Progreso → Ajustes.
- **Misiones del día** (XP, 2 lecciones, una lección con 90 %) con cofre de recompensa, **nivel de jugador**, rachas con pantalla de celebración y meta diaria.
- **Planes Gratis / Pro** (`src/product/plans.ts`): lo educativo es gratis; la separación con IA, la transcripción con explicación, el repertorio completo, los proyectos ilimitados y el Profesor IA son Pro (con cupos gratuitos mensuales). Aún no se cobra: el plan está en «Pro» y Administración permite previsualizar el gratuito.
- **Administración** (`#/admin`, enlace en Progreso): observabilidad local y privada (uso por día, pantallas y funciones, operaciones de IA con tiempo, dispositivo y audio procesado, errores, capacidades del equipo), **calculadora de costo del Profesor IA** con los precios oficiales de Claude y el **plan de lanzamiento** con casillas.
- **Plan de producto**: [`docs/PRODUCTO.md`](docs/PRODUCTO.md) — dónde corre la IA y cuánto cuesta, versiones, pasos para cobrar licencias, temas legales y lanzamiento.

## Sonido

Instrumentos sampleados (no síntesis): piano **Salamander Grand Piano V3** (Alexander Holm, CC-BY 3.0); saxo tenor y alto, contrabajo pizzicato, guitarra jazz, Rhodes y baterías de jazz y de escobillas renderizados desde **MuseScore General** (S. Christian Collins, MIT). Se regeneran con:

```bash
sudo apt-get install -y fluidsynth ffmpeg musescore-general-soundfont-lossless
python3 tools/render_samples.py /usr/share/sounds/sf2/MuseScore_General_Full.sf2 <carpeta salamander de github.com/Tonejs/audio> public/samples
```

Cada instrumento es un único mp3 «sprite» (unos 6,4 MB en total) que la app recorta al cargarlo. Los acompañamientos tienen humanización (tiempo y dinámica), swing que se ajusta al tempo, walking bass variado, comping con voicings sin fundamental y anticipaciones. **Salida MIDI** opcional para usar tus propios plugins (Pianoteq, Kontakt, un DAW…): Progreso → Sonido → Avanzado.

## Repertorio (tipo «Real Book»)

32 temas clásicos (blues, standards, bebop, modal, bossa, funk/soul jazz y tradicionales) con **cifrado completo** transpuesto para tu instrumento (saxo tenor/alto escrito), forma y secciones, tonalidad elegible, **tempo libre** (practica lento y sube), bucle por sección y tres modos:

- **Tema**: la melodía real en los temas de dominio público; en los temas con derechos, una **melodía de estudio original** generada sobre la armonía (claramente rotulada). No se reproducen melodías ni solos grabados protegidos.
- **Solos de ejemplo**: solos originales explicados nota a nota con las siete ideas del taller.
- **Improvisa tú**: la base completa para tocar encima, con escalas/notas guía del acorde que suena y análisis opcional por micrófono.

Cada tema enlaza la **grabación oficial en YouTube**. Los enlaces se comprobaron con el servicio oEmbed de YouTube (`node tools/check-links.mjs`, requiere red) y la app los vuelve a comprobar al abrirlos con la API oficial del reproductor: si un video falla prueba el siguiente y, si ninguno funciona, ofrece búsquedas en YouTube y Spotify.

## Mezclador global y botón «Detener audio»

- **Mezcla** (barra superior): elige qué suena en todos los acompañamientos —batería, bajo, piano, guitarra, melodía y clic— en cualquier combinación (solo batería, batería + clic, solo piano, trío para solear…). Se aplica en vivo.
- **Detener audio**: aparece un botón flotante mientras suena cualquier cosa (acompañamientos, frases, metrónomo, estudio, demostraciones, video); también con la tecla Esc.

## Explorar una cadencia (Laboratorio)

La primera pestaña del Laboratorio guía en tres pasos:

1. **Elige la cadencia**: V7→I, ii–V–I mayor, blues de 12 compases, turnaround I–vi–ii–V, vamp dórico, ii–V–i menor, iii–VI7–ii–V, backdoor y sustitución tritonal, en cualquier tonalidad (nombres transpuestos para saxo).
2. **Elige qué escala tocar**: modo fácil (una escala para toda la cadencia, con el modo que forma sobre cada acorde) o una escala por acorde con etiquetas *recomendada*, *segura*, *color*, *tensión*, *bebop* y *blues*, y el porqué de cada una (dórico, mixolidio, alterada, disminuida, lidio dominante, locrio #2, menor melódica, bebop…).
3. **Prueba ideas de menos a más**: recorrer la escala (desde la fundamental, desde la 3ª, conectada sin cortar) → tríadas y arpegios (1-3-5-8, 1-3-5-7, conectados, 3-5-7-9) → ideas compuestas (1-2-3-5, terceras, notas guía, motivo) → bebop (aproximación cromática, enclosure, escala bebop, línea completa) → frases clave (b9 que resuelve, sustituto tritonal, pentatónicas superpuestas, b3→3 del blues).

Cada idea se genera para la cadencia, la tonalidad, las escalas elegidas y el registro del instrumento; se ve en partitura con la función de cada nota, suena con acompañamiento, se repite frase a frase y tiene un reto. «¡Lo probé!» suma XP y cuenta para la racha. Las «frases clave» indican de dónde viene cada recurso; son frases originales construidas con ese recurso, no transcripciones. Código: `src/theory/cadence.ts` (pruebas en `cadence.test.ts`) y `src/components/CadenceExplorer.tsx`.

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
| Medición de precisión rítmica (botón, barra espaciadora o **palmas por micrófono**) | ✅ medida con el reloj de audio |
| Reconocimiento de acordes por micrófono | 🟡 beta (cromagrama) |
| Biblioteca de standards (progresiones + análisis + tareas por instrumento) | ✅ 9 temas con análisis ampliado |
| Repertorio tipo Real Book con enlaces oficiales verificados | ✅ 32 temas (24 con video oficial que se reproduce dentro de la app); melodía real solo en temas de dominio público |
| Sacar solos: separación con IA, editor con loop, partitura y explicación del solo | 🟡 beta: la calidad depende de la grabación; la separación con IA requiere la versión de GitHub Pages (en claude.ai el navegador bloquea el modelo) |
| Rachas, meta diaria y pantallas de celebración estilo Duolingo | ✅ |
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
