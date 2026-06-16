import { LABEL_COLS } from '@/lib/nutrition/label/build';
import { asDisplayText, asObjectArray } from '@/lib/ui/prop-guards';
import {
  COL_STYLE,
  FIXED_TABLE_STYLE,
  GroupedMenuNameCell,
  HEADER_STYLE,
  NutritionLabelColumnHeader,
  NutritionLabelEmpty,
  NutritionLabelScrollArea,
  NutritionValueText,
} from './NutritionLabelTablePrimitives';

export function PizzaNutritionTable({ rows }) {
  const safeRows = asObjectArray(rows);
  if (!safeRows.length) {
    return (
      <NutritionLabelEmpty msg="피자 영양성분 데이터가 없어요. 베이스 영양성분을 먼저 입력해주세요." />
    );
  }

  return (
    <NutritionLabelScrollArea>
      <div className="origin-result-title large">영양성분표 (피자) — 150g 기준</div>
      <table className="origin-result-table" style={FIXED_TABLE_STYLE}>
        <colgroup>
          <col style={{ width: 160 }} />
          <col style={{ width: 90 }} />
          <col style={{ width: 40 }} />
          {LABEL_COLS.map(column => (
            <col key={column.key} style={{ width: 75 }} />
          ))}
          <col style={{ width: 220 }} />
        </colgroup>
        <thead>
          <tr>
            <th style={HEADER_STYLE}>메뉴명</th>
            <th style={HEADER_STYLE}>크러스트</th>
            <th style={HEADER_STYLE}>L/R</th>
            {LABEL_COLS.map(column => (
              <NutritionLabelColumnHeader key={column.key} column={column} />
            ))}
            <th style={HEADER_STYLE}>함유알레르기</th>
          </tr>
        </thead>
        <tbody>
          {safeRows.map(({ menuName, rows: crustRows }, groupIndex) => (
            <PizzaMenuRows
              key={asDisplayText(menuName, `메뉴 ${groupIndex + 1}`)}
              menuName={menuName}
              crustRows={crustRows}
              groupIndex={groupIndex}
            />
          ))}
        </tbody>
      </table>
    </NutritionLabelScrollArea>
  );
}

function PizzaMenuRows({ menuName, crustRows, groupIndex }) {
  const safeCrustRows = asObjectArray(crustRows);
  const displayMenuName = asDisplayText(menuName, `메뉴 ${groupIndex + 1}`);

  return safeCrustRows.map((row, index) => (
    <tr
      key={`${displayMenuName}-${asDisplayText(row.crustLabel)}-${asDisplayText(row.side)}-${index}`}
    >
      {index === 0 && <GroupedMenuNameCell name={displayMenuName} rowSpan={safeCrustRows.length} />}
      <td style={{ padding: '5px 8px', fontSize: 12 }}>
        {asDisplayText(row.crustLabel, '—')}
      </td>
      <td style={{ padding: '5px 6px', fontSize: 11, textAlign: 'center', color: '#666' }}>
        {asDisplayText(row.side, '—')}
      </td>
      {LABEL_COLS.map(column => (
        <td key={column.key} style={COL_STYLE}>
          <NutritionValueText value={row[column.key]} />
        </td>
      ))}
      <td style={{ padding: '5px 8px', fontSize: 11 }}>{asDisplayText(row.allergen, '—')}</td>
    </tr>
  ));
}
