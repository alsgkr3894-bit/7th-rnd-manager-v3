/**
 * lib/nutrition/values/menu-refs.js — nutrition_menu_ref CRUD
 *
 * 메뉴 목록 조회·추가·삭제. cascade 삭제 시 raw-values의 deleteRawValuesByMenuCode를 호출한다.
 */
import { getAll, getByIndex, deleteById, runTransaction, hasStore } from '@/lib/db';
import { assertActiveAdmin } from '@/lib/auth/guard';
import { compactRecordsByKey, menuRefKey } from './dedup';
import { cleanKey, byDisplayOrder, upsertWithTimestamp, upsertUniqueByIndex } from './shared';

export async function getAllMenuRefs() {
  if (!hasStore('nutrition_menu_ref')) return [];
  const rows = await getAll('nutrition_menu_ref');
  return compactRecordsByKey(rows, menuRefKey).sort(byDisplayOrder);
}

export async function upsertMenuRef(data) {
  await assertActiveAdmin('영양 메뉴 참조 저장');
  const menuCode = cleanKey(data?.menuCode);
  if (!menuCode) return upsertWithTimestamp('nutrition_menu_ref', data);
  return upsertUniqueByIndex('nutrition_menu_ref', 'menuCode', menuCode, {
    ...data,
    menuCode,
  });
}

/**
 * 기존 베이스 메뉴의 메뉴명/코드를 수정한다.
 *
 * 코드가 바뀌면 nutrition_raw_values의 menuCode도 같은 트랜잭션에서 함께
 * 옮긴다 — 그냥 upsertMenuRef({id, menuCode: newCode, ...})만 호출하면
 * menu_ref는 새 코드로 바뀌지만(put이 같은 id를 갱신) raw_values는
 * 옛 코드에 그대로 남아 고아가 되어 그 메뉴의 영양값이 조용히 사라진다.
 *
 * @param {{id:number, menuCode:string}} existingRef 수정 대상 원본 레코드
 * @param {{menuCode?:string, menuName?:string}} updates
 */
export async function updateMenuRefIdentity(existingRef, updates = {}) {
  await assertActiveAdmin('영양 메뉴 정보 수정');
  const oldCode = cleanKey(existingRef?.menuCode);
  const newCode = cleanKey(updates?.menuCode ?? existingRef?.menuCode) || oldCode;
  const newName =
    updates?.menuName !== undefined ? String(updates.menuName).trim() : existingRef?.menuName;
  if (!newCode) throw new Error('메뉴코드가 필요합니다');
  if (existingRef?.id == null) throw new Error('수정할 메뉴를 찾을 수 없습니다');

  if (newCode === oldCode) {
    // 이름만 바뀌는 경우 — raw_values 이관이 필요 없다.
    return upsertMenuRef({ ...existingRef, ...updates, menuCode: newCode, menuName: newName });
  }

  const hasMenuRefStore = hasStore('nutrition_menu_ref');
  const hasRawValueStore = hasStore('nutrition_raw_values');

  if (hasMenuRefStore) {
    const conflictRows = await getByIndex('nutrition_menu_ref', 'menuCode', newCode);
    if (conflictRows.some(row => row.id !== existingRef.id)) {
      throw new Error(`이미 사용 중인 코드입니다: ${newCode}`);
    }
  }

  const rawTargets = hasRawValueStore
    ? (await getAll('nutrition_raw_values')).filter(
        row => row.menuCode === oldCode && row.id != null
      )
    : [];

  const timestamp = new Date().toISOString();
  const nextRef = {
    ...existingRef,
    ...updates,
    menuCode: newCode,
    menuName: newName,
    id: existingRef.id,
    updatedAt: timestamp,
  };

  const stores = [
    ...(hasMenuRefStore ? ['nutrition_menu_ref'] : []),
    ...(hasRawValueStore ? ['nutrition_raw_values'] : []),
  ];
  await runTransaction(stores, 'readwrite', tx => {
    if (hasMenuRefStore) tx.objectStore('nutrition_menu_ref').put(nextRef);
    if (hasRawValueStore) {
      const rawStore = tx.objectStore('nutrition_raw_values');
      for (const row of rawTargets) {
        rawStore.put({ ...row, menuCode: newCode, updatedAt: timestamp });
      }
    }
  });

  return { ...nextRef, _rawValuesMigrated: rawTargets.length };
}

/**
 * nutrition_menu_ref 단건 삭제 + cascade:
 *   - nutrition_raw_values (deleteRawValuesByMenuCode 위임)
 */
