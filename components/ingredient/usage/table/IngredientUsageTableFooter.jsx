export function IngredientUsageTableFooter({ displayCount, hiddenCount, showUnused, usageCat }) {
  return (
    <div
      style={{
        padding: '8px 16px',
        fontSize: 11,
        color: 'var(--text-3)',
        borderTop: '1px solid var(--divider)',
      }}
    >
      {displayCount}개 표시 ·{' '}
      {showUnused
        ? '미사용 필터 중'
        : usageCat !== '전체'
          ? `${usageCat} 필터 중`
          : '전체 카테고리'}
      {hiddenCount > 0 ? ` · 숨김 ${hiddenCount}개` : ''}
    </div>
  );
}
