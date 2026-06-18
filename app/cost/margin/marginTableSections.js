const LR_SIZE_LABELS = ['L', 'R'];
const SINGLE_SIZE_LABEL = '단일';
const SINGLE_SIZE_CATEGORIES = new Set(['1인피자', '사이드', '소스', '음료', '엣지']);
const SIZE_ORDER = ['L', 'R', '단일', '단품', '세트'];

function normalizeCategory(value) {
  return String(value || '').trim();
}

function normalizeSizeLabel(value) {
  return String(value || '').trim() || SINGLE_SIZE_LABEL;
}

function isLrSizeLabel(label) {
  return LR_SIZE_LABELS.includes(normalizeSizeLabel(label).toUpperCase());
}

export function isLrMarginCategory(category) {
  const cat = normalizeCategory(category);
  return cat === '세트박스' || cat === '피자' || cat.startsWith('피자/');
}

export function isSingleMarginCategory(category) {
  return SINGLE_SIZE_CATEGORIES.has(normalizeCategory(category));
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

function normalizeSingleSizeRow(row) {
  const sizes = Array.isArray(row?.sizes) ? row.sizes : [];
  const picked = sizes.find(size => !isLrSizeLabel(size?.label)) || sizes[0] || null;
  const pickedLabel = normalizeSizeLabel(picked?.label);
  return {
    ...row,
    sizes: picked ? [{ ...picked, label: SINGLE_SIZE_LABEL }] : [],
    costMap: {
      ...(row?.costMap || {}),
      [SINGLE_SIZE_LABEL]: row?.costMap?.[pickedLabel] || 0,
    },
  };
}

export function buildMarginTableSections(rows = []) {
  const lrRows = [];
  const singleRows = [];
  const otherRows = [];

  for (const row of rows || []) {
    const cat = row?.menuCategory;
    if (isLrMarginCategory(cat)) lrRows.push(row);
    else if (isSingleMarginCategory(cat)) singleRows.push(normalizeSingleSizeRow(row));
    else otherRows.push(row);
  }

  const sections = [];
  if (lrRows.length > 0) {
    const lrSizeLabels = collectSizeLabels(lrRows, isLrSizeLabel);
    sections.push({
      id: 'lr',
      title: '피자 · 세트박스',
      sizeLabels: lrSizeLabels.length ? lrSizeLabels : collectSizeLabels(lrRows),
      rows: lrRows,
    });
  }
  if (singleRows.length > 0) {
    sections.push({
      id: 'single',
      title: '단일 메뉴',
      sizeLabels: [SINGLE_SIZE_LABEL],
      rows: singleRows,
    });
  }
  if (otherRows.length > 0) {
    sections.push({
      id: 'other',
      title: '기타',
      sizeLabels: collectSizeLabels(otherRows),
      rows: otherRows,
    });
  }
  return sections.filter(section => section.sizeLabels.length > 0);
}
