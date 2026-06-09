'use client';
import { useRouter } from 'next/navigation';
import { Icon } from '@/components/icons';

/**
 * MasterSourceBadge — 메뉴 마스터에서 관리되는 데이터를 가져다 쓰는 소비 페이지에 표시.
 * 클릭하면 메뉴 마스터로 이동. "이 페이지의 메뉴코드·분류·판매가는 메뉴 마스터에서 관리(활성중)" 의미.
 */
export function MasterSourceBadge() {
  const router = useRouter();
  return (
    <button
      type="button"
      onClick={() => router.push('/menu-master')}
      title="메뉴코드·분류·판매가는 메뉴 마스터에서 관리됩니다"
      style={{
        display: 'inline-flex',
        alignItems: 'center',
        gap: 5,
        padding: '3px 9px',
        borderRadius: 999,
        cursor: 'pointer',
        fontSize: 11,
        fontWeight: 700,
        background: 'var(--positive-soft)',
        color: 'var(--positive)',
        border: '1px solid color-mix(in oklab, var(--positive) 35%, transparent)',
      }}
    >
      <span
        style={{
          width: 6,
          height: 6,
          borderRadius: '50%',
          background: 'var(--positive)',
          flexShrink: 0,
        }}
      />
      메뉴 마스터 활성중
      <Icon.chevRight style={{ width: 11, height: 11 }} />
    </button>
  );
}
