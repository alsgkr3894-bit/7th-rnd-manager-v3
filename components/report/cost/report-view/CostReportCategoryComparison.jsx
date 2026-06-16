export function CostReportCategoryComparison({
  catStats,
  totalCount,
  allAvg,
  allRisk,
  riskThreshold,
}) {
  return (
    <div className="paper-section">
      <div className="paper-section-title">카테고리별 종합 비교</div>
      {catStats.some(c => c.count > 0) ? (
        <>
          <CategoryCostBars catStats={catStats} riskThreshold={riskThreshold} />
          <CategoryComparisonTable
            catStats={catStats}
            totalCount={totalCount}
            allAvg={allAvg}
            allRisk={allRisk}
          />
        </>
      ) : (
        <CategoryComparisonEmptyState />
      )}
    </div>
  );
}

function CategoryCostBars({ catStats, riskThreshold }) {
  return (
    <div className="cost-bars">
      {catStats
        .filter(c => c.count > 0)
        .map(c => (
          <div key={c.id} className="cost-bar-row">
            <div className="cost-bar-label">
              <span className="dot" style={{ background: c.color }} />
              <span>{c.label}</span>
            </div>
            <div className="cost-bar-track">
              <div
                className="cost-bar-fill"
                style={{
                  width: `${Math.min((c.avg / 50) * 100, 100)}%`,
                  background: c.color,
                }}
              />
              <div
                className="cost-bar-threshold"
                style={{ left: `${(riskThreshold / 50) * 100}%` }}
                title={`위험 기준 ${riskThreshold}%`}
              />
            </div>
            <div className="cost-bar-val num">
              {c.avg > 0 ? (
                <>
                  <b>
                    {c.avg.toFixed(1)}
                    <span className="unit">%</span>
                  </b>
                  <span className="muted" style={{ fontSize: 11, marginLeft: 4 }}>
                    ({c.min.toFixed(1)}~{c.max.toFixed(1)})
                  </span>
                </>
              ) : (
                <span className="muted">원가 미등록</span>
              )}
            </div>
          </div>
        ))}
    </div>
  );
}

function CategoryComparisonTable({ catStats, totalCount, allAvg, allRisk }) {
  return (
    <table className="paper-table" style={{ marginTop: 14 }}>
      <thead>
        <tr>
          <th>카테고리</th>
          <th style={{ width: 70, textAlign: 'right' }}>메뉴 수</th>
          <th style={{ width: 90, textAlign: 'right' }}>평균 원가율</th>
          <th style={{ width: 120, textAlign: 'right' }}>최저 ~ 최고</th>
          <th style={{ width: 80, textAlign: 'right' }}>위험</th>
        </tr>
      </thead>
      <tbody>
        {catStats.map(c => (
          <CategoryComparisonRow key={c.id} category={c} />
        ))}
        <tr style={{ background: 'var(--surface-2)' }}>
          <td style={{ fontWeight: 800 }}>합계</td>
          <td className="num right" style={{ fontWeight: 800 }}>
            {totalCount}
          </td>
          <td className="num right" style={{ fontWeight: 800 }}>
            {allAvg > 0 ? `${allAvg.toFixed(1)}%` : '—'}
          </td>
          <td className="num right muted">—</td>
          <td className="num right" style={{ fontWeight: 800, color: 'var(--warn)' }}>
            {allRisk}개
          </td>
        </tr>
      </tbody>
    </table>
  );
}

function CategoryComparisonRow({ category }) {
  const c = category;

  return (
    <tr>
      <td>
        <span style={{ display: 'inline-flex', alignItems: 'center', gap: 6 }}>
          <span
            className="dot"
            style={{
              width: 8,
              height: 8,
              borderRadius: '50%',
              background: c.color,
            }}
          />
          <b>{c.label}</b>
        </span>
      </td>
      <td className="num right">{c.count}</td>
      <td className="num right" style={{ fontWeight: 800 }}>
        {c.avg > 0 ? `${c.avg.toFixed(1)}%` : '—'}
      </td>
      <td className="num right">
        {c.avg > 0 ? `${c.min.toFixed(1)}% ~ ${c.max.toFixed(1)}%` : '—'}
      </td>
      <td className="num right">
        {c.risk > 0 ? (
          <span style={{ color: 'var(--warn)', fontWeight: 800 }}>{c.risk}개 ⚠</span>
        ) : (
          <span className="muted">0개</span>
        )}
      </td>
    </tr>
  );
}

function CategoryComparisonEmptyState() {
  return (
    <div
      style={{
        height: 60,
        display: 'grid',
        placeItems: 'center',
        color: 'var(--text-4)',
        fontSize: 13,
      }}
    >
      원가계산 → 판매가 등록 후 표시돼요
    </div>
  );
}
