/**
 * lib/cost/menu-price/template.js — 메뉴 판매가 양식 데이터·헤더
 */

import { getActiveBrandId } from '@/lib/active-brand';

// 7번가(main) 전용 피자 카테고리 프리셋. 다른 브랜드는 빈 프리셋 → 자유 입력.
export const MENU_PRICE_CATEGORIES = [
  '피자', '피자/프리미엄 스페셜', '피자/프리미엄', '피자/오리지널', '피자/하프앤하프',
  '1인피자', '세트박스', '사이드', '소스', '음료', '엣지', '테스트',
];

/**
 * 활성 브랜드의 카테고리 프리셋.
 *   - main(7번가): 위 피자 카테고리 그대로
 *   - 그 외 브랜드: [] (드롭다운 대신 자유 입력, 피자 카테고리 노출 안 함)
 */
export function getMenuPriceCategories() {
  return getActiveBrandId() === 'main' ? MENU_PRICE_CATEGORIES : [];
}

/**
 * 중분류 코드 × 사이즈별 기본 판매가 (부가세 포함)
 * 사이드·세트박스·음료는 메뉴마다 다르므로 별도 입력
 */
export const DEFAULT_PRICE_MAP = {
  // 중분류코드: { L, R, ONE }
  PS:  { L: 32500, R: 25900 },
  PR:  { L: 29900, R: 22900 },
  OR:  { L: 26900, R: 20900 },
  HH:  { L: 27900, R: 21900 },
  ONE: { 단품: 6900 },
};

/**
 * 메뉴코드에서 기본 판매가 반환
 * @param {string} menuCode  예) 'P-OR-005-L'
 * @returns {number|null}
 */
export function getDefaultPrice(menuCode) {
  if (!menuCode) return null;
  const parts = menuCode.toUpperCase().split('-');
  if (parts[0] !== 'P') return null;
  const sub  = parts[1];            // PS | PR | OR | HH | ONE
  // 1인피자(P-ONE-*)는 사이즈 접미사 유무와 무관하게 판매가 키는 '단품'
  const lastPart = parts[parts.length - 1];
  const size = sub === 'ONE' ? '단품' : lastPart;
  return DEFAULT_PRICE_MAP[sub]?.[size] ?? null;
}

/** 피자/세트박스는 L/R, 그 외는 단일 */
export function defaultSizesFor(category) {
  const cat = category?.split('/')[0];
  return (cat === '피자' || cat === '세트박스') ? ['L', 'R'] : ['단일'];
}

/** 엑셀/CSV 양식 헤더 — 메뉴코드는 선택(비우면 자동 생성) */
export const TEMPLATE_HEADERS = ['메뉴코드', '분류', '메뉴명', '규격', '판매가', '비고'];

/** 양식 다운로드용 샘플 행 — 메뉴코드 비워두면 자동 발급됨 */
export const TEMPLATE_SAMPLE_ROWS = [
  ['P-OR-005-L', '피자/오리지널',       '슈퍼콤비네이션 피자', 'L',    '26900', ''],
  ['P-OR-005-R', '피자/오리지널',       '슈퍼콤비네이션 피자', 'R',    '20900', ''],
  ['P-ONE-002',     '1인피자',          '페페로니 피자',       '단일', '6900',  ''],
  ['SET-FAM-001-L', '세트박스',         '패밀리박스',          'L',    '39900', ''],
  ['S-SPG-001',  '사이드',             '쉬림프 아라비아따',   '단일', '8500',  ''],
  ['S-SAU-001',  '소스',               '갈릭디핑소스',        '단일', '200',   ''],
  ['D-CC-001-355', '음료',             '코카콜라355ml',       '단일', '1600',  ''],
  ['OPT-EDGE-002', '엣지',             '치즈크러스트',        '단일', '4000',  ''],
];

/** 양식에 들어갈 전체 행 (헤더 + 샘플) */
export function buildTemplateRows() {
  return [TEMPLATE_HEADERS, ...TEMPLATE_SAMPLE_ROWS];
}
