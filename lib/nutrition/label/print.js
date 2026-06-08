/**
 * lib/nutrition/label/print.js — 영양성분표 PDF(인쇄) 출력
 */

const esc = s => String(s ?? '').replace(/&/g, '&amp;').replace(/</g, '&lt;').replace(/>/g, '&gt;');
const val = v => (v === '' || v == null) ? '<span class="dash">—</span>' : esc(v);

function pizzaHtml(rows) {
  const body = rows.map(({ menuName, rows: crustRows }) => {
    const rowCount = crustRows.length;
    return crustRows.map((r, i) => `
      <tr>
        ${i === 0 ? `<td rowspan="${rowCount}" class="menu-name">${esc(menuName)}</td>` : ''}
        <td>${esc(r.crustLabel)}</td>
        <td>${esc(r.side)}</td>
        <td class="num">${val(r.weight)}</td>
        <td class="num">${val(r.kcal)}</td>
        <td class="num">${val(r.sugar)}</td>
        <td class="num">${val(r.protein)}</td>
        <td class="num">${val(r.satFat)}</td>
        <td class="num">${val(r.sodium)}</td>
        <td class="allergen">${val(r.allergen)}</td>
      </tr>`).join('');
  }).join('');
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
  const body = rows.map(({ menuName, rows: crustRows }) => {
    const rowCount = crustRows.length;
    return crustRows.map((r, i) => `
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
        <td class="num">${val(r.satFat)}</td>
        <td class="num">${val(r.sodium)}</td>
        <td class="allergen">${val(r.allergen)}</td>
      </tr>`).join('');
  }).join('');
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
  const body = rows.map(r => `
    <tr>
      <td class="menu-name">${esc(r.menuName)}</td>
      <td class="num">${val(r.weight)}</td>
      <td class="num">${val(r.kcal)}</td>
      <td class="num">${val(r.sugar)}</td>
      <td class="num">${val(r.protein)}</td>
      <td class="num">${val(r.satFat)}</td>
      <td class="num">${val(r.sodium)}</td>
      <td class="allergen">${val(r.allergen)}</td>
    </tr>`).join('');
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
  const body = rows.map(r => `
    <tr>
      <td class="menu-name">${esc(r.menuName)}</td>
      <td class="num">${val(r.weight)}</td>
      <td class="num">${val(r.minKcal)}</td>
      <td class="num">${val(r.maxKcal)}</td>
      <td class="allergen">${val(r.allergen)}</td>
    </tr>`).join('');
  return `
    <div class="sheet-title">영양성분표 — 세트박스·하프앤하프</div>
    <table>
      <thead><tr>
        <th>메뉴명</th><th>1회중량(g)</th><th>최소열량(kcal)</th><th>최대열량(kcal)</th><th>함유알레르기</th>
      </tr></thead>
      <tbody>${body}</tbody>
    </table>`;
}

export function printNutritionLabelAll({ pizzaSheet, pizzaSliceSheet = [], toppingSheet, sideSheet, setHalfSheet, beverageSheet }) {
  const win = window.open('', '_blank', 'width=1100,height=1100');
  if (!win) { alert('팝업이 차단되었습니다. 팝업 허용 후 다시 시도해주세요.'); return; }

  const html = `<!doctype html>
<html lang="ko"><head><meta charset="utf-8"><title>제품 영양성분표</title>
<style>
* { box-sizing: border-box; margin: 0; padding: 0; }
body { font-family: 'Pretendard Variable', Pretendard, -apple-system, sans-serif; color: #111; background: #fff; }
.page { padding: 14mm 12mm; page-break-after: always; }
.page:last-child { page-break-after: auto; }
.sheet-title { text-align: center; font-size: 20px; font-weight: 800; padding: 10px 0;
  border: 1px solid #333; border-bottom: none; background: #f9f9f9; }
table { width: 100%; border-collapse: collapse; table-layout: fixed; }
th, td { border: 1px solid #333; padding: 5px 6px; vertical-align: middle;
  word-break: keep-all; word-wrap: break-word; line-height: 1.4; font-size: 12px; }
th { background: #f0f0f0; font-weight: 700; text-align: center; font-size: 11px; }
td.menu-name { font-weight: 600; }
td.num { text-align: right; font-variant-numeric: tabular-nums; }
td.allergen { font-size: 11px; }
.dash { color: #aaa; }
@media print {
  @page { size: A4 landscape; margin: 12mm 8mm; }
  body { -webkit-print-color-adjust: exact; print-color-adjust: exact; }
}
</style></head><body>
  <div class="page">${pizzaHtml(pizzaSheet)}</div>
  <div class="page">${pizzaSliceHtml(pizzaSliceSheet)}</div>
  <div class="page">${simpleHtml('영양성분표 — 추가토핑', toppingSheet)}</div>
  <div class="page">${simpleHtml('영양성분표 — 사이드·파스타', sideSheet)}</div>
  <div class="page">${setHalfHtml(setHalfSheet)}</div>
  <div class="page">${simpleHtml('영양성분표 — 음료', beverageSheet, '용량(ml)')}</div>
  <script>window.onload = function() { window.focus(); window.print(); };<\/script>
</body></html>`;

  win.document.open();
  win.document.write(html);
  win.document.close();
}
