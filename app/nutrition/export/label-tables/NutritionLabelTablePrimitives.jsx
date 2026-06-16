import { asDisplayText } from '@/lib/ui/prop-guards';

export const COL_STYLE = { textAlign: 'right', minWidth: 70, fontSize: 12, padding: '6px 8px' };
export const HEADER_STYLE = {
  ...COL_STYLE,
  background: '#f0f0f0',
  fontWeight: 700,
  fontSize: 11,
};
export const TABLE_STYLE = { borderCollapse: 'collapse', width: '100%' };
export const FIXED_TABLE_STYLE = { ...TABLE_STYLE, tableLayout: 'fixed' };

const EMPTY_DASH_STYLE = { color: '#aaa' };

export function NutritionValueText({ value }) {
  const text = asDisplayText(value);
  if (!text || text === '—') return <span style={EMPTY_DASH_STYLE}>—</span>;
  return text;
}

export function NutritionLabelColumnHeader({ column }) {
  return (
    <th style={HEADER_STYLE}>
      {column.label}
      <br />
      <span style={{ fontWeight: 400, fontSize: 9 }}>({column.unit})</span>
    </th>
  );
}

export function NutritionLabelEmpty({ msg }) {
  return (
    <div
      className="origin-result-empty"
      style={{ padding: '40px 20px', textAlign: 'center', color: '#888' }}
    >
      {msg}
    </div>
  );
}

export function NutritionLabelScrollArea({ children }) {
  return <div style={{ overflowX: 'auto' }}>{children}</div>;
}

export function GroupedMenuNameCell({ name, rowSpan }) {
  return (
    <td
      rowSpan={rowSpan}
      style={{
        fontWeight: 700,
        verticalAlign: 'middle',
        padding: '6px 8px',
        fontSize: 13,
        borderRight: '1px solid #ccc',
      }}
    >
      {name}
    </td>
  );
}
