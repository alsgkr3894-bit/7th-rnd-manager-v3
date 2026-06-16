'use client';

import { Icon } from '@/components/icons';
import { asDisplayText } from '@/lib/ui/prop-guards';
import {
  findLinkedToppingIngredient,
  formatToppingNutritionValue,
  toppingAllergenText,
} from './toppingUtils';

function ToppingRow({ topping, index, lookups, onEdit, onRemove }) {
  const linked = findLinkedToppingIngredient(topping, lookups);
  const toppingName = asDisplayText(topping.toppingName, `추가토핑 ${index + 1}`);
  const productCode = asDisplayText(topping.productCode);
  const ingredientName = asDisplayText(linked?.ingredientName || topping.ingredientName);

  return (
    <tr>
      <td style={{ fontWeight: 800 }}>{toppingName}</td>
      <td className="mono muted">{productCode || '미연결'}</td>
      <td>
        {ingredientName ? (
          <span style={{ fontWeight: 700 }}>{ingredientName}</span>
        ) : (
          <span style={{ color: 'var(--text-4)' }}>식자재 미연결</span>
        )}
      </td>
      <td>{formatToppingNutritionValue(topping.weight, 'g')}</td>
      <td style={{ fontWeight: 800, color: 'var(--accent)' }}>
        {formatToppingNutritionValue(topping.kcal, 'kcal')}
      </td>
      <td style={{ fontSize: 12 }}>{toppingAllergenText(topping, lookups)}</td>
      <td>
        <div style={{ display: 'flex', gap: 4 }}>
          <button className="btn sm ghost" type="button" onClick={() => onEdit(topping)}>
            <Icon.edit style={{ width: 13, height: 13 }} />
          </button>
          <button
            className="btn sm ghost"
            type="button"
            onClick={() => onRemove(topping)}
            style={{ color: 'var(--danger)' }}
          >
            <Icon.trash style={{ width: 13, height: 13 }} />
          </button>
        </div>
      </td>
    </tr>
  );
}

export function ToppingsTable({ toppings, lookups, onEdit, onRemove }) {
  return (
    <div className="card table-card">
      <div style={{ overflowX: 'auto' }}>
        <table className="data-table" style={{ minWidth: 900 }}>
          <thead>
            <tr>
              <th>추가토핑명</th>
              <th style={{ width: 130 }}>식자재코드</th>
              <th>연결 식자재</th>
              <th style={{ width: 100 }}>중량</th>
              <th style={{ width: 110 }}>열량</th>
              <th>알레르기</th>
              <th style={{ width: 90 }}>관리</th>
            </tr>
          </thead>
          <tbody>
            {toppings.map((topping, index) => (
              <ToppingRow
                key={topping.id || topping.toppingCode || asDisplayText(topping.toppingName)}
                topping={topping}
                index={index}
                lookups={lookups}
                onEdit={onEdit}
                onRemove={onRemove}
              />
            ))}
          </tbody>
        </table>
      </div>
    </div>
  );
}
