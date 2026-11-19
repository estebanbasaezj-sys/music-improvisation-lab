// Pasos para convertir la app en un producto comercial (resumen de docs/PRODUCTO.md, usado en Administración).
export const LAUNCH_STEPS: { phase: string; steps: { id: string; title: string; detail: string }[] }[] = [
  { phase: 'Fase 0 · Medir antes de decidir (ahora)', steps: [
    { id: 'm1', title: 'Probar con 10–20 personas reales de cada edad', detail: 'Niños (con un adulto), adolescentes y adultos durante 2–4 semanas. Mide con este panel: lecciones por día, rachas, funciones más usadas y dónde abandonan.' },
    { id: 'm2', title: 'Medir la IA en equipos reales', detail: 'Pestaña «IA y costos»: tiempo de separación y transcripción en un notebook, un computador de escritorio y celulares. Decide desde qué duración conviene pedir separar solo el solo.' },
    { id: 'm3', title: 'Definir el precio con la calculadora', detail: 'Hoy la IA corre en el equipo del usuario (costo US$ 0 por uso). Solo el Profesor IA cuesta: usa la calculadora para fijar su cupo mensual y el precio Pro.' },
  ] },
  { phase: 'Fase 1 · Producto vendible', steps: [
    { id: 'p1', title: 'Cuentas de usuario y progreso en la nube', detail: 'Backend con inicio de sesión (p. ej. Supabase o Firebase) para que la licencia y el progreso sigan al usuario entre equipos. Hoy todo vive en el navegador.' },
    { id: 'p2', title: 'Verificar la licencia en el servidor', detail: 'Los límites del plan gratuito ya existen en la app, pero se pueden saltar en el navegador: el plan debe validarlo el servidor (token firmado).' },
    { id: 'p3', title: 'Pasarela de cobro', detail: 'Para vender en muchos países, una «merchant of record» (Paddle, Lemon Squeezy) gestiona impuestos y facturas; Stripe o Mercado Pago/Flow si vendes desde Chile. En tiendas de apps, su sistema de pago es obligatorio para contenido digital.' },
    { id: 'p4', title: 'Profesor IA con backend propio', detail: 'Fuera de claude.ai, el Profesor IA necesita un servidor que llame a la API de Claude con tu clave (nunca en el navegador), con límite de llamadas por usuario y caché del texto fijo.' },
  ] },
  { phase: 'Fase 2 · Legal y confianza', steps: [
    { id: 'l1', title: 'Términos, privacidad y menores de edad', detail: 'Si hay niños: consentimiento de padres y mínimos datos (COPPA en EE. UU. para menores de 13; GDPR en Europa; en Chile la Ley 21.719). Consulta a un abogado antes de cobrar.' },
    { id: 'l2', title: 'Atribuciones de licencias de terceros', detail: 'Pantalla de créditos: Salamander Grand Piano (CC-BY 3.0, exige atribución), MuseScore General (MIT), SoundTouch JS (MPL-2.0), Basic Pitch y TensorFlow.js (Apache-2.0), SCNet y ONNX Runtime (MIT), Tone.js (MIT).' },
    { id: 'l3', title: 'Repertorio y captura de audio', detail: 'Los cifrados son libres; las melodías y grabaciones no (la app ya lo respeta). Revisa con un abogado la captura de audio de otras pestañas en la versión comercial.' },
    { id: 'l4', title: 'Marca y dominio', detail: 'Registra el nombre (INAPI en Chile) y un dominio propio.' },
  ] },
  { phase: 'Fase 3 · Simple y motivador para todas las edades', steps: [
    { id: 's1', title: 'Perfiles por edad y modo simple', detail: 'Ya implementado: niño, adolescente y adulto con menú reducido, misiones del día y cofre. Ajusta según lo que muestren las pruebas.' },
    { id: 's2', title: 'Recordatorios y ligas semanales', detail: 'Notificaciones de racha y ligas con otros usuarios (requieren el backend de la fase 1).' },
  ] },
  { phase: 'Fase 4 · Lanzamiento', steps: [
    { id: 'z1', title: 'Hosting profesional', detail: 'Dominio propio y un CDN (Cloudflare Pages, Vercel o Netlify) en lugar de GitHub Pages; monitoreo de errores (p. ej. Sentry) con consentimiento.' },
    { id: 'z2', title: 'Beta cerrada y precio de lanzamiento', detail: 'Invita a los usuarios de la fase 0, mide la conversión de Gratis a Pro y ajusta el precio y los cupos.' },
    { id: 'z3', title: 'Apps para tiendas', detail: 'La app ya es instalable (PWA). Para App Store y Google Play se puede empaquetar (Capacitor o TWA).' },
  ] },
];
