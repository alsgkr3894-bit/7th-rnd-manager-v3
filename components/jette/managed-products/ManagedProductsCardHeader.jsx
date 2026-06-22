'use client';

import { Icon } from '@/components/icons';

export function ManagedProductsCardHeader({
  totalCount,
  counts,
  filteredCount,
  onExport,
  migrating,
  onMigrate,
  adding,
  canEdit = false,
  onToggleAdding,
}) {
  return (
    <div className="card-header">
      <div>
        <div className="card-title">대상 제품 목록</div>
        <div className="card-sub">
          총 {totalCount}개 (전용 {counts.exclusive} · 범용 {counts.generic} · 범용관리{' '}
          {counts['generic-managed']} · 관리품목 {counts.managed})
        </div>
      </div>
      <div className="card-header-actions">
        <button className="btn sm" onClick={onExport} disabled={filteredCount === 0}>
          엑셀로 내보내기
        </button>
        <button className="btn sm" onClick={onMigrate} disabled={migrating || !canEdit}>
          <Icon.download style={{ width: 12, height: 12 }} />
          {migrating ? '가져오는 중...' : '가격비교에서 전용상품 가져오기'}
        </button>
        <button className="btn sm" onClick={onToggleAdding} disabled={!canEdit}>
          {adding ? (
            '닫기'
          ) : (
            <>
              <Icon.plus style={{ width: 12, height: 12 }} /> 추가
            </>
          )}
        </button>
      </div>
    </div>
  );
}
