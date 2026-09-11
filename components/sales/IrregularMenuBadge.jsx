'use client';

/**
 * 비정규메뉴 배지 — menu_master에 없는 판매명을 사용자가 직접 단종 처리했을 때 표시.
 * DiscontinuedBadge(menu_master status 기준)와 구분되는 별도 배지.
 */
export function IrregularMenuBadge() {
  return (
    <span
      className="chip"
      style={{
        marginLeft: 6,
        fontSize: 10,
        padding: '1px 6px',
        background: 'var(--warn-soft)',
        color: 'var(--warn)',
        fontWeight: 700,
      }}
      title="메뉴마스터에 없는 판매명 — 사용자가 단종(비정규메뉴) 처리했습니다"
    >
      비정규메뉴
    </span>
  );
}
