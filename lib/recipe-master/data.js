import { initDB } from '@/lib/db';
import { getAllMenuMaster, pushMasterToPrices, upsertMenuMaster } from '@/lib/menu-master';
import { getAllIngredients } from '@/lib/ingredient';
import { buildUnitPriceMap } from '@/lib/recipe';
import { buildPriceRowMap, getPriceFiles, getPriceRowsByFileId } from '@/lib/price';
import { getAllPizzaRecipes, upsertPizzaRecipe } from '@/lib/cost/pizza-detail';
import { getAllPersonalRecipes, upsertPersonalRecipe } from '@/lib/cost/personal-detail';
import { getAllSideRecipes, upsertSideRecipe } from '@/lib/cost/side-detail';
import { getAllSetRecipes, upsertSetRecipe } from '@/lib/cost/set-detail';
import { asObjectArray } from '@/lib/ui/prop-guards';
import {
  buildMissingRecipeSkeletons,
  buildRecipeMasterMenuPayload,
  buildRecipeMasterRecipePayload,
  normalizeRecipeMasterComponents,
  recipeStoreKindForCategory,
} from './sync';
import { buildRecipeMap } from './rows';

const STORE_APIS = {
  pizza: { getAll: getAllPizzaRecipes, upsert: upsertPizzaRecipe },
  personal: { getAll: getAllPersonalRecipes, upsert: upsertPersonalRecipe },
  side: { getAll: getAllSideRecipes, upsert: upsertSideRecipe },
  set: { getAll: getAllSetRecipes, upsert: upsertSetRecipe },
};

export async function loadRecipeMasterData() {
  await initDB();
  const [menus, ingredients, files, pizzaRows, personalRows, sideRows, setRows] =
    await Promise.all([
      getAllMenuMaster(),
      getAllIngredients(),
      getPriceFiles(),
      getAllPizzaRecipes(),
      getAllPersonalRecipes(),
      getAllSideRecipes(),
      getAllSetRecipes(),
    ]);
  const menuRows = asObjectArray(menus);
  let recipeMaps = buildRecipeMaps({ pizzaRows, personalRows, sideRows, setRows });
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
  const [pizzaRows, personalRows, sideRows, setRows] = await Promise.all([
    getAllPizzaRecipes(),
    getAllPersonalRecipes(),
    getAllSideRecipes(),
    getAllSetRecipes(),
  ]);
  return buildRecipeMaps({ pizzaRows, personalRows, sideRows, setRows });
}

function buildRecipeMaps({ pizzaRows, personalRows, sideRows, setRows }) {
  return {
    pizza: buildRecipeMap(pizzaRows),
    personal: buildRecipeMap(personalRows),
    side: buildRecipeMap(sideRows),
    set: buildRecipeMap(setRows),
  };
}

async function syncMenuMasterToRecipeStores(menuRows, recipeMaps) {
  const skeletons = buildMissingRecipeSkeletons({ menuRows, recipeMaps });
  let created = 0;

  for (const { kind, payload } of skeletons) {
    const result = await STORE_APIS[kind]?.upsert(payload);
    if (result?.mode === 'insert') created += 1;
  }

  return { created, checked: menuRows.length };
}

export async function saveRecipeMasterDraft(draft) {
  const kind = recipeStoreKindForCategory(draft?.category);
  const api = STORE_APIS[kind];
  if (!kind || !api) throw new Error('지원하지 않는 카테고리입니다');

  const components = normalizeRecipeMasterComponents(draft?.components);
  const menuPayload = buildRecipeMasterMenuPayload(draft);
  const menuResult = await upsertMenuMaster(menuPayload);
  await pushMasterToPrices();
  const recipeResult = await api.upsert({
    id: draft?.recipeId,
    ...buildRecipeMasterRecipePayload(
      {
        menuCode: menuPayload.menuCode,
        menuName: menuPayload.menuName,
        size: menuPayload.size || draft?.size || '단일',
        note: menuPayload.note,
      },
      components
    ),
  });

  return { kind, menuResult, recipeResult, components };
}
