/**
 * lib/ingredient/destructive.js — 식자재 숨김/복원/삭제/초기화/일괄변경
 *
 * 모든 파괴적 함수는 assertActiveAdmin 가드로 시작한다.
 */
import { getAll, runTransaction, hasStore } from '@/lib/db';
import { logWork } from '@/lib/work-log';
import { assertActiveAdmin } from '@/lib/auth/guard';
import { findIngredientsByProductCode, compareIngredientKeep } from './product-code';

function store(tx) {
  return tx.objectStore('cost_ingredients');
}

// ── 숨기기 / 복원 ──────────────────────────────────────────────

export async function excludeIngredientByCode(productCode) {
  await assertActiveAdmin('식자재 단종 처리');
  if (!hasStore('cost_ingredients')) throw new Error('cost_ingredients store 없음');
  const all = await getAll('cost_ingredients');
  const targets = findIngredientsByProductCode(all, productCode);
  const existing = [...targets].sort(compareIngredientKeep)[0] || {};
  const now = new Date().toISOString();
  await runTransaction(['cost_ingredients'], 'readwrite', tx => {
    const st = store(tx);
    if (targets.length) {
      targets.forEach(row => st.put({ ...row, excluded: true, updatedAt: now }));
    } else {
      st.put({ ...existing, productCode, excluded: true, isManual: false, updatedAt: now });
    }
  });
}

export async function restoreIngredientByCode(productCode) {
  await assertActiveAdmin('식자재 단종 복구');
  if (!hasStore('cost_ingredients')) throw new Error('cost_ingredients store 없음');
  const all = await getAll('cost_ingredients');
  const targets = findIngredientsByProductCode(all, productCode);
  if (!targets.length) return;
  const now = new Date().toISOString();
  await runTransaction(['cost_ingredients'], 'readwrite', tx => {
    const st = store(tx);
    targets.forEach(row => st.put({ ...row, excluded: false, updatedAt: now }));
  });
}

// ── 삭제 ─────────────────────────────────────────────────────

/**
 * 여러 식자재를 일괄 삭제. 삭제된 원본 레코드와 실패 목록을 함께 반환한다.
 * @returns {Promise<{removed: Array<{ingredient: object, cascadeErrors?: Array<object>}>, failures: Array<{id: number, message: string}>}>}
 */
export async function bulkDeleteIngredients(ids) {
  await assertActiveAdmin('식자재 일괄 삭제');
  const removed = [];
  const failures = [];
  for (const id of ids) {
    try {
      const rec = await deleteIngredient(id);
      if (rec) {
        removed.push(rec);
      } else {
        failures.push({ id, message: '항목을 찾을 수 없습니다' });
      }
    } catch (err) {
      failures.push({ id, message: err?.message || String(err) });
      console.warn('[ingredient/destructive] bulkDeleteIngredients 항목 삭제 실패', {
        id,
        error: err,
      });
    }
  }
  return { removed, failures };
}

/**
 * 식자재 단건 삭제. 삭제 전 스냅샷을 반환(실행취소용).
 * @returns {Promise<{ingredient: object, cascadeErrors: Array<object>}|null>}
 */
export async function deleteIngredient(id) {
  await assertActiveAdmin('식자재 삭제');
  if (!hasStore('cost_ingredients')) throw new Error('cost_ingredients store 없음');
  const all = await getAll('cost_ingredients');
  const target = all.find(r => r.id === id);
  if (!target) return null;
  const cascadeErrors = [];

  await runTransaction(['cost_ingredients'], 'readwrite', tx => {
    store(tx).delete(id);
  });
  // 알레르기 링크 cascade — nutrition_allergy_links는 v20 이후 사실상 빈 legacy store
  try {
    const allergenStore = await import('@/lib/nutrition/allergen/store');
    await allergenStore.deleteAllergenLinksByIngredient({
      ingredientId: target.id,
      productCode: target.productCode,
    });
  } catch (err) {
    cascadeErrors.push({ step: 'allergenLinks', message: err?.message || String(err) });
  }

  if (cascadeErrors.length > 0) {
    console.warn('[ingredient/destructive] deleteIngredient cascade 일부 실패', cascadeErrors);
  }

  logWork('DELETE', `식자재 삭제: ${target.ingredientName || target.productName || ''}`, {
    ref: id,
  }).catch(e => console.warn('[ingredient/destructive] logWork 실패', e));
  return { ingredient: target, cascadeErrors };
}

// ── 분류·태그 일괄 변경 ──────────────────────────────────────

/** 분류(category) 전역 삭제 */
export async function removeCategoryFromAll(category) {
  await assertActiveAdmin('카테고리 일괄 제거');
  if (!hasStore('cost_ingredients') || !category) return { updated: 0 };
  const all = await getAll('cost_ingredients');
  const targets = all.filter(r => r.category === category);
  if (!targets.length) return { updated: 0 };
  const now = new Date().toISOString();
  await runTransaction(['cost_ingredients'], 'readwrite', tx => {
    const st = store(tx);
    for (const r of targets) st.put({ ...r, category: '', updatedAt: now });
  });
  return { updated: targets.length };
}

