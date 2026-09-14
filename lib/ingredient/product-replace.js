/**
 * lib/ingredient/product-replace.js — 제때 제품코드 변경/대체 연결
 */
import { getAll, hasStore, runTransaction } from '@/lib/db';
import { assertActiveAdmin } from '@/lib/auth/guard';

const STORES = ['cost_ingredients', 'menu_recipes', 'cost_recipe_groups', 'cost_edge_dough'];

function text(value) {
  return String(value ?? '').trim();
}

function codeKey(value) {
  return text(value).toUpperCase();
}

function replacementName(row, fallback = '') {
  return (
    text(row?.ingredientName) ||
    text(row?.displayName) ||
    text(row?.productName) ||
    text(row?.name) ||
    fallback
  );
}

function hasValue(value) {
  if (Array.isArray(value)) return value.length > 0;
  return value !== undefined && value !== null && value !== '';
}

/**
 * 대체 대상(newRow)에 값이 있으면 새 항목을 우선한다 — 대체 연결 모달이 사용자에게
 * "선택한 식자재의 정보가 없으면 기존 항목의 정보를 이어받습니다"라고 안내하기 때문에,
 * newRow에 이미 값이 있다면 oldRow가 그걸 덮어써서는 안 된다. newRow가 아예 없을 때만
 * (새 코드로 이관하는 경우) oldRow 값을 그대로 쓴다.
 */
function preferNew(oldRow, newRow, key) {
  if (!newRow) return oldRow?.[key];
  return hasValue(newRow[key]) ? newRow[key] : oldRow?.[key];
}

function mergeIngredientRecord(oldRow, newRow, nextCode, nextName, now) {
  const base = newRow || oldRow || {};
  return {
    ...base,
    ingredientName: nextName || base.ingredientName || oldRow?.ingredientName || '',
    productCode: nextCode,
    category: preferNew(oldRow, newRow, 'category') || '',
    tags: preferNew(oldRow, newRow, 'tags') || [],
    manufacturer: preferNew(oldRow, newRow, 'manufacturer') || '',
    baseQuantity: preferNew(oldRow, newRow, 'baseQuantity') ?? null,
    baseUnitType: preferNew(oldRow, newRow, 'baseUnitType') || 'g',
    pieceWeightGrams: preferNew(oldRow, newRow, 'pieceWeightGrams') ?? null,
    taxType: preferNew(oldRow, newRow, 'taxType') || '과세',
    priceOverride: preferNew(oldRow, newRow, 'priceOverride') ?? null,
    scope: preferNew(oldRow, newRow, 'scope') || '',
    note: preferNew(oldRow, newRow, 'note') || '',
    photos: preferNew(oldRow, newRow, 'photos'),
    photo: preferNew(oldRow, newRow, 'photo') || null,
    temperature: preferNew(oldRow, newRow, 'temperature') || null,
    originHidden: preferNew(oldRow, newRow, 'originHidden') === true,
    originNone: preferNew(oldRow, newRow, 'originNone') === true,
    origin: preferNew(oldRow, newRow, 'origin') || null,
    allergenNone: preferNew(oldRow, newRow, 'allergenNone') === true,
    allergens: preferNew(oldRow, newRow, 'allergens') || [],
    discontinued: false,
    excluded: false,
    replacedFromProductCode: text(oldRow?.productCode),
    replacementAppliedAt: now,
    updatedAt: now,
  };
}

function replaceProductCodeInComponents(components, oldCode, newCode, newName) {
  let changed = false;
  const next = (Array.isArray(components) ? components : []).map(component => {
    if (codeKey(component?.productCode) !== oldCode) return component;
    changed = true;
    return {
      ...component,
      productCode: newCode,
      ingredientName: newName || component?.ingredientName || newCode,
    };
  });
  return { changed, components: next };
}

function replaceProductCodeInIngredientLines(ingredients, oldCode, newCode, newName) {
  let changed = false;
  const next = (Array.isArray(ingredients) ? ingredients : []).map(line => {
    if (codeKey(line?.productCode) !== oldCode) return line;
    changed = true;
    return {
      ...line,
      productCode: newCode,
      ingredientName: newName || line?.ingredientName || newCode,
    };
  });
  return { changed, ingredients: next };
}

/**
 * 대체 연결 실행 전 영향 범위를 읽기 전용으로 반환한다 (admin 가드 없음).
 * 확인 다이얼로그에 "레시피 N개가 변경됩니다" 같은 안내를 보여주기 위한 미리보기.
 * @returns {Promise<{menuRecipeCount:number, recipeGroupCount:number, edgeCount:number, totalCount:number}>}
 */
export async function previewIngredientProductReplace(oldProductCode) {
  const oldCode = codeKey(oldProductCode);
  if (!oldCode) return { menuRecipeCount: 0, recipeGroupCount: 0, edgeCount: 0, totalCount: 0 };

  const [menuRecipes, recipeGroups, edges] = await Promise.all([
    hasStore('menu_recipes') ? getAll('menu_recipes') : Promise.resolve([]),
    hasStore('cost_recipe_groups') ? getAll('cost_recipe_groups') : Promise.resolve([]),
    hasStore('cost_edge_dough') ? getAll('cost_edge_dough') : Promise.resolve([]),
  ]);

  const referencesCode = components =>
    (Array.isArray(components) ? components : []).some(c => codeKey(c?.productCode) === oldCode);

  const menuRecipeCount = menuRecipes.filter(recipe => referencesCode(recipe.components)).length;
  const recipeGroupCount = recipeGroups.filter(group => referencesCode(group.ingredients)).length;
  const edgeCount = edges.filter(edge => referencesCode(edge.components)).length;

  return {
    menuRecipeCount,
    recipeGroupCount,
    edgeCount,
    totalCount: menuRecipeCount + recipeGroupCount + edgeCount,
  };
}

