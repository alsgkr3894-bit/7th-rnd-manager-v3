export function IngredientUsageEmptyState({ showHidden, showUnused }) {
  return (
    <div
      style={{
        padding: '40px 0',
        textAlign: 'center',
        color: 'var(--text-3)',
        fontSize: 13,
      }}
    >
      {showHidden
        ? '숨긴 재료가 없습니다.'
        : showUnused
          ? '조건에 맞는 미사용 식자재가 없습니다.'
          : '등록된 레시피가 없거나 해당 조건에 맞는 재료가 없어요.'}
    </div>
  );
}
