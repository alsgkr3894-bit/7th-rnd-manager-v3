import { AreaChart } from '@/components/charts/AreaChart';
import { fmtShort } from '@/lib/format';
import { getProfile } from '@/lib/profile';
import { safeQuantity } from '@/lib/report/period';
import { asDisplayText, asFiniteNumber, asObjectArray } from '@/lib/ui/prop-guards';

function safePercent(value) {
  return asFiniteNumber(value, null);
}

function modeLabel(mode) {
  if (mode === 'mom') return '전월 대비';
  if (mode === 'yoy') return '전년 동월';
  return '사용자 지정';
}

function scopeLabel(scope) {
  if (scope === 'all') return '전체';
  if (scope === 'pizza') return '피자';
  return '사이드';
}

export function MenuSalesComparePreview({
  mode,
  scope,
  opts,
  periodALabel,
  periodBLabel,
  monthA,
  periodB,
  compareResult,
  series,
}) {
  const safeCompareResult =
    compareResult && typeof compareResult === 'object' && !Array.isArray(compareResult)
      ? compareResult
      : null;
  const compareRows =
    asObjectArray(safeCompareResult?.rows)
      .filter(row => !row.aIsZero && !row.bIsZero)
      .sort((a, b) => Math.abs(safeQuantity(b.pct)) - Math.abs(safeQuantity(a.pct)))
      .slice(0, 6) || [];
  const safeSeries = asObjectArray(series);
  const totalPct = safePercent(safeCompareResult?.totalPct);

  return (
    <>
      <div className="paper-head">
        <div className="paper-eyebrow">7번가피자 본사 · R&amp;D팀</div>
        <h2 className="paper-title">
          판매량 비교 보고서 — {periodALabel} vs {periodBLabel}
        </h2>
        <div className="paper-meta">
          <span>비교 모드: {modeLabel(mode)}</span>
          <span>·</span>
          <span>대상: {scopeLabel(scope)}</span>
          <span>·</span>
          <span className="mono">
            생성일 {new Date().toLocaleDateString('ko-KR').slice(0, -1).replace(/\. /g, '.')} ·{' '}
            {getProfile().name}
          </span>
        </div>
      </div>

      {opts.summary && (
        <div className="paper-stat-row">
          <div className="paper-stat">
            <div className="paper-stat-label">총 판매량 (A)</div>
            <div className="paper-stat-val num">
              {safeCompareResult ? fmtShort(safeQuantity(safeCompareResult.totalA)) : '—'}
            </div>
          </div>
          <div className="paper-stat">
            <div className="paper-stat-label">총 판매량 (B)</div>
            <div className="paper-stat-val num">
              {safeCompareResult ? fmtShort(safeQuantity(safeCompareResult.totalB)) : '—'}
            </div>
          </div>
          <div className="paper-stat">
            <div className="paper-stat-label">증감</div>
            <div
              className="paper-stat-val num"
              style={{
                color: (totalPct ?? 0) >= 0 ? 'var(--positive)' : 'var(--negative)',
              }}
            >
              {totalPct != null ? `${totalPct >= 0 ? '+' : ''}${totalPct.toFixed(1)}%` : '—'}
            </div>
          </div>
        </div>
      )}

      {opts.chart && (
        <div className="paper-section">
          <div className="paper-section-title">카테고리별 판매량 비교</div>
          <div style={{ padding: '8px 0' }}>
            {safeSeries.length > 0 ? (
              <AreaChart
                series={safeSeries}
                labels={[]}
                colors={['#7C3AED', '#3182F6']}
                height={180}
                formatY={fmtShort}
              />
            ) : (
              <div
                style={{
                  height: 180,
                  display: 'grid',
                  placeItems: 'center',
                  color: 'var(--text-4)',
                  fontSize: 13,
                }}
              >
                데이터 없음
              </div>
            )}
          </div>
        </div>
      )}

      {opts.rankShift && (
        <div className="paper-section">
          <div className="paper-section-title">순위 이동 (TOP 6 미리보기)</div>
          {compareRows.length > 0 ? (
            <table className="paper-table">
              <thead>
                <tr>
                  <th>메뉴명</th>
                  <th style={{ width: 100, textAlign: 'right' }}>A ({monthA}월)</th>
                  <th style={{ width: 100, textAlign: 'right' }}>B ({periodB.month}월)</th>
                  <th style={{ width: 80, textAlign: 'right' }}>증감</th>
                </tr>
              </thead>
              <tbody>
                {compareRows.map(row => {
                  const pct = safePercent(row.pct) ?? 0;
                  return (
                    <tr key={asDisplayText(row.name, '—')}>
                      <td>{asDisplayText(row.name, '—')}</td>
                      <td className="num right muted">{fmtShort(safeQuantity(row.a))}</td>
                      <td className="num right" style={{ fontWeight: 700 }}>
                        {fmtShort(safeQuantity(row.b))}
                      </td>
                      <td
                        className="num right"
                        style={{
                          color: pct >= 0 ? 'var(--positive)' : 'var(--negative)',
                          fontWeight: 700,
                        }}
                      >
                        {pct >= 0 ? '▲' : '▼'} {Math.abs(pct).toFixed(1)}%
                      </td>
                    </tr>
                  );
                })}
              </tbody>
            </table>
          ) : (
            <div
              style={{
                height: 60,
                display: 'grid',
                placeItems: 'center',
                color: 'var(--text-4)',
                fontSize: 13,
              }}
            >
              데이터 없음
            </div>
          )}
        </div>
      )}

      {opts.winners && safeCompareResult && (
        <div className="paper-section">
          <div className="paper-section-title">Winners &amp; Losers (±10% 이상)</div>
          <div className="winners-grid">
            <div className="winner-col">
              <div className="winner-h" style={{ color: 'var(--positive)' }}>
                ▲ Winners
              </div>
              {asObjectArray(safeCompareResult.topRise)
                .filter(row => (safePercent(row.pct) ?? 0) >= 10)
                .map(row => (
                  <div className="winner-row" key={asDisplayText(row.name, '—')}>
                    <span>{asDisplayText(row.name, '—')}</span>
                    <b className="num" style={{ color: 'var(--positive)' }}>
                      +{(safePercent(row.pct) ?? 0).toFixed(1)}%
                    </b>
                  </div>
                ))}
              {asObjectArray(safeCompareResult.topRise).filter(
                row => (safePercent(row.pct) ?? 0) >= 10
              ).length === 0 && (
                <div className="muted" style={{ fontSize: 12 }}>
                  해당 없음
                </div>
              )}
            </div>
            <div className="winner-col">
              <div className="winner-h" style={{ color: 'var(--negative)' }}>
                ▼ Losers
              </div>
              {asObjectArray(safeCompareResult.topFall)
                .filter(row => (safePercent(row.pct) ?? 0) <= -10)
                .map(row => (
                  <div className="winner-row" key={asDisplayText(row.name, '—')}>
                    <span>{asDisplayText(row.name, '—')}</span>
                    <b className="num" style={{ color: 'var(--negative)' }}>
                      {(safePercent(row.pct) ?? 0).toFixed(1)}%
                    </b>
                  </div>
                ))}
              {asObjectArray(safeCompareResult.topFall).filter(
                row => (safePercent(row.pct) ?? 0) <= -10
              ).length === 0 && (
                <div className="muted" style={{ fontSize: 12 }}>
                  해당 없음
                </div>
              )}
            </div>
          </div>
        </div>
      )}

      <div className="paper-foot">
        <span>1 / 7</span>
        <span className="mono">7번가 R&amp;D 플랫폼</span>
      </div>
    </>
  );
}
