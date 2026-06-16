'use client';

import { Icon } from '@/components/icons';

export function ToppingsEmptyState() {
  return (
    <div className="empty-state">
      <div className="empty-icon-wrap">
        <Icon.box style={{ width: 28, height: 28 }} />
      </div>
      <div className="empty-title">등록된 추가토핑이 없어요</div>
      <div className="empty-sub">추가토핑명, 식자재코드, 열량 정보를 등록하세요.</div>
    </div>
  );
}
