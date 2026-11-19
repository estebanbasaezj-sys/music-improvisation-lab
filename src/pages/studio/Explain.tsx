// Explicación escrita del solo transcrito (modo, acordes, recursos, frases y qué practicar).
import { SoloReport } from '../../theory/soloAnalysis';

export function SoloExplanation({ report, onJump }: { report: SoloReport; onJump?: (bar: number) => void }) {
  const bar = (b: number) => (onJump ? <button key={b} className="chip sm" onClick={() => onJump(b)}>c. {b}</button> : <span key={b} className="pill">c. {b}</span>);
  return (
    <div className="explain">
      <section>
        <h4>En resumen</h4>
        <ul>{report.summary.map((s) => <li key={s}>{s}</li>)}</ul>
      </section>
      {report.perChord.length > 0 && (
        <section>
          <h4>Qué escala usa sobre cada acorde</h4>
          <div className="table-wrap">
            <table className="status-table">
              <thead><tr><th>Compás</th><th>Acorde</th><th>Escala que mejor encaja</th><th>Notas que encajan</th><th>Detalles</th></tr></thead>
              <tbody>{report.perChord.map((c, i) => (
                <tr key={i}><td>{c.bars}</td><td><b>{c.chord}</b></td><td>{c.scale}</td><td>{Math.round(c.coverage * 100)} % de {c.notes}</td><td className="small">{c.comment || '—'}</td></tr>
              ))}</tbody>
            </table>
          </div>
        </section>
      )}
      {report.devices.length > 0 && (
        <section>
          <h4>Recursos que aparecen</h4>
          <div className="device-grid">
            {report.devices.map((d) => (
              <div key={d.id} className="device">
                <b>{d.name}</b> <span className="pill">{d.count}×</span>
                <p className="small">{d.text}</p>
                <div className="chip-row">{d.bars.slice(0, 8).map(bar)}</div>
              </div>
            ))}
          </div>
        </section>
      )}
      {report.phrases.length > 0 && (
        <section>
          <h4>Frase por frase</h4>
          <ol>{report.phrases.map((p, i) => <li key={i}><b>c. {p.fromBar}{p.toBar !== p.fromBar ? `–${p.toBar}` : ''}:</b> {p.text}</li>)}</ol>
        </section>
      )}
      {report.practice.length > 0 && (
        <section>
          <h4>Para practicar</h4>
          <ol>{report.practice.map((p) => <li key={p}>{p}</li>)}</ol>
        </section>
      )}
      <p className="muted small">Análisis automático a partir de las notas y acordes detectados: compruébalo de oído (pulsa un compás para escucharlo) y corrige los acordes si hace falta; la explicación se actualiza sola.</p>
    </div>
  );
}
