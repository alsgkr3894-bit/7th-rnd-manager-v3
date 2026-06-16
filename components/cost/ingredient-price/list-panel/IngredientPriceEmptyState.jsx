'use client';

import { Icon } from '@/components/icons';

export function IngredientPriceEmptyState() {
  return (
    <div className="card" style={{ minHeight: 200, display: 'grid', placeItems: 'center' }}>
      <div style={{ textAlign: 'center', color: 'var(--text-3)' }}>
        <Icon.box style={{ width: 32, height: 32, marginBottom: 12, opacity: 0.4 }} />
        <div style={{ fontWeight: 600, marginBottom: 6 }}>마스터에 등록된 식자재가 없습니다</div>
        <div style={{ fontSize: 13 }}>식자재 관리에서 식자재를 등록하면 자동으로 표시됩니다.</div>
      </div>
    </div>
  );
}
