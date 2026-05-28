/**
 * lib/cost/menu-price/code.js — 메뉴코드 자동 생성
 *
 * 형식:
 *   피자:     PZ-{NNN}-{L|R}  — 같은 메뉴명의 L/R은 base 공유 (PZ-001-L / PZ-001-R)
 *   1인피자:  IP-{NNN}
 *   사이드:   SD-{NNN}
 *   세트박스: ST-{NNN}
 */

export const CATEGORY_PREFIX = {
  '피자':     'PZ',
  '1인피자':  'IP',
  '사이드':   'SD',
  '세트박스': 'ST',
  '테스트':   'TS',
};

/** 메뉴코드에서 prefix(앞 2글자)와 base 숫자 추출 */
export function parseMenuCode(code) {
  if (!code) return null;
  const m = String(code).match(/^([A-Z]+)-(\d+)(?:-(L|R))?$/);
  if (!m) return null;
  return {
    prefix: m[1],
    base:   parseInt(m[2], 10),
    size:   m[3] || null,
  };
}

/** 분류별 최대 base 번호 (다음 시퀀스 결정용) */
function maxBaseInCategory(category, existing) {
  const prefix = CATEGORY_PREFIX[category];
  if (!prefix) return 0;
  let max = 0;
  for (const c of existing) {
    if (!c) continue;
    const parsed = parseMenuCode(c);
    if (parsed?.prefix === prefix && parsed.base > max) max = parsed.base;
  }
  return max;
}

/**
 * 단건 메뉴코드 생성.
 *
 * @param {object} item - { category, size, menuName }
 * @param {object[]} existingRecords - 기존 cost_selling_prices (menuCode 포함)
 * @returns {string} 새 메뉴코드
 */
export function generateMenuCode({ category, size, menuName }, existingRecords) {
  const prefix = CATEGORY_PREFIX[category];
  if (!prefix) return ''; // 분류 미정 시 코드 발급 안 함
  const records = existingRecords || [];

  // 피자 — 같은 menuName 다른 사이즈가 있으면 base 재사용
  if (category === '피자') {
    const sameMenu = records.find(r =>
      r.category === '피자' && r.menuName === menuName && r.menuCode
    );
    let base;
    if (sameMenu) {
      base = parseMenuCode(sameMenu.menuCode)?.base || 0;
    }
    if (!base) {
      base = maxBaseInCategory('피자', records.map(r => r.menuCode)) + 1;
    }
    return `${prefix}-${pad3(base)}-${size || 'L'}`;
  }

  // 그 외 (1인/사이드/세트박스) — 단순 시퀀스
  const seq = maxBaseInCategory(category, records.map(r => r.menuCode)) + 1;
  return `${prefix}-${pad3(seq)}`;
}

/**
 * 배치(업로드) — 여러 행에 대해 menuCode 일괄 생성.
 * 배치 내 중복 방지를 위해 생성된 코드를 누적 추적.
 *
 * @param {object[]} items - 입력 행 (menuCode 비어있을 수 있음)
 * @returns {object[]} menuCode가 채워진 새 배열
 */
export function generateMenuCodesForBatch(items) {
  const accum = []; // 누적된 record (menuCode 포함) — generateMenuCode가 참조
  return items.map(it => {
    if (it.menuCode) {
      accum.push(it);
      return it;
    }
    const code = generateMenuCode(it, accum);
    const next = { ...it, menuCode: code };
    accum.push(next);
    return next;
  });
}

function pad3(n) { return String(n).padStart(3, '0'); }
