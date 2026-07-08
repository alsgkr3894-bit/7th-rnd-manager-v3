import { formatNumber } from '@/lib/format';
import { groupCostMenusBySize } from '@/lib/report/cost-menu-display';

const S_DOT_LABEL = { display: 'inline-flex', alignItems: 'center', gap: 8 };
const S_GROUP_CELL = {
  width: 72,
  fontSize: 11,
  fontWeight: 800,
  color: 'var(--text-2)',
  background: 'color-mix(in oklab, var(--surface-2) 82%, var(--surface))',
  borderRight: '1px solid var(--border)',
  whiteSpace: 'nowrap',
};
const S_GROUP_BADGE = {
  display: 'inline-flex',
  alignItems: 'center',
  justifyContent: 'center',
  minWidth: 46,
  padding: '3px 8px',
  borderRadius: 6,
  background: 'var(--surface)',
  border: '1px solid var(--border)',
  color: 'var(--text-2)',
};

function menuRowStyle(index) {
  return {
    background:
      index % 2 === 0 ? 'color-mix(in oklab, var(--accent) 4%, var(--surface))' : 'var(--surface)',
    boxShadow: 'inset 0 1px 0 var(--border)',
  };
}

function CostCells({ menu, riskThreshold }) {
  return (
    <>
      <td className="num right muted">{menu?.sale > 0 ? `${formatNumber(menu.sale)}원` : '—'}</td>
      <td className="num right muted">{menu?.cost > 0 ? `${formatNumber(menu.cost)}원` : '—'}</td>
      <td
        className="num right"
        style={{
          fontWeight: 700,
          color: menu?.rate >= riskThreshold ? 'var(--warn)' : 'var(--text-1)',
        }}
      >
        {menu?.rate > 0 ? `${menu.rate.toFixed(1)}%` : '—'}
      </td>
    </>
  );
}

/**
 * 제품원가표 뷰 (viewTab === 'costTable').
 * 순수 렌더링 — 상태 없음, props만 사용.
 */
export function CostTableView({ activeCats, riskThreshold }) {
  return (
    <>
      {activeCats
        .filter(([id]) => id === 'pizza')
        .map(([id, c]) => {
          const groups = groupCostMenusBySize(c.menus);
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
                    <th rowSpan={2} style={{ width: 72, verticalAlign: 'bottom' }}>
                      구분
                    </th>
                    <th rowSpan={2} style={{ verticalAlign: 'bottom' }}>
                      메뉴명
                    </th>
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
                  {groups.map((g, index) => (
                    <tr
                      key={g.key || g.name}
                      className="cost-table-menu-row"
                      style={menuRowStyle(index)}
                    >
                      <td style={S_GROUP_CELL}>
                        <span style={S_GROUP_BADGE}>메뉴 {index + 1}</span>
                      </td>
                      <td style={{ fontWeight: 600 }}>{g.name}</td>
                      <CostCells menu={g.sizes.L} riskThreshold={riskThreshold} />
                      <CostCells menu={g.sizes.R} riskThreshold={riskThreshold} />
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          );
        })}

      {activeCats
        .filter(([id]) => id !== 'pizza')
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
                    <th style={{ width: 72 }}>구분</th>
                    <th>메뉴명</th>
                    <th style={{ width: 90, textAlign: 'right' }}>판매가</th>
                    <th style={{ width: 90, textAlign: 'right' }}>원가</th>
                    <th style={{ width: 80, textAlign: 'right' }}>원가율</th>
                  </tr>
                </thead>
                <tbody>
                  {c.menus.map((m, index) => (
                    <tr
                      key={m.code || m.name}
                      className="cost-table-menu-row"
                      style={menuRowStyle(index)}
                    >
                      <td style={S_GROUP_CELL}>
                        <span style={S_GROUP_BADGE}>{c.label}</span>
                      </td>
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
