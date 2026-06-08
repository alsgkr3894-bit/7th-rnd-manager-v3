/**
 * lib/nutrition/origin/print.js — 원산지 표시판 통합 PDF(인쇄) 출력
 * 매장비치용 · 냉장고부착용 · 배달플랫폼용 3표를 페이지 구분해 1파일로.
 */

const NOTICE = '※ 재료 수급에 따라 원산지가 다소 변경 될 수 있습니다.';
const esc = s => String(s ?? '').replace(/&/g, '&amp;').replace(/</g, '&lt;').replace(/>/g, '&gt;');

function sheet1Html(rows) {
  const body = rows.map(r => `
    <tr>
      <td>${esc(r.displayName)}</td>
      <td>${esc(r.originCountry)}</td>
      <td>${esc([...r.menus].join(', '))}</td>
    </tr>`).join('');
  return `
    <div class="sheet-title large">원산지 표시판 (매장비치용)</div>
    <table class="sign-table">
      <colgroup><col style="width:30%"><col style="width:35%"><col style="width:35%"></colgroup>
      <thead><tr><th>표시품목</th><th>원산지</th><th>음식명</th></tr></thead>
      <tbody>${body}</tbody>
    </table>
    <div class="notice large">${esc(NOTICE)}</div>`;
}

function sheet2Html(rows) {
  const body = rows.map(r => `
    <tr>
      <td>${esc(r.ingredientName)}</td>
      <td class="multiline">${esc(r.items.map(it => it.displayName).join('\n'))}</td>
      <td class="multiline">${esc(r.items.map(it => it.country).join('\n'))}</td>
    </tr>`).join('');
  return `
    <div class="sheet-title large">원산지 표시판 (냉장고부착용)</div>
    <table class="fridge-table">
      <colgroup><col style="width:30%"><col style="width:30%"><col style="width:40%"></colgroup>
      <thead><tr><th>재료명</th><th>표시품목</th><th>원산지</th></tr></thead>
      <tbody>${body}</tbody>
    </table>
    <div class="notice large">${esc(NOTICE)}</div>`;
}

function sheet3Html(rows) {
  const body = rows.map(r => `
    <tr>
      <td style="font-weight:700">${esc(r.menuName)}</td>
      <td>${esc(r.parts.join(', '))}</td>
    </tr>`).join('');
  return `
    <div class="sheet-title">배달플랫폼 원산지 표기</div>
    <table class="delivery-table">
      <colgroup><col style="width:28%"><col style="width:72%"></colgroup>
      <thead><tr><th>메뉴명</th><th>재료명(원산지)</th></tr></thead>
      <tbody>${body}</tbody>
    </table>
    <div class="notice">${esc(NOTICE)}</div>`;
}

function sheet4Html(rows) {
  const lines = rows.map(r =>
    `<p class="stmt-line"><span class="stmt-names">${esc(r.names)}</span>(${esc(r.breakdown)})</p>`
  ).join('');
  return `
    <div class="sheet-title large">원산지 정보</div>
    <div class="stmt-box">${lines}</div>
    <div class="notice large">${esc(NOTICE)}</div>`;
}

export function printOriginAll({ sheet1, sheet2, sheet3, sheet4 = [] }) {
  const win = window.open('', '_blank', 'width=1000,height=1100');
  if (!win) {
    alert('팝업이 차단되었습니다. 팝업 허용 후 다시 시도해주세요.');
    return;
  }

  const html = `<!doctype html>
<html lang="ko"><head><meta charset="utf-8">
<title>원산지 표시판</title>
<style>
* { box-sizing: border-box; margin: 0; padding: 0; }
body { font-family: 'Pretendard Variable', Pretendard, -apple-system, sans-serif; color: #111; background: #fff; }
.page { padding: 20mm 15mm; page-break-after: always; }
.page:last-child { page-break-after: auto; }
.sheet-title { text-align: center; font-size: 20px; font-weight: 800; padding: 10px 0;
  border: 1px solid #333; border-bottom: none; background: #f9f9f9; letter-spacing: -0.02em; }
.sheet-title.large { font-size: 28px; padding: 16px 0; }
table { width: 100%; border-collapse: collapse; table-layout: fixed; }
th, td { border: 1px solid #333; padding: 6px 8px; vertical-align: middle;
  word-break: keep-all; word-wrap: break-word; white-space: pre-wrap; line-height: 1.5; font-size: 13px; }
th { background: #f0f0f0; font-weight: 700; text-align: center; font-size: 13px; }
td.multiline { white-space: pre-line; }
.sign-table th, .sign-table td { font-size: 15px; padding: 10px; }
.sign-table th { font-size: 16px; padding: 12px 10px; }
.fridge-table th, .fridge-table td { font-size: 15px; padding: 10px; }
.fridge-table th { font-size: 16px; padding: 12px 10px; }
.delivery-table th { font-size: 14px; padding: 10px; }
.delivery-table td { font-size: 13px; padding: 8px 10px; vertical-align: top; }
.notice { border: 1px solid #333; border-top: none; padding: 8px 12px;
  font-size: 13px; font-weight: 600; color: #555; }
.notice.large { font-size: 15px; padding: 12px; }
.stmt-box { border: 1px solid #333; border-bottom: none; padding: 16px 22px;
  background: #fff; font-size: 15px; line-height: 2; }
.stmt-line { margin: 0 0 6px; word-break: keep-all; }
.stmt-line:last-child { margin-bottom: 0; }
.stmt-names { font-weight: 800; color: #111; }
@media print {
  @page { size: A4 landscape; margin: 15mm 10mm; }
  body { -webkit-print-color-adjust: exact; print-color-adjust: exact; }
}
</style></head><body>
  <div class="page">${sheet1Html(sheet1)}</div>
  <div class="page">${sheet2Html(sheet2)}</div>
  <div class="page">${sheet3Html(sheet3)}</div>
  <div class="page">${sheet4Html(sheet4)}</div>
  <script>window.onload = function() { window.focus(); window.print(); };<\/script>
</body></html>`;

  win.document.open();
  win.document.write(html);
  win.document.close();
}
