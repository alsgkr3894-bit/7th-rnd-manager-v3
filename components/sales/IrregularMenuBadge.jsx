'use client';

/**
 * 비정규메뉴 배지 — menu_master에 없는 판매명을 사용자가 직접 단종 처리했을 때 표시.
 * DiscontinuedBadge(menu_master status 기준)와 구분되는 별도 배지.
 * onUnmark가 주어지면(관리자) 배지 안에 작은 "해제" 버튼을 함께 보여준다 — 잘못
 * 단종 처리한 항목을 되돌릴 수 있어야 한다.
 */
export function IrregularMenuBadge({ onUnmark }) {
  const canUnmark = typeof onUnmark === 'function';
  return (
    <span
      className="chip irregular-menu-badge"
      style={{
        marginLeft: 6,
        fontSize: 10,
        padding: '1px 6px',
        background: 'var(--warn-soft)',
        color: 'var(--warn)',
        fontWeight: 700,
        display: 'inline-flex',
        alignItems: 'center',
        gap: 4,
      }}
      title="메뉴마스터에 없는 판매명 — 사용자가 단종(비정규메뉴) 처리했습니다"
    >
      비정규메뉴
      {canUnmark && (
        <button
          type="button"
          onClick={onUnmark}
          title="단종 처리 해제"
          style={{
            border: 0,
            background: 'transparent',
            cursor: 'pointer',
            color: 'inherit',
            opacity: 0.7,
            padding: 0,
            lineHeight: 1,
            fontSize: 11,
            fontWeight: 700,
          }}
        >
          ×
        </button>
      )}
    </span>
  );
}
