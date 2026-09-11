/**
 * lib/sales/store-user-rules.js — 사용자 정의 분류 룰 CRUD
 *
 * 4개 store:
 *   - ref_sales_aliases  (별칭)
 *   - sales_rules        (분류 규칙)
 *   - ref_excluded       (제외)
 *   - ref_discontinued   (비정규메뉴 단종 처리 — menu_master에 없는 판매명)
 *
 * 정적 룰(SALES_ALIASES/SALES_RULES)은 코드에 있어 CRUD 불가.
 * 사용자가 미매칭 해결 / 설정 페이지 / 보고서 순위표에서 추가한 룰만 여기서 관리.
 */

import { getAll, runTransaction, hasStore } from '../db';
import { assertActiveAdmin } from '@/lib/auth/guard';
import { asDisplayText, asObjectArray } from '../ui/prop-guards.js';

// 중복 판정 순수 함수 — 단위 테스트를 위해 export
export function normKey(v) {
  return asDisplayText(v).trim().toLowerCase().replace(/\s+/g, '');
}

export function sameId(a, b) {
  return String(a) === String(b);
}

export function sameAlias(row, rawName, excludeId) {
  const safeRow = row && typeof row === 'object' && !Array.isArray(row) ? row : {};
  const rowKey = normKey(safeRow.rawName);
  const inputKey = normKey(rawName);
  if (!rowKey || !inputKey) return false;
  return !sameId(safeRow.id, excludeId) && rowKey === inputKey;
}

export function sameRule(row, input = {}, excludeId) {
  const safeRow = row && typeof row === 'object' && !Array.isArray(row) ? row : {};
  const safeInput = input && typeof input === 'object' && !Array.isArray(input) ? input : {};
  const rawMenuName = asDisplayText(safeInput.rawMenuName);
  const category = asDisplayText(safeInput.category);
  const groupName = asDisplayText(safeInput.groupName);
  const detailName = asDisplayText(safeInput.detailName);
  const nextDetail = detailName.trim() || groupName.trim();
  const rowPattern = normKey(safeRow.rawMenuName || safeRow.pattern);
  const inputPattern = normKey(rawMenuName);
  const rowCategory = asDisplayText(safeRow.category);
  const inputCategory = category;
  const rowGroup = normKey(safeRow.groupName);
  const inputGroup = normKey(groupName);
  if (!rowPattern || !inputPattern || !rowCategory || !inputCategory || !rowGroup || !inputGroup) {
    return false;
  }

  return (
    !sameId(safeRow.id, excludeId) &&
    rowPattern === inputPattern &&
    rowCategory === inputCategory &&
    rowGroup === inputGroup &&
    normKey(safeRow.detailName || safeRow.groupName) === normKey(nextDetail)
  );
}

export function sameExcluded(row, menuName, excludeId) {
  const safeRow = row && typeof row === 'object' && !Array.isArray(row) ? row : {};
  const rowKey = normKey(safeRow.menuName);
  const inputKey = normKey(menuName);
  if (!rowKey || !inputKey) return false;
  return !sameId(safeRow.id, excludeId) && rowKey === inputKey;
}

/* ============================================================
   별칭 (ref_sales_aliases)
============================================================ */

/** 모든 사용자 정의 별칭 조회 */
export async function getUserAliases() {
  if (!hasStore('ref_sales_aliases')) return [];
  return asObjectArray(await getAll('ref_sales_aliases'));
}

/**
 * 별칭 추가.
 * @param {{ rawName: string, mappedName: string }} input
 * @throws Error — rawName 또는 mappedName이 비어있을 때
 */
export async function addUserAlias({ rawName, mappedName }) {
  await assertActiveAdmin('판매량 별칭 추가');
  if (!rawName?.trim() || !mappedName?.trim()) throw new Error('rawName과 mappedName은 필수입니다');
  const all = await getUserAliases();
  if (all.some(row => sameAlias(row, rawName))) throw new Error('이미 등록된 별칭입니다');
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
  await assertActiveAdmin('판매량 별칭 삭제');
  await runTransaction(['ref_sales_aliases'], 'readwrite', tx => {
    tx.objectStore('ref_sales_aliases').delete(id);
  });
}

/**
 * 별칭 부분 수정. undefined 필드는 변경하지 않음.
 * @param {{ id: number, rawName?: string, mappedName?: string, enable?: boolean }} input
 */
export async function updateUserAlias({ id, rawName, mappedName, enable }) {
  await assertActiveAdmin('판매량 별칭 수정');
  if (rawName !== undefined) {
    const all = await getUserAliases();
    if (all.some(row => sameAlias(row, rawName, id))) throw new Error('이미 등록된 별칭입니다');
  }
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
  return asObjectArray(await getAll('sales_rules'));
}

/**
 * 분류 규칙 추가. detailName 미지정 시 groupName 사용.
 * @param {{ rawMenuName: string, category: string, groupName: string, detailName?: string }} input
 * @throws Error — 필수 필드 누락 시
 */