export async function replaceIngredientProductCode(oldProductCode, replacement) {
  await assertActiveAdmin('식자재 제품 대체 연결');
  if (!hasStore('cost_ingredients')) throw new Error('cost_ingredients store 없음');

  const oldCode = codeKey(oldProductCode);
  const newCode = text(replacement?.productCode);
  const newCodeKey = codeKey(newCode);
  if (!oldCode || !newCodeKey) throw new Error('기존/대체 제품코드가 필요합니다.');
  if (oldCode === newCodeKey) throw new Error('같은 제품코드로는 대체할 수 없습니다.');

  const stores = STORES.filter(hasStore);
  const [ingredients, menuRecipes, recipeGroups, edges] = await Promise.all([
    getAll('cost_ingredients'),
    hasStore('menu_recipes') ? getAll('menu_recipes') : Promise.resolve([]),
    hasStore('cost_recipe_groups') ? getAll('cost_recipe_groups') : Promise.resolve([]),
    hasStore('cost_edge_dough') ? getAll('cost_edge_dough') : Promise.resolve([]),
  ]);

  const oldRows = ingredients.filter(row => codeKey(row.productCode) === oldCode);
  if (!oldRows.length) throw new Error('기존 제품코드를 가진 식자재를 찾을 수 없습니다.');
  const oldRow = oldRows[0];
  const newRow = ingredients.find(row => codeKey(row.productCode) === newCodeKey);
  if (newRow && (newRow.discontinued || newRow.excluded)) {
    throw new Error('이미 단종되었거나 숨김 처리된 제품으로는 대체할 수 없습니다.');
  }
  // 이 old 코드를 대체 대상으로 이미 가리키고 있던 상위 행(A→old였던 A)이 있다면,
  // old가 지금 new로 대체되므로 A의 배지도 new를 가리키도록 함께 갱신한다.
  const upstreamRows = ingredients.filter(row => codeKey(row.replacedByProductCode) === oldCode);
  const now = new Date().toISOString();
  const nextName = replacementName(replacement, oldRow.ingredientName || oldRow.productName);
  const mergedRecord = mergeIngredientRecord(oldRow, newRow, newCode, nextName, now);

  const recipeUpdates = [];
  for (const recipe of menuRecipes) {
    const result = replaceProductCodeInComponents(recipe.components, oldCode, newCode, nextName);
    if (result.changed)
      recipeUpdates.push({ ...recipe, components: result.components, updatedAt: now });
  }

  const groupUpdates = [];
  for (const group of recipeGroups) {
    const result = replaceProductCodeInIngredientLines(
      group.ingredients,
      oldCode,
      newCode,
      nextName
    );
    if (result.changed)
      groupUpdates.push({ ...group, ingredients: result.ingredients, updatedAt: now });
  }

  const edgeUpdates = [];
  for (const edge of edges) {
    const result = replaceProductCodeInComponents(edge.components, oldCode, newCode, nextName);
    if (result.changed)
      edgeUpdates.push({ ...edge, components: result.components, updatedAt: now });
  }

  await runTransaction(stores, 'readwrite', tx => {
    const ingredientStore = tx.objectStore('cost_ingredients');
    if (newRow) {
      ingredientStore.put({ ...mergedRecord, id: newRow.id });
      for (const row of oldRows) {
        if (row.id === newRow.id) continue;
        ingredientStore.put({
          ...row,
          discontinued: true,
          excluded: true,
          replacedByProductCode: newCode,
          replacementAppliedAt: now,
          updatedAt: now,
        });
      }
    } else {
      ingredientStore.put({ ...mergedRecord, id: oldRow.id });
      for (const row of oldRows.slice(1)) {
        ingredientStore.put({
          ...row,
          discontinued: true,
          excluded: true,
          replacedByProductCode: newCode,
          replacementAppliedAt: now,
          updatedAt: now,
        });
      }
    }

    if (hasStore('menu_recipes')) {
      const store = tx.objectStore('menu_recipes');
      for (const row of recipeUpdates) store.put(row);
    }
    if (hasStore('cost_recipe_groups')) {
      const store = tx.objectStore('cost_recipe_groups');
      for (const row of groupUpdates) store.put(row);
    }
    if (hasStore('cost_edge_dough')) {
      const store = tx.objectStore('cost_edge_dough');
      for (const row of edgeUpdates) store.put(row);
    }

    const handledIds = new Set([oldRow.id, newRow?.id].filter(id => id != null));
    for (const row of upstreamRows) {
      if (handledIds.has(row.id)) continue;
      ingredientStore.put({ ...row, replacedByProductCode: newCode, updatedAt: now });
    }
  });

  return {
    oldProductCode: text(oldProductCode),
    newProductCode: newCode,
    ingredientUpdated: true,
    menuRecipeUpdated: recipeUpdates.length,
    recipeGroupUpdated: groupUpdates.length,
    edgeUpdated: edgeUpdates.length,
  };
}
