'use client';

import { Icon } from '@/components/icons';

export function SyncBaseQtyDone({ count, onClose }) {
  return (
    <div style={{ padding: '40px 0', textAlign: 'center' }}>
      <Icon.check style={{ width: 36, height: 36, color: 'var(--positive)', marginBottom: 12 }} />
      <div style={{ fontWeight: 700, fontSize: 15, marginBottom: 6 }}>
        {count}개 기준수량 업데이트 완료
      </div>
      <div style={{ fontSize: 12, color: 'var(--text-3)', marginBottom: 20 }}>
        목록이 자동으로 새로고침됩니다.
      </div>
      <button type="button" className="btn primary" onClick={onClose}>
        닫기
      </button>
    </div>
  );
}
