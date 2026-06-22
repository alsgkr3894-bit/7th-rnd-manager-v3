'use client';

import { Icon } from '@/components/icons';
import { SectionLabel, thStyle } from '@/components/cost/shared/FormLabels';
import {
  formatGroupTotal,
  formatSubtotal,
  formatUnitPrice,
  getLineSubtotal,
} from './groupEditorUtils';

function SizeHeaderBadge({ sizeLabel }) {
  return (
    <span
      style={{
        fontSize: 10,
        padding: '1px 5px',
        borderRadius: 3,
        fontWeight: 700,
        background: 'rgba(56,189,248,.15)',
        color: 'var(--accent)',
        marginRight: 4,
      }}
    >
      {sizeLabel}
    </span>
  );
}

function IngredientSizeCells({
  line,
  lineIndex,
  sizeLabels,
  unitPriceMap,
  readOnly = false,
  onQty,
}) {
  return sizeLabels.map(sizeLabel => {
    const qty = line.quantities?.[sizeLabel] ?? '';
    const subtotal = getLineSubtotal(line, sizeLabel, unitPriceMap);
    return [
      <td key={sizeLabel + '_q'} style={{ padding: '4px 4px', width: 70 }}>
        <input
          className="form-input"
          type="number"
          min="0"
          value={qty}
          onChange={event => onQty(lineIndex, sizeLabel, event.target.value)}
          placeholder="0"
          style={{ width: '100%', padding: '3px 5px', textAlign: 'right' }}
          disabled={readOnly}
        />
      </td>,
      <td
        key={sizeLabel + '_s'}
        style={{
          padding: '4px 6px',
          textAlign: 'right',
          fontSize: 12,
          color:
            subtotal == null ? 'var(--text-4)' : subtotal < 0 ? 'var(--negative)' : 'var(--text-1)',
          fontWeight: subtotal != null ? 600 : undefined,
          width: 60,
        }}
      >
        {formatSubtotal(subtotal)}
      </td>,
    ];
  });
}

function GroupIngredientRow({
  line,
  lineIndex,
  sizeLabels,
  unitPriceMap,
  readOnly = false,
  onQty,
  onRemove,
}) {
  const info = unitPriceMap.get(line.productCode);
  const hasPrice = info?.unitPrice != null;

  return (
    <tr style={{ borderBottom: '1px solid var(--divider)' }}>
      <td style={{ padding: '6px 8px' }}>
        <div style={{ fontWeight: 500 }}>{line.ingredientName}</div>
        {!hasPrice && (
          <div style={{ fontSize: 10, color: '#f59e0b', marginTop: 1 }}>⚠ 단가 미등록</div>
        )}
      </td>
      <td
        style={{
          padding: '6px 8px',
          textAlign: 'right',
          color: 'var(--text-3)',
          fontSize: 12,
        }}
      >
        {formatUnitPrice(info?.unitPrice)}
      </td>
      <IngredientSizeCells
        line={line}
        lineIndex={lineIndex}
        sizeLabels={sizeLabels}
        unitPriceMap={unitPriceMap}
        readOnly={readOnly}
        onQty={onQty}
      />
      <td style={{ padding: '6px 4px', fontSize: 12, color: 'var(--text-3)' }}>{line.unitType}</td>
      <td style={{ padding: '6px 2px', textAlign: 'center' }}>
        <button
          onClick={() => onRemove(lineIndex)}
          disabled={readOnly}
          style={{
            border: 0,
            background: 'transparent',
            cursor: readOnly ? 'default' : 'pointer',
            color: 'var(--text-4)',
            padding: '2px',
          }}
        >
          <Icon.close style={{ width: 11, height: 11 }} />
        </button>
      </td>
    </tr>
  );
}

function GroupIngredientsFooter({ sizeLabels, costBySizes }) {
  if (sizeLabels.length === 0) return null;

  return (
    <tfoot>
      <tr style={{ borderTop: '2px solid var(--divider)', background: 'var(--surface-2)' }}>
        <td style={{ padding: '6px 8px', fontWeight: 700, fontSize: 12 }}>합계</td>
        <td />
        {sizeLabels.map(sizeLabel => {
          const total = costBySizes[sizeLabel] || 0;
          return [
            <td key={sizeLabel + '_qt'} />,
            <td
              key={sizeLabel + '_st'}
              style={{
                padding: '6px 6px',
                textAlign: 'right',
                fontWeight: 700,
                fontSize: 13,
                color: total < 0 ? 'var(--negative)' : 'var(--accent)',
              }}
            >
              {formatGroupTotal(total)}
            </td>,
          ];
        })}
        <td />
        <td />
      </tr>
    </tfoot>
  );
}

export function GroupIngredientsTable({
  ingredients,
  sizeLabels,
  unitPriceMap,
  costBySizes,
  readOnly = false,
  onQty,
  onRemove,
}) {
  return (
    <>
      <SectionLabel>
        식자재{' '}
        <span style={{ fontSize: 11, fontWeight: 400, color: 'var(--text-4)' }}>
          (사용량에 −(마이너스) 입력 시 차감)
        </span>
      </SectionLabel>
      {ingredients.length > 0 && (
        <div style={{ marginBottom: 8, overflowX: 'auto' }}>
          <table style={{ width: '100%', borderCollapse: 'collapse', fontSize: 13 }}>
            <thead>
              <tr style={{ borderBottom: '2px solid var(--divider)' }}>
                <th style={thStyle}>식자재명</th>
                <th style={{ ...thStyle, width: 80, textAlign: 'right' }}>단가/단위</th>
                {sizeLabels.map(sizeLabel => (
                  <th key={sizeLabel} style={{ ...thStyle, width: 100 }} colSpan={2}>
                    <SizeHeaderBadge sizeLabel={sizeLabel} />
                    사용량 / 소계
                  </th>
                ))}
                <th style={{ ...thStyle, width: 40 }}>단위</th>
                <th style={{ ...thStyle, width: 32 }}></th>
              </tr>
            </thead>
            <tbody>
              {ingredients.map((line, index) => (
                <GroupIngredientRow
                  key={index}
                  line={line}
                  lineIndex={index}
                  sizeLabels={sizeLabels}
                  unitPriceMap={unitPriceMap}
                  readOnly={readOnly}
                  onQty={onQty}
                  onRemove={onRemove}
                />
              ))}
            </tbody>
            <GroupIngredientsFooter sizeLabels={sizeLabels} costBySizes={costBySizes} />
          </table>
        </div>
      )}
    </>
  );
}
