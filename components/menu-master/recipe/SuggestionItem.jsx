'use client';

import { formatUnitPrice } from '@/lib/format';

export function SuggestionItem({ ingredient, unitPriceMap, isActive, onPick }) {
  // productCode 없는 수동 식자재는 unitPriceMap이 String(id)를 키로 사용
  const upmKey = ingredient.productCode || (ingredient.id != null ? String(ingredient.id) : null);
  const info = upmKey ? unitPriceMap.get(upmKey) : null;
  return (
    <div
      role="option"
      aria-selected={isActive}
      onMouseDown={onPick}
      style={{
        padding: '8px 10px',
        cursor: 'pointer',
        fontSize: 13,
        background: isActive ? 'var(--accent-soft)' : undefined,
      }}
    >
      <span style={{ fontWeight: 700 }}>{ingredient.ingredientName}</span>
      <div style={{ display: 'flex', gap: 6, flexWrap: 'wrap', marginTop: 1 }}>
        {ingredient.productCode && (
          <span style={{ color: 'var(--text-4)', fontSize: 11 }}>{ingredient.productCode}</span>
        )}
        {info?.unitPrice != null && (
          <span style={{ color: 'var(--text-3)', fontSize: 11 }}>
            {formatUnitPrice(info.unitPrice, info.baseUnitType)}
          </span>
        )}
      </div>
    </div>
  );
}
