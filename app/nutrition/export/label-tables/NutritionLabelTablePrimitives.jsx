import { asDisplayText } from '@/lib/ui/prop-guards';

export const COL_STYLE = { textAlign: 'right', minWidth: 70, fontSize: 12, padding: '6px 8px' };
export const HEADER_STYLE = {
  ...COL_STYLE,
  textAlign: 'center',
  background: '#f0f0f0',
  fontWeight: 700,
  fontSize: 11,
  // 표를 내려도 컬럼명이 계속 보이도록 상단에 고정한다.
  // 이 sticky는 NutritionLabelScrollArea의 스크롤 영역 기준으로 동작해야
  // 앱 상단 고정바(.topbar, position:sticky top:0)와 겹치지 않는다.
  position: 'sticky',
  top: 0,
  zIndex: 1,
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
  // 세로 스크롤 컨테이너를 이 div로 한정해야 헤더 sticky(top:0)가 앱 상단 고정바가 아니라
  // 이 영역 기준으로 붙는다. maxHeight는 다른 큰 표(AllergenMenuMatrixTable)와 동일 기준.
  return (
    <div style={{ overflowX: 'auto', overflowY: 'auto', maxHeight: 'calc(100vh - 260px)' }}>
      {children}
    </div>
  );
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
