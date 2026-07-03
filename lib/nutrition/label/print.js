/**
 * lib/nutrition/label/print.js — 영양성분표 PDF(인쇄) 출력
 */

import { asObjectArray } from '@/lib/ui/prop-guards';
import { withDownloadDateSuffix } from '@/lib/download';
import { buildAutoPrintScript, openPrintWindow } from '@/lib/print/window-print';
import {
  buildPosterPizzaRows,
  compactRows,
  displayNutritionMenuName,
  formatNutritionPosterMonth,
  nutritionValue,
  pairAllergen,
  pair150Value,
  pairValue,
  splitSetHalfRows,
  splitSideAndPastaRows,
} from '@/lib/nutrition/label/poster';

const esc = s =>
  String(s ?? '')
    .replace(/&/g, '&amp;')
    .replace(/</g, '&lt;')
    .replace(/>/g, '&gt;');
const val = v => (v === '' || v == null ? '<span class="dash">—</span>' : esc(v));

const PIZZA_150_GROUPS = [
  { label: '1회 중량(g)', key: 'weight' },
  { label: '열량(kcal/150g)', key: 'kcal' },
  { label: '당류(g/150g)', key: 'sugar' },
  { label: '단백질(g/150g)', key: 'protein' },
  { label: '포화지방(g/150g)', key: 'fat' },
  { label: '나트륨(mg/150g)', key: 'sodium' },
];

