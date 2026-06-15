import { initDB } from '@/lib/db';
import { getAllMenuMaster, pushMasterToPrices, upsertMenuMaster } from '@/lib/menu-master';
import { getAllIngredients } from '@/lib/ingredient';
import { buildUnitPriceMap } from '@/lib/recipe';
import { buildPriceRowMap, getPriceFiles, getPriceRowsByFileId } from '@/lib/price';
import { loadMenuRecipeMaps, upsertMenuRecipeForMenu } from '@/lib/menu-recipes';
import { asObjectArray } from '@/lib/ui/prop-guards';
import {
  buildMissingRecipeSkeletons,
  buildRecipeMasterMenuPayload,
  buildRecipeMasterRecipePayload,
  normalizeRecipeMasterComponents,
  recipeStoreKindForCategory,
} from './sync';

export async function loadRecipeMasterData() {
  await initDB();
  const [menus, ingredients, files, initialRecipeMaps] = await Promise.all([
    getAllMenuMaster(),
    getAllIngredients(),
    getPriceFiles(),
    loadMenuRecipeMaps(),
  ]);
  const menuRows = asObjectArray(menus);
  let recipeMaps = initialRecipeMaps;
  const syncResult = await syncMenuMasterToRecipeStores(menuRows, recipeMaps);

  if (syncResult.created > 0) {
    recipeMaps = await fetchRecipeMaps();
  }

  let priceRowMap = new Map();
  if (files[0]?.id != null) {
    const priceRows = await getPriceRowsByFileId(files[0].id);
    priceRowMap = buildPriceRowMap(priceRows).map;
  }

  const safeIngredients = asObjectArray(ingredients);
  return {
    menuRows,
    ingredients: safeIngredients,
    unitPriceMap: buildUnitPriceMap(safeIngredients, priceRowMap),
    recipeMaps,
    recipeMasterSync: syncResult,
  };
}

async function fetchRecipeMaps() {
  return loadMenuRecipeMaps();
}

async function syncMenuMasterToRecipeStores(menuRows, recipeMaps) {
  const skeletons = buildMissingRecipeSkeletons({ menuRows, recipeMaps });
  let created = 0;

  for (const { kind, payload } of skeletons) {
    const result = await upsertMenuRecipeForMenu({ ...payload, kind }, { mirrorLegacy: false });
    if (result?.recipeResult?.mode === 'insert') created += 1;
  }

  return { created, checked: menuRows.length };
}

export async function saveRecipeMasterDraft(draft) {
  const kind = recipeStoreKindForCategory(draft?.category);
  if (!kind) throw new Error('지원하지 않는 카테고리입니다');

  const components = normalizeRecipeMasterComponents(draft?.components);
  const menuPayload = buildRecipeMasterMenuPayload(draft);
  const menuResult = await upsertMenuMaster(menuPayload);
  await pushMasterToPrices();
  const result = await upsertMenuRecipeForMenu({
    id: draft?.recipeId,
    ...buildRecipeMasterRecipePayload(
      {
        menuCode: menuPayload.menuCode,
        menuName: menuPayload.menuName,
        category: menuPayload.category,
        size: menuPayload.size || draft?.size || '단일',
        note: menuPayload.note,
      },
      components
    ),
  });

  return {
    kind,
    menuResult,
    recipeResult: result.recipeResult,
    legacyResult: result.legacyResult,
    components,
  };
}
