/**
 * lib/nutrition/migrate-to-ingredient.js — 수동 입력 원산지/알레르기 → 식자재 마스터 이전
 *
 * 기존 nutrition_origin_master / nutrition_allergy_links 의 데이터를
 * ingredientId 기준으로 cost_ingredients.origin / allergens 필드에 주입.
 *
 * idempotent: 이미 origin/allergens가 채워진 식자재는 건너뜀(덮어쓰지 않음).
 * 수동 menuCodes 연결 정보는 버림(자동 매칭으로 대체).
 */

import { getAll, runTransaction, hasStore } from '@/lib/db';

/**
 * nutrition_origin_master → cost_ingredients.origin
 * nutrition_allergy_links → cost_ingredients.allergens
 *
 * @returns {Promise<{ originMigrated: number, allergenMigrated: number }>}
 */
export async function migrateNutritionToIngredients() {
  if (!hasStore('cost_ingredients')) return { originMigrated: 0, allergenMigrated: 0 };

  const ingredients = await getAll('cost_ingredients');
  const ingById = new Map(ingredients.filter(r => r.id != null).map(r => [r.id, r]));

  const toUpdate = new Map(); // ingredientId → patch

  // ── 1. 원산지 마이그레이션 ────────────────────────────────────
  let originMigrated = 0;
  if (hasStore('nutrition_origin_master')) {
    const origins = await getAll('nutrition_origin_master');
    for (const o of origins) {
      if (!o.ingredientId) continue;
      const ing = ingById.get(o.ingredientId);
      if (!ing) continue;
      // 이미 origin이 있으면 건너뜀 (idempotent)
      if (ing.origin) continue;

      // items[]가 있으면 첫 번째, 없으면 직접 필드 사용
      const item = o.items?.[0];
      const origin = {
        displayName: item?.displayName || o.displayName || o.ingredientName || '',
        country:     item?.originCountry || o.originCountry || '',
        region:      item?.originRegion  || o.originRegion  || '',
      };
      if (!origin.country) continue; // 원산지 국가 없으면 의미 없음

      const patch = toUpdate.get(o.ingredientId) || { ...ing };
      patch.origin = origin;
      toUpdate.set(o.ingredientId, patch);
      originMigrated++;
    }
  }

  // ── 2. 알레르기 마이그레이션 ──────────────────────────────────
  let allergenMigrated = 0;
  if (hasStore('nutrition_allergy_links')) {
    const links = await getAll('nutrition_allergy_links');
    for (const l of links) {
      if (!l.ingredientId) continue;
      const ing = ingById.get(l.ingredientId);
      if (!ing) continue;
      // 이미 allergens가 있으면 건너뜀 (idempotent)
      if (ing.allergens?.length) continue;
      const codes = l.allergenCodes || [];
      if (!codes.length) continue;

      const patch = toUpdate.get(l.ingredientId) || { ...ing };
      patch.allergens = [...codes];
      toUpdate.set(l.ingredientId, patch);
      allergenMigrated++;
    }
  }

  if (toUpdate.size === 0) return { originMigrated: 0, allergenMigrated: 0 };

  // ── 3. 일괄 저장 ──────────────────────────────────────────────
  await runTransaction(['cost_ingredients'], 'readwrite', tx => {
    const store = tx.objectStore('cost_ingredients');
    for (const record of toUpdate.values()) {
      store.put({ ...record, updatedAt: new Date().toISOString() });
    }
  });

  return { originMigrated, allergenMigrated };
}
