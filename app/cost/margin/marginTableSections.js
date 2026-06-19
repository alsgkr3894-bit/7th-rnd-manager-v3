const LR_SIZE_LABELS = ['L', 'R'];
const SINGLE_SIZE_LABEL = '단일';
const SINGLE_SIZE_CATEGORIES = new Set(['1인피자', '사이드', '소스', '음료', '엣지']);
const SIZE_ORDER = ['L', 'R', '단일', '단품', '세트'];
const CATEGORY_SECTIONS = [
  {
    id: 'pizza',
    title: '피자',
    sizeMode: 'lr',
    matches: cat => cat === '피자' || cat.startsWith('피자/'),
  },
  { id: 'set', title: '세트박스', sizeMode: 'lr', matches: cat => cat === '세트박스' },
  { id: 'personal', title: '1인피자', sizeMode: 'single', matches: cat => cat === '1인피자' },
  { id: 'side', title: '사이드', sizeMode: 'single', matches: cat => cat === '사이드' },
  { id: 'sauce', title: '소스', sizeMode: 'single', matches: cat => cat === '소스' },
  { id: 'drink', title: '음료', sizeMode: 'single', matches: cat => cat === '음료' },
  { id: 'edge', title: '엣지', sizeMode: 'single', matches: cat => cat === '엣지' },
];
const OTHER_SECTION = { id: 'other', title: '기타', sizeMode: 'mixed' };

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
  const buckets = new Map(
    [...CATEGORY_SECTIONS, OTHER_SECTION].map(section => [section.id, { ...section, rows: [] }])
  );

  for (const row of rows || []) {
    const cat = normalizeCategory(row?.menuCategory);
    const section = CATEGORY_SECTIONS.find(entry => entry.matches(cat)) || OTHER_SECTION;
    const nextRow = section.sizeMode === 'single' ? normalizeSingleSizeRow(row) : row;
    buckets.get(section.id).rows.push(nextRow);
  }

  return [...buckets.values()]
    .filter(section => section.rows.length > 0)
    .map(section => ({
      id: section.id,
      title: section.title,
      sizeLabels: getSectionSizeLabels(section),
      rows: section.rows,
    }))
    .filter(section => section.sizeLabels.length > 0);
}

function getSectionSizeLabels(section) {
  if (section.sizeMode === 'single') return [SINGLE_SIZE_LABEL];
  if (section.sizeMode === 'lr') {
    const lrSizeLabels = collectSizeLabels(section.rows, isLrSizeLabel);
    return lrSizeLabels.length ? lrSizeLabels : collectSizeLabels(section.rows);
  }
  return collectSizeLabels(section.rows);
}
