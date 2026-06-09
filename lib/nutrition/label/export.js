/**
 * lib/nutrition/label/export.js — 영양성분표 엑셀 출력
 */
import { loadXlsx } from '@/lib/excel';
import { LABEL_COLS } from './build';
import { asObjectArray } from '@/lib/ui/prop-guards';

const HEADERS = LABEL_COLS.map(c => `${c.label}(${c.unit})`);
// 음료는 1회중량(g) 대신 용량(ml) 표기
const BEVERAGE_HEADERS = HEADERS.map((h, i) => (i === 0 ? '용량(ml)' : h));
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

  // ── 시트1: 피자 (150g 기준) ──────────────────────────────────
  const ws1Rows = [
    ['제품 영양성분표 — 피자 (150g 기준)'],
    ['메뉴명', '크러스트', '사이드', ...HEADERS, '함유알레르기'],
  ];
  asObjectArray(pizzaSheet).forEach(({ menuName, rows }) => {
    asObjectArray(rows).forEach(r => {
      ws1Rows.push([
        cell(menuName),
        cell(r.crustLabel),
        cell(r.side),
        cell(r.weight),
        cell(r.kcal),
        cell(r.sugar),
        cell(r.protein),
        cell(r.satFat),
        cell(r.sodium),
        cell(r.allergen),
      ]);
    });
  });
  appendSheet(wb, XLSX, ws1Rows, '피자', [22, 14, 6, 8, 8, 8, 8, 8, 8, 40]);

  // ── 시트1b: 피자 (조각 기준) ─────────────────────────────────
  const wsSliceRows = [
    ['제품 영양성분표 — 피자 (조각 기준)'],
    [
      '메뉴명',
      '크러스트',
      '사이드',
      '조각수',
      '1회제공량',
      '중량(g)',
      '열량(kcal)',
      '당류(g)',
      '단백질(g)',
      '포화지방(g)',
      '나트륨(mg)',
      '함유알레르기',
    ],
  ];
  asObjectArray(pizzaSliceSheet).forEach(({ menuName, rows }) => {
    asObjectArray(rows).forEach(r => {
      wsSliceRows.push([
        cell(menuName),
        cell(r.crustLabel),
        cell(r.side),
        cell(r.slice),
        cell(r.servingLabel),
        cell(r.weight),
        cell(r.kcal),
        cell(r.sugar),
        cell(r.protein),
        cell(r.satFat),
        cell(r.sodium),
        cell(r.allergen),
      ]);
    });
  });
  appendSheet(wb, XLSX, wsSliceRows, '피자(조각)', [22, 14, 6, 7, 9, 8, 8, 8, 8, 8, 8, 40]);

  // ── 시트2: 추가토핑 ──────────────────────────────────────────
  const ws2Rows = [['제품 영양성분표 — 추가토핑'], ['메뉴명', ...HEADERS, '함유알레르기']];
  asObjectArray(toppingSheet).forEach(r => {
    ws2Rows.push([
      cell(r.menuName),
      cell(r.weight),
      cell(r.kcal),
      cell(r.sugar),
      cell(r.protein),
      cell(r.satFat),
      cell(r.sodium),
      cell(r.allergen),
    ]);
  });
  appendSheet(wb, XLSX, ws2Rows, '추가토핑', [24, 8, 8, 8, 8, 8, 8, 40]);

  // ── 시트3: 사이드·파스타 ──────────────────────────────────────
  const ws3Rows = [['제품 영양성분표 — 사이드·파스타'], ['메뉴명', ...HEADERS, '함유알레르기']];
  asObjectArray(sideSheet).forEach(r => {
    ws3Rows.push([
      cell(r.menuName),
      cell(r.weight),
      cell(r.kcal),
      cell(r.sugar),
      cell(r.protein),
      cell(r.satFat),
      cell(r.sodium),
      cell(r.allergen),
    ]);
  });
  appendSheet(wb, XLSX, ws3Rows, '사이드·파스타', [24, 8, 8, 8, 8, 8, 8, 40]);

  // ── 시트4: 세트박스·하프앤하프 ────────────────────────────────
  const ws4Rows = [
    ['제품 영양성분표 — 세트박스·하프앤하프'],
    ['메뉴명', '1회중량(g)', '최소열량(kcal)', '최대열량(kcal)', '함유알레르기'],
  ];
  asObjectArray(setHalfSheet).forEach(r => {
    ws4Rows.push([
      cell(r.menuName),
      cell(r.weight),
      cell(r.minKcal),
      cell(r.maxKcal),
      cell(r.allergen),
    ]);
  });
  appendSheet(wb, XLSX, ws4Rows, '세트박스·하프앤하프', [26, 10, 14, 14, 40]);

  // ── 시트5: 음료 ──────────────────────────────────────────────
  const ws5Rows = [['제품 영양성분표 — 음료'], ['메뉴명', ...BEVERAGE_HEADERS, '함유알레르기']];
  asObjectArray(beverageSheet).forEach(r => {
    ws5Rows.push([
      cell(r.menuName),
      cell(r.weight),
      cell(r.kcal),
      cell(r.sugar),
      cell(r.protein),
      cell(r.satFat),
      cell(r.sodium),
      cell(r.allergen),
    ]);
  });
  appendSheet(wb, XLSX, ws5Rows, '음료', [24, 8, 8, 8, 8, 8, 8, 40]);

  const date = new Date().toISOString().slice(0, 10).replace(/-/g, '');
  XLSX.writeFile(wb, `제품영양성분표_${date}.xlsx`);
}

function appendSheet(wb, XLSX, rows, name, colWidths) {
  const ws = XLSX.utils.aoa_to_sheet(rows);
  ws['!cols'] = colWidths.map(wch => ({ wch }));
  XLSX.utils.book_append_sheet(wb, ws, name);
}
