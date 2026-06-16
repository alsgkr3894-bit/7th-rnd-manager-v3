import { formatNumber } from '@/lib/format';

const S_DOT_LABEL = { display: 'inline-flex', alignItems: 'center', gap: 8 };

export function CostReportCategorySections({ catStats, riskThreshold }) {
  return catStats
    .filter(c => c.count > 0)
    .map(c => (
      <div className="paper-section paper-cat-section" key={c.id}>
        <CategorySectionTitle category={c} />
        <table className="paper-table">
          <thead>
            <tr>
              <th style={{ width: 36 }}>#</th>
              <th>메뉴명</th>
              <th style={{ width: 90, textAlign: 'right' }}>판매가</th>
              <th style={{ width: 90, textAlign: 'right' }}>원가</th>
              <th style={{ width: 80, textAlign: 'right' }}>원가율</th>
            </tr>
          </thead>
          <tbody>
            {c.menus.map((menu, index) => (
              <CategoryMenuRow
                key={menu.code || menu.name}
                menu={menu}
                index={index}
                riskThreshold={riskThreshold}
              />
            ))}
          </tbody>
        </table>
      </div>
    ));
}

function CategorySectionTitle({ category }) {
  return (
    <div
      className="paper-section-title"
      style={{
        borderBottomColor: category.color,
        display: 'flex',
        justifyContent: 'space-between',
        alignItems: 'flex-end',
      }}
    >
      <span style={S_DOT_LABEL}>
        <span
          className="dot"
          style={{ width: 10, height: 10, borderRadius: 3, background: category.color }}
        />
        {category.label} 종합 원가 (전체 {category.count}개)
      </span>
      <span className="muted" style={{ fontSize: 11, fontWeight: 600 }}>
        평균{' '}
        <b
          className="num"
          style={{ color: category.avg > 0 ? 'var(--text-1)' : undefined }}
        >
          {category.avg > 0 ? `${category.avg.toFixed(1)}%` : '—'}
        </b>
        {' · '}위험 {category.risk}개
      </span>
    </div>
  );
}

function CategoryMenuRow({ menu, index, riskThreshold }) {
  const risk = menu.rate >= riskThreshold;

  return (
    <tr>
      <td className="num">{index + 1}</td>
      <td>{menu.name}</td>
      <td className="num right muted">{menu.sale > 0 ? `${formatNumber(menu.sale)}원` : '—'}</td>
      <td className="num right muted">{menu.cost > 0 ? `${formatNumber(menu.cost)}원` : '—'}</td>
      <td
        className="num right"
        style={{
          fontWeight: risk ? 800 : 600,
          color: risk ? 'var(--warn)' : 'var(--text-1)',
        }}
      >
        {menu.rate > 0 ? `${menu.rate.toFixed(1)}%` : '—'}
      </td>
    </tr>
  );
}
