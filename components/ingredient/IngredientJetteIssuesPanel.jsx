'use client';

export function IngredientJetteIssuesPanel({
  newJetteRows,
  jetteRemovedRows,
  onAutoRegister,
  onExclude,
  isViewer,
}) {
  return (
    <>
      {newJetteRows.length > 0 && (
        <div className="card" style={{ marginBottom: 12 }}>
          <div className="card-header">
            <div>
              <div className="card-title" style={{ color: 'var(--accent)' }}>
                제때 신규 미등록 ({newJetteRows.length}개)
              </div>
              <div className="card-sub">최신 제때 파일에 있지만 식자재관리에 없는 항목</div>
            </div>
          </div>
          <table className="data-table">
            <thead>
              <tr>
                <th>제품명</th>
                <th style={{ width: 110 }}>제품코드</th>
                <th style={{ width: 90 }} />
              </tr>
            </thead>
            <tbody>
              {newJetteRows.map(row => (
                <tr key={row.productCode}>
                  <td style={{ fontWeight: 500 }}>{row.displayName || row.productName}</td>
                  <td className="mono muted" style={{ fontSize: 12 }}>
                    {row.productCode || '—'}
                  </td>
                  <td>
                    <button
                      className="btn sm"
                      onClick={() => onAutoRegister(row)}
                      disabled={isViewer}
                    >
                      자동 등록
                    </button>
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      )}

      {jetteRemovedRows.length > 0 && (
        <div className="card" style={{ marginBottom: 12 }}>
          <div className="card-header">
            <div>
              <div className="card-title" style={{ color: 'var(--warn)' }}>
                제때 제거 후보 ({jetteRemovedRows.length}개)
              </div>
              <div className="card-sub">이전 파일에 있었으나 최신 파일에서 사라진 항목</div>
            </div>
          </div>
          <table className="data-table">
            <thead>
              <tr>
                <th>식자재명</th>
                <th style={{ width: 110 }}>제품코드</th>
                <th style={{ width: 100 }} />
              </tr>
            </thead>
            <tbody>
              {jetteRemovedRows.map(row => (
                <tr key={row.productCode || row.id}>
                  <td style={{ fontWeight: 500 }}>
                    {row.ingredientName || row.displayName || '—'}
                  </td>
                  <td className="mono muted" style={{ fontSize: 12 }}>
                    {row.productCode || '—'}
                  </td>
                  <td>
                    <button
                      className="btn sm"
                      style={{ color: 'var(--negative)' }}
                      onClick={() => row.productCode && onExclude(row)}
                      disabled={isViewer}
                    >
                      단종 처리
                    </button>
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      )}
    </>
  );
}
