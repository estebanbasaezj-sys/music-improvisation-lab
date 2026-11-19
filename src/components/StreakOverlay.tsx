// Pantallas de celebración al estilo Duolingo que aparecen al terminar la primera práctica del día
// (racha extendida) y al cumplir la meta diaria de XP. Escucha los cambios del estado global, así que
// funciona igual desde lecciones, repasos, pruebas o la sesión guiada.
import { useEffect, useRef, useState } from 'react';
import { AppState, addDays, currentStreak, today, useAppState, xpToday } from '../progress/store';

type Event = { kind: 'streak'; count: number; started: boolean } | { kind: 'goal'; xp: number; goal: number };

const WEEK = ['L', 'M', 'X', 'J', 'V', 'S', 'D'];

/** Lunes de la semana actual (fecha local). */
function weekDays(): string[] {
  const t = today();
  const dow = (new Date(t + 'T12:00:00').getDay() + 6) % 7; // 0 = lunes
  return Array.from({ length: 7 }, (_, i) => addDays(t, i - dow));
}

export function StreakWeek({ s, animateToday }: { s: AppState; animateToday?: boolean }) {
  const t = today();
  return (
    <div className="streak-week">
      {weekDays().map((d, i) => {
        const done = (s.game.xpByDay[d] ?? 0) > 0;
        const isToday = d === t;
        return (
          <div key={d} className={`sw-day ${done ? 'done' : ''} ${isToday ? 'today' : ''} ${d > t ? 'future' : ''} ${isToday && animateToday ? 'pop' : ''}`}>
            <span className="sw-l">{WEEK[i]}</span>
            <span className="sw-dot">{done ? '✓' : ''}</span>
          </div>
        );
      })}
    </div>
  );
}

export function StreakOverlay() {
  const s = useAppState();
  const prev = useRef<{ lastDay: string | null; xp: number } | null>(null);
  const [queue, setQueue] = useState<Event[]>([]);
  useEffect(() => {
    const d = today();
    const now = { lastDay: s.game.streak.lastDay, xp: xpToday(s) };
    const p = prev.current;
    prev.current = now;
    if (!p) return; // primera carga: no celebrar
    const ev: Event[] = [];
    if (p.lastDay !== d && now.lastDay === d) ev.push({ kind: 'streak', count: currentStreak(s), started: currentStreak(s) === 1 });
    const goal = s.game.dailyGoal;
    if (p.xp < goal && now.xp >= goal) ev.push({ kind: 'goal', xp: now.xp, goal });
    if (ev.length) setQueue((q) => [...q, ...ev]);
  }, [s]);
  const cur = queue[0];
  if (!cur) return null;
  const next = () => setQueue((q) => q.slice(1));
  if (cur.kind === 'streak') {
    const n = cur.count;
    return (
      <div className="overlay streak-overlay" role="dialog" aria-label="Racha">
        <div className="streak-card">
          <div className="flame-wrap" aria-hidden="true">
            <svg viewBox="0 0 120 150" className="flame">
              <defs>
                <linearGradient id="fl-o" x1="0" y1="1" x2="0" y2="0"><stop offset="0" stopColor="#ff7a1a" /><stop offset="1" stopColor="#ffb238" /></linearGradient>
                <linearGradient id="fl-i" x1="0" y1="1" x2="0" y2="0"><stop offset="0" stopColor="#ffd34d" /><stop offset="1" stopColor="#fff2b0" /></linearGradient>
              </defs>
              <path className="fl-outer" d="M60 6c6 22 34 40 40 72 6 34-16 64-40 64S14 116 20 82c3-18 14-26 18-40 4 12 2 22 10 28 0-24 4-46 12-64z" fill="url(#fl-o)" />
              <path className="fl-inner" d="M60 62c4 14 22 26 22 46 0 18-10 30-22 30s-22-12-22-28c0-12 8-18 10-26 3 8 4 12 8 14 0-14 1-26 4-36z" fill="url(#fl-i)" />
            </svg>
            <span className="flame-num">{n}</span>
          </div>
          <h1>{n === 1 ? '¡1 día de racha!' : `¡${n} días de racha!`}</h1>
          <p>{cur.started ? 'Empezaste una racha nueva. Practica un poco cada día para mantenerla encendida.' : 'Tu racha sigue viva. ¡Vuelve mañana para sumar otro día!'}</p>
          <StreakWeek s={s} animateToday />
          {s.game.streak.freezes > 0 && <p className="muted small">🧊 Tienes {s.game.streak.freezes} protector(es): si un día no practicas, se usa uno y no pierdes la racha.</p>}
          {n > 0 && n % 7 === 0 && <p className="small">🎁 ¡Una semana completa! Ganaste un protector de racha.</p>}
          <button className="btn primary big" onClick={next} autoFocus>Continuar</button>
        </div>
      </div>
    );
  }
  return (
    <div className="overlay streak-overlay" role="dialog" aria-label="Meta diaria">
      <div className="streak-card goal">
        <div className="goal-ring" aria-hidden="true">
          <svg viewBox="0 0 120 120"><circle cx="60" cy="60" r="50" className="gr-bg" /><circle cx="60" cy="60" r="50" className="gr-fg" /></svg>
          <span>🎯</span>
        </div>
        <h1>¡Meta diaria cumplida!</h1>
        <p>Hoy sumaste <b>{cur.xp} XP</b> (tu meta era {cur.goal}). Puedes seguir practicando o volver mañana.</p>
        <button className="btn primary big" onClick={next} autoFocus>Continuar</button>
      </div>
    </div>
  );
}
