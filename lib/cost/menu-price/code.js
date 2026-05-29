/**
 * lib/cost/menu-price/code.js — 메뉴코드 자동 생성
 *
 * 새 코드 체계 (2025-05 적용):
 *   피자:      P-{SUB}-{NNN}-{L|R}   예) P-OR-005-L
 *   1인피자:   P-ONE-{NNN}-ONE        예) P-ONE-001-ONE
 *   사이드:    S-{SUB}-{NNN}          예) S-CHK-001
 *   세트박스:  SET-{SUB}-{NNN}-{SIZE} 예) SET-FAM-001-L
 *   음료:      D-{SUB}-{NNN}-{SIZE}   예) D-CC-001-355
 *
 * ※ 판매가에서 직접 추가 시 중분류(SUB)가 없으면 'ETC' 사용.
 *   메뉴 마스터 기본 코드 등록 후 코드를 선택하는 방식을 권장.
 */

/**
 * 메뉴코드 → { category, subCategory } 자동 파싱
 *
 * P-PS-001-L  → { category: '피자/프리미엄 스페셜', subCategory: '프리미엄 스페셜' }
 * P-OR-005-R  → { category: '피자/오리지널',        subCategory: '오리지널' }
 * P-PR-002-L  → { category: '피자/프리미엄',        subCategory: '프리미엄' }
 * P-HH-001-L  → { category: '피자/하프앤하프',      subCategory: '하프앤하프' }
 * P-ONE-001-ONE → { category: '1인피자',            subCategory: '씬도우 전용' }
 * S-CHK-001   → { category: '사이드',               subCategory: '치킨' }
 * D-CC-001-355 → { category: '음료',                subCategory: '코카콜라' }
 * SET-FAM-001-L → { category: '세트박스',            subCategory: '패밀리박스' }
 */

const PIZZA_SUB_MAP = {
  PS:  '프리미엄 스페셜',
  PR:  '프리미엄',
  OR:  '오리지널',
  HH:  '하프앤하프',
  ONE: null, // 1인피자로 처리
};

export function parseCategoryFromCode(code) {
  if (!code) return { category: '', subCategory: '' };
  const parts = code.toUpperCase().split('-');

  // 세트박스: SET-FAM-001-L
  if (parts[0] === 'SET') {
    const subMap = { FAM: '패밀리박스' };
    return { category: '세트박스', subCategory: subMap[parts[1]] || parts[1] || '' };
  }

  // 음료: D-CC-001-355
  if (parts[0] === 'D') {
    const subMap = { CC: '코카콜라', CZ: '코카콜라 제로', SPR: '스프라이트' };
    return { category: '음료', subCategory: subMap[parts[1]] || parts[1] || '' };
  }

  // 사이드 / 소스: S-CHK-001, S-SAU-001
  if (parts[0] === 'S') {
    const sub = parts[1];
    if (sub === 'SAU') return { category: '소스', subCategory: '소스추가' };
    const subMap = { SPG: '스파게티', TBK: '떡볶이', CHK: '치킨', FRY: '튀김', SNK: '스낵', SLD: '샐러드', PKL: '피클류' };
    return { category: '사이드', subCategory: subMap[sub] || sub || '' };
  }

  // 엣지: OPT-EDGE-001
  if (parts[0] === 'OPT') {
    return { category: '엣지', subCategory: '도우옵션' };
  }

  // 피자: P-{SUB}-NNN-SIZE
  if (parts[0] === 'P') {
    const sub = parts[1]; // PS, PR, OR, HH, ONE …

    // 1인피자
    if (sub === 'ONE') return { category: '1인피자', subCategory: '씬도우 전용' };

    const subLabel = PIZZA_SUB_MAP[sub];
    if (subLabel) return { category: `피자/${subLabel}`, subCategory: subLabel };

    // 알 수 없는 중분류
    return { category: '피자', subCategory: sub || '' };
  }

  return { category: '', subCategory: '' };
}

