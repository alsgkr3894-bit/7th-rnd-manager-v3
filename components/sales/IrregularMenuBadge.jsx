'use client';

/**
 * 비정규메뉴 배지 — menu_master에 없는 판매명을 사용자가 직접 단종 처리했을 때 표시.
 * DiscontinuedBadge(menu_master status 기준)와 구분되는 별도 배지. 화면 문구는 순위표의
 * "단종" 토글 칩과 맞춰 "단종"으로 쓰고(사용자가 단종으로 표시한 것을 "비정규메뉴"로 되돌려
 * 보여주면 혼란), 구분은 색(warn 톤)과 title로만 남긴다.
 * onUnmark가 주어지면(관리자) 배지 안에 작은 "해제" 버튼을 함께 보여준다 — 잘못
 * 단종 처리한 항목을 되돌릴 수 있어야 한다.
 * printOnly면 화면에서는 숨고 인쇄물에만 나간다 — 관리자 순위표는 같은 뜻의 "단종" 토글 칩이
 * 화면을 맡고(FlagToggleChip), 칩은 no-print라 인쇄에서는 이 배지가 자리를 대신한다.
 */
export function IrregularMenuBadge({ onUnmark, printOnly = false }) {
  const canUnmark = typeof onUnmark === 'function';
  return (
    <span
      className={'chip irregular-menu-badge' + (printOnly ? ' print-only' : '')}
      style={{
        marginLeft: 6,
        fontSize: 10,
        padding: '1px 6px',
        minHeight: 0,
        lineHeight: 1.5,
        borderRadius: 4,
        background: 'var(--warn-soft)',
        color: 'var(--warn)',
        fontWeight: 700,
        display: 'inline-flex',
        alignItems: 'center',
        gap: 4,
      }}
      title="메뉴마스터에 없는 판매명 — 사용자가 단종(비정규메뉴) 처리했습니다"
    >
      단종
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
