'use client';
import { formatNumber } from '@/lib/format';
import { safeQuantity } from '@/lib/report/period';
import { asDisplayText, asFiniteNumber, asObjectArray } from '@/lib/ui/prop-guards';
import { SectionDot, S_EMPTY_STATE, S_SECTION_TITLE_FLEX } from './SalesReportSectionParts';

export function SalesCompareTableSection({
  compareData,
  catShares,
  groupRanking,
  periodLabel,
  cmpYear,
  cmpMonth,
}) {
  if (!compareData) {
    return (
      <div className="paper-section">
        <div style={S_EMPTY_STATE}>비교 데이터 없음</div>
      </div>
    );
  }

  const catNameMap = new Map(
    groupRanking.map(item => [
      asDisplayText(item.name, '—'),
      asDisplayText(item.category, '미분류') || '미분류',
    ])
  );
  const sortedRows = asObjectArray(compareData.rows)
    .filter(row => !row.aIsZero)
    .sort((a, b) => safeQuantity(b.a) - safeQuantity(a.a));
  const grouped = {};
  for (const row of sortedRows) {
    const category = catNameMap.get(asDisplayText(row.name, '—')) || '미분류';
    if (!grouped[category]) grouped[category] = [];
    grouped[category].push(row);
  }
  const catOrder = catShares.map(category => asDisplayText(category.name, '미분류'));
  const categories = [...new Set([...catOrder, ...Object.keys(grouped)])].filter(
    category => grouped[category]
  );

  return (
    <>
      {categories.map(category => {
        const items = grouped[category];
        const catColor =
          catShares.find(item => asDisplayText(item.name) === category)?.color || '#6B7280';
        return (
          <div className="paper-section paper-cat-section" key={category}>
            <div className="paper-section-title" style={S_SECTION_TITLE_FLEX}>
              <SectionDot color={catColor} />
              {category} — {periodLabel} vs {cmpYear}년 {cmpMonth}월
            </div>
            <table className="paper-table">
              <thead>
                <tr>
                  <th style={{ width: 36 }}>#</th>
                  <th>메뉴명 (중분류)</th>
                  <th style={{ width: 90, textAlign: 'right' }}>{periodLabel}</th>
                  <th style={{ width: 90, textAlign: 'right' }}>
                    {cmpYear}년{cmpMonth}월
                  </th>
                  <th style={{ width: 80, textAlign: 'right' }}>증감</th>
                  <th style={{ width: 70, textAlign: 'right' }}>증감%</th>
                </tr>
              </thead>
              <tbody>
                {items.map((item, index) => (
                  <tr key={asDisplayText(item.name, '—')}>
                    <td className="num">{index + 1}</td>
                    <td style={{ fontWeight: 600 }}>{asDisplayText(item.name, '—')}</td>
                    <td className="num right">{formatNumber(safeQuantity(item.a))}</td>
                    <td className="num right muted">
                      {safeQuantity(item.b) > 0 ? formatNumber(safeQuantity(item.b)) : '—'}
                    </td>
                    <td
                      className="num right"
                      style={{
                        color:
                          safeQuantity(item.diff) > 0
                            ? 'var(--positive)'
                            : safeQuantity(item.diff) < 0
                              ? 'var(--negative)'
                              : 'inherit',
                      }}
                    >
                      {safeQuantity(item.diff) !== 0
                        ? `${safeQuantity(item.diff) > 0 ? '+' : ''}${formatNumber(safeQuantity(item.diff))}`
                        : '—'}
                    </td>
                    <td className="num right muted" style={{ fontSize: 11 }}>
                      {asFiniteNumber(item.pct, null) != null
                        ? `${item.pct >= 0 ? '+' : ''}${item.pct.toFixed(1)}%`
                        : '—'}
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        );
      })}
      <div
        style={{
          marginTop: 4,
          padding: '6px 0',
          borderTop: '1px solid var(--border)',
          fontSize: 12,
          color: 'var(--text-3)',
        }}
      >
        합계 {formatNumber(safeQuantity(compareData.totalA))}건 →
        {asFiniteNumber(compareData.totalPct, null) != null
          ? ` ${compareData.totalPct >= 0 ? '+' : ''}${compareData.totalPct.toFixed(1)}%`
          : ' —'}
        (전월 {formatNumber(safeQuantity(compareData.totalB))}건)
      </div>
    </>
  );
}
