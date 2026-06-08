/**
 * lib/nutrition/label/export.js — 영양성분표 엑셀 출력 (5시트)
 */
import { loadXlsx } from '@/lib/excel';
import { LABEL_COLS } from './build';

const HEADERS = LABEL_COLS.map(c => `${c.label}(${c.unit})`);

export async function exportNutritionLabelToExcel({ pizzaSheet, toppingSheet, sideSheet, setHalfSheet, beverageSheet }) {
  const XLSX = await loadXlsx();
  const wb = XLSX.utils.book_new();

  // ── 시트1: 피자 ──────────────────────────────────────────────
  const ws1Rows = [['제품 영양성분표 — 피자'], ['메뉴명', '크러스트', '사이드', ...HEADERS, '함유알레르기']];
  pizzaSheet.forEach(({ menuName, rows }) => {
    rows.forEach(r => {
      ws1Rows.push([
        menuName, r.crustLabel, r.side,
        r.weight, r.kcal, r.sugar, r.protein, r.satFat, r.sodium,
        r.allergen,
      ]);
    });
  });
  appendSheet(wb, XLSX, ws1Rows, '피자', [22, 14, 6, 8, 8, 8, 8, 8, 8, 40]);

  // ── 시트2: 추가토핑 ──────────────────────────────────────────
  const ws2Rows = [['제품 영양성분표 — 추가토핑'], ['메뉴명', ...HEADERS, '함유알레르기']];
  toppingSheet.forEach(r => {
    ws2Rows.push([r.menuName, r.weight, r.kcal, r.sugar, r.protein, r.satFat, r.sodium, r.allergen]);
  });
  appendSheet(wb, XLSX, ws2Rows, '추가토핑', [24, 8, 8, 8, 8, 8, 8, 40]);

  // ── 시트3: 사이드·파스타 ──────────────────────────────────────
  const ws3Rows = [['제품 영양성분표 — 사이드·파스타'], ['메뉴명', ...HEADERS, '함유알레르기']];
  sideSheet.forEach(r => {
    ws3Rows.push([r.menuName, r.weight, r.kcal, r.sugar, r.protein, r.satFat, r.sodium, r.allergen]);
  });
  appendSheet(wb, XLSX, ws3Rows, '사이드·파스타', [24, 8, 8, 8, 8, 8, 8, 40]);

  // ── 시트4: 세트박스·하프앤하프 ────────────────────────────────
  const ws4Rows = [['제품 영양성분표 — 세트박스·하프앤하프'], ['메뉴명', '1회중량(g)', '최소열량(kcal)', '최대열량(kcal)', '함유알레르기']];
  setHalfSheet.forEach(r => {
    ws4Rows.push([r.menuName, r.weight, r.minKcal, r.maxKcal, r.allergen]);
  });
  appendSheet(wb, XLSX, ws4Rows, '세트박스·하프앤하프', [26, 10, 14, 14, 40]);

  // ── 시트5: 음료 ──────────────────────────────────────────────
  const ws5Rows = [['제품 영양성분표 — 음료'], ['메뉴명', ...HEADERS, '함유알레르기']];
  beverageSheet.forEach(r => {
    ws5Rows.push([r.menuName, r.weight, r.kcal, r.sugar, r.protein, r.satFat, r.sodium, r.allergen]);
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
