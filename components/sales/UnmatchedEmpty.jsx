'use client';
import { Icon } from '@/components/icons';

export function UnmatchedAllResolved() {
  return (
    <div
      className="card"
      style={{
        marginTop: 16,
        padding: '56px 24px',
        textAlign: 'center',
        display: 'flex',
        flexDirection: 'column',
        alignItems: 'center',
        gap: 12,
      }}
    >
      <Icon.check style={{ width: 48, height: 48, color: 'var(--positive)' }} />
      <div style={{ fontSize: 15, fontWeight: 700 }}>모든 메뉴가 정상 매핑됐습니다</div>
      <div style={{ fontSize: 13, color: 'var(--text-3)' }}>
        업로드된 파일 중 매핑되지 않은 메뉴가 없습니다.
        <br />새 파일 업로드 시 미매칭이 발생하면 여기에 표시됩니다.
      </div>
    </div>
  );
}

export function UnmatchedNoMatch() {
  return (
    <div
      className="card"
      style={{
        marginTop: 16,
        padding: '40px 24px',
        textAlign: 'center',
        color: 'var(--text-3)',
        fontSize: 13,
      }}
    >
      조건에 맞는 항목이 없습니다
    </div>
  );
}

export function UnmatchedSkeleton() {
  return (
    <div
      className="card"
      style={{
        marginTop: 16,
        height: 120,
        display: 'grid',
        placeItems: 'center',
        color: 'var(--text-4)',
        fontSize: 13,
      }}
    >
      로딩 중…
    </div>
  );
}
