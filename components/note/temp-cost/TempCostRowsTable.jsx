'use client';

import { Icon } from '@/components/icons';
import { nonNeg, tempCostRowSubtotal } from './tempCostUtils';

const HEADER_STYLE = {
  textAlign: 'left',
  padding: '4px 8px',
  color: 'var(--text-3)',
  fontWeight: 600,
  fontSize: 11,
  whiteSpace: 'nowrap',
};

function TempCostRow({ row, onUpdateRow, onRemoveRow }) {
  const subtotal = tempCostRowSubtotal(row);

  return (
    <tr style={{ borderBottom: '1px solid var(--surface-2)' }}>
      <td style={{ padding: '6px 8px', color: 'var(--text-1)', minWidth: 120 }}>
        <div style={{ fontWeight: 600 }}>{row.name}</div>
        {row.productCode && (
          <div style={{ fontSize: 10, color: 'var(--text-4)', marginTop: 1 }}>
            {row.productCode}
          </div>
        )}
      </td>
      <td style={{ padding: '6px 8px' }}>
        <div style={{ display: 'flex', alignItems: 'center', gap: 4 }}>
          <input
            className="form-input"
            style={{ width: 64, padding: '3px 6px', fontSize: 12 }}
            type="number"
            min="0"
            value={row.quantity}
            onChange={event => onUpdateRow(row.id, 'quantity', nonNeg(event.target.value))}
            placeholder="0"
          />
          <span style={{ fontSize: 11, color: 'var(--text-3)' }}>{row.unit}</span>
        </div>
      </td>
      <td style={{ padding: '6px 8px' }}>
        <input
          className="form-input"
          style={{ width: 80, padding: '3px 6px', fontSize: 12 }}
          type="number"
          min="0"
          value={row.unitPrice}
          onChange={event => onUpdateRow(row.id, 'unitPrice', nonNeg(event.target.value))}
          placeholder="0"
        />
      </td>
      <td
        style={{
          padding: '6px 8px',
          color: 'var(--text-2)',
          fontWeight: 600,
          whiteSpace: 'nowrap',
        }}
      >
        {subtotal > 0 ? Math.round(subtotal).toLocaleString() : '—'}
      </td>
      <td style={{ padding: '6px 4px' }}>
        <button
          type="button"
          onClick={() => onRemoveRow(row.id)}
          style={{
            background: 'none',
            border: 'none',
            cursor: 'pointer',
            color: 'var(--text-4)',
            padding: 2,
          }}
        >
          <Icon.close style={{ width: 13, height: 13 }} />
        </button>
      </td>
    </tr>
  );
}

export function TempCostRowsTable({ rows, onUpdateRow, onRemoveRow }) {
  if (!rows.length) {
    return (
      <div
        style={{
          textAlign: 'center',
          padding: '20px 0',
          color: 'var(--text-4)',
          fontSize: 12,
        }}
      >
        재료를 검색해서 추가하세요
      </div>
    );
  }

  return (
    <div style={{ overflowX: 'auto', marginBottom: 12 }}>
      <table style={{ width: '100%', borderCollapse: 'collapse', fontSize: 13 }}>
        <thead>
          <tr style={{ borderBottom: '1px solid var(--border)' }}>
            {['재료명', '사용량', '단가(원)', '소계(원)', ''].map(header => (
              <th key={header} style={HEADER_STYLE}>
                {header}
              </th>
            ))}
          </tr>
        </thead>
        <tbody>
          {rows.map(row => (
            <TempCostRow
              key={row.id}
              row={row}
              onUpdateRow={onUpdateRow}
              onRemoveRow={onRemoveRow}
            />
          ))}
        </tbody>
      </table>
    </div>
  );
}
