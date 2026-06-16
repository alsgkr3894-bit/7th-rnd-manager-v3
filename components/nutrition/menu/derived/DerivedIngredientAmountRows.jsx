'use client';
import { Icon } from '@/components/icons';
import { asDisplayText, asStringArray } from '@/lib/ui/prop-guards';
import { asAmountMap } from './derivedCompositionUtils';

export function DerivedIngredientAmountRows({
  form,
  ingredientMetaByCode,
  onUpdateIngredientAmount,
  onRemoveIngredient,
}) {
  const ingredientCodes = asStringArray(form.ingredientCodes);
  if (ingredientCodes.length === 0) return null;

  return (
    <div style={{ marginTop: 12 }}>
      <div style={{ fontSize: 12, fontWeight: 800, marginBottom: 6 }}>L/R 식자재 사용량</div>
      <div style={{ display: 'flex', flexDirection: 'column', gap: 8 }}>
        {ingredientCodes.map(code => {
          const row = ingredientMetaByCode[code];
          const ingredientName = asDisplayText(
            row?.ingredientName || row?.displayName || row?.productName,
            code || '식자재'
          );
          const amounts = asAmountMap(form.ingredientAmounts)[code] || {};

          return (
            <div
              key={code}
              style={{
                display: 'grid',
                gridTemplateColumns: '1fr 100px 100px 42px',
                gap: 8,
                alignItems: 'center',
                padding: '8px 10px',
                border: '1px solid var(--border)',
                borderRadius: 8,
                background: 'var(--surface-2)',
              }}
            >
              <div>
                <div style={{ fontSize: 13, fontWeight: 800 }}>{ingredientName}</div>
                <div style={{ fontSize: 11, color: 'var(--text-4)' }}>
                  {code} · 구성 확인용, 영양값 자동 반영 없음
                </div>
              </div>
              <input
                className="input"
                type="number"
                min="0"
                step="0.1"
                value={amounts.L ?? ''}
                onChange={event => onUpdateIngredientAmount(code, 'L', event.target.value)}
                placeholder="L g"
              />
              <input
                className="input"
                type="number"
                min="0"
                step="0.1"
                value={amounts.R ?? ''}
                onChange={event => onUpdateIngredientAmount(code, 'R', event.target.value)}
                placeholder="R g"
              />
              <button
                type="button"
                className="btn sm ghost"
                onClick={() => onRemoveIngredient(code)}
                style={{ color: 'var(--danger)' }}
              >
                <Icon.trash style={{ width: 13, height: 13 }} />
              </button>
            </div>
          );
        })}
      </div>
    </div>
  );
}