export async function deleteMenuRef(id, menuCode) {
  await assertActiveAdmin('영양 메뉴 참조 삭제');
  if (!menuCode) {
    await deleteById('nutrition_menu_ref', id);
    return;
  }
  // menu_ref(해당 id) + raw_values(menuCode 일치)를 단일 트랜잭션으로 원자 삭제한다.
  // 이전엔 deleteById 후 별도 트랜잭션으로 raw_values를 지워 중간 실패 시 raw orphan이 남았다.
  const hasRaw = hasStore('nutrition_raw_values');
  const rawTargets = hasRaw
    ? (await getAll('nutrition_raw_values')).filter(r => r.menuCode === menuCode && r.id != null)
    : [];
  const stores = ['nutrition_menu_ref', ...(hasRaw ? ['nutrition_raw_values'] : [])];
  await runTransaction(stores, 'readwrite', tx => {
    tx.objectStore('nutrition_menu_ref').delete(id);
    if (hasRaw) {
      const rawStore = tx.objectStore('nutrition_raw_values');
      rawTargets.forEach(r => rawStore.delete(r.id));
    }
  });
}

/** menuCode 기준 menu_ref + raw_values cascade 삭제 — 단일 다중스토어 트랜잭션(원자적). */
export async function deleteMenuRefsByMenuCode(menuCode) {
  await assertActiveAdmin('영양 메뉴 참조 메뉴별 삭제');
  if (!menuCode) return;
  const hasMenuRefStore = hasStore('nutrition_menu_ref');
  const hasRawValueStore = hasStore('nutrition_raw_values');
  if (!hasMenuRefStore && !hasRawValueStore) return;

  const [refs, rawValues] = await Promise.all([
    hasMenuRefStore ? getAll('nutrition_menu_ref') : [],
    hasRawValueStore ? getAll('nutrition_raw_values') : [],
  ]);
  const refTargets = refs.filter(r => r.menuCode === menuCode && r.id != null);
  const rawTargets = rawValues.filter(r => r.menuCode === menuCode && r.id != null);
  if (refTargets.length + rawTargets.length === 0) return;

  const stores = [
    ...(hasMenuRefStore ? ['nutrition_menu_ref'] : []),
    ...(hasRawValueStore ? ['nutrition_raw_values'] : []),
  ];
  await runTransaction(stores, 'readwrite', tx => {
    if (hasMenuRefStore) {
      const menuStore = tx.objectStore('nutrition_menu_ref');
      refTargets.forEach(r => menuStore.delete(r.id));
    }
    if (hasRawValueStore) {
      const rawStore = tx.objectStore('nutrition_raw_values');
      rawTargets.forEach(r => rawStore.delete(r.id));
    }
  });
}

/** 메뉴마스터 밖 orphan 영양 메뉴 ref + raw_values 일괄 정리 */
export async function deleteMenuRefsByMenuCodes(menuCodes = []) {
  await assertActiveAdmin('영양 메뉴 참조 일괄 정리');
  const codeSet = new Set(
    (Array.isArray(menuCodes) ? menuCodes : []).map(cleanKey).filter(Boolean)
  );
  if (codeSet.size === 0) return { deletedMenuRefs: 0, deletedRawValues: 0 };

  const hasMenuRefStore = hasStore('nutrition_menu_ref');
  const hasRawValueStore = hasStore('nutrition_raw_values');
  if (!hasMenuRefStore && !hasRawValueStore) {
    return { deletedMenuRefs: 0, deletedRawValues: 0 };
  }

  const [refs, rawValues] = await Promise.all([
    hasMenuRefStore ? getAll('nutrition_menu_ref') : [],
    hasRawValueStore ? getAll('nutrition_raw_values') : [],
  ]);
  const refTargets = refs.filter(row => codeSet.has(cleanKey(row.menuCode)) && row.id != null);
  const rawTargets = rawValues.filter(row => codeSet.has(cleanKey(row.menuCode)) && row.id != null);
  if (refTargets.length + rawTargets.length === 0) {
    return { deletedMenuRefs: 0, deletedRawValues: 0 };
  }

  const stores = [
    ...(hasMenuRefStore ? ['nutrition_menu_ref'] : []),
    ...(hasRawValueStore ? ['nutrition_raw_values'] : []),
  ];
  await runTransaction(stores, 'readwrite', tx => {
    if (hasMenuRefStore) {
      const menuStore = tx.objectStore('nutrition_menu_ref');
      refTargets.forEach(row => menuStore.delete(row.id));
    }
    if (hasRawValueStore) {
      const rawStore = tx.objectStore('nutrition_raw_values');
      rawTargets.forEach(row => rawStore.delete(row.id));
    }
  });

  return {
    deletedMenuRefs: refTargets.length,
    deletedRawValues: rawTargets.length,
  };
}
