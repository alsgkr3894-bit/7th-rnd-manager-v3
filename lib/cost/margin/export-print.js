// 원가마진표 PDF(인쇄) HTML 빌더 + 인쇄 팝업
import { makeFileNameWithBrand } from '@/lib/download';
import { buildAutoPrintScript, openPrintWindow } from '@/lib/print/window-print';
import { buildMarginPizzaCostRateSummary } from './report-options';
import { buildMarginExcelRows } from './export-rows';
import { buildCategorySheetModel, groupRowsByCategory } from './export-sheets';
import {
  asValidDate,
  discountLabel,
  esc,
  formatMarginDownloadDate,
  formatPrintValue,
  formatRateMetric,
  viewModeLabel,
} from './export-format';

function printTitle(exportedAt) {
  return makeFileNameWithBrand('원가마진표', 'pdf', exportedAt).replace(/\.pdf$/i, '');
}

function buildMarginPrintSections(rows, sizeLabels, viewMode, activePlatform, discount) {
  return [...groupRowsByCategory(rows)].map(([category, categoryRows]) => {
    const sheetModel = buildCategorySheetModel(category, categoryRows, sizeLabels);
    return {
      category,
      rowCount: sheetModel.rows.length,
      sheetRows: buildMarginExcelRows(
        sheetModel.rows,
        sheetModel.sizeLabels,
        viewMode,
        activePlatform,
        discount
      ),
    };
  });
}

function tableHtml(sheetRows) {
  const headers = sheetRows[0] || [];
  const bodyRows = sheetRows.slice(1);
  const headerHtml = headers
    .map((header, index) => `<th class="${index >= 2 ? 'num' : ''}">${esc(header)}</th>`)
    .join('');
  const bodyHtml = bodyRows.length
    ? bodyRows
        .map(
          row =>
            `<tr>${headers
              .map((_, index) => {
                const cls = index === 1 ? 'name' : index >= 2 ? 'num' : '';
                return `<td class="${cls}">${formatPrintValue(row[index])}</td>`;
              })
              .join('')}</tr>`
        )
        .join('')
    : `<tr><td class="empty" colspan="${Math.max(headers.length, 1)}">출력할 행이 없습니다</td></tr>`;

  return `<table>
    <thead><tr>${headerHtml}</tr></thead>
    <tbody>${bodyHtml}</tbody>
  </table>`;
}

function buildPizzaCostRateSummaryHtml(rows, activePlatform, discount) {
  const summary = buildMarginPizzaCostRateSummary(rows, activePlatform, discount);
  if (!summary.total.count) return '';
  const metricCell = metric => formatRateMetric(metric) || '<span class="dash">-</span>';
  const categoryRows = summary.categories
    .map(
      row => `<tr>
        <td class="name">${esc(row.category)}</td>
        <td class="num">${metricCell(row.total)}</td>
        <td class="num">${metricCell(row.sizes.L)}</td>
        <td class="num">${metricCell(row.sizes.R)}</td>
        <td class="num">${row.total.count.toLocaleString('ko-KR')}</td>
      </tr>`
    )
    .join('');

  return `<section class="section summary-section">
    <div class="section-title">
      <h2>피자 원가율 요약</h2>
      <span>전체 · L 사이즈 · R 사이즈 평균</span>
    </div>
    <div class="summary pizza-summary">
      <div><span>전체 피자 평균원가율</span><strong>${metricCell(summary.total)}</strong></div>
      <div><span>L 사이즈 평균원가율</span><strong>${metricCell(summary.sizes.L)}</strong></div>
      <div><span>R 사이즈 평균원가율</span><strong>${metricCell(summary.sizes.R)}</strong></div>
    </div>
    <table>
      <thead>
        <tr>
          <th>피자 카테고리</th>
          <th class="num">전체 평균원가율</th>
          <th class="num">L 평균원가율</th>
          <th class="num">R 평균원가율</th>
          <th class="num">기준 가격 수</th>
        </tr>
      </thead>
      <tbody>${categoryRows}</tbody>
    </table>
  </section>`;
}

