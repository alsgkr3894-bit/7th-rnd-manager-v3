/**
 * lib/cost/usage-print.js — 제품별 사용현황 PDF(인쇄) 출력
 *
 * 별도 인쇄 창을 열어 모든 식자재 · 모든 메뉴를 펼친 표를 그린 뒤 print()를 호출한다.
 * 앱 전역 CSS와 충돌하지 않도록 자체 완결 HTML을 사용한다.
 */

const esc = (s) => String(s ?? '')
  .replace(/&/g, '&amp;').replace(/</g, '&lt;').replace(/>/g, '&gt;')
  .replace(/"/g, '&quot;');

/**
 * @param {Array<{ name, code, scope?, count, menus: Array<{menuName, cat}> }>} rows
 * @param {string} usageCat - 현재 카테고리 필터(표시용)
 */
export function printUsageReport(rows, usageCat = '전체') {
  const win = window.open('', '_blank', 'width=900,height=1000');
  if (!win) {
    alert('팝업이 차단되었습니다. 팝업을 허용한 뒤 다시 시도해주세요.');
    return;
  }

  const totalMenus = new Set(rows.flatMap(r => r.menus.map(m => m.menuName))).size;

  const bodyRows = rows.map((r, i) => {
    const menus = r.menus.map(m => esc(m.menuName)).join(', ');
    const scope = r.scope ? `<span class="scope">${esc(r.scope)}</span>` : '';
    return `
      <tr>
        <td class="num">${i + 1}</td>
        <td class="name">${esc(r.name)} ${scope}</td>
        <td class="code">${esc(r.code || '—')}</td>
        <td class="num">${r.count}</td>
        <td class="menus">${menus || '—'}</td>
      </tr>`;
  }).join('');

  const html = `<!doctype html>
<html lang="ko"><head><meta charset="utf-8">
<title>제품별 사용현황</title>
<style>
  * { box-sizing: border-box; }
  body { font-family: -apple-system, "Apple SD Gothic Neo", "Malgun Gothic", sans-serif; color:#111; margin:24px; }
  h1 { font-size:18px; margin:0 0 4px; }
  .meta { font-size:12px; color:#666; margin-bottom:14px; }
  table { width:100%; border-collapse:collapse; font-size:12px; }
  th, td { border-bottom:1px solid #ddd; padding:6px 8px; vertical-align:top; text-align:left; }
  th { background:#f3f4f6; font-size:11px; color:#444; }
  td.num, th.num { text-align:center; width:48px; }
  td.code { font-family:ui-monospace, monospace; color:#666; width:90px; }
  td.name { font-weight:600; width:200px; }
  td.menus { color:#333; line-height:1.6; }
  .scope { font-size:10px; font-weight:700; color:#1d4ed8; border:1px solid #c7d2fe; border-radius:8px; padding:0 5px; margin-left:4px; white-space:nowrap; }
  @media print { body { margin:10mm; } th { -webkit-print-color-adjust:exact; print-color-adjust:exact; } }
</style></head>
<body>
  <h1>제품별 사용현황</h1>
  <div class="meta">${esc(usageCat !== '전체' ? usageCat + ' 카테고리' : '전체 카테고리')} · 식자재 ${rows.length}개 · 사용 메뉴 ${totalMenus}개</div>
  <table>
    <thead>
      <tr>
        <th class="num">순위</th>
        <th>식자재명</th>
        <th>제품코드</th>
        <th class="num">메뉴수</th>
        <th>사용 메뉴 (전체)</th>
      </tr>
    </thead>
    <tbody>${bodyRows}</tbody>
  </table>
  <script>
    window.onload = function () { window.focus(); window.print(); };
  </script>
</body></html>`;

  win.document.open();
  win.document.write(html);
  win.document.close();
}
