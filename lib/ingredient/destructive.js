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

const RECIPE_CASCADE_STORES = ['menu_recipes', 'cost_recipe_groups', 'cost_edge_dough'];

function codeKey(value) {
  return String(value ?? '')
    .trim()
    .toUpperCase();
}

function referencesCode(components, code) {
  return (Array.isArray(components) ? components : []).some(c => codeKey(c?.productCode) === code);
}

function removeProductCodeFromComponents(components, code) {
  const list = Array.isArray(components) ? components : [];
  const next = list.filter(c => codeKey(c?.productCode) !== code);
  return { changed: next.length !== list.length, components: next };
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
 * 삭제 전 영향 범위를 읽기 전용으로 반환한다 (admin 가드 없음).
 * @returns {Promise<{ingredient: object, allergenLinkCount: number, menuRecipeCount: number, recipeGroupCount: number, edgeCount: number}|null>}
 */
export async function previewIngredientDelete(id) {
  if (!hasStore('cost_ingredients')) return null;
  const all = await getAll('cost_ingredients');
  const ingredient = all.find(r => r.id === id);
  if (!ingredient) return null;
  let allergenLinkCount = 0;
  if (hasStore('nutrition_allergy_links')) {
    const links = await getAll('nutrition_allergy_links');
    allergenLinkCount = links.filter(link => {
      const idMatch =
        link.ingredientId != null && String(link.ingredientId) === String(ingredient.id);
      const codeMatch =
        ingredient.productCode &&
        String(link.productCode ?? '').trim() === String(ingredient.productCode).trim();
      return idMatch || codeMatch;
    }).length;
  }

  const code = codeKey(ingredient.productCode);
  let menuRecipeCount = 0;
  let recipeGroupCount = 0;
  let edgeCount = 0;
  if (code) {
    const [menuRecipes, recipeGroups, edges] = await Promise.all([
      hasStore('menu_recipes') ? getAll('menu_recipes') : Promise.resolve([]),
      hasStore('cost_recipe_groups') ? getAll('cost_recipe_groups') : Promise.resolve([]),
      hasStore('cost_edge_dough') ? getAll('cost_edge_dough') : Promise.resolve([]),
    ]);
    menuRecipeCount = menuRecipes.filter(recipe => referencesCode(recipe.components, code)).length;
    recipeGroupCount = recipeGroups.filter(group => referencesCode(group.ingredients, code)).length;
    edgeCount = edges.filter(edge => referencesCode(edge.components, code)).length;
  }

  return { ingredient, allergenLinkCount, menuRecipeCount, recipeGroupCount, edgeCount };
}

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
 * productCode가 있으면 레시피/세트·그룹/엣지·도우에 남은 참조도 함께 제거한다
 * (대체 연결 시 replaceIngredientProductCode가 재연결하는 것과 대칭되는 처리 —
 * 삭제는 갈 곳이 없으므로 참조 자체를 지운다).
 * @returns {Promise<{ingredient: object, cascadeErrors: Array<object>, deletedAllergenLinks: Array<object>, recipeRemoved: number, groupRemoved: number, edgeRemoved: number}|null>}
 */
export async function deleteIngredient(id) {
  await assertActiveAdmin('식자재 삭제');
  if (!hasStore('cost_ingredients')) throw new Error('cost_ingredients store 없음');
  const all = await getAll('cost_ingredients');
  const target = all.find(r => r.id === id);
  if (!target) return null;
  const cascadeErrors = [];
  let deletedAllergenLinks = [];
  let recipeRemoved = 0;
  let groupRemoved = 0;
  let edgeRemoved = 0;

  const code = codeKey(target.productCode);
  const cascadeStores = code ? RECIPE_CASCADE_STORES.filter(hasStore) : [];

  if (cascadeStores.length) {
    const [menuRecipes, recipeGroups, edges] = await Promise.all([
      hasStore('menu_recipes') ? getAll('menu_recipes') : Promise.resolve([]),
      hasStore('cost_recipe_groups') ? getAll('cost_recipe_groups') : Promise.resolve([]),
      hasStore('cost_edge_dough') ? getAll('cost_edge_dough') : Promise.resolve([]),
    ]);
    const now = new Date().toISOString();

    const recipeUpdates = [];
    for (const recipe of menuRecipes) {
      const result = removeProductCodeFromComponents(recipe.components, code);
      if (result.changed) {
        recipeUpdates.push({ ...recipe, components: result.components, updatedAt: now });
        recipeRemoved++;
      }
    }
    const groupUpdates = [];
    for (const group of recipeGroups) {
      const result = removeProductCodeFromComponents(group.ingredients, code);
      if (result.changed) {
        groupUpdates.push({ ...group, ingredients: result.components, updatedAt: now });
        groupRemoved++;
      }
    }
    const edgeUpdates = [];
    for (const edge of edges) {
      const result = removeProductCodeFromComponents(edge.components, code);
      if (result.changed) {
        edgeUpdates.push({ ...edge, components: result.components, updatedAt: now });
        edgeRemoved++;
      }
    }

    await runTransaction(['cost_ingredients', ...cascadeStores], 'readwrite', tx => {
      tx.objectStore('cost_ingredients').delete(id);
      if (hasStore('menu_recipes')) {
        const s = tx.objectStore('menu_recipes');
        for (const r of recipeUpdates) s.put(r);
      }
      if (hasStore('cost_recipe_groups')) {
        const s = tx.objectStore('cost_recipe_groups');
        for (const r of groupUpdates) s.put(r);
      }
      if (hasStore('cost_edge_dough')) {
        const s = tx.objectStore('cost_edge_dough');
        for (const r of edgeUpdates) s.put(r);
      }
    });
  } else {
    await runTransaction(['cost_ingredients'], 'readwrite', tx => {
      store(tx).delete(id);
    });
  }

  // 알레르기 링크 cascade — nutrition_allergy_links는 v20 이후 사실상 빈 legacy store
  try {
    const allergenStore = await import('@/lib/nutrition/allergen/store');
    deletedAllergenLinks = await allergenStore.deleteAllergenLinksByIngredient({
      ingredientId: target.id,
      productCode: target.productCode,
    });
  } catch (err) {
    cascadeErrors.push({ step: 'allergenLinks', message: err?.message || String(err) });
  }

  if (cascadeErrors.length > 0) {
    console.warn('[ingredient/destructive] deleteIngredient cascade 일부 실패', cascadeErrors);
  }

  const name = target.ingredientName || target.productName || '';
  const cascadeSuffix =
    cascadeErrors.length > 0
      ? ` [cascade 오류 ${cascadeErrors.length}건: ${cascadeErrors.map(e => e.step).join(', ')}]`
      : '';
  logWork('DELETE', `식자재 삭제: ${name}${cascadeSuffix}`, { ref: id }).catch(e =>
    console.warn('[ingredient/destructive] logWork 실패', e)
  );
  return {
    ingredient: target,
    cascadeErrors,
    deletedAllergenLinks,
    recipeRemoved,
    groupRemoved,
    edgeRemoved,
  };
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

/** 여러 태그를 한 번의 스캔으로 전역 삭제 */
export async function removeManyTagsFromAll(tags) {
  await assertActiveAdmin('미사용 태그 일괄 제거');
  if (!hasStore('cost_ingredients') || !tags?.length) return { updated: 0 };
  const tagSet = new Set(tags.filter(Boolean));
  if (!tagSet.size) return { updated: 0 };
  const all = await getAll('cost_ingredients');
  const targets = all.filter(r => Array.isArray(r.tags) && r.tags.some(t => tagSet.has(t)));
  if (!targets.length) return { updated: 0 };
  const now = new Date().toISOString();
  await runTransaction(['cost_ingredients'], 'readwrite', tx => {
    const st = store(tx);
    for (const r of targets)
      st.put({ ...r, tags: r.tags.filter(t => !tagSet.has(t)), updatedAt: now });
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

/**
 * ids 목록의 원산지/알레르기 "없음" 상태를 일괄 적용.
 * 이슈탭(원산지 미표기/알레르기 미표기)에서 선택한 항목에 한 번에 반영하기 위함 —
 * true로 표시된 값만 patch하고 나머지 필드는 그대로 둔다.
 * @param {number[]} ids
 * @param {{originNone?: boolean, allergenNone?: boolean}} flags
 */
export async function bulkSetOriginAllergenNone(ids, flags = {}) {
  await assertActiveAdmin('원산지/알레르기 없음 일괄 적용');
  if (!hasStore('cost_ingredients') || !ids?.length) return { updated: 0 };
  const { originNone, allergenNone } = flags;
  if (originNone === undefined && allergenNone === undefined) return { updated: 0 };
  const all = await getAll('cost_ingredients');
  const idSet = new Set(ids);
  const targets = all.filter(r => idSet.has(r.id));
  if (!targets.length) return { updated: 0 };
  const now = new Date().toISOString();
  await runTransaction(['cost_ingredients'], 'readwrite', tx => {
    const st = store(tx);
    for (const r of targets) {
      const patch = { ...r, updatedAt: now };
      if (originNone !== undefined) patch.originNone = originNone === true;
      if (allergenNone !== undefined) patch.allergenNone = allergenNone === true;
      st.put(patch);
    }
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
