import { asDisplayText, asObjectArray } from '@/lib/ui/prop-guards';
import { displayNutritionMenuName } from '@/lib/nutrition/label/poster';
import {
  COL_STYLE,
  HEADER_STYLE,
  NutritionLabelEmpty,
  NutritionLabelScrollArea,
  NutritionValueText,
  TABLE_STYLE,
} from './NutritionLabelTablePrimitives';

export function SetHalfNutritionTable({ rows }) {
  const safeRows = asObjectArray(rows);
  if (!safeRows.length) return <NutritionLabelEmpty msg="세트/하프앤하프 데이터가 없어요." />;

  return (
    <NutritionLabelScrollArea>
      <div className="origin-result-title large">
        영양성분표 (세트박스·하프앤하프) — 입력 총중량 기준
      </div>
      <table className="origin-result-table" style={TABLE_STYLE}>
        <thead>
          <tr>
            <th style={{ ...HEADER_STYLE, textAlign: 'left', width: 200 }}>메뉴명</th>
            <th style={HEADER_STYLE}>사이즈</th>
            <th style={HEADER_STYLE}>1회중량(g)</th>
            <th style={HEADER_STYLE}>최소열량(kcal)</th>
            <th style={HEADER_STYLE}>최대열량(kcal)</th>
            <th style={{ ...HEADER_STYLE, textAlign: 'left' }}>함유알레르기</th>
          </tr>
        </thead>
        <tbody>
          {safeRows.map((row, index) => (
            <tr key={row.menuCode || row.menuName || index}>
              <td style={{ padding: '6px 8px', fontWeight: 600, fontSize: 13 }}>
                {displayNutritionMenuName(row.menuName, `메뉴 ${index + 1}`)}
              </td>
              <td style={COL_STYLE}>
                {asDisplayText(row.side, '—')}
              </td>
              <td style={COL_STYLE}>
                <NutritionValueText value={row.weight} />
              </td>
              <td style={COL_STYLE}>
                <NutritionValueText value={row.minKcal} />
              </td>
              <td style={COL_STYLE}>
                <NutritionValueText value={row.maxKcal} />
              </td>
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