export async function addUserRule({ rawMenuName, category, groupName, detailName }) {
  await assertActiveAdmin('판매량 분류 규칙 추가');
  if (!rawMenuName?.trim() || !category || !groupName?.trim()) {
    throw new Error('rawMenuName, category, groupName은 필수입니다');
  }
  const all = await getUserRules();
  if (all.some(row => sameRule(row, { rawMenuName, category, groupName, detailName }))) {
    throw new Error('이미 등록된 분류 규칙입니다');
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
  await assertActiveAdmin('판매량 분류 규칙 삭제');
  await runTransaction(['sales_rules'], 'readwrite', tx => {
    tx.objectStore('sales_rules').delete(id);
  });
}

/**
 * 분류 규칙 부분 수정. undefined 필드는 변경하지 않음.
 * rawMenuName 수정 시 pattern도 같이 동기화.
 */
export async function updateUserRule({ id, rawMenuName, category, groupName, detailName, enable }) {
  await assertActiveAdmin('판매량 분류 규칙 수정');
  if (
    rawMenuName !== undefined ||
    category !== undefined ||
    groupName !== undefined ||
    detailName !== undefined
  ) {
    const all = await getUserRules();
    const current = all.find(row => sameId(row.id, id));
    const next = {
      rawMenuName: rawMenuName ?? current?.rawMenuName ?? current?.pattern ?? '',
      category: category ?? current?.category ?? '',
      groupName: groupName ?? current?.groupName ?? '',
      detailName: detailName ?? current?.detailName ?? '',
    };
    if (all.some(row => sameRule(row, next, id))) throw new Error('이미 등록된 분류 규칙입니다');
  }
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
  return asObjectArray(await getAll('ref_excluded'));
}

/**
 * 제외 메뉴 추가.
 * @param {{ menuName: string }} input
 * @throws Error — menuName이 비어있을 때
 */
export async function addUserExcluded({ menuName }) {
  await assertActiveAdmin('판매량 제외 메뉴 추가');
  if (!menuName?.trim()) throw new Error('menuName은 필수입니다');
  const all = await getUserExcluded();
  if (all.some(row => sameExcluded(row, menuName))) throw new Error('이미 등록된 제외 메뉴입니다');
  await runTransaction(['ref_excluded'], 'readwrite', tx => {
    tx.objectStore('ref_excluded').add({
      menuName: menuName.trim(),
      createdAt: new Date().toISOString(),
    });
  });
}

/** 제외 메뉴 단건 삭제 */
export async function deleteUserExcluded(id) {
  await assertActiveAdmin('판매량 제외 메뉴 삭제');
  await runTransaction(['ref_excluded'], 'readwrite', tx => {
    tx.objectStore('ref_excluded').delete(id);
  });
}

/**
 * 제외 메뉴명 수정.
 * @param {{ id: number, menuName?: string }} input
 */
export async function updateUserExcluded({ id, menuName }) {
  await assertActiveAdmin('판매량 제외 메뉴 수정');
  if (menuName !== undefined) {
    const all = await getUserExcluded();
    if (all.some(row => sameExcluded(row, menuName, id)))
      throw new Error('이미 등록된 제외 메뉴입니다');
  }
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

/* ============================================================
   비정규메뉴 단종 처리 (ref_discontinued) — menuName 필드만 씀,
   중복 판정은 ref_excluded와 같은 sameExcluded를 재사용(구조 동일)
============================================================ */

/** 사용자가 단종 처리한 비정규메뉴(menu_master 미등록 판매명) 전체 조회 */
export async function getRefDiscontinued() {
  if (!hasStore('ref_discontinued')) return [];
  return asObjectArray(await getAll('ref_discontinued'));
}

/**
 * 비정규메뉴 단종 처리 추가 — 판매량 보고서 순위표에서 menu_master에 없는 판매명을
 * 선택했을 때 호출된다.
 * @param {{ menuName: string }} input
 * @throws Error — menuName이 비어있거나 이미 등록된 경우
 */
export async function addRefDiscontinued({ menuName }) {
  await assertActiveAdmin('비정규메뉴 단종 처리');
  if (!menuName?.trim()) throw new Error('menuName은 필수입니다');
  const all = await getRefDiscontinued();
  if (all.some(row => sameExcluded(row, menuName))) throw new Error('이미 단종 처리된 메뉴입니다');
  await runTransaction(['ref_discontinued'], 'readwrite', tx => {
    tx.objectStore('ref_discontinued').add({
      menuName: menuName.trim(),
      createdAt: new Date().toISOString(),
    });
  });
}

/** 비정규메뉴 단종 처리 해제(단건 삭제) */
export async function deleteRefDiscontinued(id) {
  await assertActiveAdmin('비정규메뉴 단종 처리 해제');
  await runTransaction(['ref_discontinued'], 'readwrite', tx => {
    tx.objectStore('ref_discontinued').delete(id);
  });
}

/**
 * 메뉴명으로 단종 처리를 찾아 해제한다 — 순위표의 배지에는 id 없이 표시명만 있으므로
 * UI가 id를 따로 들고 있지 않아도 되게 한다. 일치하는 행이 없으면 아무 일도 하지 않는다.
 * @param {string} menuName
 * @returns {Promise<{ deleted: boolean }>}
 */
export async function deleteRefDiscontinuedByName(menuName) {
  await assertActiveAdmin('비정규메뉴 단종 처리 해제');
  const all = await getRefDiscontinued();
  const match = all.find(row => sameExcluded(row, menuName));
  if (!match) return { deleted: false };
  await runTransaction(['ref_discontinued'], 'readwrite', tx => {
    tx.objectStore('ref_discontinued').delete(match.id);
  });
  return { deleted: true };
}
