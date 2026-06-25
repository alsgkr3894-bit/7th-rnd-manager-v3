import { loadXlsx } from '@/lib/excel';
import { makeFileNameWithBrand } from '@/lib/download';
import { buildAutoPrintScript, openPrintWindow } from '@/lib/print/window-print';
import { applyDiscount, calcNetRevenue, calcPlatformMargin } from './platforms';

const MAX_SHEET_NAME_LENGTH = 31;
const LR_SIZE_LABELS = ['L', 'R'];
const SINGLE_SIZE_LABEL = '단일';
const SINGLE_SIZE_CATEGORIES = new Set(['1인피자', '사이드', '소스', '음료', '엣지']);
const SIZE_ORDER = ['L', 'R', '단일', '단품', '세트'];

const esc = value =>
  String(value ?? '')
    .replace(/&/g, '&amp;')
    .replace(/</g, '&lt;')
    .replace(/>/g, '&gt;')
    .replace(/"/g, '&quot;');

function getCostEntry(costMap, label) {
  if (!Object.prototype.hasOwnProperty.call(costMap || {}, label)) {
    return { hasCost: false, cost: 0 };
  }
  const cost = Number(costMap[label]);
  return Number.isFinite(cost) ? { hasCost: true, cost } : { hasCost: false, cost: 0 };
}

function padDatePart(value) {
  return String(value).padStart(2, '0');
}

function asValidDate(value) {
  return value instanceof Date && Number.isFinite(value.getTime()) ? value : new Date();
}

export function formatMarginDownloadDate(date = new Date()) {
  const safeDate = asValidDate(date);
  return `${safeDate.getFullYear()}-${padDatePart(safeDate.getMonth() + 1)}-${padDatePart(
    safeDate.getDate()
  )}`;
}

function hasOwnCost(costMap, label) {
  return Object.prototype.hasOwnProperty.call(costMap || {}, label);
}

function normalizeSizeLabel(value) {
  return String(value || '').trim() || SINGLE_SIZE_LABEL;
}

function isLrSizeLabel(label) {
  return LR_SIZE_LABELS.includes(normalizeSizeLabel(label).toUpperCase());
}

function sortSizeLabels(labels) {
  return [...labels].sort((a, b) => {
    const ia = SIZE_ORDER.indexOf(a);
    const ib = SIZE_ORDER.indexOf(b);
    if (ia !== -1 && ib !== -1) return ia - ib;
    if (ia !== -1) return -1;
    if (ib !== -1) return 1;
    return a.localeCompare(b, 'ko');
  });
}

function worksheetCols(sheetRows) {
  const headers =
    (Array.isArray(sheetRows) ? sheetRows.find(row => row?.[0] === '메뉴명') : null) ||
    sheetRows?.[0] ||
    [];
  return headers.map((header, index) => ({
    wch:
      index === 0
        ? 32
        : index <= 2
          ? 18
          : Math.max(10, Math.min(18, String(header || '').length + 4)),
  }));
}

function categoryLabel(row) {
  const label = String(row?.menuCategory || '기타').trim();
  return label || '기타';
}

function subCategoryLabel(row) {
  const code = String(row?.menuSubCategoryCode || '').trim();
  const label = String(row?.menuSubCategory || '').trim();
  if (code && label) return `${code} ${label}`;
  return label || code || '';
}

function isLrCategory(category) {
  const cat = String(category || '').trim();
  return cat === '세트박스' || cat === '피자' || cat.startsWith('피자/');
}

function isSingleCategory(category) {
  return SINGLE_SIZE_CATEGORIES.has(String(category || '').trim());
}

function safeSheetName(value, usedNames) {
  const base =
    String(value || '기타')
      .replace(/[\[\]*?\/\\:]/g, ' ')
      .replace(/\s+/g, ' ')
      .trim()
      .slice(0, MAX_SHEET_NAME_LENGTH) || '기타';
  let name = base;
  let index = 2;

  while (usedNames.has(name)) {
    const suffix = ` (${index})`;
    name = `${base.slice(0, MAX_SHEET_NAME_LENGTH - suffix.length)}${suffix}`;
    index += 1;
  }

  usedNames.add(name);
  return name;
}

function appendMarginSheet(XLSX, wb, sheetName, sheetRows, usedNames) {
  const ws = XLSX.utils.aoa_to_sheet(sheetRows);
  ws['!cols'] = worksheetCols(sheetRows);
  XLSX.utils.book_append_sheet(wb, ws, safeSheetName(sheetName, usedNames));
}

function groupRowsByCategory(rows) {
  const grouped = new Map();
  for (const row of Array.isArray(rows) ? rows : []) {
    const label = categoryLabel(row);
    if (!grouped.has(label)) grouped.set(label, []);
    grouped.get(label).push(row);
  }
  return grouped;
}

function collectSizeLabels(rows, predicate = () => true) {
  const labels = new Set();
  for (const row of rows || []) {
    for (const size of row?.sizes || []) {
      const label = normalizeSizeLabel(size?.label);
      if (predicate(label)) labels.add(label);
    }
  }
  return sortSizeLabels(labels);
}

function normalizeSingleSizeRows(row) {
  const sizes = Array.isArray(row?.sizes) ? row.sizes : [];
  if (sizes.length === 0) {
    return [{ ...row, sizes: [], costMap: { ...(row?.costMap || {}), [SINGLE_SIZE_LABEL]: 0 } }];
  }

  const preferred = sizes.filter(size => !isLrSizeLabel(size?.label));
  const picked = preferred.length ? preferred : sizes;
  const multi = picked.length > 1;

  return picked.map((size, index) => {
    const origLabel = normalizeSizeLabel(size?.label);
    return {
      ...row,
      id: multi ? `${row?.id ?? ''}::${origLabel || index}` : row?.id,
      menuName: multi ? `${row?.menuName ?? ''} (${origLabel})` : row?.menuName,
      sizes: [{ ...size, label: SINGLE_SIZE_LABEL }],
      costMap: {
        ...(row?.costMap || {}),
        ...(hasOwnCost(row?.costMap, origLabel)
          ? { [SINGLE_SIZE_LABEL]: row.costMap[origLabel] }
          : {}),
      },
    };
  });
}

function buildCategorySheetModel(category, rows, fallbackSizeLabels) {
  if (isSingleCategory(category)) {
    return {
      rows: rows.flatMap(normalizeSingleSizeRows),
      sizeLabels: [SINGLE_SIZE_LABEL],
    };
  }
  if (isLrCategory(category)) {
    const sizeLabels = collectSizeLabels(rows, isLrSizeLabel);
    return {
      rows,
      sizeLabels: sizeLabels.length
        ? sizeLabels
        : sortSizeLabels((fallbackSizeLabels || []).filter(isLrSizeLabel)),
    };
  }
  const sizeLabels = collectSizeLabels(rows);
  return {
    rows,
    sizeLabels: sizeLabels.length ? sizeLabels : fallbackSizeLabels,
  };
}

function formatPrintValue(value) {
  if (value === '' || value == null) return '<span class="dash">-</span>';
  if (typeof value === 'number' && Number.isFinite(value)) {
    return esc(value.toLocaleString('ko-KR'));
  }
  return esc(value);
}

function discountLabel(discount) {
  if (!discount) return '없음';
  const value = Number(discount.value);
  if (!Number.isFinite(value)) return '없음';
  if (discount.type === 'pct') return `${value}%`;
  return `${Math.round(value).toLocaleString('ko-KR')}원`;
}

function viewModeLabel(viewMode) {
  return viewMode === 'margin' ? '마진율' : '원가율';
}

function printTitle(exportedAt) {
  return makeFileNameWithBrand('원가마진표', 'pdf', exportedAt).replace(/\.pdf$/i, '');
}

function buildMarginExcelMetaRows({ exportedAt, activePlatform, viewMode, discount }) {
  return [
    ['다운로드일', formatMarginDownloadDate(exportedAt)],
    ['플랫폼', activePlatform?.name || '기본'],
    ['보기 기준', viewModeLabel(viewMode)],
    ['할인', discountLabel(discount)],
    [],
  ];
}

function withMarginExcelMetaRows(sheetRows, meta) {
  return [...buildMarginExcelMetaRows(meta), ...sheetRows];
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
    .map((header, index) => `<th class="${index >= 3 ? 'num' : ''}">${esc(header)}</th>`)
    .join('');
  const bodyHtml = bodyRows.length
    ? bodyRows
        .map(
          row => `<tr>${headers
            .map((_, index) => {
              const cls = index === 0 ? 'name' : index >= 3 ? 'num' : '';
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
    ${sectionHtml}
  </main>
  ${buildAutoPrintScript()}
</body></html>`;
}

export function buildMarginExcelRows(rows, sizeLabels, viewMode, activePlatform, discount) {
  const fees = activePlatform?.fees;
  const headers = [
    '메뉴명',
    '카테고리',
    '중분류',
    ...sizeLabels.map(l => l + ' 원가'),
    ...sizeLabels.map(l => l + ' 판매가'),
    ...sizeLabels.map(l => l + (viewMode === 'margin' ? ' 마진율' : ' 원가율')),
  ];
  const bodyRows = rows.map(r => [
    r.menuName,
    r.menuCategory || '기타',
    subCategoryLabel(r),
    ...sizeLabels.map(l => {
      const { hasCost, cost } = getCostEntry(r.costMap, l);
      return hasCost ? Math.round(cost) : '';
    }),
    ...sizeLabels.map(l => {
      const s = r.sizes?.find(s => s.label === l);
      return s?.sellingPrice || '';
    }),
    ...sizeLabels.map(l => {
      // 화면(MarginRow)과 동일하게 할인·플랫폼수수료 차감 후 수령액(net) 기준으로 계산한다.
      const { hasCost, cost } = getCostEntry(r.costMap, l);
      const s = r.sizes?.find(s => s.label === l);
      if (!hasCost || !s?.sellingPrice) return '';
      const net = calcNetRevenue(applyDiscount(s.sellingPrice, discount), fees, l);
      const rate = calcPlatformMargin(cost, net);
      if (rate == null) return '';
      return viewMode === 'margin' ? (100 - rate).toFixed(1) + '%' : rate.toFixed(1) + '%';
    }),
  ]);
  return [headers, ...bodyRows];
}

export async function exportMarginExcel(
  rows,
  sizeLabels,
  viewMode,
  activePlatform,
  discount,
  options = {}
) {
  const XLSX = await loadXlsx();
  const exportedAt = asValidDate(options?.now);
  const meta = { exportedAt, activePlatform, viewMode, discount };
  const sheetRows = buildMarginExcelRows(rows, sizeLabels, viewMode, activePlatform, discount);
  const wb = XLSX.utils.book_new();
  const usedNames = new Set();
  appendMarginSheet(XLSX, wb, '원가마진표', withMarginExcelMetaRows(sheetRows, meta), usedNames);

  for (const [category, categoryRows] of groupRowsByCategory(rows)) {
    const sheetModel = buildCategorySheetModel(category, categoryRows, sizeLabels);
    appendMarginSheet(
      XLSX,
      wb,
      category,
      withMarginExcelMetaRows(
        buildMarginExcelRows(
          sheetModel.rows,
          sheetModel.sizeLabels,
          viewMode,
          activePlatform,
          discount
        ),
        meta
      ),
      usedNames
    );
  }

  XLSX.writeFile(wb, makeFileNameWithBrand('원가마진표', 'xlsx', exportedAt));
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
