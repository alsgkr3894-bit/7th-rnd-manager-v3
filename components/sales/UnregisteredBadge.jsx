'use client';

/**
 * 메뉴마스터에 없는(아직 단종/비정규메뉴로 등록 안 된) 판매명 배지.
 * 관리자 화면에서는 "+ 단종" 버튼이 이미 같은 뜻을 전달하므로 인쇄 전용(print-only)으로만
 * 보이고, 뷰어(관리자 아님) 화면에서는 버튼이 없어 화면에도 함께 보여준다.
 * "+ 단종" 버튼은 no-print라 PDF에는 아무 표시가 없었던 문제를 해결한다.
 */
export function UnregisteredBadge({ printOnly = false }) {
  return (
    <span
      className={'chip unregistered-badge' + (printOnly ? ' print-only' : '')}
      style={{
        marginLeft: 6,
        fontSize: 10,
        padding: '1px 6px',
        background: 'transparent',
        color: 'var(--text-3)',
        fontWeight: 700,
        border: '1px dashed var(--border)',
        display: 'inline-flex',
        alignItems: 'center',
      }}
      title="메뉴마스터에 없는 판매명 — 아직 단종 등록 전"
    >
      미등록
    </span>
  );
}
