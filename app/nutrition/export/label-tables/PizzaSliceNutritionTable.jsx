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

const NUTRITION_COLUMNS = LABEL_COLS.filter(column => column.key !== 'weight');

export function PizzaSliceNutritionTable({ rows }) {
  const safeRows = asObjectArray(rows);
  if (!safeRows.length) {
    return (
      <NutritionLabelEmpty msg="피자 영양성분 데이터가 없어요. 베이스 영양성분(중량 포함)을 먼저 입력해주세요." />
    );
  }

  return (
    <NutritionLabelScrollArea>
      <div className="origin-result-title large">영양성분표 (피자) — 조각 기준</div>
      <div style={{ fontSize: 11, color: '#888', margin: '0 0 6px' }}>
        ※ 한판 총중량 ÷ 조각수로 1조각 산출. 1조각이 100kcal 이상이면 1조각, 미만이면 2조각, 2조각도
        100kcal 이하면 3조각을 1회 제공량으로 표기. 중량 미입력 시 &apos;—&apos;.
      </div>
      <table className="origin-result-table" style={FIXED_TABLE_STYLE}>
        <colgroup>
          <col style={{ width: 150 }} />
          <col style={{ width: 84 }} />
          <col style={{ width: 36 }} />
          <col style={{ width: 52 }} />
          <col style={{ width: 64 }} />
          <col style={{ width: 64 }} />
          {NUTRITION_COLUMNS.map(column => (
            <col key={column.key} style={{ width: 70 }} />
          ))}
          <col style={{ width: 200 }} />
        </colgroup>
        <thead>
          <tr>
            <th style={HEADER_STYLE}>메뉴명</th>
            <th style={HEADER_STYLE}>크러스트</th>
            <th style={HEADER_STYLE}>L/R</th>
            <th style={HEADER_STYLE}>조각수</th>
            <th style={HEADER_STYLE}>1회제공</th>
            <th style={HEADER_STYLE}>
              중량
              <br />
              <span style={{ fontWeight: 400, fontSize: 9 }}>(g)</span>
            </th>
            {NUTRITION_COLUMNS.map(column => (
              <NutritionLabelColumnHeader key={column.key} column={column} />
            ))}
            <th style={HEADER_STYLE}>함유알레르기</th>
          </tr>
        </thead>
        <tbody>
          {safeRows.map(({ menuName, rows: crustRows }, groupIndex) => (
            <PizzaSliceMenuRows
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

function PizzaSliceMenuRows({ menuName, crustRows, groupIndex }) {
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
      <td style={{ ...COL_STYLE, textAlign: 'center' }}>
        <NutritionValueText value={row.slice} />
      </td>
      <td style={{ ...COL_STYLE, textAlign: 'center', fontWeight: 600 }}>
        <NutritionValueText value={row.servingLabel} />
      </td>
      <td style={COL_STYLE}>
        <NutritionValueText value={row.weight} />
      </td>
      {NUTRITION_COLUMNS.map(column => (
        <td key={column.key} style={COL_STYLE}>
          <NutritionValueText value={row[column.key]} />
        </td>
      ))}
      <td style={{ padding: '5px 8px', fontSize: 11 }}>{asDisplayText(row.allergen, '—')}</td>
    </tr>
  ));
}
