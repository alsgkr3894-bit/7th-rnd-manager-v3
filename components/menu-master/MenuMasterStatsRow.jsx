'use client';

export function MenuMasterStatsRow({
  rows,
  activeRows,
  discontinuedRows,
  testRows,
  displayCategories,
  recipeSummaries,
  recipeWritten,
  recipeNeedsCheck,
}) {
  return (
    <div className="stat-row">
      <div className="stat-card">
        <div className="stat-label">전체 메뉴</div>
        <div className="stat-value">
          {rows.length}
          <span className="unit">개</span>
        </div>
        <div style={{ fontSize: 12, color: 'var(--text-3)', marginTop: 6 }}>
          {displayCategories
            .map(c => `${c} ${rows.filter(r => (r.category || '').startsWith(c)).length}`)
            .join(' · ')}
        </div>
      </div>
      <div className="stat-card">
        <div className="stat-label">활성</div>
        <div className="stat-value" style={{ color: 'var(--positive)' }}>
          {activeRows.length}
          <span className="unit">개</span>
        </div>
        <div style={{ fontSize: 12, color: 'var(--text-3)', marginTop: 6 }}>
          가격 입력 {activeRows.filter(r => r.price).length}개
        </div>
      </div>
      <div className="stat-card">
        <div className="stat-label">단종</div>
        <div className="stat-value" style={{ color: 'var(--text-3)' }}>
          {discontinuedRows.length}
          <span className="unit">개</span>
        </div>
      </div>
      <div className="stat-card">
        <div className="stat-label">테스트</div>
        <div className="stat-value" style={{ color: 'var(--accent)' }}>
          {testRows.length}
          <span className="unit">개</span>
        </div>
      </div>
      <div className="stat-card">
        <div className="stat-label">레시피 작성</div>
        <div className="stat-value" style={{ color: 'var(--accent-text)' }}>
          {recipeWritten}
          <span className="unit">개</span>
        </div>
        <div style={{ fontSize: 12, color: 'var(--text-3)', marginTop: 6 }}>
          대상 {recipeSummaries.length}개 · 확인 필요 {recipeNeedsCheck}개
        </div>
      </div>
    </div>
  );
}
