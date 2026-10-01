'use client';
import { Icon } from '@/components/icons';
import { formatNumber } from '@/lib/format';
import { safeRevenue } from '@/lib/sales/revenue';
import { asDisplayText } from '@/lib/ui/prop-guards';

/**
 * RevenueFillPreview — 이미 올린 달에 매출액만 채우기 확인
 *
 * 매출액이 비어 있는 달의 엑셀을 다시 올렸고, 메뉴명·판매량이 기존 데이터와 전부 같을 때 뜬다.
 *
 * @param {object} props
 * @param {{year, month}} props.period
 * @param {string} props.fileName
 * @param {string} props.revenueColumnName
 * @param {number} props.rowCount
 * @param {number} props.totalRevenue
 * @param {number} props.revenueWarningCount
 * @param {Function} props.onCancel
 * @param {Function} props.onConfirm
 * @param {boolean} props.saving
 * @param {boolean} props.canEdit
 */
export function RevenueFillPreview({
  period,
  fileName,
  revenueColumnName,
  rowCount,
  totalRevenue,
  revenueWarningCount = 0,
  onCancel,
  onConfirm,
  saving,
  canEdit = false,
}) {
  const periodYear = asDisplayText(period?.year, '-');
  const periodMonth = asDisplayText(period?.month, '-');
  const warningCount = Number(revenueWarningCount) || 0;

  return (
    <>
      <div className="info-banner info-accent" style={{ marginTop: 16 }}>
        <div
          className="info-banner-ico"
          style={{ background: 'var(--accent-soft)', color: 'var(--accent-text)' }}
        >
          <Icon.check style={{ width: 16, height: 16 }} />
        </div>
        <div>
          <b>
            {periodYear}년 {periodMonth}월 매출액만 채우기
          </b>{' '}
          — 이미 올린 데이터에 매출액이 비어 있습니다. 새 파일의 메뉴명·판매량{' '}
          {formatNumber(Number(rowCount) || 0)}행이 기존과 모두 같아서, 분류·판매량은 그대로 두고
          매출액만 채웁니다.
          <div style={{ marginTop: 6, color: 'var(--text-2)' }}>
            매출액 합계 <b>{formatNumber(safeRevenue(totalRevenue))}원</b>
            {revenueColumnName ? ` · 금액 칸 '${asDisplayText(revenueColumnName)}'` : ''}
            {fileName ? ` · ${asDisplayText(fileName)}` : ''}
            {warningCount > 0 && (
              <span style={{ color: 'var(--warn)', marginLeft: 8 }}>
                금액 확인 필요 {formatNumber(warningCount)}건
              </span>
            )}
          </div>
        </div>
      </div>

      <div style={{ display: 'flex', gap: 8, justifyContent: 'flex-end', marginTop: 16 }}>
        <button className="btn" onClick={onCancel} disabled={saving}>
          취소
        </button>
        <button className="btn primary" onClick={onConfirm} disabled={saving || !canEdit}>
          <Icon.check style={{ width: 14, height: 14 }} />
          {saving ? '채우는 중...' : '매출액 채우기'}
        </button>
      </div>
    </>
  );
}