export function buildMarginPrintHtml(
  rows,
  sizeLabels,
  viewMode,
  activePlatform,
  discount,
  options = {}
) {
  const safeRows = Array.isArray(rows) ? rows : [];
  const exportedAt = asValidDate(options?.now);
  const downloadDate = formatMarginDownloadDate(exportedAt);
  const title = printTitle(exportedAt);
  const sections = buildMarginPrintSections(
    safeRows,
    Array.isArray(sizeLabels) ? sizeLabels : [],
    viewMode,
    activePlatform,
    discount
  );
  const sectionHtml = sections.length
    ? sections
        .map(
          section => `<section class="section">
    <div class="section-title">
      <h2>${esc(section.category)}</h2>
      <span>${section.rowCount.toLocaleString('ko-KR')}개 메뉴</span>
    </div>
    ${tableHtml(section.sheetRows)}
  </section>`
        )
        .join('')
    : '<div class="empty-block">출력할 원가마진표 행이 없습니다.</div>';
  const pizzaCostRateHtml = buildPizzaCostRateSummaryHtml(safeRows, activePlatform, discount);
  const modeLabel = viewModeLabel(viewMode);
  const platformName = activePlatform?.name || '기본';

  return `<!doctype html>
<html lang="ko"><head><meta charset="utf-8">
<title>${esc(title)}</title>
<style>
  * { box-sizing: border-box; }
  body { margin: 0; color: #111; background: #fff; font-family: -apple-system, "Apple SD Gothic Neo", "Malgun Gothic", sans-serif; }
  .page { padding: 12mm 10mm; }
  .header { display: flex; justify-content: space-between; gap: 12px; align-items: flex-end; margin-bottom: 10px; }
  h1 { margin: 0 0 4px; font-size: 20px; letter-spacing: 0; }
  .meta { color: #555; font-size: 11px; line-height: 1.6; }
  .summary { display: grid; grid-template-columns: repeat(4, minmax(0, 1fr)); gap: 6px; margin: 10px 0 12px; }
  .summary div { border: 1px solid #d7dce2; border-radius: 6px; padding: 7px 8px; }
  .summary span { display: block; color: #667085; font-size: 10px; margin-bottom: 2px; }
  .summary strong { font-size: 13px; }
  .pizza-summary { grid-template-columns: repeat(3, minmax(0, 1fr)); margin: 0 0 8px; }
  .section.summary-section + .section { break-before: auto; page-break-before: auto; }
  .section { margin-top: 12px; }
  .section + .section { break-before: page; page-break-before: always; }
  .section-title { display: flex; justify-content: space-between; align-items: center; border: 1px solid #2f343b; border-bottom: none; background: #f3f5f7; padding: 7px 8px; break-after: avoid; page-break-after: avoid; }
  h2 { margin: 0; font-size: 14px; }
  .section-title span { color: #4b5563; font-size: 10px; font-weight: 700; }
  table { width: 100%; border-collapse: collapse; table-layout: fixed; font-size: 9.5px; }
  th, td { border: 1px solid #d7dce2; padding: 4px 5px; vertical-align: middle; word-break: keep-all; overflow-wrap: anywhere; line-height: 1.35; }
  th { background: #eef1f4; font-weight: 800; text-align: left; color: #343a40; }
  th.num, td.num { text-align: right; font-variant-numeric: tabular-nums; }
  td.name { font-weight: 700; }
  .dash { color: #a0a7b2; }
  .empty, .empty-block { color: #667085; text-align: center; padding: 24px; border: 1px solid #d7dce2; }
  @media print {
    @page { size: A4 landscape; margin: 8mm; }
    body { -webkit-print-color-adjust: exact; print-color-adjust: exact; }
    .page { padding: 0; }
  }
</style></head>
<body>
  <main class="page">
    <header class="header">
      <div>
        <h1>메뉴 원가마진표</h1>
        <div class="meta">현재 필터 결과 기준 · 카테고리별 출력</div>
      </div>
      <div class="meta">다운로드일: ${esc(downloadDate)}<br>플랫폼: ${esc(platformName)} · 보기: ${esc(modeLabel)} · 할인: ${esc(discountLabel(discount))}</div>
    </header>
    <div class="summary">
      <div><span>출력 메뉴</span><strong>${safeRows.length.toLocaleString('ko-KR')}개</strong></div>
      <div><span>카테고리</span><strong>${sections.length.toLocaleString('ko-KR')}개</strong></div>
      <div><span>플랫폼</span><strong>${esc(platformName)}</strong></div>
      <div><span>다운로드일</span><strong>${esc(downloadDate)}</strong></div>
    </div>
    ${pizzaCostRateHtml}
    ${sectionHtml}
  </main>
  ${buildAutoPrintScript()}
</body></html>`;
}

export function printMarginPdf(rows, sizeLabels, viewMode, activePlatform, discount, options = {}) {
  return openPrintWindow(
    buildMarginPrintHtml(rows, sizeLabels, viewMode, activePlatform, discount, options),
    {
      width: 1200,
      height: 900,
    }
  );
}
