'use client';

export function SyncBaseQtyNotice() {
  return (
    <div
      style={{
        padding: '10px 14px',
        borderRadius: 8,
        background: 'color-mix(in srgb, var(--accent) 10%, transparent)',
        fontSize: 12,
        color: 'var(--text-2)',
        marginBottom: 16,
        lineHeight: 1.7,
      }}
    >
      <b>주의:</b> 이 작업은 기준수량(포장단위)을 덮어씁니다. 기준수량은 개당 단가 계산의 기준이
      되므로 변경 전 반드시 내용을 확인하세요.
      <br />
      수량이 없는 제때 항목, 매칭이 안 되는 항목, g/개로 환산할 수 없는 단위는 변경되지 않습니다.
    </div>
  );
}
