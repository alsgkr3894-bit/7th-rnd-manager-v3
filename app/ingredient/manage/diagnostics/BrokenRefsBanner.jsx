'use client';
import { Icon } from '@/components/icons';

export function BrokenRefsBanner({ brokenRefs }) {
  if (brokenRefs.length === 0) return null;
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
      <div style={{ fontSize: 13 }}>
        <b>복합 식자재 참조 오류 {brokenRefs.length}건</b> —{' '}
        {brokenRefs
          .slice(0, 3)
          .map(row => row.ingredientName)
          .join(', ')}
        {brokenRefs.length > 3 && ` 외 ${brokenRefs.length - 3}개`}가 존재하지 않는 코드를
        compositeOf로 참조합니다.
      </div>
    </div>
  );
}
