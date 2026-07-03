import { LABEL_COLS } from '@/lib/nutrition/label/build';
import { asDisplayText, asObjectArray } from '@/lib/ui/prop-guards';
import { displayNutritionMenuName } from '@/lib/nutrition/label/poster';
import {
  COL_STYLE,
  HEADER_STYLE,
  NutritionLabelColumnHeader,
  NutritionLabelEmpty,
  NutritionLabelScrollArea,
  NutritionValueText,
  TABLE_STYLE,
} from './NutritionLabelTablePrimitives';

export function SimpleNutritionTable({ title, rows, cols = LABEL_COLS }) {
  const safeRows = asObjectArray(rows);
  const safeCols = asObjectArray(cols);
  if (!safeRows.length) return <NutritionLabelEmpty msg={`${title} 영양성분 데이터가 없어요.`} />;

  return (
    <NutritionLabelScrollArea>
      <div className="origin-result-title large">{`영양성분표 (${title})`}</div>
      <table className="origin-result-table" style={TABLE_STYLE}>
        <thead>
          <tr>
            <th style={{ ...HEADER_STYLE, textAlign: 'left', width: 200 }}>메뉴명</th>
            {safeCols.map(column => (
              <NutritionLabelColumnHeader key={column.key} column={column} />
            ))}
            <th style={{ ...HEADER_STYLE, textAlign: 'left' }}>함유알레르기</th>
          </tr>
        </thead>
        <tbody>
          {safeRows.map((row, index) => (
            <tr key={row.menuCode || row.menuName || index}>
              <td style={{ padding: '6px 8px', fontWeight: 600, fontSize: 13 }}>
                {displayNutritionMenuName(row.menuName, `메뉴 ${index + 1}`)}
              </td>
              {safeCols.map(column => (
                <td key={column.key} style={COL_STYLE}>
                  <NutritionValueText value={row[column.key]} />
                </td>
              ))}
              <td style={{ padding: '6px 8px', fontSize: 11 }}>
                {asDisplayText(row.allergen, '—')}
              </td>
            </tr>
          ))}
        </tbody>
      </table>
    </NutritionLabelScrollArea>
  );
}
