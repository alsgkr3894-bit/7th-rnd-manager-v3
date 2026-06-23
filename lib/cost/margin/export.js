import { loadXlsx } from '@/lib/excel';
import { makeFileNameWithBrand } from '@/lib/download';
import { applyDiscount, calcNetRevenue, calcPlatformMargin } from './platforms';

const MAX_SHEET_NAME_LENGTH = 31;
const LR_SIZE_LABELS = ['L', 'R'];
const SINGLE_SIZE_LABEL = '단일';
const SINGLE_SIZE_CATEGORIES = new Set(['1인피자', '사이드', '소스', '음료', '엣지']);
const SIZE_ORDER = ['L', 'R', '단일', '단품', '세트'];

function getCostEntry(costMap, label) {
  if (!Object.prototype.hasOwnProperty.call(costMap || {}, label)) {
    return { hasCost: false, cost: 0 };
  }
  const cost = Number(costMap[label]);
  return Number.isFinite(cost) ? { hasCost: true, cost } : { hasCost: false, cost: 0 };
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

function worksheetCols(headers) {
  return headers.map((header, index) => ({
    wch: index === 0 ? 32 : Math.max(10, Math.min(18, String(header || '').length + 4)),
  }));
}

function categoryLabel(row) {
  const label = String(row?.menuCategory || '기타').trim();
  return label || '기타';
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
    const sheetModel = buildCategorySheetModel(category, categoryRows, sizeLabels);
    appendMarginSheet(
      XLSX,
      wb,
      category,
      buildMarginExcelRows(
        sheetModel.rows,
        sheetModel.sizeLabels,
        viewMode,
        activePlatform,
        discount
      ),
      usedNames
    );
  }

  XLSX.writeFile(wb, makeFileNameWithBrand('원가마진표', 'xlsx'));
}
