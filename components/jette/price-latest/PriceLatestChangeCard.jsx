'use client';
import { formatNumber } from '@/lib/format';
import { asDisplayText, asObjectArray } from '@/lib/ui/prop-guards';
import { PriceCompareStatusChip } from '@/components/jette/price-compare/PriceCompareStatusChip';

function priceLabel(row) {
  if (row.changeStatus === '신규') return '신규 등록';
  if (row.changeStatus === '삭제') return '삭제됨';
  return `${formatNumber(row.basePrice)}원 → ${formatNumber(row.latestPrice)}원`;
}

function amountLabel(row) {
  if (row.changeAmount == null) return '—';
  const sign = row.changeAmount > 0 ? '+' : '';
  const pct = row.changeRate != null ? ` (${sign}${(row.changeRate * 100).toFixed(1)}%)` : '';
  return `${sign}${formatNumber(row.changeAmount)}원${pct}`;
}

/**
 * 직전 단가파일 대비 변동 제품 카드 — /jette/price-compare의 "최신" 탭.
 * comparePriceLists/summarizePriceChanges(lib/price/compare.js)를 그대로 재사용하며,
 * 여기서는 "직전 파일" 기준을 사용자가 고른 baseFileId가 아니라 latestFileId 바로
 * 이전 파일로 고정한다(usePriceLatestChangeSummary).
 */
export function PriceLatestChangeCard({ prevFile, summary }) {
  if (!prevFile) return null;

  const rows = asObjectArray(summary?.changed);

  return (
    <div className="card" style={{ marginTop: 16 }}>
      <div className="card-header">
        <div>
          <div className="card-title">직전 대비 변동 제품</div>
          <div className="card-sub">
            {asDisplayText(prevFile.updateDate, '-')} → 최신 · {rows.length}건
          </div>
        </div>
      </div>

      {rows.length === 0 ? (
        <div
          style={{ padding: '24px 0', textAlign: 'center', color: 'var(--text-3)', fontSize: 13 }}
        >
          직전 파일과 단가 차이가 없습니다.
        </div>
      ) : (
        <div style={{ overflowX: 'auto' }}>
          <table className="data-table">
            <thead>
              <tr>
                <th style={{ width: 100 }}>제품코드</th>
                <th>제품명</th>
                <th style={{ width: 200 }}>단가</th>
                <th style={{ width: 130, textAlign: 'right' }}>변동</th>
                <th style={{ width: 80 }}>상태</th>
              </tr>
            </thead>
            <tbody>
              {rows.map(row => (
                <tr key={row.productCode || row.productName}>
                  <td style={{ fontFamily: 'monospace', fontSize: 12 }}>
                    {asDisplayText(row.productCode, '-')}
                  </td>
                  <td>{asDisplayText(row.productName, '-')}</td>
                  <td>{priceLabel(row)}</td>
                  <td className="num" style={{ textAlign: 'right' }}>
                    {amountLabel(row)}
                  </td>
                  <td>
                    <PriceCompareStatusChip status={row.changeStatus} />
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      )}
    </div>
  );
}
