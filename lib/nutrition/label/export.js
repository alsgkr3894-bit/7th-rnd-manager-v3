/**
 * lib/nutrition/label/export.js — 영양성분표 엑셀 출력
 */
import { loadXlsx } from '@/lib/excel';
import { makeFileNameWithBrand } from '@/lib/download';
import { asObjectArray } from '@/lib/ui/prop-guards';
import {
  buildPosterPizzaRows,
  displayNutritionMenuName,
  pairAllergen,
  pairValue,
} from './poster';

const PIZZA_150_GROUPS = [
  { label: '1회중량(g)', key: 'weight' },
  { label: '열량(kcal)', key: 'kcal' },
  { label: '당류(g)', key: 'sugar' },
  { label: '단백질(g)', key: 'protein' },
  { label: '포화지방(g)', key: 'fat' },
  { label: '나트륨(mg)', key: 'sodium' },
];

const PIZZA_SLICE_GROUPS = [
  { label: '1회 중량(g)', key: 'weight' },
  { label: '1회 조각수', key: 'servingLabel' },
  { label: '총 조각중량(g)', key: 'totalWeight' },
  { label: '열량(kcal/1회분)', key: 'kcal' },
  { label: '당류(g/1회분)', key: 'sugar' },
  { label: '단백질(g/1회분)', key: 'protein' },
  { label: '포화지방(g/1회분)', key: 'fat' },
  { label: '나트륨(mg/1회분)', key: 'sodium' },
];

const SIMPLE_COLS = [
  { label: '1회 중량(g)', key: 'weight' },
  { label: '열량(kcal/1회분)', key: 'kcal' },
  { label: '당류(g/1회분)', key: 'sugar' },
  { label: '단백질(g/1회분)', key: 'protein' },
  { label: '포화지방(g/1회분)', key: 'fat' },
  { label: '나트륨(mg/1회분)', key: 'sodium' },
];

const BEVERAGE_COLS = [{ label: '총량(ml)', key: 'weight' }, ...SIMPLE_COLS.slice(1)];
const cell = value => value ?? '';

export async function exportNutritionLabelToExcel({
  pizzaSheet,
  pizzaSliceSheet = [],
  toppingSheet,
  sideSheet,
  setHalfSheet,
  beverageSheet,
} = {}) {
  const XLSX = await loadXlsx();
  const wb = XLSX.utils.book_new();

  const pizza150 = buildPizzaPairSheetRows(pizzaSheet, PIZZA_150_GROUPS);
  appendSheet(wb, XLSX, pizza150.rows, '피자', pizzaWidths(PIZZA_150_GROUPS), pizza150.merges);

  const pizzaSlice = buildPizzaPairSheetRows(pizzaSliceSheet, PIZZA_SLICE_GROUPS);
  appendSheet(
    wb,
    XLSX,
    pizzaSlice.rows,
    '피자(조각)',
    pizzaWidths(PIZZA_SLICE_GROUPS),
    pizzaSlice.merges
  );

  appendSheet(
    wb,
    XLSX,
    buildSimpleSheetRows(sideSheet, SIMPLE_COLS),
    '사이드·파스타',
    simpleWidths(SIMPLE_COLS)
  );

  appendSheet(
    wb,
    XLSX,
    buildSimpleSheetRows(toppingSheet, SIMPLE_COLS),
    '추가토핑',
    simpleWidths(SIMPLE_COLS)
  );

  appendSheet(
    wb,
    XLSX,
    buildSetHalfSheetRows(setHalfSheet),
    '세트박스·하프앤하프',
    [26, 8, 10, 14, 14, 40]
  );

  appendSheet(
    wb,
    XLSX,
    buildSimpleSheetRows(beverageSheet, BEVERAGE_COLS),
    '음료',
    simpleWidths(BEVERAGE_COLS)
  );

  XLSX.writeFile(wb, makeFileNameWithBrand('제품 영양성분표', 'xlsx'));
}

function buildPizzaPairSheetRows(sheet, groups) {
  const rows = [
    [
      'Pizza',
      '크러스트',
      ...groups.flatMap(group => [group.label, '']),
      '함유된 알레르기 유발물질',
    ],
    ['', '', ...groups.flatMap(() => ['L', 'R']), ''],
  ];
  const lastCol = rows[0].length - 1;
  const merges = [
    { s: { r: 0, c: 0 }, e: { r: 1, c: 0 } },
    { s: { r: 0, c: 1 }, e: { r: 1, c: 1 } },
    { s: { r: 0, c: lastCol }, e: { r: 1, c: lastCol } },
    ...groups.map((_, index) => ({
      s: { r: 0, c: 2 + index * 2 },
      e: { r: 0, c: 3 + index * 2 },
    })),
  ];

  buildPosterPizzaRows(sheet).forEach(row => {
    const rowIndex = rows.length;
    rows.push([
      row.firstOfMenu ? cell(row.menuName) : '',
      cell(row.crustLabel),
      ...groups.flatMap(group => [
        cell(pairValue(row, group.key, 'L')),
        cell(pairValue(row, group.key, 'R')),
      ]),
      cell(pairAllergen(row)),
    ]);

    if (row.firstOfMenu && row.rowSpan > 1) {
      merges.push({ s: { r: rowIndex, c: 0 }, e: { r: rowIndex + row.rowSpan - 1, c: 0 } });
    }
  });

  return { rows, merges };
}

function buildSimpleSheetRows(sheet, cols) {
  const rows = [['메뉴명', ...cols.map(col => col.label), '함유된 알레르기 유발물질']];
  asObjectArray(sheet).forEach(row => {
    rows.push([
      cell(displayNutritionMenuName(row?.menuName)),
      ...cols.map(col => cell(row?.[col.key])),
      cell(row?.allergen),
    ]);
  });
  return rows;
}

function buildSetHalfSheetRows(sheet) {
  const rows = [
    ['메뉴명', '사이즈', '1회 중량(g)', '최소 열량(kcal)', '최대 열량(kcal)', '함유된 알레르기 유발물질'],
  ];
  asObjectArray(sheet).forEach(row => {
    rows.push([
      cell(displayNutritionMenuName(row?.menuName)),
      cell(row?.side),
      cell(row?.weight),
      cell(row?.minKcal),
      cell(row?.maxKcal),
      cell(row?.allergen),
    ]);
  });
  return rows;
}

function pizzaWidths(groups) {
  return [22, 14, ...groups.flatMap(() => [8, 8]), 42];
}

function simpleWidths(cols) {
  return [24, ...cols.map(() => 10), 42];
}

function appendSheet(wb, XLSX, rows, name, colWidths, merges = []) {
  const ws = XLSX.utils.aoa_to_sheet(rows);
  ws['!cols'] = colWidths.map(wch => ({ wch }));
  if (merges.length) ws['!merges'] = merges;
  XLSX.utils.book_append_sheet(wb, ws, name);
}
