'use client';
import Link from 'next/link';
import { ModalFrame } from '@/components/ui/ModalFrame';
import { formatNumber, formatPercent } from '@/lib/format';

const MAX_ROWS = 20;

/** 팝업 부제 — 어떤 단가 변동 때문인지 */
export function priceRiseSubtitle(result) {
  if (result?.source === 'manual') {
    const label = result?.label ? `「${result.label}」 ` : '';
    return `${label}단가(수동 단가·포장수량) 변경으로 메뉴 원가가 올랐어요`;
  }
  const range =
    result?.baseDate && result?.targetDate ? ` (${result.baseDate} → ${result.targetDate})` : '';
  return `제때 단가 업로드로 메뉴 원가가 올랐어요${range}`;
}

function CauseChips({ causes }) {
  const shown = (Array.isArray(causes) ? causes : []).slice(0, 3);
  if (shown.length === 0) return <span style={{ color: 'var(--text-4)' }}>—</span>;
  return (
    <div style={{ display: 'flex', gap: 4, flexWrap: 'wrap' }}>
      {shown.map(cause => (
        <span
          key={cause.name}
          className="chip"
          title={`단가 ${formatNumber(cause.beforeUnitPrice, 1)} → ${formatNumber(cause.afterUnitPrice, 1)}원`}
          style={{ fontSize: 11, minHeight: 0, padding: '2px 8px' }}
        >
          {cause.name}
          {cause.deltaPct != null ? ` +${formatPercent(cause.deltaPct)}` : ''}
        </span>
      ))}
    </div>
  );
}

/**
 * 원가 상승 메뉴 팝업 — 제때 단가 업로드·수동 단가 저장 직후, 원가가 오른 메뉴와 원인 식자재를 보여 준다.
 * [확인]은 홈 "오늘 할 일"에 남겨 둔 알림도 함께 지우고, [나중에]는 알림을 남겨 둔다.
 */
export function PriceRiseModal({ result, onConfirm, onLater }) {
  if (!result || !(result.total > 0)) return null;
  const items = result.items.slice(0, MAX_ROWS);
  const hidden = result.total - items.length;
  const worst = result.items[0];

  return (
    <ModalFrame
      title={`⚠ 원가가 오른 메뉴 ${result.total}개`}
      subtitle={priceRiseSubtitle(result)}
      onClose={onLater}
      width="min(820px, 96vw)"
      zIndex={400}
    >
      {worst && (
        <div style={{ fontSize: 13, color: 'var(--text-2)', marginBottom: 12 }}>
          가장 많이 오른 메뉴는 <b>{worst.menuName}</b> — {formatNumber(worst.beforeCost)}원 →{' '}
          {formatNumber(worst.afterCost)}원 (
          <b style={{ color: 'var(--negative)' }}>+{formatNumber(worst.costDelta)}원</b>
          {worst.costDeltaPct != null ? `, +${formatPercent(worst.costDeltaPct)}` : ''})
        </div>
      )}
      <div style={{ overflowX: 'auto' }}>
        <table className="data-table" style={{ width: '100%', minWidth: 560 }}>
          <thead>
            <tr>
              <th>메뉴</th>
              <th style={{ textAlign: 'right' }}>원가</th>
              <th style={{ textAlign: 'right' }}>상승</th>
              <th style={{ textAlign: 'right' }}>원가율</th>
              <th>원인 식자재</th>
            </tr>
          </thead>
          <tbody>
            {items.map(item => (
              <tr key={item.menuCode}>
                <td style={{ fontWeight: 700 }}>{item.menuName}</td>
                <td style={{ textAlign: 'right', whiteSpace: 'nowrap' }}>
                  {formatNumber(item.beforeCost)} → {formatNumber(item.afterCost)}원
                </td>
                <td
                  style={{
                    textAlign: 'right',
                    whiteSpace: 'nowrap',
                    color: 'var(--negative)',
                    fontWeight: 700,
                  }}
                >
                  +{formatNumber(item.costDelta)}원
                  {item.costDeltaPct != null ? ` (+${formatPercent(item.costDeltaPct)})` : ''}
                </td>
                <td style={{ textAlign: 'right', whiteSpace: 'nowrap' }}>
                  {item.beforeCostRate != null && item.afterCostRate != null
                    ? `${formatPercent(item.beforeCostRate)} → ${formatPercent(item.afterCostRate)}`
                    : '—'}
                </td>
                <td>
                  <CauseChips causes={item.causes} />
                </td>
              </tr>
            ))}
          </tbody>
        </table>
      </div>
      {hidden > 0 && (
        <div style={{ fontSize: 12, color: 'var(--text-3)', marginTop: 8 }}>
          외 {hidden}개 메뉴는 원가마진표에서 확인하세요.
        </div>
      )}
      <div style={{ display: 'flex', gap: 8, justifyContent: 'flex-end', marginTop: 16 }}>
        <Link className="btn" href="/cost/margin" onClick={onLater}>
          원가마진표 보기
        </Link>
        <button type="button" className="btn" onClick={onLater}>
          나중에
        </button>
        <button type="button" className="btn primary" onClick={onConfirm}>
          확인
        </button>
      </div>
    </ModalFrame>
  );
}
