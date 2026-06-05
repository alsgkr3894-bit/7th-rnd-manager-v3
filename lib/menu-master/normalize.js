/**
 * lib/menu-master/normalize.js — 메뉴코드 정규화 (일회성 마이그레이션)
 *
 * 1인피자 코드 끝의 '-ONE' 접미사 제거.
 * 코드 생성 로직은 이미 P-ONE-004 형태로 고쳐졌으나(f7bad21),
 * 기존 저장 데이터에 P-ONE-004-ONE 가 남아 P-ONE-004 와 중복 집계되는 문제 해결.
 *
 * idempotent: 변경 대상이 없으면 no-op. 매 로드마다 호출해도 안전.
 */

import { getAll, runTransaction, hasStore } from '@/lib/db';

const PERSONAL_SUFFIX_RE = /^(P-ONE-\d{3})-ONE$/i;

/** 코드에서 1인피자 '-ONE' 접미사를 제거한 base 코드 반환. 해당 없으면 null. */
export function stripPersonalSuffix(code) {
  const m = PERSONAL_SUFFIX_RE.exec(String(code || ''));
  return m ? m[1].toUpperCase() : null;
}

/**
 * 단일 store에서 P-ONE-###-ONE 코드를 정규화.
 *   - base(P-ONE-###)가 이미 존재 → 구 레코드(-ONE) 삭제 (중복 제거)
 *   - base 미존재 → menuCode 를 base 로 갱신 (rename)
 *
 * @param {string} storeName
 * @returns {Promise<{ renamed: number, removed: number }>}
 */
async function normalizeStore(storeName) {
  if (!hasStore(storeName)) return { renamed: 0, removed: 0 };
  const all = await getAll(storeName);
  const codeSet = new Set(all.map(r => r.menuCode).filter(Boolean));

  const toPut = [];
  const toDelete = [];
  for (const r of all) {
    const base = stripPersonalSuffix(r.menuCode);
    if (!base) continue;
    if (codeSet.has(base)) {
      toDelete.push(r.id);          // base 이미 존재 → 중복 삭제
    } else {
      toPut.push({ ...r, menuCode: base });
      codeSet.add(base);            // 같은 배치 내 추가 중복 방지
    }
  }

  if (toPut.length + toDelete.length === 0) return { renamed: 0, removed: 0 };

  await runTransaction([storeName], 'readwrite', tx => {
    const store = tx.objectStore(storeName);
    for (const r of toPut)    store.put(r);
    for (const id of toDelete) store.delete(id);
  });
  return { renamed: toPut.length, removed: toDelete.length };
}

/**
 * 1인피자 코드 정규화 — menu_master + cost_selling_prices + cost_recipes 대상.
 * @returns {Promise<{ changed: number }>}
 */
export async function normalizePersonalPizzaCodes() {
  const stores = ['menu_master', 'cost_selling_prices', 'cost_recipes'];
  let changed = 0;
  for (const s of stores) {
    const { renamed, removed } = await normalizeStore(s);
    changed += renamed + removed;
  }
  return { changed };
}
