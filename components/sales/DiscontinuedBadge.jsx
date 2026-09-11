'use client';

/** 메뉴마스터 단종 배지 — 판매 데이터 유무와 무관한, 메뉴마스터 status 기준 표시. */
export function DiscontinuedBadge() {
  return (
    <span
      className="chip"
      style={{
        marginLeft: 6,
        fontSize: 10,
        padding: '1px 6px',
        background: 'var(--surface-2)',
        color: 'var(--text-3)',
        fontWeight: 700,
      }}
      title="메뉴마스터에서 단종 처리된 메뉴입니다"
    >
      단종
    </span>
  );
}
