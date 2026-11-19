// Captura del audio que suena en una pestaña del navegador (getDisplayMedia con audio), en tiempo real,
// como un grabador: sirve para estudiar un fragmento que estás escuchando (por ejemplo el video insertado
// en la app o una pestaña con un reproductor). No descarga nada de ningún servicio.
export const canCaptureTab = () => typeof navigator !== 'undefined' && !!navigator.mediaDevices && 'getDisplayMedia' in navigator.mediaDevices && !/iPhone|iPad|iPod|Android/i.test(navigator.userAgent);

export interface TabCapture { stop: () => Promise<Blob>; cancel: () => void; startedAt: number }

export async function captureTabAudio(currentTab: boolean, onEnded?: () => void): Promise<TabCapture> {
  const constraints = {
    video: true, // Chrome exige pedir video para ofrecer el audio de la pestaña; no se usa
    audio: { echoCancellation: false, noiseSuppression: false, autoGainControl: false, suppressLocalAudioPlayback: false },
    preferCurrentTab: currentTab,
    selfBrowserSurface: currentTab ? 'include' : 'exclude',
    surfaceSwitching: 'exclude',
    systemAudio: 'include',
  } as DisplayMediaStreamOptions;
  const stream = await navigator.mediaDevices.getDisplayMedia(constraints);
  const audio = stream.getAudioTracks();
  if (!audio.length) {
    stream.getTracks().forEach((t) => t.stop());
    throw new Error('No se compartió el audio. Vuelve a intentarlo y marca «Compartir también el audio de la pestaña».');
  }
  const rec = new MediaRecorder(new MediaStream(audio), MediaRecorder.isTypeSupported('audio/webm;codecs=opus') ? { mimeType: 'audio/webm;codecs=opus', audioBitsPerSecond: 192000 } : undefined);
  const chunks: Blob[] = [];
  rec.ondataavailable = (e) => { if (e.data.size) chunks.push(e.data); };
  rec.start(1000);
  let done: ((b: Blob) => void) | null = null;
  rec.onstop = () => { stream.getTracks().forEach((t) => t.stop()); done?.(new Blob(chunks, { type: rec.mimeType || 'audio/webm' })); };
  // si el usuario deja de compartir desde el navegador
  stream.getTracks().forEach((t) => t.addEventListener('ended', () => { if (rec.state === 'recording') { rec.stop(); onEnded?.(); } }));
  return {
    startedAt: performance.now(),
    stop: () => new Promise<Blob>((res) => { done = res; if (rec.state === 'recording') rec.stop(); else res(new Blob(chunks, { type: rec.mimeType || 'audio/webm' })); }),
    cancel: () => { done = null; if (rec.state === 'recording') rec.stop(); stream.getTracks().forEach((t) => t.stop()); },
  };
}
