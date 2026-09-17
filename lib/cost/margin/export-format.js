// 원가마진표 내보내기 공통: 상수, 이스케이프, 날짜/라벨 포맷, 사이즈·카테고리 판별
export const MAX_SHEET_NAME_LENGTH = 31;
export const LR_SIZE_LABELS = ['L', 'R'];
export const SINGLE_SIZE_LABEL = '단일';
const SINGLE_SIZE_CATEGORIES = new Set(['1인피자', '사이드', '소스', '음료', '엣지', '추가토핑']);
const SIZE_ORDER = ['L', 'R', '단일', '단품', '세트'];

export const esc = value =>
  String(value ?? '')
    .replace(/&/g, '&amp;')
    .replace(/</g, '&lt;')
    .replace(/>/g, '&gt;')
    .replace(/"/g, '&quot;');

export function getCostEntry(costMap, label) {
  if (!Object.prototype.hasOwnProperty.call(costMap || {}, label)) {
    return { hasCost: false, cost: 0 };
  }
  const cost = Number(costMap[label]);
  return Number.isFinite(cost) ? { hasCost: true, cost } : { hasCost: false, cost: 0 };
}

function padDatePart(value) {
  return String(value).padStart(2, '0');
}

export function asValidDate(value) {
  return value instanceof Date && Number.isFinite(value.getTime()) ? value : new Date();
}

export function formatMarginDownloadDate(date = new Date()) {
  const safeDate = asValidDate(date);
  return `${safeDate.getFullYear()}-${padDatePart(safeDate.getMonth() + 1)}-${padDatePart(
    safeDate.getDate()
  )}`;
}

export function hasOwnCost(costMap, label) {
  return Object.prototype.hasOwnProperty.call(costMap || {}, label);
}

export function normalizeSizeLabel(value) {
  return String(value || '').trim() || SINGLE_SIZE_LABEL;
}

export function isLrSizeLabel(label) {
  return LR_SIZE_LABELS.includes(normalizeSizeLabel(label).toUpperCase());
}

export function sortSizeLabels(labels) {
  return [...labels].sort((a, b) => {
    const ia = SIZE_ORDER.indexOf(a);
    const ib = SIZE_ORDER.indexOf(b);
    if (ia !== -1 && ib !== -1) return ia - ib;
    if (ia !== -1) return -1;
    if (ib !== -1) return 1;
    return a.localeCompare(b, 'ko');
  });
}

export function categoryLabel(row) {
  const label = String(row?.menuCategory || '기타').trim();
  return label || '기타';
}

export function isLrCategory(category) {
  const cat = String(category || '').trim();
  return cat === '세트박스' || cat === '피자' || cat.startsWith('피자/');
}

export function isSingleCategory(category) {
  return SINGLE_SIZE_CATEGORIES.has(String(category || '').trim());
}

export function formatPrintValue(value) {
  if (value === '' || value == null) return '<span class="dash">-</span>';
  if (typeof value === 'number' && Number.isFinite(value)) {
    return esc(value.toLocaleString('ko-KR'));
  }
  return esc(value);
}

export function discountLabel(discount) {
  if (!discount) return '없음';
  const value = Number(discount.value);
  if (!Number.isFinite(value)) return '없음';
  if (discount.type === 'pct') return `${value}%`;
  return `${Math.round(value).toLocaleString('ko-KR')}원`;
}

export function viewModeLabel(viewMode) {
  return viewMode === 'margin' ? '마진율' : '원가율';
}

export function formatRateMetric(metric) {
  return metric?.count ? `${metric.avg.toFixed(1)}%` : '';
}

export function platformMetaLabel(activePlatform, allPlatforms) {
  if (Array.isArray(allPlatforms)) return `전체 비교 (${allPlatforms.length}개)`;
  return activePlatform?.name || '기본';
}
