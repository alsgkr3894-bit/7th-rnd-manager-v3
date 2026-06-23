'use client';
import { Icon } from '@/components/icons';
import { IngredientSearch } from '@/components/cost/shared/IngredientSearch';
import { formatNumber } from '@/lib/format';
import { UNIT_OPTIONS } from '@/lib/cost/shared/unit-options';

export function EdgeComponentRow({ component, allMeta, unitPriceMap, onChange, onRemove }) {
  const quantity = Number(component.quantity);
  const unitPrice = Number(component.unitPrice);
  const hasSubtotal =
    component.quantity !== '' &&
    component.quantity != null &&
    component.unitPrice !== '' &&
    component.unitPrice != null &&
    Number.isFinite(quantity) &&
    Number.isFinite(unitPrice);
  const subtotal = hasSubtotal ? quantity * unitPrice : 0;

  return (
    <div
      data-comp-row="1"
      style={{
        display: 'grid',
        gridTemplateColumns: '1fr 90px 72px 110px 90px 28px',
        gap: 6,
        alignItems: 'center',
      }}
    >
      <div style={{ position: 'relative' }}>
        {component.ingredientName ? (
          <div
            style={{
              display: 'flex',
              alignItems: 'center',
              gap: 4,
              padding: '5px 8px',
              background: 'var(--accent-soft)',
              border: '1.5px solid var(--accent)',
              borderRadius: 7,
              fontSize: 13,
            }}
          >
            <span
              style={{
                flex: 1,
                color: 'var(--accent-text)',
                fontWeight: 600,
                overflow: 'hidden',
                textOverflow: 'ellipsis',
                whiteSpace: 'nowrap',
              }}
            >
              {component.ingredientName}
            </span>
            <button
              type="button"
              onClick={() => onChange({ ingredientName: '', productCode: null, unitPrice: '' })}
              style={{
                border: 0,
                background: 'none',
                cursor: 'pointer',
                color: 'var(--text-3)',
                padding: 0,
                flexShrink: 0,
              }}
            >
              <Icon.close style={{ width: 12, height: 12 }} />
            </button>
          </div>
        ) : (
          <IngredientSearch
            allMeta={allMeta}
            unitPriceMap={unitPriceMap}
            onSelect={meta => {
              const info = unitPriceMap.get(meta.productCode);
              const patch = {
                ingredientName: meta.ingredientName || '',
                productCode: meta.productCode || null,
                unit: info?.baseUnitType || meta.baseUnitType || 'g',
              };
              if (info?.unitPrice != null) patch.unitPrice = String(info.unitPrice);
              onChange(patch);
            }}
            style={{ marginTop: 0 }}
          />
        )}
      </div>

      <input
        className="form-input"
        type="number"
        step="any"
        value={component.quantity ?? ''}
        onChange={e => onChange({ quantity: e.target.value })}
        placeholder="수량"
        style={{ textAlign: 'right' }}
      />

      <select
        className="form-input"
        value={component.unit || 'g'}
        onChange={e => onChange({ unit: e.target.value })}
      >
        {UNIT_OPTIONS.map(unit => (
          <option key={unit} value={unit}>
            {unit}
          </option>
        ))}
      </select>

      <input
        className="form-input"
        type="number"
        min="0"
        step="any"
        value={component.unitPrice ?? ''}
        onChange={e => onChange({ unitPrice: e.target.value })}
        placeholder="단가"
        style={{ textAlign: 'right' }}
      />

      <div
        style={{
          textAlign: 'right',
          fontSize: 13,
          fontWeight: 600,
          color: subtotal < 0 ? 'var(--negative)' : hasSubtotal ? 'var(--text-1)' : 'var(--text-4)',
        }}
      >
        {hasSubtotal ? `${formatNumber(Math.round(subtotal))}원` : '—'}
      </div>

      <button
        type="button"
        onClick={onRemove}
        style={{
          background: 'transparent',
          border: 'none',
          padding: 4,
          cursor: 'pointer',
          color: 'var(--text-4)',
          display: 'inline-flex',
        }}
      >
        <Icon.close style={{ width: 14, height: 14 }} />
      </button>
    </div>
  );
}
