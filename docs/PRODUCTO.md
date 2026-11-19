# Music Improvisation Lab — plan de producto

Guía para convertir la app en un producto con licencia. Resume qué hay hoy, cuánto cuesta la IA, cómo separar las versiones gratuita y Pro, y los pasos en orden. Los mismos pasos están en la app: **Administración → Lanzamiento** (se pueden marcar).

## 1. Dónde corre la IA y cuánto cuesta

| Función | Tecnología | Dónde corre | Costo por uso para el negocio |
|---|---|---|---|
| Separación de instrumentos | SCNet (pesos MIT) + ONNX Runtime Web | Equipo del usuario (WebGPU o CPU) | **US$ 0** |
| Transcripción a partitura | Basic Pitch (Apache-2.0) + TensorFlow.js | Equipo del usuario | **US$ 0** |
| Armonía, tempo, detección por micrófono | Algoritmos propios (cromagrama, YIN, seguimiento de pulso) | Equipo del usuario | **US$ 0** |
| Explicación del solo, solos de ejemplo | Reglas propias | Equipo del usuario | **US$ 0** |
| Profesor IA (solos y preguntas) | Claude (API) | **Nube** | por tokens (abajo) |

Las bibliotecas de IA ya se «instalan» en el equipo: el modelo SCNet (≈13 MB) y el motor ONNX (15–29 MB) se descargan la primera vez y quedan guardados; con la app instalada (PWA) funcionan sin conexión. En equipos sin WebGPU la separación usa el procesador y es más lenta (mídelo en **Administración → IA y costos**). Un celular nuevo con WebGPU la hace en la tarjeta gráfica.

**Costo del Profesor IA** (precios oficiales de Claude por millón de tokens, consultados el 2026-11-03; la lectura desde caché ≈10 % del precio de entrada). Ejemplo: 40 llamadas al mes por usuario, 2 500 tokens de entrada (la mitad desde caché) y 600 de salida por llamada:

| Modelo | Entrada / salida (US$ por M tokens) | Costo por usuario al mes |
|---|---|---|
| Claude Haiku 5.5 | 0,10 / 0,50 | ≈ US$ 0,02 |
| Claude Sonnet 5.5 | 2 / 10 | ≈ US$ 0,35 |
| Claude Opus 5.5 | 4 / 20 | ≈ US$ 0,70 |

Conclusión: la IA pesada ya corre en el equipo del usuario, así que el costo variable lo pone casi solo el Profesor IA. Con cupos mensuales y el modelo económico para preguntas simples, el costo de IA queda muy por debajo del precio de una suscripción. A esto se suman hosting, CDN (la primera visita descarga ≈50 MB entre sonidos y motor de IA), soporte, comisiones de cobro e impuestos. Usa la calculadora de **Administración** con tus datos medidos.

## 2. Versiones

| | Gratis | Pro |
|---|---|---|
| Camino por niveles, lecciones, prueba de nivel, rachas, misiones, logros | ✅ | ✅ |
| Laboratorio, acompañamientos con mezclador, micrófono y palmas | ✅ | ✅ |
| Repertorio | 12 temas | todos + nuevos |
| Sacar solos: editor, loop, velocidad, tono | ✅ | ✅ |
| Separación con IA | 3 por mes | ilimitada |
| Transcripción y explicación del solo | 5 por mes | ilimitada |
| Proyectos guardados | 3 | ilimitados |
| Profesor IA (nube) | — | con cupo mensual |

Ya implementado: los planes y sus límites (`src/product/plans.ts`) y una vista previa de cada plan en **Administración → Planes**. Hoy el plan está en «Pro» porque aún no se cobra.

## 3. Pasos en orden

1. **Medir** (ahora): prueba 2–4 semanas con 10–20 personas de cada edad; mira en Administración qué usan, dónde abandonan y cuánto tarda la IA en sus equipos.
2. **Producto vendible**: cuentas de usuario y progreso en la nube; licencia verificada en el servidor; pasarela de cobro (Paddle o Lemon Squeezy gestionan impuestos internacionales; Stripe, Mercado Pago o Flow desde Chile); backend propio para el Profesor IA (la clave de la API nunca en el navegador).
3. **Legal**: términos y privacidad; con menores, consentimiento de padres y datos mínimos (COPPA, GDPR, Ley 21.719 en Chile; consulta a un abogado); créditos de licencias (Salamander CC-BY exige atribución); revisar la captura de audio de otras pestañas para la versión comercial; registrar la marca.
4. **Simple y motivador**: perfiles por edad, modo simple, misiones diarias (hechos); recordatorios y ligas semanales (necesitan backend).
5. **Lanzamiento**: dominio propio y CDN, monitoreo de errores con consentimiento, beta cerrada, ajustar precio y cupos según la conversión, y luego apps para tiendas (Capacitor o TWA).

## 4. Observabilidad

`src/telemetry/telemetry.ts` registra en el navegador sesiones, pantallas, lecciones, funciones, operaciones de IA (duración, dispositivo, segundos de audio, tokens estimados), errores y capacidades del equipo. **Administración** (`#/admin`) muestra los resúmenes, la calculadora de costos y permite exportar los datos. Para ver a todos los usuarios, conecta `setSink()` a un servicio propio de analítica **con consentimiento** (obligatorio con menores) y agrega los datos en el servidor.
