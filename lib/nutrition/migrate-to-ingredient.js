/**
 * lib/nutrition/migrate-to-ingredient.js — 수동 입력 원산지 → 식자재 마스터 이전
 *
 * 기존 nutrition_origin_master 의 데이터를
 * ingredientId 기준으로 cost_ingredients.origin 필드에 주입.
 *
 * idempotent: 이미 origin이 채워진 식자재는 건너뜀(덮어쓰지 않음).
 * 수동 menuCodes 연결 정보는 버림(자동 매칭으로 대체).
 *
 * 알레르기 마이그레이션(nutrition_allergy_links → cost_ingredients.allergens)은
 * v20에서 store 제거와 함께 완료됐으므로 이 함수에서 제거됨.
 */

import { getAll, runTransaction, hasStore } from '@/lib/db';
import { assertActiveAdmin } from '@/lib/auth/guard';

/**
 * nutrition_origin_master → cost_ingredients.origin
 *
 * @returns {Promise<{ originMigrated: number }>}
 */
export async function migrateNutritionToIngredients() {
  try {
    await assertActiveAdmin('원산지 식자재 마이그레이션');
  } catch (error) {
    if (error?.code === 'PERMISSION_DENIED') return { originMigrated: 0, skipped: 'permission' };
    throw error;
  }
  if (!hasStore('cost_ingredients')) return { originMigrated: 0 };

  const ingredients = await getAll('cost_ingredients');
  const ingById = new Map(ingredients.filter(r => r.id != null).map(r => [r.id, r]));

  const toUpdate = new Map(); // ingredientId → patch

  // ── 원산지 마이그레이션 ────────────────────────────────────────
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
        country: item?.originCountry || o.originCountry || '',
        region: item?.originRegion || o.originRegion || '',
      };
      if (!origin.country) continue; // 원산지 국가 없으면 의미 없음

      const patch = toUpdate.get(o.ingredientId) || { ...ing };
      patch.origin = origin;
      toUpdate.set(o.ingredientId, patch);
      originMigrated++;
    }
  }

  if (toUpdate.size === 0) return { originMigrated: 0 };

  // ── 일괄 저장 ──────────────────────────────────────────────────
  await runTransaction(['cost_ingredients'], 'readwrite', tx => {
    const store = tx.objectStore('cost_ingredients');
    for (const record of toUpdate.values()) {
      store.put({ ...record, updatedAt: new Date().toISOString() });
    }
  });

  return { originMigrated };
}
