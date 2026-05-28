/**
 * lib/cost/margin/platforms.js
 * 플랫폼별 수수료 설정 + 마진 계산
 *
 * fee 구조:
 *   { id, label, type: 'pct',   value: 7.5 }             → 판매가 × value%
 *   { id, label, type: 'fixed', value: 3000,
 *     sizeOverrides?: { L?: 3500, R?: 2500 } }            → 고정금액, 사이즈별 재정의 가능
 *
 * sizeOverrides 미설정 시 value(공통)로 폴백.
 */

const KEY = 'v3:cost-platforms';

export const DEFAULT_PLATFORMS = [
  {
    id: 'default',
    name: '기본',
    fees: [],
  },
  {
    id: 'visit',
    name: '방문/포장',
    fees: [
      { id: 'f1', label: '할인', type: 'fixed', value: 7000 },
    ],
  },
  {
    id: 'baemin',
    name: '배달의민족',
    fees: [
      { id: 'f1', label: '플랫폼수수료', type: 'pct',   value: 7.5 },
      { id: 'f2', label: '배달비',       type: 'fixed', value: 3000 },
      { id: 'f3', label: '카드수수료',   type: 'pct',   value: 2.5 },
    ],
  },
];

export function loadPlatforms() {
  if (typeof localStorage === 'undefined') return DEFAULT_PLATFORMS;
  try {
    const raw = localStorage.getItem(KEY);
    if (raw) return JSON.parse(raw);
  } catch {}
  return DEFAULT_PLATFORMS;
}

export function savePlatforms(platforms) {
  try {
    localStorage.setItem(KEY, JSON.stringify(platforms));
  } catch {}
}

/**
 * 할인 적용 후 실효 판매가
 */
export function applyDiscount(sellingPrice, discount) {
  if (!sellingPrice || sellingPrice <= 0) return sellingPrice ?? 0;
  if (!discount || !discount.value) return sellingPrice;
  const amt = discount.type === 'pct'
    ? sellingPrice * discount.value / 100
    : discount.value;
  return Math.max(0, sellingPrice - amt);
}

/**
 * 고정 fee 한 항목의 실제 차감액 (사이즈 고려)
 * sizeLabel이 있고 sizeOverrides에 해당 사이즈가 있으면 그 값 사용, 없으면 공통(value) 폴백
 */
function fixedFeeAmount(fee, sizeLabel) {
  if (sizeLabel && fee.sizeOverrides) {
    const override = fee.sizeOverrides[sizeLabel];
    if (override != null && override !== '') return parseFloat(override) || 0;
  }
  return parseFloat(fee.value) || 0;
}

/**
 * 실효 판매가에서 플랫폼 수수료 차감 후 수령액
 * @param {number}  effectivePrice  할인 적용된 판매가
 * @param {Array}   fees            플랫폼 fee 배열
 * @param {string}  [sizeLabel]     'L' | 'R' | '단일' 등 — 고정비 사이즈 분기에 사용
 */
export function calcNetRevenue(effectivePrice, fees, sizeLabel) {
  if (!effectivePrice || effectivePrice <= 0) return 0;
  let deduction = 0;
  for (const f of (fees || [])) {
    if (f.type === 'fixed') deduction += fixedFeeAmount(f, sizeLabel);
    else if (f.type === 'pct') deduction += effectivePrice * (f.value || 0) / 100;
  }
  return Math.max(0, effectivePrice - deduction);
}

/**
 * 마진율: (수령액 - 원가) / 수령액 × 100
 */
export function calcPlatformMargin(cost, netRevenue) {
  if (!netRevenue || netRevenue <= 0) return null;
  return ((netRevenue - cost) / netRevenue) * 100;
}
