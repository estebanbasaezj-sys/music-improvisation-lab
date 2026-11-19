// Planes: qué incluye la versión gratuita y la Pro. El cobro aún no está activo (se anuncia como «próximamente»).
import { FEATURES } from '../product/plans';
import { useAppState } from '../progress/store';
import { Card } from '../components/common';

export function PlansPage() {
  const s = useAppState();
  const free = FEATURES.filter((f) => f.tier === 'free');
  const pro = FEATURES.filter((f) => f.tier === 'pro');
  return (
    <div className="page plans">
      <div className="page-hero"><h1>Planes</h1><p className="lead">Aprende gratis para siempre con el camino completo. Pro suma la inteligencia artificial y todo el repertorio.</p></div>
      <div className="plan-grid">
        <Card className={`plan ${s.settings.plan === 'free' ? 'current' : ''}`}>
          <h2>Gratis</h2>
          <p className="plan-price">US$ 0</p>
          <ul>{free.map((f) => <li key={f.id}>✅ {f.name}</li>)}{pro.filter((f) => f.limitText).map((f) => <li key={f.id}>🔸 {f.name}: {f.limitText}</li>)}</ul>
          {s.settings.plan === 'free' && <span className="pill">Tu plan</span>}
        </Card>
        <Card className={`plan pro ${s.settings.plan === 'pro' ? 'current' : ''}`}>
          <h2><span className="pro-badge">PRO</span> Pro</h2>
          <p className="plan-price">Próximamente</p>
          <ul><li>✅ Todo lo del plan gratuito</li>{pro.map((f) => <li key={f.id}>⭐ {f.name}</li>)}</ul>
          {s.settings.plan === 'pro' ? <span className="pill">Activo (versión de desarrollo)</span> : <button className="btn primary" disabled>Suscribirme (pronto)</button>}
        </Card>
      </div>
      <p className="muted small">La separación de instrumentos, la transcripción y la explicación del solo se calculan en tu propio equipo; el Profesor IA usa la nube. Tu audio no se sube a ningún servidor.</p>
    </div>
  );
}
