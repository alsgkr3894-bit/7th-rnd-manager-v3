'use client';

export function IngredientUsageStats({
  allMetaCount,
  nonHiddenCount,
  hiddenCount,
  oneCount,
  totalUsedCount,
  onlyOne,
  showUnused,
  showHidden,
  onOnlyOne,
  onShowUnused,
  onShowHidden,
}) {
  return (
    <div className="stat-row">
      <div className="stat-card">
        <div className="stat-label">사용 재료</div>
        <div className="stat-value">
          {nonHiddenCount}
          <span className="unit">개</span>
        </div>
      </div>
      <div
        className="stat-card"
        style={{ cursor: 'pointer', outline: onlyOne ? '2px solid var(--warn)' : undefined }}
        onClick={() => {
          onOnlyOne(value => !value);
          onShowUnused(false);
        }}
      >
        <div className="stat-label">1개 메뉴만 사용 ⚠</div>
        <div className="stat-value" style={{ color: oneCount > 0 ? 'var(--warn)' : undefined }}>
          {oneCount}
          <span className="unit">개</span>
        </div>
        <div style={{ fontSize: 11, color: 'var(--text-3)', marginTop: 6 }}>
          {onlyOne ? '필터 해제' : '클릭하여 보기'}
        </div>
      </div>
      <div
        className="stat-card"
        style={{
          cursor: 'pointer',
          outline: showUnused ? '2px solid var(--accent)' : undefined,
        }}
        onClick={() => {
          onShowUnused(value => !value);
          onOnlyOne(false);
          onShowHidden(false);
        }}
      >
        <div className="stat-label">미사용</div>
        <div className="stat-value" style={{ color: 'var(--text-3)' }}>
          {allMetaCount - totalUsedCount}
          <span className="unit">개</span>
        </div>
        <div style={{ fontSize: 11, color: 'var(--text-3)', marginTop: 6 }}>
          {showUnused ? '필터 해제' : '클릭하여 보기'}
        </div>
      </div>
      <div
        className="stat-card"
        style={{
          cursor: hiddenCount ? 'pointer' : 'default',
          outline: showHidden ? '2px solid var(--accent)' : undefined,
        }}
        onClick={() => hiddenCount && onShowHidden(value => !value)}
      >
        <div className="stat-label">숨김</div>
        <div className="stat-value" style={{ color: hiddenCount > 0 ? 'var(--accent)' : undefined }}>
          {hiddenCount}
          <span className="unit">개</span>
        </div>
        {hiddenCount > 0 && (
          <div style={{ fontSize: 11, color: 'var(--text-3)', marginTop: 6 }}>
            {showHidden ? '숨김 보기 끄기' : '숨김만 보기'}
          </div>
        )}
      </div>
    </div>
  );
}
