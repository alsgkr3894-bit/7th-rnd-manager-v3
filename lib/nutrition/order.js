/**
 * lib/nutrition/order.js — 영양성분(원산지·알레르기) 사용자 정의 정렬 순서
 *
 * 메뉴 순서·알레르기 순서를 localStorage에 키 배열로 저장하고,
 * 그 순서대로 항목을 정렬한다. 저장된 순서에 없는 항목은 뒤에 ㄱㄴㄷ로 붙는다.
 */
import { getJSONLS, setJSONLS } from '@/lib/note/storage';

/** 메뉴 순서 키 — 원산지 전용. 알레르기는 별도 키로 분리해 독립적으로 관리 */
export const MENU_ORDER_KEY         = 'v3:nutrition-menu-order';         // 원산지 전용
export const ALLERGEN_MENU_ORDER_KEY = 'v3:nutrition-allergen-menu-order'; // 알레르기 전용
/** 알레르기 22종 순서 키 */
export const ALLERGEN_ORDER_KEY = 'v3:nutrition-allergen-order';

/** 저장된 순서 배열 읽기 (없으면 []) */
export function loadOrder(key) {
  const arr = getJSONLS(key);
  return Array.isArray(arr) ? arr.filter(item => typeof item === 'string' && item.trim()) : [];
}

/** 순서 배열 저장 */
export function saveOrder(key, orderedKeys) {
  setJSONLS(
    key,
    Array.isArray(orderedKeys)
      ? orderedKeys.filter(item => typeof item === 'string' && item.trim())
      : []
  );
}

/**
 * items를 orderedKeys 순서로 정렬한다.
 * - orderedKeys에 있는 항목은 그 순서대로 앞에
 * - 나머지는 뒤에 labelFn 기준 ㄱㄴㄷ(ko)로
 *
 * @param {T[]} items
 * @param {string[]} orderedKeys
 * @param {(item:T)=>string} keyFn     항목 식별 키 추출
 * @param {(item:T)=>string} [labelFn] 미지정 항목 ㄱㄴㄷ 정렬용 (기본: keyFn)
 * @returns {T[]} 새 배열
 */
export function applyOrder(items, orderedKeys, keyFn, labelFn = keyFn) {
  const rank = new Map((orderedKeys || []).map((k, i) => [k, i]));
  return [...items].sort((a, b) => {
    const ra = rank.has(keyFn(a)) ? rank.get(keyFn(a)) : Infinity;
    const rb = rank.has(keyFn(b)) ? rank.get(keyFn(b)) : Infinity;
    if (ra !== rb) return ra - rb;
    return (labelFn(a) || '').localeCompare(labelFn(b) || '', 'ko');
  });
}
