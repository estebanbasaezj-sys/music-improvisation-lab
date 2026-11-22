// Desbloqueo del audio en celulares.
// - iPhone/iPad (y Android en menor medida) solo dejan sonar el audio si se activa DENTRO de un toque del
//   usuario. Muchas partes de la app esperan algo (cargar muestras, pedir el micrófono) antes de sonar, y para
//   entonces el navegador ya no lo considera un toque. Aquí se escucha cada toque de toda la página y, en ese
//   mismo instante, se reanuda el audio si está detenido.
// - El iPhone en modo silencio (interruptor lateral) silencia el audio web. Se pide la sesión de audio de
//   «reproducción» (iOS 17+) o, en iOS anteriores, se reproduce un audio mudo que cambia la sesión.
// - Al volver de otra app o de una llamada, iOS deja el audio «interrumpido»: el siguiente toque lo reanuda.
import * as Tone from 'tone';

export const isIOS = () =>
  typeof navigator !== 'undefined' && (/iPad|iPhone|iPod/.test(navigator.userAgent) || (navigator.platform === 'MacIntel' && navigator.maxTouchPoints > 1));

export const isMobile = () =>
  typeof navigator !== 'undefined' && (/Android|iPhone|iPad|iPod|Mobile/i.test(navigator.userAgent) || isIOS());

let silentEl: HTMLAudioElement | null = null;

/** Un WAV mudo y corto (8 kHz, 0,1 s) creado en el momento: no hace falta ningún archivo. */
function silentWavUrl(): string {
  const n = 800;
  const buf = new ArrayBuffer(44 + n * 2);
  const v = new DataView(buf);
  const str = (o: number, s: string) => { for (let i = 0; i < s.length; i++) v.setUint8(o + i, s.charCodeAt(i)); };
  str(0, 'RIFF'); v.setUint32(4, 36 + n * 2, true); str(8, 'WAVE'); str(12, 'fmt ');
  v.setUint32(16, 16, true); v.setUint16(20, 1, true); v.setUint16(22, 1, true); v.setUint32(24, 8000, true);
  v.setUint32(28, 16000, true); v.setUint16(32, 2, true); v.setUint16(34, 16, true); str(36, 'data'); v.setUint32(40, n * 2, true);
  return URL.createObjectURL(new Blob([buf], { type: 'audio/wav' }));
}

function bypassSilentSwitch() {
  const nav = navigator as Navigator & { audioSession?: { type: string } };
  if (nav.audioSession) {
    // iOS 17+: «playback» suena aunque el interruptor esté en silencio
    try { if (nav.audioSession.type !== 'playback' && nav.audioSession.type !== 'play-and-record') nav.audioSession.type = 'playback'; } catch { /* nada */ }
    return;
  }
  if (!isIOS()) return;
  try {
    if (!silentEl) {
      silentEl = document.createElement('audio');
      silentEl.setAttribute('x-webkit-airplay', 'deny');
      silentEl.setAttribute('playsinline', '');
      silentEl.preload = 'auto';
      silentEl.loop = true;
      silentEl.src = silentWavUrl();
    }
    if (silentEl.paused) void silentEl.play().catch(() => undefined);
  } catch { /* nada */ }
}

// Hasta que la app quiera sonar por primera vez no se toca el audio: así abrir la app no corta la música
// que el usuario tenga sonando en otra aplicación.
let wanted = false;

function resumeContext() {
  try {
    const ctx = Tone.getContext();
    if (ctx.state !== 'running') void Tone.start().catch(() => undefined);
  } catch { /* nada */ }
}

/** Debe llamarse de forma síncrona dentro de un toque, clic o tecla (o al empezar a reproducir). */
export function resumeAudioNow() {
  wanted = true;
  resumeContext();
  bypassSilentSwitch();
}

let installed = false;
/** Escucha todos los toques de la página para mantener el audio desbloqueado. Llamar una vez al iniciar. */
export function installAudioUnlock() {
  if (installed || typeof document === 'undefined') return;
  installed = true;
  // reanudar el contexto no corta otras apps (el audio web se mezcla); el truco del modo silencio sí, por eso
  // solo se aplica cuando la app ya quiso sonar
  const h = () => { if (wanted) resumeAudioNow(); else resumeContext(); };
  // touchend y click son los gestos que iOS acepta; pointerdown y keydown cubren el resto
  for (const t of ['touchend', 'click', 'pointerdown', 'keydown']) document.addEventListener(t, h, { capture: true, passive: true });
  document.addEventListener('visibilitychange', () => {
    // en segundo plano se pausa el audio mudo (no deja el reproductor abierto en la pantalla de bloqueo)
    if (document.hidden) silentEl?.pause();
  });
}
