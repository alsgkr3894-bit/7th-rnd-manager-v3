'use client';
import {
  IngredientConnectInput,
  NumberImportInput,
  StatusBadge,
  TextImportInput,
} from './ToppingImportInputs';
import { FIELD_BY_KEY, PREVIEW_FIELDS, asText, ingredientAllergenText } from './toppingImportUtils';

export function ToppingPreviewTable({
  rows,
  ingredientOptions,
  onToggle,
  onPatchRow,
  onIngredientInput,
}) {
  return (
    <div
      style={{
        maxHeight: '58vh',
        overflow: 'auto',
        border: '1px solid var(--border)',
        borderRadius: 8,
      }}
    >
      <table style={{ width: '100%', minWidth: 1440, borderCollapse: 'collapse', fontSize: 13 }}>
        <thead>
          <tr>
            {[
              '포함',
              '상태',
              '추가토핑',
              '식자재 연결',
              '알레르기',
              ...PREVIEW_FIELDS.map(key => FIELD_BY_KEY[key]?.label || key),
            ].map((label, index) => (
              <th
                key={`${label}-${index}`}
                style={{
                  position: 'sticky',
                  top: 0,
                  zIndex: 1,
                  padding: '9px 10px',
                  background: 'var(--surface-2)',
                  borderBottom: '1px solid var(--border)',
                  color: 'var(--text-2)',
                  textAlign: index >= 5 ? 'right' : 'left',
                  whiteSpace: 'nowrap',
                }}
              >
                {label}
              </th>
            ))}
          </tr>
        </thead>
        <tbody>
          {rows.map((row, index) => (
            <tr
              key={`${row.toppingCode || row.toppingName || 'row'}-${index}`}
              style={{
                background:
                  row.status === 'invalid'
                    ? 'color-mix(in srgb, #fee2e2 48%, var(--surface))'
                    : row.status === 'exists'
                      ? 'color-mix(in srgb, #dcfce7 35%, var(--surface))'
                      : undefined,
              }}
            >
              <td style={{ padding: '8px 10px', borderBottom: '1px solid var(--divider)' }}>
                <input
                  type="checkbox"
                  checked={!!row.include}
                  disabled={row.status === 'invalid'}
                  onChange={() => onToggle(index)}
                  style={{ transform: 'scale(1.15)' }}
                />
              </td>
              <td style={{ padding: '8px 10px', borderBottom: '1px solid var(--divider)' }}>
                <StatusBadge status={row.status} />
                {row.sourceRow && (
                  <div style={{ marginTop: 3, fontSize: 10, color: 'var(--text-4)' }}>
                    {row.sourceSheet ? `${row.sourceSheet} ` : ''}
                    {row.sourceRow}행
                  </div>
                )}
              </td>
              <td style={{ padding: '8px 10px', borderBottom: '1px solid var(--divider)' }}>
                <div style={{ display: 'grid', gap: 5, minWidth: 170 }}>
                  <TextImportInput
                    value={row.toppingName}
                    placeholder="추가토핑명"
                    onChange={value => onPatchRow(index, { toppingName: value })}
                  />
                  <TextImportInput
                    value={row.toppingCode}
                    placeholder="코드 없으면 자동 생성"
                    mono
                    onChange={value => onPatchRow(index, { toppingCode: value })}
                  />
                </div>
              </td>
              <td style={{ padding: '8px 10px', borderBottom: '1px solid var(--divider)' }}>
                <div style={{ display: 'grid', gap: 5, minWidth: 220 }}>
                  <IngredientConnectInput
                    row={row}
                    index={index}
                    options={ingredientOptions}
                    onIngredientInput={onIngredientInput}
                  />
                  <div
                    className="mono"
                    style={{
                      fontSize: 11,
                      color: row.hasIngredientMatch ? '#16a34a' : 'var(--text-4)',
                    }}
                  >
                    {row.hasIngredientMatch ? '연결됨' : row.productCode ? '일치 없음' : '미연결'}
                  </div>
                </div>
              </td>
              <td
                style={{
                  padding: '8px 10px',
                  borderBottom: '1px solid var(--divider)',
                  minWidth: 160,
                }}
              >
                <span style={{ fontSize: 12, fontWeight: 700, color: 'var(--text-2)' }}>
                  {ingredientAllergenText(row, ingredientOptions) || '-'}
                </span>
              </td>
              {PREVIEW_FIELDS.map(key => (
                <td
                  key={key}
                  style={{
                    padding: '8px 10px',
                    borderBottom: '1px solid var(--divider)',
                    textAlign: 'right',
                    whiteSpace: 'nowrap',
                  }}
                >
                  <NumberImportInput
                    value={row.values?.[key]}
                    unit={FIELD_BY_KEY[key]?.unit || ''}
                    onChange={value =>
                      onPatchRow(index, {
                        values: {
                          ...row.values,
                          [key]: value,
                        },
                      })
                    }
                  />
                </td>
              ))}
            </tr>
          ))}
        </tbody>
      </table>
    </div>
  );
}
