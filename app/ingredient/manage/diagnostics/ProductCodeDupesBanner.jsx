'use client';
import { Icon } from '@/components/icons';

export function ProductCodeDupesBanner({
  productCodeDupes,
  dedupeConfirm,
  dedupeBusy,
  onDedupeConfirm,
  onDedupeCancel,
  onRepairProductCodeDuplicates,
}) {
  if (!productCodeDupes?.hasDuplicates) return null;
  return (
    <div
      className="info-banner"
      style={{
        marginBottom: 8,
        background: 'var(--warn-soft)',
        borderColor: 'var(--warn-soft)',
      }}
    >
      <div className="info-banner-ico" style={{ background: 'var(--warn)', color: '#fff' }}>
        <Icon.alert style={{ width: 16, height: 16 }} />
      </div>
      <div style={{ fontSize: 13, display: 'grid', gap: 8, flex: 1 }}>
        <div>
          <b>제품코드 중복 {productCodeDupes.groupCount}그룹</b> — 대표 식자재 1건에
          태그·알레르기·비어 있는 필드를 병합하고 나머지 행을 정리할 수 있습니다.
        </div>
        <div style={{ display: 'flex', flexWrap: 'wrap', gap: 6 }}>
          {productCodeDupes.groups.slice(0, 4).map(group => (
            <span
              key={group.key}
              className="chip"
              title={`병합 대상: ${group.removeNames.filter(Boolean).join(', ') || '-'}`}
            >
              {group.productCode} · 대표 {group.keepName || group.keepId} · 병합{' '}
              {group.removeIds.length}개
            </span>
          ))}
        </div>
        {dedupeConfirm && (
          <div style={{ display: 'flex', gap: 6, alignItems: 'center', flexWrap: 'wrap' }}>
            <span style={{ fontSize: 12, color: 'var(--negative)', fontWeight: 700 }}>
              최신 대표행만 남기고 {productCodeDupes.duplicateRows}개 중복 행을 정리할까요?
            </span>
            <button
              className="btn sm"
              style={{ background: 'var(--negative)', color: '#fff', border: 0 }}
              onClick={onRepairProductCodeDuplicates}
              disabled={dedupeBusy}
            >
              {dedupeBusy ? '정리 중…' : '정리'}
            </button>
            <button className="btn sm" onClick={onDedupeCancel}>
              취소
            </button>
          </div>
        )}
      </div>
      {!dedupeConfirm && (
        <button className="btn sm" onClick={onDedupeConfirm}>
          제품코드 중복 정리
        </button>
      )}
    </div>
  );
}
