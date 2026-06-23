import { loadXlsx } from '@/lib/excel';
import { makeFileNameWithBrand } from '@/lib/download';
import { applyDiscount, calcNetRevenue, calcPlatformMargin } from './platforms';

const MAX_SHEET_NAME_LENGTH = 31;

function getCostEntry(costMap, label) {
  if (!Object.prototype.hasOwnProperty.call(costMap || {}, label)) {
    return { hasCost: false, cost: 0 };
  }
  const cost = Number(costMap[label]);
  return Number.isFinite(cost) ? { hasCost: true, cost } : { hasCost: false, cost: 0 };
}

function worksheetCols(headers) {
  return headers.map((header, index) => ({
    wch: index === 0 ? 32 : Math.max(10, Math.min(18, String(header || '').length + 4)),
  }));
}

function categoryLabel(row) {
  const label = String(row?.menuCategory || '기타').trim();
  return label || '기타';
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
  ws['!cols'] = worksheetCols(sheetRows[0] || []);
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

export function buildMarginExcelRows(rows, sizeLabels, viewMode, activePlatform, discount) {
  const fees = activePlatform?.fees;
  const headers = [
    '메뉴명',
    '카테고리',
    ...sizeLabels.map(l => l + ' 원가'),
    ...sizeLabels.map(l => l + ' 판매가'),
    ...sizeLabels.map(l => l + (viewMode === 'margin' ? ' 마진율' : ' 원가율')),
  ];
  const bodyRows = rows.map(r => [
    r.menuName,
    r.menuCategory || '기타',
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

export async function exportMarginExcel(rows, sizeLabels, viewMode, activePlatform, discount) {
  const XLSX = await loadXlsx();
  const sheetRows = buildMarginExcelRows(rows, sizeLabels, viewMode, activePlatform, discount);
  const wb = XLSX.utils.book_new();
  const usedNames = new Set();
  appendMarginSheet(XLSX, wb, '원가마진표', sheetRows, usedNames);

  for (const [category, categoryRows] of groupRowsByCategory(rows)) {
    appendMarginSheet(
      XLSX,
      wb,
      category,
      buildMarginExcelRows(categoryRows, sizeLabels, viewMode, activePlatform, discount),
      usedNames
    );
  }

  XLSX.writeFile(wb, makeFileNameWithBrand('원가마진표', 'xlsx'));
}
