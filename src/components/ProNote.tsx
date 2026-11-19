// Aviso de función Pro (con lo que incluye el plan) cuando el usuario gratuito llega a un límite.
import { FEATURES, FeatureId, featureById } from '../product/plans';

export function ProNote({ feature, reason, onClose }: { feature: FeatureId; reason?: string; onClose?: () => void }) {
  const f = featureById(feature);
  return (
    <div className="pro-note" role="dialog" aria-label="Función Pro">
      <div className="pro-head"><span className="pro-badge">PRO</span><b>{f.name}</b>{onClose && <button className="btn sm" onClick={onClose}>Cerrar</button>}</div>
      <p className="small">{reason ?? 'Esta función es parte del plan Pro.'}</p>
      <ul className="small">{FEATURES.filter((x) => x.tier === 'pro').map((x) => <li key={x.id}>{x.name}{x.limitText ? ` (gratis: ${x.limitText})` : ''}</li>)}</ul>
      <a className="btn primary" href="#/planes">Ver planes</a>
    </div>
  );
}

export function ProBadge() { return <span className="pro-badge sm">PRO</span>; }
