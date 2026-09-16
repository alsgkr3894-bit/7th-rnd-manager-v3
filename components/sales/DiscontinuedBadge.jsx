'use client';

/**
 * 메뉴마스터 단종 배지 — 판매 데이터 유무와 무관한, 메뉴마스터 status 기준 표시.
 * onUnmark가 주어지면(관리자) 배지 안에 작은 "해제" 버튼을 함께 보여준다 — 메뉴마스터에서
 * 잘못 단종 처리된 항목을 이 화면에서 바로 되돌릴 수 있어야 한다.
 */
export function DiscontinuedBadge({ onUnmark }) {
  const canUnmark = typeof onUnmark === 'function';
  return (
    <span
      className="chip discontinued-badge"
      style={{
        marginLeft: 6,
        fontSize: 10,
        padding: '1px 6px',
        minHeight: 0,
        lineHeight: 1.5,
        borderRadius: 4,
        background: 'var(--surface-2)',
        color: 'var(--text-3)',
        fontWeight: 700,
        display: 'inline-flex',
        alignItems: 'center',
        gap: 4,
      }}
      title="메뉴마스터에서 단종 처리된 메뉴입니다"
    >
      단종
      {canUnmark && (
        <button
          type="button"
          onClick={onUnmark}
          title="메뉴마스터 단종 상태 해제"
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
