'use client';

export function BulkPriceFormatHint() {
  return (
    <div
      style={{
        padding: '10px 14px',
        borderRadius: 8,
        background: 'var(--surface-2)',
        fontSize: 12,
        color: 'var(--text-2)',
        marginBottom: 16,
        lineHeight: 1.7,
      }}
    >
      <b>필수 컬럼:</b> 상품코드 (또는 제품코드·코드·productCode)&emsp;
      <b>단가</b> (또는 가격·부가세포함가·price)
      <br />
      <b>선택 컬럼:</b> 재료명 (또는 품목명·제품명)&emsp;
      <span style={{ color: 'var(--text-3)' }}>지원 형식: .csv, .xlsx, .xls</span>
    </div>
  );
}
