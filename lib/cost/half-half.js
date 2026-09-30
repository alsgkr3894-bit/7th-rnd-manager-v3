/**
 * lib/cost/half-half.js — 하프앤하프 피자 원가 (순수)
 *
 * 하프앤하프는 두 피자를 반씩 섞는 메뉴라 고정 레시피가 없다. 원가는 사이즈별로
 * 오리지널 피자 중 최대 원가와 최소 원가의 평균으로 정한다(2026-09-30 주임님 결정).
 * 각 피자 원가에는 도우·박스 같은 공통묶음이 이미 들어 있어, 평균에도 공통 구성품
 * 한 판 몫이 그대로 남는다(두 번 세지 않는다).
 *
 * 원가마진표(lib/cost/margin/build-rows.js)와 원가 보고서(lib/report/build-cost-report.js)가
 * 같은 규칙을 쓴다.
 */

export const HALF_HALF_CATEGORY = '피자/하프앤하프';
export const HALF_HALF_BASE_CATEGORY = '피자/오리지널';

const text = value => String(value ?? '').trim();

export function isHalfHalfCategory(category) {
  return text(category) === HALF_HALF_CATEGORY;
}

export function isHalfHalfBaseCategory(category) {
  return text(category) === HALF_HALF_BASE_CATEGORY;
}

/**
 * 사이즈별 하프앤하프 원가.
 *
 * @param {Array<{ menuCode?: string, menuName?: string, size?: string, cost: number }>} candidates
 *   오리지널 피자 후보 — 단종 메뉴는 호출하는 쪽에서 미리 뺀다.
 * @returns {Record<string, { cost: number, max: object, min: object, count: number }>}
 *   원가가 있는 후보가 없는 사이즈는 결과에 없다. 후보가 하나면 그 원가를 그대로 쓴다.
 */
export function buildHalfHalfCostBySize(candidates = []) {
  const bySize = {};
  for (const item of Array.isArray(candidates) ? candidates : []) {
    const cost = Number(item?.cost);
    const size = text(item?.size);
    if (!size || !Number.isFinite(cost) || cost <= 0) continue;
    const entry = { menuCode: text(item.menuCode), menuName: text(item.menuName), cost };
    const current = bySize[size];
    if (!current) {
      bySize[size] = { max: entry, min: entry, count: 1 };
      continue;
    }
    current.count += 1;
    if (cost > current.max.cost) current.max = entry;
    if (cost < current.min.cost) current.min = entry;
  }
  for (const entry of Object.values(bySize)) {
    entry.cost = (entry.max.cost + entry.min.cost) / 2;
  }
  return bySize;
}

/** 원가 보고서·원가마진표에 붙이는 설명 문구 */
export const HALF_HALF_COST_NOTE =
  '하프앤하프 원가는 오리지널 피자 중 최대 원가와 최소 원가를 반씩 합친 값입니다.';

const won = value => `${Math.round(Number(value) || 0).toLocaleString('ko-KR')}원`;
const menuLabel = item => text(item?.menuName || item?.menuCode).replace(/\s+[LR]$/i, '');

/** 한 사이즈의 근거 — "최대 컨츄리치킨 피자 7,614원 · 최소 페페로니 피자 5,976원" */
export function formatHalfHalfBasis(basis) {
  if (!basis?.max || !basis?.min) return '';
  if (basis.count === 1 || basis.max === basis.min) {
    return `기준 ${menuLabel(basis.max)} ${won(basis.max.cost)}`;
  }
  return `최대 ${menuLabel(basis.max)} ${won(basis.max.cost)} · 최소 ${menuLabel(basis.min)} ${won(basis.min.cost)}`;
}

/**
 * 원가 보고서 하프앤하프 행 아래 설명 — 사이즈별 근거까지 한 줄로.
 * @param {Record<string, object>} basisBySize - { L: halfHalf, R: halfHalf } (없는 사이즈는 생략)
 */
export function buildHalfHalfNote(basisBySize = {}) {
  const parts = ['L', 'R', '단일']
    .filter(size => basisBySize?.[size])
    .map(size => `${size}: ${formatHalfHalfBasis(basisBySize[size])}`);
  if (!parts.length) return '';
  return `※ ${HALF_HALF_COST_NOTE} (${parts.join(' / ')})`;
}
