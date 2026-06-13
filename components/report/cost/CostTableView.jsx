import { formatNumber } from '@/lib/format';

const S_DOT_LABEL = { display: 'inline-flex', alignItems: 'center', gap: 8 };

function groupPizzaLR(menus) {
  const map = new Map();
  for (const m of menus) {
    const match = m.name.match(/^(.+)\s+(L|R)$/);
    if (match) {
      const base = match[1];
      const sz = match[2];
      if (!map.has(base)) map.set(base, { name: base });
      map.get(base)[sz] = m;
    } else {
      if (!map.has(m.name)) map.set(m.name, { name: m.name });
      map.get(m.name)['단일'] = m;
    }
  }
  return [...map.values()];
}

/**
 * 제품원가표 뷰 (viewTab === 'costTable').
 * 순수 렌더링 — 상태 없음, props만 사용.
 */
export function CostTableView({ activeCats, riskThreshold }) {
  return (
    <>
      {activeCats
        .filter(([id]) => id === 'pizza' || id === 'personal')
        .map(([id, c]) => {
          const groups = groupPizzaLR(c.menus);
          if (!groups.length) return null;
          return (
            <div className="paper-section paper-cat-section" key={id}>
              <div className="paper-section-title" style={{ borderBottomColor: c.color }}>
                <span style={S_DOT_LABEL}>
                  <span
                    className="dot"
                    style={{ width: 10, height: 10, borderRadius: 3, background: c.color }}
                  />
                  {c.label}
                </span>
              </div>
              <table className="paper-table">
                <thead>
                  <tr>
                    <th rowSpan={2} style={{ verticalAlign: 'bottom' }}>메뉴명</th>
                    <th
                      colSpan={3}
                      style={{ textAlign: 'center', borderBottom: '1px solid var(--border)' }}
                    >
                      L
                    </th>
                    <th
                      colSpan={3}
                      style={{ textAlign: 'center', borderBottom: '1px solid var(--border)' }}
                    >
                      R
                    </th>
                  </tr>
                  <tr>
                    <th style={{ textAlign: 'right', width: 80 }}>판매가</th>
                    <th style={{ textAlign: 'right', width: 80 }}>원가</th>
                    <th style={{ textAlign: 'right', width: 70 }}>원가율</th>
                    <th style={{ textAlign: 'right', width: 80 }}>판매가</th>
                    <th style={{ textAlign: 'right', width: 80 }}>원가</th>
                    <th style={{ textAlign: 'right', width: 70 }}>원가율</th>
                  </tr>
                </thead>
                <tbody>
                  {groups.map(g => (
                    <tr key={g.name}>
                      <td style={{ fontWeight: 600 }}>{g.name}</td>
                      <td className="num right muted">
                        {g.L?.sale > 0 ? `${formatNumber(g.L.sale)}원` : '—'}
                      </td>
                      <td className="num right muted">
                        {g.L?.cost > 0 ? `${formatNumber(g.L.cost)}원` : '—'}
                      </td>
                      <td
                        className="num right"
                        style={{
                          fontWeight: 700,
                          color: g.L?.rate >= riskThreshold ? 'var(--warn)' : 'var(--text-1)',
                        }}
                      >
                        {g.L?.rate > 0 ? `${g.L.rate.toFixed(1)}%` : '—'}
                      </td>
                      <td className="num right muted">
                        {g.R?.sale > 0 ? `${formatNumber(g.R.sale)}원` : '—'}
                      </td>
                      <td className="num right muted">
                        {g.R?.cost > 0 ? `${formatNumber(g.R.cost)}원` : '—'}
                      </td>
                      <td
                        className="num right"
                        style={{
                          fontWeight: 700,
                          color: g.R?.rate >= riskThreshold ? 'var(--warn)' : 'var(--text-1)',
                        }}
                      >
                        {g.R?.rate > 0 ? `${g.R.rate.toFixed(1)}%` : '—'}
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          );
        })}

      {activeCats
        .filter(([id]) => id !== 'pizza' && id !== 'personal')
        .map(([id, c]) => {
          if (!c.menus.length) return null;
          return (
            <div className="paper-section paper-cat-section" key={id}>
              <div className="paper-section-title" style={{ borderBottomColor: c.color }}>
                <span style={S_DOT_LABEL}>
                  <span
                    className="dot"
                    style={{ width: 10, height: 10, borderRadius: 3, background: c.color }}
                  />
                  {c.label}
                </span>
              </div>
              <table className="paper-table">
                <thead>
                  <tr>
                    <th>메뉴명</th>
                    <th style={{ width: 90, textAlign: 'right' }}>판매가</th>
                    <th style={{ width: 90, textAlign: 'right' }}>원가</th>
                    <th style={{ width: 80, textAlign: 'right' }}>원가율</th>
                  </tr>
                </thead>
                <tbody>
                  {c.menus.map(m => (
                    <tr key={m.code || m.name}>
                      <td style={{ fontWeight: 600 }}>{m.name}</td>
                      <td className="num right muted">
                        {m.sale > 0 ? `${formatNumber(m.sale)}원` : '—'}
                      </td>
                      <td className="num right muted">
                        {m.cost > 0 ? `${formatNumber(m.cost)}원` : '—'}
                      </td>
                      <td
                        className="num right"
                        style={{
                          fontWeight: 700,
                          color: m.rate >= riskThreshold ? 'var(--warn)' : 'var(--text-1)',
                        }}
                      >
                        {m.rate > 0 ? `${m.rate.toFixed(1)}%` : '—'}
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          );
        })}
    </>
  );
}