const PIZZA_SLICE_GROUPS = [
  { label: '1회 조각수', key: 'servingLabel' },
  { label: '총 조각중량(g)', key: 'totalWeight' },
  { label: '조각 중량(g)', key: 'weight' },
  { label: '열량(kcal/조각)', key: 'kcal' },
  { label: '당류(g/조각)', key: 'sugar' },
  { label: '단백질(g/조각)', key: 'protein' },
  { label: '포화지방(g/조각)', key: 'fat' },
  { label: '나트륨(mg/조각)', key: 'sodium' },
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

function pizzaHtml(rows) {
  const body = asObjectArray(rows)
    .map(({ menuName, rows: rawRows }) => {
      const crustRows = asObjectArray(rawRows);
      const rowCount = crustRows.length;
      return crustRows
        .map(
          (r, i) => `
      <tr>
        ${i === 0 ? `<td rowspan="${rowCount}" class="menu-name">${esc(menuName)}</td>` : ''}
        <td>${esc(r.crustLabel)}</td>
        <td>${esc(r.side)}</td>
        <td class="num">${val(r.weight)}</td>
        <td class="num">${val(r.kcal)}</td>
        <td class="num">${val(r.sugar)}</td>
        <td class="num">${val(r.protein)}</td>
        <td class="num">${val(r.fat)}</td>
        <td class="num">${val(r.sodium)}</td>
        <td class="allergen">${val(r.allergen)}</td>
      </tr>`
        )
        .join('');
    })
    .join('');
  return `
    <div class="sheet-title">영양성분표 — 피자</div>
    <table>
      <thead><tr>
        <th>메뉴명</th><th>크러스트</th><th>L/R</th>
        <th>1회중량(g)</th><th>열량(kcal)</th><th>당류(g)</th>
        <th>단백질(g)</th><th>포화지방(g)</th><th>나트륨(mg)</th>
        <th>함유알레르기</th>
      </tr></thead>
      <tbody>${body}</tbody>
    </table>`;
}

function pizzaSliceHtml(rows) {
  const body = asObjectArray(rows)
    .map(({ menuName, rows: rawRows }) => {
      const crustRows = asObjectArray(rawRows);
      const rowCount = crustRows.length;
      return crustRows
        .map(
          (r, i) => `
      <tr>
        ${i === 0 ? `<td rowspan="${rowCount}" class="menu-name">${esc(menuName)}</td>` : ''}
        <td>${esc(r.crustLabel)}</td>
        <td>${esc(r.side)}</td>
        <td class="num">${val(r.slice)}</td>
        <td class="num">${val(r.servingLabel)}</td>
        <td class="num">${val(r.weight)}</td>
        <td class="num">${val(r.kcal)}</td>
        <td class="num">${val(r.sugar)}</td>
        <td class="num">${val(r.protein)}</td>
        <td class="num">${val(r.fat)}</td>
        <td class="num">${val(r.sodium)}</td>
        <td class="allergen">${val(r.allergen)}</td>
      </tr>`
        )
        .join('');
    })
    .join('');
  return `
    <div class="sheet-title">영양성분표 — 피자 (조각 기준)</div>
    <table>
      <thead><tr>
        <th>메뉴명</th><th>크러스트</th><th>L/R</th>
        <th>조각수</th><th>1회제공</th><th>중량(g)</th>
        <th>열량(kcal)</th><th>당류(g)</th><th>단백질(g)</th><th>포화지방(g)</th><th>나트륨(mg)</th>
        <th>함유알레르기</th>
      </tr></thead>
      <tbody>${body}</tbody>
    </table>`;
}

function simpleHtml(title, rows, weightHeader = '1회중량(g)') {
  const body = asObjectArray(rows)
    .map(
      r => `
    <tr>
      <td class="menu-name">${esc(r.menuName)}</td>
      <td class="num">${val(r.weight)}</td>
      <td class="num">${val(r.kcal)}</td>
      <td class="num">${val(r.sugar)}</td>
      <td class="num">${val(r.protein)}</td>
      <td class="num">${val(r.fat)}</td>
      <td class="num">${val(r.sodium)}</td>
      <td class="allergen">${val(r.allergen)}</td>
    </tr>`
    )
    .join('');
  return `
    <div class="sheet-title">${esc(title)}</div>
    <table>
      <thead><tr>
        <th>메뉴명</th>
        <th>${esc(weightHeader)}</th><th>열량(kcal)</th><th>당류(g)</th>
        <th>단백질(g)</th><th>포화지방(g)</th><th>나트륨(mg)</th>
        <th>함유알레르기</th>
      </tr></thead>
      <tbody>${body}</tbody>
    </table>`;
}

function setHalfHtml(rows) {
  const body = asObjectArray(rows)
    .map(
      r => `
    <tr>
      <td class="menu-name">${esc(r.menuName)}</td>
      <td class="num">${val(r.weight)}</td>
      <td class="num">${val(r.minKcal)}</td>
      <td class="num">${val(r.maxKcal)}</td>
      <td class="allergen">${val(r.allergen)}</td>
    </tr>`
    )
    .join('');
  return `
    <div class="sheet-title">영양성분표 — 세트박스·하프앤하프</div>
    <table>
      <thead><tr>
        <th>메뉴명</th><th>1회중량(g)</th><th>최소열량(kcal)</th><th>최대열량(kcal)</th><th>함유알레르기</th>
      </tr></thead>
      <tbody>${body}</tbody>
    </table>`;
}

function posterValue(value) {
  return esc(nutritionValue(value));
}

function pizzaPosterHtml(sliceRows, rows150) {
  const posterRows = buildPosterPizzaRows(sliceRows, rows150);
  const groupHeader = [...PIZZA_150_GROUPS, ...PIZZA_SLICE_GROUPS].map(
    group => `<th colspan="2">${esc(group.label)}</th>`
  ).join('');
  const sideHeader = [...PIZZA_150_GROUPS, ...PIZZA_SLICE_GROUPS].map(
    group => `<th data-pair="${esc(group.key)}">L</th><th data-pair="${esc(group.key)}">R</th>`
  ).join('');
  const body = posterRows.length
    ? posterRows
        .map(
          row => `
    <tr>
      ${
        row.firstOfMenu
          ? `<td rowspan="${row.rowSpan}" class="poster-menu-name">${posterValue(row.menuName)}</td>`
          : ''
      }
      <td class="poster-crust-name">${posterValue(row.crustLabel)}</td>
      ${PIZZA_150_GROUPS.map(
        group => `
          <td class="poster-num">${posterValue(pair150Value(row, group.key, 'L'))}</td>
          <td class="poster-num">${posterValue(pair150Value(row, group.key, 'R'))}</td>`
      ).join('')}
      ${PIZZA_SLICE_GROUPS.map(
        group => `
          <td class="poster-num">${posterValue(pairValue(row, group.key, 'L'))}</td>
          <td class="poster-num">${posterValue(pairValue(row, group.key, 'R'))}</td>`
      ).join('')}
      <td class="poster-allergen">${posterValue(pairAllergen(row))}</td>
    </tr>`
        )
        .join('')
    : '<tr><td colspan="31" class="poster-empty-cell">피자 영양성분 데이터가 없습니다</td></tr>';

  return `
    <section class="nutrition-poster-main-section">
      <table class="nutrition-poster-table nutrition-poster-pizza-table">
        <thead>
          <tr>
            <th rowspan="3" class="poster-pizza-label">Pizza</th>
            <th rowspan="3">크러스트</th>
            <th colspan="${PIZZA_150_GROUPS.length * 2}">150g 기준</th>
            <th colspan="${PIZZA_SLICE_GROUPS.length * 2}">조각 기준</th>
            <th rowspan="3">함유된 알레르기 유발물질</th>
          </tr>
          <tr>
            ${groupHeader}
          </tr>
          <tr>${sideHeader}</tr>
        </thead>
        <tbody>${body}</tbody>
      </table>
    </section>`;
}

function sectionTitle(title) {
  return `<div class="nutrition-poster-section-title">${esc(title)}</div>`;
}

function simplePosterHtml(title, rows, cols = SIMPLE_COLS, options = {}) {
  const safeRows = compactRows(rows, options.limit);
  const body = safeRows.length
    ? safeRows
        .map(
          row => `
    <tr>
      <td class="poster-menu-name small">${posterValue(displayNutritionMenuName(row.menuName))}</td>
      ${cols
        .map(col => `<td class="poster-num">${posterValue(row[col.key])}</td>`)
        .join('')}
      <td class="poster-allergen">${posterValue(row.allergen)}</td>
    </tr>`
        )
        .join('')
    : `<tr><td colspan="${cols.length + 2}" class="poster-empty-cell">데이터 없음</td></tr>`;

  return `
    <section class="nutrition-poster-section ${esc(options.className || '')}">
      ${sectionTitle(title)}
      <table class="nutrition-poster-table nutrition-poster-simple-table">
        <thead>
          <tr>
            <th>${esc(options.nameHeader || '메뉴명')}</th>
            ${cols.map(col => `<th>${esc(col.label)}</th>`).join('')}
            <th>함유된 알레르기 유발물질</th>
          </tr>
        </thead>
        <tbody>${body}</tbody>
      </table>
    </section>`;
}

function setHalfPosterHtml(title, rows) {
  const safeRows = asObjectArray(rows);
  const body = safeRows.length
    ? safeRows
        .map(
          row => `
    <tr>
      <td class="poster-menu-name small">${posterValue(displayNutritionMenuName(row.menuName))}</td>
      <td class="poster-num">${posterValue(row.side)}</td>
      <td class="poster-num">${posterValue(row.minKcal)}</td>
      <td class="poster-num">${posterValue(row.maxKcal)}</td>
      <td class="poster-num">${posterValue(row.weight)}</td>
    </tr>`
        )
        .join('')
    : '<tr><td colspan="5" class="poster-empty-cell">데이터 없음</td></tr>';
  return `
    <section class="nutrition-poster-section">
      ${sectionTitle(title)}
      <table class="nutrition-poster-table nutrition-poster-simple-table">
        <thead>
          <tr><th>메뉴명</th><th>사이즈</th><th>최소 열량(kcal)</th><th>최대 열량(kcal)</th><th>1회 중량(g)</th></tr>
        </thead>
        <tbody>${body}</tbody>
      </table>
    </section>`;
}

function originPosterHtml(rows) {
  const safeRows = compactRows(rows, 12);
  const body = safeRows.length
    ? safeRows
        .map(
          row => `
      <p><strong>${posterValue(row.names)}</strong><span>(${posterValue(row.breakdown)})</span></p>`
        )
        .join('')
    : '<p>식자재 관리의 원산지 등록 후 자동 표시됩니다.</p>';
  return `
    <section class="nutrition-poster-section nutrition-poster-origin-box">
      ${sectionTitle('원산지')}
      <div class="nutrition-poster-origin-lines">${body}</div>
    </section>`;
}

function nutritionPosterHtml({
  pizzaSheet = [],
  pizzaSliceSheet = [],
  toppingSheet = [],
  sideSheet = [],
  setHalfSheet = [],
  beverageSheet = [],
  originStatementSheet = [],
} = {}) {
  const { sideRows, pastaRows } = splitSideAndPastaRows(sideSheet);
  const { setRows, halfRows } = splitSetHalfRows(setHalfSheet);
  return `
  <article class="nutrition-poster-sheet">
    ${pizzaPosterHtml(pizzaSliceSheet, pizzaSheet)}
    ${simplePosterHtml('추가 토핑', toppingSheet, SIMPLE_COLS, { className: 'poster-topping' })}

    <div class="nutrition-poster-bottom-grid">
      <div class="nutrition-poster-bottom-left">
        ${simplePosterHtml('Side', sideRows, SIMPLE_COLS, { limit: 10 })}
        ${simplePosterHtml('Pasta', pastaRows, SIMPLE_COLS, { limit: 4 })}
      </div>
      <div class="nutrition-poster-bottom-center">
        ${setHalfPosterHtml('Set Box', setRows)}
        ${setHalfPosterHtml('하프앤하프', halfRows)}
        ${originPosterHtml(originStatementSheet)}
      </div>
      <div class="nutrition-poster-bottom-right">
        ${simplePosterHtml('Beverage', beverageSheet, BEVERAGE_COLS)}
        <div class="nutrition-poster-notice">
          <p>1. 위 제품은 재료의 수급 상황에 따라 구성 성분이 다소 차이가 날 수 있습니다.</p>
          <p>2. 위 영양 성분 표는 제품의 중량으로, 실제 제공 시와 차이가 날 수 있습니다.</p>
          <p>3. 위 영양 성분 수치는 설정 방법에 따라 차이가 날 수 있습니다.</p>
          <p>4. 위 원산지 내용은 현지 사정에 따라 다소 변경될 수 있습니다.</p>
        </div>
      </div>
    </div>

    <footer class="nutrition-poster-footer">${esc(formatNutritionPosterMonth())}</footer>
  </article>`;
}

export function buildNutritionLabelPrintHtml({
  pizzaSheet = [],
  pizzaSliceSheet = [],
  toppingSheet = [],
  sideSheet = [],
  setHalfSheet = [],
  beverageSheet = [],
  originStatementSheet = [],
} = {}) {
  const title = withDownloadDateSuffix('제품 영양성분표');
  return `<!doctype html>
<html lang="ko"><head><meta charset="utf-8"><title>${esc(title)}</title>
<style>
* { box-sizing: border-box; margin: 0; padding: 0; }
body { font-family: 'Pretendard Variable', Pretendard, -apple-system, sans-serif; background:#fff; color:#111; }
.nutrition-poster-sheet {
  --poster-line: #111;
  width: 230mm;
  min-height: auto;
  padding: 6mm 5mm;
  background:#fff;
  color:#111;
}
.nutrition-poster-header { display:none; }
.nutrition-poster-title-en { font-size:23pt; font-weight:950; font-style:italic; line-height:1; letter-spacing:0; }
.nutrition-poster-title-ko { font-size:16pt; font-weight:900; line-height:1; letter-spacing:0; }
.nutrition-poster-main-section, .nutrition-poster-section { margin-bottom:3.4mm; }
.nutrition-poster-section-title {
  min-height:14pt; display:flex; align-items:center; justify-content:center;
  background:#fff; color:#111; border:1px solid var(--poster-line);
  border-bottom:0; font-size:9pt; font-weight:950; line-height:1;
}
.nutrition-poster-table { width:100%; border-collapse:collapse; table-layout:fixed; color:#111; }
.nutrition-poster-table th, .nutrition-poster-table td {
  border:1px solid var(--poster-line); vertical-align:middle; line-height:1.12;
  word-break:keep-all; overflow-wrap:anywhere;
}
.nutrition-poster-table th { background:#f3f4f6; color:#111; font-size:5.2pt; font-weight:950; text-align:center; padding:.8pt 1.4pt; }
.nutrition-poster-table td { font-size:5.2pt; font-weight:750; padding:.8pt 1.4pt; }
.nutrition-poster-pizza-table th, .nutrition-poster-pizza-table td { font-size:3.6pt; padding:.45pt .7pt; }
.nutrition-poster-pizza-table .poster-pizza-label { width:18mm; font-size:8pt; font-style:italic; text-align:center; }
.nutrition-poster-pizza-table th:nth-child(2), .nutrition-poster-pizza-table td.poster-crust-name { width:9mm; }
.nutrition-poster-pizza-table .poster-menu-name { font-size:6.5pt !important; }
.nutrition-poster-pizza-table .poster-allergen { font-size:3.4pt !important; }
.poster-menu-name { font-size:8pt !important; font-weight:950 !important; line-height:1.05 !important; }
.poster-menu-name.small { font-size:5.3pt !important; font-weight:850 !important; }
.poster-crust-name { text-align:right; font-size:4.7pt !important; font-weight:850 !important; }
.poster-num { text-align:center; font-variant-numeric:tabular-nums; }
.poster-allergen { font-size:4.3pt !important; font-weight:750 !important; line-height:1.08 !important; }
.poster-empty-cell { padding:5pt !important; text-align:center; color:#777; }
.nutrition-poster-bottom-grid { display:grid; grid-template-columns:1fr .95fr .84fr; gap:3mm; align-items:start; }
.nutrition-poster-bottom-left, .nutrition-poster-bottom-center, .nutrition-poster-bottom-right { display:flex; flex-direction:column; gap:2.6mm; }
.nutrition-poster-origin-box .nutrition-poster-section-title { justify-content:flex-start; padding-left:4mm; }
.nutrition-poster-origin-lines { min-height:43mm; border:1px solid var(--poster-line); padding:3mm; font-size:5.2pt; font-weight:700; line-height:1.42; }
.nutrition-poster-origin-lines p { margin:0 0 1mm; }
.nutrition-poster-origin-lines strong { font-weight:950; }
.nutrition-poster-origin-lines span { margin-left:.5mm; }
.nutrition-poster-notice { margin-top:2mm; font-size:5.2pt; font-weight:800; line-height:1.55; }
.nutrition-poster-footer { margin-top:4mm; text-align:right; font-size:7pt; font-weight:900; }
@media print {
  @page { size: 230mm 319mm; margin: 0; }
  body { -webkit-print-color-adjust: exact; print-color-adjust: exact; }
}
</style></head><body>
  ${nutritionPosterHtml({
    pizzaSheet,
    pizzaSliceSheet,
    toppingSheet,
    sideSheet,
    setHalfSheet,
    beverageSheet,
    originStatementSheet,
  })}
  ${buildAutoPrintScript()}
</body></html>`;
}

export function printNutritionLabelAll(sheets) {
  openPrintWindow(buildNutritionLabelPrintHtml(sheets), { width: 1100, height: 1100 });
}
