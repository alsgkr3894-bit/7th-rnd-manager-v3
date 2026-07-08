import { asDisplayText, asObjectArray } from '@/lib/ui/prop-guards';
import { displayNutritionMenuName } from '@/lib/nutrition/label/poster';
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

const PIZZA_SLICE_COLS = [
  { key: 'weight', label: '1회중량', unit: 'g' },
  { key: 'servingLabel', label: '1회조각수', unit: '' },
  { key: 'totalWeight', label: '총조각중량', unit: 'g' },
  { key: 'kcal', label: '열량', unit: 'kcal/1회분' },
  { key: 'sugar', label: '당류', unit: 'g/1회분' },
  { key: 'protein', label: '단백질', unit: 'g/1회분' },
  { key: 'fat', label: '포화지방', unit: 'g/1회분' },
  { key: 'sodium', label: '나트륨', unit: 'mg/1회분' },
];

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
          {PIZZA_SLICE_COLS.map(column => (
            <col key={column.key} style={{ width: 70 }} />
          ))}
          <col style={{ width: 200 }} />
        </colgroup>
        <thead>
          <tr>
            <th style={HEADER_STYLE}>메뉴명</th>
            <th style={HEADER_STYLE}>크러스트</th>
            <th style={HEADER_STYLE}>L/R</th>
            {PIZZA_SLICE_COLS.map(column => (
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
  const displayMenuName = displayNutritionMenuName(menuName, `메뉴 ${groupIndex + 1}`);

  return safeCrustRows.map((row, index) => (
    <tr
      key={`${displayMenuName}-${asDisplayText(row.crustLabel)}-${asDisplayText(row.side)}-${index}`}
      title={sliceTraceTitle(row)}
    >
      {index === 0 && <GroupedMenuNameCell name={displayMenuName} rowSpan={safeCrustRows.length} />}
      <td style={{ padding: '5px 8px', fontSize: 12 }}>{asDisplayText(row.crustLabel, '—')}</td>
      <td style={{ padding: '5px 6px', fontSize: 11, textAlign: 'center', color: '#666' }}>
        {asDisplayText(row.side, '—')}
      </td>
      {PIZZA_SLICE_COLS.map(column => (
        <td key={column.key} style={COL_STYLE}>
          <NutritionValueText value={row[column.key]} />
        </td>
      ))}
      <td style={{ padding: '5px 8px', fontSize: 11 }}>{asDisplayText(row.allergen, '—')}</td>
    </tr>
  ));
}

function sliceTraceTitle(row) {
  const trace = row?.servingTrace;
  if (!trace || trace.status !== 'ok')
    return '중량 또는 열량 미입력으로 조각 기준을 계산할 수 없습니다.';
  return [
    `한판 총중량 ${trace.totalWeight}g`,
    `${trace.sliceCount}조각`,
    `1조각 약 ${trace.perSliceWeight}g`,
    `1조각 약 ${Number(trace.perSliceKcal || 0).toFixed(1)}kcal`,
    `1회 제공량 ${trace.servingSlices}조각`,
  ].join(' · ');
}
