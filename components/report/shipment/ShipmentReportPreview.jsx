'use client';
import { fmtShort, formatNumber } from '@/lib/format';
import { AreaChart } from '@/components/charts/AreaChart';
import { getProfile } from '@/lib/profile';
import { asDisplayText } from '@/lib/ui/prop-guards';
import { safeQuantity } from '@/lib/report/period';
import { ShipmentItemTable, safeProductName, typeLabel } from './ShipmentItemTable';

function safeAmount(v) {
  return safeQuantity(v);
}

export function ShipmentReportPreview({
  fileLabel,
  showExclusive,
  showGeneric,
  exclusive,
  genericAll,
  managed,
  exclusiveQty,
  genericQty,
  managedQty,
  safeOpts,
  qtyStats,
  amtStats,
  chartSeries,
  chartColors,
  safeSeriesLabels,
  notShipped,
  safeShipMonth,
  todayLabel,
  isLoading,
  aggRowsLength,
}) {
  const qtyTxt = v => {
    const n = safeQuantity(v);
    return n ? formatNumber(n) : '—';
  };
  const amtTxt = v => {
    const n = safeAmount(v);
    return n ? `${formatNumber(n)}원` : '—';
  };

  return (
    <>
      {/* ── 헤더 ── */}
      <div className="paper-head">
        <div className="paper-eyebrow">7번가피자 본사 · 제때상품관리</div>
        <h2 className="paper-title">{fileLabel} 제때 출고량 보고서</h2>
        <div className="paper-meta">
          <span>
            {showExclusive && `전용상품 ${exclusive.length}개`}
            {showExclusive && showGeneric && ' · '}
            {showGeneric &&
              `범용상품 ${genericAll.length}개${managed.length > 0 ? ` (관리품목 ${managed.length}개)` : ''}`}
          </span>
          <span>·</span>
          <span className="mono">
            생성일 {todayLabel} · {getProfile().name}
          </span>
        </div>
      </div>

      {/* ── 요약 통계 (출고량) — 표시 범위에 맞춰 정확한 숫자로 ── */}
      <div className="paper-stat-row">
        {qtyStats.map(([label, val, isCount]) => (
          <div className="paper-stat" key={label}>
            <div className="paper-stat-label">{label}</div>
            <div className="paper-stat-val num">
              {isCount ? `${formatNumber(val)}개` : qtyTxt(val)}
            </div>
          </div>
        ))}
      </div>

      {/* ── 출고금액 요약 ── */}
      {safeOpts.amountSummary && (
        <div className="paper-stat-row">
          {amtStats.map(([label, val]) => (
            <div className="paper-stat" key={label}>
              <div className="paper-stat-label">{label}</div>
              <div className="paper-stat-val num">{amtTxt(val)}</div>
            </div>
          ))}
        </div>
      )}

      {/* ── 추이 차트 ── */}
      {safeOpts.chart && (
        <div className="paper-section">
          <div className="paper-section-title">
            월별 출고량 추이 (최근 {safeSeriesLabels.length || 7}개월)
          </div>
          <div style={{ padding: '8px 0' }}>
            {chartSeries.length > 0 ? (
              <AreaChart
                series={chartSeries}
                labels={safeSeriesLabels}
                colors={chartColors}
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
          <div className="paper-legend">
            {showExclusive && (
              <div className="paper-legend-item">
                <span className="dot" style={{ background: 'var(--positive)' }} />
                <span>전용상품</span>
                <span className="num muted">{qtyTxt(exclusiveQty)}</span>
              </div>
            )}
            {showGeneric && (
              <div className="paper-legend-item">
                <span className="dot" style={{ background: 'var(--scope-generic)' }} />
                <span>범용상품</span>
                <span className="num muted">{qtyTxt(genericQty)}</span>
              </div>
            )}
          </div>
        </div>
      )}

      {/* ── 전용상품 목록 ── */}
      {showExclusive && safeOpts.fullList && exclusive.length > 0 && (
        <div className="paper-section paper-cat-section">
          <div
            className="paper-section-title"
            style={{ display: 'flex', alignItems: 'center', gap: 8 }}
          >
            <span
              style={{
                width: 10,
                height: 10,
                borderRadius: '50%',
                background: 'var(--positive)',
                display: 'inline-block',
                flexShrink: 0,
              }}
            />
            전용상품 출고 현황
            <span className="num muted" style={{ fontSize: 11, marginLeft: 'auto' }}>
              합계 {qtyTxt(exclusiveQty)}
            </span>
          </div>
          <ShipmentItemTable items={exclusive} maxQty={exclusive[0]?.totalQuantity || 1} />
        </div>
      )}

      {/* ── 범용상품 목록 (관리품목은 한 시트 안에서 색·배지로 구분) ── */}
      {showGeneric && safeOpts.fullList && genericAll.length > 0 && (
        <div className="paper-section paper-cat-section">
          <div
            className="paper-section-title"
            style={{ display: 'flex', alignItems: 'center', gap: 8 }}
          >
            <span
              style={{
                width: 10,
                height: 10,
                borderRadius: '50%',
                background: 'var(--scope-generic)',
                display: 'inline-block',
                flexShrink: 0,
              }}
            />
            범용상품 출고 현황
            {managed.length > 0 && (
              <span
                className="muted"
                style={{
                  fontWeight: 400,
                  fontSize: 11,
                  display: 'inline-flex',
                  alignItems: 'center',
                  gap: 4,
                }}
              >
                (
                <span
                  style={{
                    display: 'inline-block',
                    width: 8,
                    height: 8,
                    borderRadius: 2,
                    background: 'var(--warn)',
                  }}
                />
                관리품목 {managed.length}개 · {qtyTxt(managedQty)})
              </span>
            )}
            <span className="num muted" style={{ fontSize: 11, marginLeft: 'auto' }}>
              합계 {qtyTxt(genericQty)}
            </span>
          </div>
          <ShipmentItemTable items={genericAll} maxQty={genericAll[0]?.totalQuantity || 1} />
        </div>
      )}

      {/* ── 금월 미출고 품목 (등록됐으나 이번 달 출고 없음) ── */}
      {safeOpts.notShippedList && notShipped.length > 0 && (
        <div className="paper-section paper-cat-section">
          <div
            className="paper-section-title"
            style={{ display: 'flex', alignItems: 'center', gap: 8 }}
          >
            <span
              style={{
                width: 10,
                height: 10,
                borderRadius: '50%',
                background: 'var(--text-3)',
                display: 'inline-block',
                flexShrink: 0,
              }}
            />
            {safeShipMonth}월 미출고 품목
            <span className="muted" style={{ fontWeight: 400, fontSize: 11 }}>
              (등록됐으나 이번 달 출고 없음)
            </span>
            <span className="num muted" style={{ fontSize: 11, marginLeft: 'auto' }}>
              {notShipped.length}개
            </span>
          </div>
          <table className="paper-table">
            <thead>
              <tr>
                <th style={{ width: 36 }}>#</th>
                <th>제품명</th>
                <th style={{ width: 90 }}>분류</th>
                <th style={{ width: 110 }}>제품코드</th>
              </tr>
            </thead>
            <tbody>
              {notShipped.map((p, i) => (
                <tr key={asDisplayText(p.productCode) || `${safeProductName(p)}-${i}`}>
                  <td className="num">{i + 1}</td>
                  <td>{safeProductName(p)}</td>
                  <td>
                    <span className="muted" style={{ fontSize: 11 }}>
                      {typeLabel(p)}
                    </span>
                  </td>
                  <td className="num muted" style={{ fontSize: 11 }}>
                    {asDisplayText(p.productCode, '—') || '—'}
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      )}

      {aggRowsLength === 0 && !isLoading && (
        <div
          style={{
            height: 80,
            display: 'grid',
            placeItems: 'center',
            color: 'var(--text-4)',
            fontSize: 13,
          }}
        >
          출고 데이터가 없어요. 출고 파일을 먼저 업로드해 주세요.
        </div>
      )}

      <div className="paper-foot">
        <span className="muted" style={{ fontSize: 11 }}>
          7번가 R&amp;D 플랫폼
        </span>
      </div>
    </>
  );
}
