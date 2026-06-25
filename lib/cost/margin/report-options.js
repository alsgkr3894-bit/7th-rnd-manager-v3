import { applyDiscount, calcNetRevenue, calcPlatformMargin } from '@/lib/cost/margin/platforms';

export const BASE_EDGE_KEY = 'base';
export const BASE_EDGE_LABEL = '석쇠기본';
export const SINGLE_SIZE_GROUP = '단일';

const SIZE_ORDER = ['L', 'R', SINGLE_SIZE_GROUP];

function asRows(rows) {
  return Array.isArray(rows) ? rows.filter(row => row && typeof row === 'object') : [];
}

function normalizeLabel(value, fallback = '') {
  return String(value ?? '').trim() || fallback;
}

function normalizeCategory(value) {
  return normalizeLabel(value, '기타');
}

function normalizeSizeLabel(value) {
  return normalizeLabel(value, SINGLE_SIZE_GROUP);
}

export function normalizeMarginSizeGroup(value) {
  const label = normalizeSizeLabel(value).toUpperCase();
  if (label === 'L') return 'L';
  if (label === 'R') return 'R';
  return SINGLE_SIZE_GROUP;
}

function sortSizeGroups(values) {
  return [...values].sort((a, b) => {
    const ia = SIZE_ORDER.indexOf(a);
    const ib = SIZE_ORDER.indexOf(b);
    if (ia !== -1 && ib !== -1) return ia - ib;
    if (ia !== -1) return -1;
    if (ib !== -1) return 1;
    return a.localeCompare(b, 'ko');
  });
}

function hasConfiguredSelection(selection) {
  return selection && typeof selection === 'object' && Object.keys(selection).length > 0;
}

function isSelected(selection, key) {
  if (!hasConfiguredSelection(selection)) return true;
  return selection[key] !== false;
}

function hasOwnCost(costMap, label) {
  return Object.prototype.hasOwnProperty.call(costMap || {}, label);
}

function getCostForLabel(costMap, label) {
  const rawLabel = normalizeSizeLabel(label);
  return hasOwnCost(costMap, rawLabel) ? costMap[rawLabel] : undefined;
}

export function getMarginReportEdgeKey(row) {
  if (row?.isDerivedEdge && row?.edgeType) return normalizeLabel(row.edgeType);
  const id = String(row?.id ?? '');
  if (id.startsWith('derived||')) return normalizeLabel(id.split('||').pop());
  return BASE_EDGE_KEY;
}

export function getMarginReportEdgeLabel(key) {
  return key === BASE_EDGE_KEY ? BASE_EDGE_LABEL : key;
}

export function collectMarginReportCategories(rows) {
  const categories = new Set(asRows(rows).map(row => normalizeCategory(row.menuCategory)));
  return [...categories].sort((a, b) => a.localeCompare(b, 'ko'));
}

export function collectMarginReportEdgeOptions(rows) {
  const keys = new Set([BASE_EDGE_KEY]);
  for (const row of asRows(rows)) {
    const key = getMarginReportEdgeKey(row);
    if (key) keys.add(key);
  }
  return [...keys]
    .sort((a, b) => {
      if (a === BASE_EDGE_KEY) return -1;
      if (b === BASE_EDGE_KEY) return 1;
      return a.localeCompare(b, 'ko');
    })
    .map(key => ({ key, label: getMarginReportEdgeLabel(key) }));
}

export function collectMarginReportSizeOptions(rows) {
  const groups = new Set();
  for (const row of asRows(rows)) {
    for (const size of Array.isArray(row.sizes) ? row.sizes : []) {
      groups.add(normalizeMarginSizeGroup(size?.label));
    }
  }
  return sortSizeGroups(groups);
}

function buildLrRow(row, sizes) {
  const costMap = {};
  for (const size of sizes) {
    const label = normalizeMarginSizeGroup(size?.label);
    const cost = getCostForLabel(row.costMap, size?.label);
    if (cost !== undefined) costMap[label] = cost;
  }
  return {
    ...row,
    sizes: sizes.map(size => ({ ...size, label: normalizeMarginSizeGroup(size?.label) })),
    costMap,
  };
}

function buildSingleRows(row, sizes) {
  const multi = sizes.length > 1;
  return sizes.map((size, index) => {
    const originalLabel = normalizeSizeLabel(size?.label);
    const cost = getCostForLabel(row.costMap, originalLabel);
    return {
      ...row,
      id: multi ? `${row.id ?? ''}::${originalLabel || index}` : row.id,
      menuName: multi ? `${row.menuName ?? ''} (${originalLabel})` : row.menuName,
      sizes: [{ ...size, label: SINGLE_SIZE_GROUP }],
      costMap: cost !== undefined ? { [SINGLE_SIZE_GROUP]: cost } : {},
    };
  });
}

export function filterMarginReportRows(
  rows,
  { categorySelection, edgeSelection, sizeSelection, includeHidden = false } = {}
) {
  const output = [];
  for (const row of asRows(rows)) {
    if (!includeHidden && row.hidden) continue;
    if (!isSelected(categorySelection, normalizeCategory(row.menuCategory))) continue;
    if (!isSelected(edgeSelection, getMarginReportEdgeKey(row))) continue;

    const selectedSizes = (Array.isArray(row.sizes) ? row.sizes : []).filter(size =>
      isSelected(sizeSelection, normalizeMarginSizeGroup(size?.label))
    );
    if (!selectedSizes.length) continue;

    const lrSizes = selectedSizes.filter(size =>
      ['L', 'R'].includes(normalizeMarginSizeGroup(size?.label))
    );
    const singleSizes = selectedSizes.filter(
      size => normalizeMarginSizeGroup(size?.label) === SINGLE_SIZE_GROUP
    );

    if (lrSizes.length) output.push(buildLrRow(row, lrSizes));
    output.push(...buildSingleRows(row, singleSizes));
  }
  return output;
}

export function buildMarginReportSummary(rows, activePlatform, discount, viewMode = 'cost') {
  let metricSum = 0;
  let metricCount = 0;
  const categories = new Set();
  const edges = new Set();
  const sizes = new Set();

  for (const row of asRows(rows)) {
    categories.add(normalizeCategory(row.menuCategory));
    edges.add(getMarginReportEdgeKey(row));
    for (const size of Array.isArray(row.sizes) ? row.sizes : []) {
      const label = normalizeMarginSizeGroup(size?.label);
      sizes.add(label);
      const cost = Number(row.costMap?.[label]);
      const sellingPrice = Number(size?.sellingPrice);
      if (!Number.isFinite(cost) || !Number.isFinite(sellingPrice) || sellingPrice <= 0) continue;
      const net = calcNetRevenue(
        applyDiscount(sellingPrice, discount),
        activePlatform?.fees,
        label
      );
      const costRate = calcPlatformMargin(cost, net);
      if (costRate == null) continue;
      metricSum += viewMode === 'margin' ? 100 - costRate : costRate;
      metricCount += 1;
    }
  }

  return {
    rowCount: asRows(rows).length,
    categoryCount: categories.size,
    edgeCount: edges.size,
    sizeCount: sizes.size,
    avgMetric: metricCount ? metricSum / metricCount : 0,
    metricCount,
  };
}
