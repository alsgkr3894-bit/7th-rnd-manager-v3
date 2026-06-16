'use client';

export function IngredientPriceIssuesPanel({ rows, onEdit, readOnly }) {
  return (
    <div className="card" style={{ padding: 16 }}>
      {rows.length === 0 ? (
        <div style={{ textAlign: 'center', color: 'var(--text-3)', padding: '32px 0' }}>
          이슈 항목이 없습니다
        </div>
      ) : (
        <>
          <div style={{ fontSize: 12, color: 'var(--text-3)', marginBottom: 12 }}>
            분류·포장단위·가격 중 하나 이상이 없는 항목 {rows.length}개
          </div>
          <div className="table-wrap">
            <table className="data-table">
              <thead>
                <tr>
                  <th>제품코드</th>
                  <th>제품명</th>
                  <th style={{ width: 80 }}>분류</th>
                  <th style={{ width: 90 }}>포장단위</th>
                  <th style={{ width: 110, textAlign: 'right' }}>부가세포함가</th>
                  <th style={{ width: 60 }}></th>
                </tr>
              </thead>
              <tbody>
                {rows.map((row, i) => (
                  <tr key={row.meta?.id ?? row.productCode ?? `issue-${i}`}>
                    <td style={{ fontSize: 11, color: 'var(--text-3)' }}>
                      {row.productCode || '—'}
                    </td>
                    <td style={{ fontWeight: 600 }}>{row.masterName || row.productName || '—'}</td>
                    <td style={{ color: !row.category ? 'var(--warn)' : undefined }}>
                      {row.category || '미설정'}
                    </td>
                    <td style={{ color: !row.baseQuantity ? 'var(--warn)' : undefined }}>
                      {row.baseQuantity != null
                        ? `${row.baseQuantity}${row.baseUnitType || ''}`
                        : '미설정'}
                    </td>
                    <td
                      style={{
                        textAlign: 'right',
                        color: row.priceWithTax == null ? 'var(--warn)' : undefined,
                      }}
                    >
                      {row.priceWithTax != null
                        ? `${row.priceWithTax.toLocaleString()}원`
                        : '미연동'}
                    </td>
                    <td>
                      <button
                        className="btn sm"
                        onClick={() => onEdit(row)}
                        style={{ fontSize: 11 }}
                        disabled={readOnly}
                      >
                        수정
                      </button>
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        </>
      )}
    </div>
  );
}