/** 태그(tag) 전역 삭제 */
export async function removeTagFromAll(tag) {
  await assertActiveAdmin('태그 일괄 제거');
  if (!hasStore('cost_ingredients') || !tag) return { updated: 0 };
  const all = await getAll('cost_ingredients');
  const targets = all.filter(r => Array.isArray(r.tags) && r.tags.includes(tag));
  if (!targets.length) return { updated: 0 };
  const now = new Date().toISOString();
  await runTransaction(['cost_ingredients'], 'readwrite', tx => {
    const st = store(tx);
    for (const r of targets) st.put({ ...r, tags: r.tags.filter(t => t !== tag), updatedAt: now });
  });
  return { updated: targets.length };
}

/** 분류(category) 이름 전역 변경 */
export async function renameCategoryInAll(oldName, newName) {
  await assertActiveAdmin('분류 이름 변경');
  const trimNew = (newName || '').trim();
  if (!hasStore('cost_ingredients') || !oldName || !trimNew || oldName === trimNew)
    return { updated: 0 };
  const all = await getAll('cost_ingredients');
  const targets = all.filter(r => r.category === oldName);
  if (!targets.length) return { updated: 0 };
  const now = new Date().toISOString();
  await runTransaction(['cost_ingredients'], 'readwrite', tx => {
    const st = store(tx);
    for (const r of targets) st.put({ ...r, category: trimNew, updatedAt: now });
  });
  return { updated: targets.length };
}

/** 태그(tag) 이름 전역 변경 */
export async function renameTagInAll(oldName, newName) {
  await assertActiveAdmin('태그 이름 변경');
  const trimNew = (newName || '').trim();
  if (!hasStore('cost_ingredients') || !oldName || !trimNew || oldName === trimNew)
    return { updated: 0 };
  const all = await getAll('cost_ingredients');
  const targets = all.filter(r => Array.isArray(r.tags) && r.tags.includes(oldName));
  if (!targets.length) return { updated: 0 };
  const now = new Date().toISOString();
  await runTransaction(['cost_ingredients'], 'readwrite', tx => {
    const st = store(tx);
    for (const r of targets) {
      const newTags = [...new Set(r.tags.map(t => (t === oldName ? trimNew : t)))];
      st.put({ ...r, tags: newTags, updatedAt: now });
    }
  });
  return { updated: targets.length };
}

/** ids 목록의 식자재 단종 상태 일괄 변경 */
export async function bulkSetDiscontinued(ids, discontinued) {
  await assertActiveAdmin('식자재 일괄 단종 변경');
  if (!hasStore('cost_ingredients') || !ids?.length) return { updated: 0 };
  const all = await getAll('cost_ingredients');
  const idSet = new Set(ids);
  const targets = all.filter(r => idSet.has(r.id));
  if (!targets.length) return { updated: 0 };
  const flag = discontinued === true;
  const now = new Date().toISOString();
  await runTransaction(['cost_ingredients'], 'readwrite', tx => {
    const st = store(tx);
    for (const r of targets) st.put({ ...r, discontinued: flag, updatedAt: now });
  });
  return { updated: targets.length };
}

/** ids 목록의 식자재 분류 일괄 변경 */
export async function bulkSetCategory(ids, newCategory) {
  await assertActiveAdmin('식자재 일괄 분류 변경');
  if (!hasStore('cost_ingredients') || !ids?.length) return { updated: 0 };
  const cat = (newCategory || '').trim();
  const all = await getAll('cost_ingredients');
  const idSet = new Set(ids);
  const targets = all.filter(r => idSet.has(r.id));
  if (!targets.length) return { updated: 0 };
  const now = new Date().toISOString();
  await runTransaction(['cost_ingredients'], 'readwrite', tx => {
    const st = store(tx);
    for (const r of targets) st.put({ ...r, category: cat, updatedAt: now });
  });
  return { updated: targets.length };
}

// ── 초기화 ───────────────────────────────────────────────────

/** 전체 cost_ingredients 초기화 */
export async function resetAllIngredients() {
  await assertActiveAdmin('식자재 전체 초기화');
  if (!hasStore('cost_ingredients')) return { deleted: 0 };
  const all = await getAll('cost_ingredients');
  const count = all.length;
  await runTransaction(['cost_ingredients'], 'readwrite', tx => {
    tx.objectStore('cost_ingredients').clear();
  });
  logWork('RESET', `식자재 전체 초기화 (${count}건 삭제)`).catch(e =>
    console.warn('[ingredient/destructive] logWork 실패', e)
  );
  return { deleted: count };
}
