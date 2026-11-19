// Perfiles por edad: adaptan el menú (modo simple), la meta diaria y el largo de las lecciones.
import type { AgeProfile, AppState } from '../progress/store';

export const PROFILE_INFO: Record<AgeProfile, { label: string; sub: string; icon: string; goal: number; text: string }> = {
  nino: { label: 'Niño o niña', sub: '6 a 12 años', icon: '🧒', goal: 10, text: 'Pantallas sencillas, lecciones más cortas y mucho juego. Ideal con un adulto al lado.' },
  adolescente: { label: 'Adolescente', sub: '13 a 17 años', icon: '🧑‍🎤', goal: 20, text: 'Camino, misiones y repertorio para tocar con la banda; las herramientas avanzadas en «Más».' },
  adulto: { label: 'Adulto', sub: '18 años o más', icon: '🧑', goal: 20, text: 'Todas las herramientas a la vista: laboratorio, sacar solos, teoría y grabaciones.' },
};

/** ¿Menú y pantallas reducidas? Por defecto sí para niños y adolescentes. */
export const isSimple = (s: AppState) => s.settings.simple ?? (s.settings.profile === 'nino' || s.settings.profile === 'adolescente');

/** Rutas visibles en el menú principal según el perfil (el resto queda en «Más»). */
export function mainNav(s: AppState): string[] | null {
  if (!isSimple(s)) return null; // todo visible
  if (s.settings.profile === 'nino') return ['hoy', 'camino', 'repertorio', 'progreso'];
  return ['hoy', 'camino', 'repertorio', 'estudio', 'progreso'];
}

/** Ejercicios por lección según la edad (los niños, lecciones más cortas). */
export const lessonLength = (s: AppState, kind: string) => {
  const base = kind === 'learn' ? 8 : kind === 'practice' ? 10 : 12;
  return s.settings.profile === 'nino' ? base - 2 : base;
};
