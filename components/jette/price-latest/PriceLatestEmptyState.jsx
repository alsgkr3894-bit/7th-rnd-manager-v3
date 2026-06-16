'use client';

export function PriceLatestEmptyState() {
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
      업로드된 가격 파일이 없습니다
    </div>
  );
}