export const CATEGORY_PREFIX = {
  '피자':     'P-ETC',
  '1인피자':  'P-ONE',
  '세트박스': 'SET-ETC',
  '사이드':   'S-ETC',
  '소스':     'S-SAU',
  '음료':     'D-ETC',
  '엣지':     'OPT-EDGE',
  '테스트':   'TEST',
};

/** 메뉴코드에서 숫자 시퀀스 추출 (다양한 형식 대응) */
export function parseMenuCode(code) {
  if (!code) return null;
  // P-OR-005-L, S-CHK-001, SET-FAM-001-L, D-CC-001-355 등
  const m = String(code).match(/^(.+?)-(\d{3})(?:-(.+))?$/);
  if (!m) return null;
  return {
    prefix: m[1],
    base:   parseInt(m[2], 10),
    size:   m[3] || null,
  };
}

/** prefix가 같은 항목들 중 최대 base 번호 */
function maxBaseForPrefix(prefix, codes) {
  let max = 0;
  for (const c of codes) {
    if (!c) continue;
    const parsed = parseMenuCode(c);
    if (parsed?.prefix === prefix && parsed.base > max) max = parsed.base;
  }
  return max;
}

/**
 * 단건 메뉴코드 생성.
 * menuCode가 이미 있으면 그대로 반환 (메뉴 마스터 연동 코드 우선).
 *
 * @param {object} item - { category, size, menuName, menuCode? }
 * @param {object[]} existingRecords
 * @returns {string}
 */
export function generateMenuCode({ category, size, menuName, menuCode }, existingRecords) {
  // 이미 코드가 있으면 그대로
  if (menuCode) return menuCode;

  const prefix = CATEGORY_PREFIX[category] || 'ETC';
  const records = existingRecords || [];
  const codes = records.map(r => r.menuCode);

  // 피자 — 같은 menuName의 다른 사이즈와 base·prefix 공유
  if (category === '피자') {
    const sameMenu = records.find(r =>
      r.category === '피자' && r.menuName === menuName && r.menuCode
    );
    if (sameMenu) {
      const parsed = parseMenuCode(sameMenu.menuCode);
      const samePrefix = parsed?.prefix || prefix;
      const base = parsed?.base || (maxBaseForPrefix(samePrefix, codes) + 1);
      return `${samePrefix}-${pad3(base)}-${size || 'L'}`;
    }
    const base = maxBaseForPrefix(prefix, codes) + 1;
    return `${prefix}-${pad3(base)}-${size || 'L'}`;
  }

  // 1인피자
  if (category === '1인피자') {
    const base = maxBaseForPrefix(prefix, codes) + 1;
    return `${prefix}-${pad3(base)}-ONE`;
  }

  // 세트박스
  if (category === '세트박스') {
    const sameMenu = records.find(r =>
      r.category === '세트박스' && r.menuName === menuName && r.menuCode
    );
    let base = sameMenu ? (parseMenuCode(sameMenu.menuCode)?.base || 0) : 0;
    if (!base) base = maxBaseForPrefix(prefix, codes) + 1;
    return size && size !== '단일'
      ? `${prefix}-${pad3(base)}-${size}`
      : `${prefix}-${pad3(base)}`;
  }

  // 사이드·음료·기타 — 단순 시퀀스
  const seq = maxBaseForPrefix(prefix, codes) + 1;
  return `${prefix}-${pad3(seq)}`;
}

/**
 * 배치(업로드) — 여러 행에 대해 menuCode 일괄 생성.
 * 배치 내 중복 방지를 위해 생성된 코드를 누적 추적.
 */
export function generateMenuCodesForBatch(items) {
  const accum = [];
  return items.map(it => {
    if (it.menuCode) { accum.push(it); return it; }
    const code = generateMenuCode(it, accum);
    const next = { ...it, menuCode: code };
    accum.push(next);
    return next;
  });
}

function pad3(n) { return String(n).padStart(3, '0'); }
