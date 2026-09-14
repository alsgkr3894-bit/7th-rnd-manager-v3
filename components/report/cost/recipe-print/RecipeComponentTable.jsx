import { formatSizeUsage, money, sectionCost } from './recipePrintFormat';

export function RecipeComponentTable({
  title,
  emptyText,
  components,
  sizes,
  menu,
  showSource = false,
}) {
  return (
    <table className="paper-table recipe-print-table" style={{ marginTop: 8 }}>
      <thead>
        <tr>
          <th colSpan={5} style={{ fontWeight: 800, background: 'var(--surface-2)' }}>
            {title} · {money(sectionCost(components))}
          </th>
        </tr>
        <tr>
          <th style={{ width: '24%' }}>원가식자재</th>
          <th style={{ width: '18%' }}>제품코드</th>
          <th>사이즈별 사용량</th>
          <th style={{ width: 84, textAlign: 'right' }}>소계</th>
          <th style={{ width: '16%' }}>비고</th>
        </tr>
      </thead>
      <tbody>
        {components.length === 0 ? (
          <tr>
            <td colSpan={5} className="muted">
              {emptyText}
            </td>
          </tr>
        ) : (
          components.map(component => (
            <tr key={component.key}>
              <td style={{ fontWeight: 700 }}>{component.ingredientName || '—'}</td>
              <td className="mono muted" style={{ fontSize: 10 }}>
                {component.productCode || '—'}
              </td>
              <td>{formatSizeUsage(component, sizes)}</td>
              <td className="num right">{money(component.totalCost)}</td>
              <td className="muted">
                {showSource
                  ? component.sourceLabel || '공통관리'
                  : component.note || menu.note || '—'}
              </td>
            </tr>
          ))
        )}
      </tbody>
    </table>
  );
}
