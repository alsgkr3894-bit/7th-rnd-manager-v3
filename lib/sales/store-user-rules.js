/**
 * lib/sales/store-user-rules.js — 사용자 정의 분류 룰 CRUD
 *
 * 3개 store:
 *   - ref_sales_aliases  (별칭)
 *   - sales_rules        (분류 규칙)
 *   - ref_excluded       (제외)
 *
 * 정적 룰(SALES_ALIASES/SALES_RULES)은 코드에 있어 CRUD 불가.
 * 사용자가 미매칭 해결 / 설정 페이지에서 추가한 룰만 여기서 관리.
 */

import { getAll, runTransaction, hasStore } from '../db';

/* ============================================================
   별칭 (ref_sales_aliases)
============================================================ */

/** 모든 사용자 정의 별칭 조회 */
export async function getUserAliases() {
  if (!hasStore('ref_sales_aliases')) return [];
  return getAll('ref_sales_aliases');
}

/**
 * 별칭 추가.
 * @param {{ rawName: string, mappedName: string }} input
 * @throws Error — rawName 또는 mappedName이 비어있을 때
 */
export async function addUserAlias({ rawName, mappedName }) {
  if (!rawName?.trim() || !mappedName?.trim()) throw new Error('rawName과 mappedName은 필수입니다');
  await runTransaction(['ref_sales_aliases'], 'readwrite', tx => {
    tx.objectStore('ref_sales_aliases').add({
      rawName: rawName.trim(),
      mappedName: mappedName.trim(),
      enable: true,
      createdAt: new Date().toISOString(),
    });
  });
}

/** 별칭 단건 삭제 */
export async function deleteUserAlias(id) {
  await runTransaction(['ref_sales_aliases'], 'readwrite', tx => {
    tx.objectStore('ref_sales_aliases').delete(id);
  });
}

/**
 * 별칭 부분 수정. undefined 필드는 변경하지 않음.
 * @param {{ id: number, rawName?: string, mappedName?: string, enable?: boolean }} input
 */
export async function updateUserAlias({ id, rawName, mappedName, enable }) {
  await runTransaction(['ref_sales_aliases'], 'readwrite', tx => {
    const store = tx.objectStore('ref_sales_aliases');
    const req = store.get(id);
    req.onsuccess = () => {
      const cur = req.result;
      if (!cur) {
        tx.abort();
        return;
      }
      const next = { ...cur, updatedAt: new Date().toISOString() };
      if (rawName !== undefined) next.rawName = rawName.trim();
      if (mappedName !== undefined) next.mappedName = mappedName.trim();
      if (enable !== undefined) next.enable = !!enable;
      store.put(next);
    };
    req.onerror = () => tx.abort();
  });
}

/* ============================================================
   분류 규칙 (sales_rules)
============================================================ */

/** 모든 사용자 정의 분류 규칙 조회 */
export async function getUserRules() {
  if (!hasStore('sales_rules')) return [];
  return getAll('sales_rules');
}

/**
 * 분류 규칙 추가. detailName 미지정 시 groupName 사용.
 * @param {{ rawMenuName: string, category: string, groupName: string, detailName?: string }} input
 * @throws Error — 필수 필드 누락 시
 */
export async function addUserRule({ rawMenuName, category, groupName, detailName }) {
  if (!rawMenuName?.trim() || !category || !groupName?.trim()) {
    throw new Error('rawMenuName, category, groupName은 필수입니다');
  }
  await runTransaction(['sales_rules'], 'readwrite', tx => {
    tx.objectStore('sales_rules').add({
      rawMenuName: rawMenuName.trim(),
      matchType: 'exact',
      pattern: rawMenuName.trim(),
      category,
      groupName: groupName.trim(),
      detailName: (detailName || '').trim() || groupName.trim(),
      enable: true,
      createdAt: new Date().toISOString(),
    });
  });
}

/** 분류 규칙 단건 삭제 */
export async function deleteUserRule(id) {
  await runTransaction(['sales_rules'], 'readwrite', tx => {
    tx.objectStore('sales_rules').delete(id);
  });
}

/**
 * 분류 규칙 부분 수정. undefined 필드는 변경하지 않음.
 * rawMenuName 수정 시 pattern도 같이 동기화.
 */
export async function updateUserRule({ id, rawMenuName, category, groupName, detailName, enable }) {
  await runTransaction(['sales_rules'], 'readwrite', tx => {
    const store = tx.objectStore('sales_rules');
    const req = store.get(id);
    req.onsuccess = () => {
      const cur = req.result;
      if (!cur) {
        tx.abort();
        return;
      }
      const next = { ...cur, updatedAt: new Date().toISOString() };
      if (rawMenuName !== undefined) {
        next.rawMenuName = rawMenuName.trim();
        next.pattern = rawMenuName.trim();
      }
      if (category !== undefined) next.category = category;
      if (groupName !== undefined) next.groupName = groupName.trim();
      if (detailName !== undefined)
        next.detailName = (detailName || '').trim() || (groupName ?? cur.groupName ?? '');
      if (enable !== undefined) next.enable = !!enable;
      store.put(next);
    };
    req.onerror = () => tx.abort();
  });
}

/* ============================================================
   제외 (ref_excluded) — enable 컬럼 없음 / 토글 미지원
============================================================ */

/** 모든 사용자 정의 제외 메뉴 조회 */
export async function getUserExcluded() {
  if (!hasStore('ref_excluded')) return [];
  return getAll('ref_excluded');
}

/**
 * 제외 메뉴 추가.
 * @param {{ menuName: string }} input
 * @throws Error — menuName이 비어있을 때
 */
export async function addUserExcluded({ menuName }) {
  if (!menuName?.trim()) throw new Error('menuName은 필수입니다');
  await runTransaction(['ref_excluded'], 'readwrite', tx => {
    tx.objectStore('ref_excluded').add({
      menuName: menuName.trim(),
      createdAt: new Date().toISOString(),
    });
  });
}

/** 제외 메뉴 단건 삭제 */
export async function deleteUserExcluded(id) {
  await runTransaction(['ref_excluded'], 'readwrite', tx => {
    tx.objectStore('ref_excluded').delete(id);
  });
}

/**
 * 제외 메뉴명 수정.
 * @param {{ id: number, menuName?: string }} input
 */
export async function updateUserExcluded({ id, menuName }) {
  await runTransaction(['ref_excluded'], 'readwrite', tx => {
    const store = tx.objectStore('ref_excluded');
    const req = store.get(id);
    req.onsuccess = () => {
      const cur = req.result;
      if (!cur) {
        tx.abort();
        return;
      }
      const next = { ...cur, updatedAt: new Date().toISOString() };
      if (menuName !== undefined) next.menuName = menuName.trim();
      store.put(next);
    };
    req.onerror = () => tx.abort();
  });
}
