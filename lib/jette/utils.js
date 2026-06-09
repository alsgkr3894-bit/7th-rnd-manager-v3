/**
 * 제때상품관리(jette) 공통 유틸리티 — 순수 함수만 포함.
 */

import { asDisplayText, asObjectArray } from '../ui/prop-guards.js';

/**
 * 행 배열을 지정된 키로 정렬해 새 배열을 반환한다.
 * null은 항상 뒤로, 문자열은 한국어 로케일 기준으로 정렬한다.
 *
 * @param {object[]}  list
 * @param {string}    key          - 정렬 기준 필드명
 * @param {'asc'|'desc'} dir
 * @param {((v: any, row: object) => any) | null} [keyTransform]
 *   - 특수 키를 비교 가능한 값으로 변환할 때 사용 (선택)
 * @returns {object[]}
 */
export function sortByKey(list, key, dir, keyTransform = null) {
  const safeList = asObjectArray(list);
  const safeKey = asDisplayText(key);
  const transform = typeof keyTransform === 'function' ? keyTransform : null;
  const d = dir === 'asc' ? 1 : -1;
  return [...safeList].sort((a, b) => {
    const va = transform ? transform(a[safeKey], a) : a[safeKey];
    const vb = transform ? transform(b[safeKey], b) : b[safeKey];
    if (va == null && vb == null) return 0;
    if (va == null) return 1;
    if (vb == null) return -1;
    if (typeof va === 'string') return va.localeCompare(vb, 'ko') * d;
    return va > vb ? d : va < vb ? -d : 0;
  });
}

/**
 * 행 배열에서 productType별 개수를 반환한다.
 *
 * @param {object[]} rows
 * @param {Map}      productTypeLookup - productCode → { productType }
 * @returns {{ exclusive: number, generic: number, 'generic-managed': number }}
 */
export function getProductTypeCounts(rows, productTypeLookup) {
  const safeRows = asObjectArray(rows);
  const lookup = productTypeLookup instanceof Map ? productTypeLookup : new Map();
  const get = (type) =>
    safeRows.filter(r => lookup.get(asDisplayText(r.productCode))?.productType === type).length;
  return {
    exclusive:         get('exclusive'),
    generic:           get('generic'),
    'generic-managed': get('generic-managed'),
  };
}
