/**
 * 시나몬츄러스 2PCS를 구성품 전용으로 표시하고, 코드 없는 레시피 구성품을
 * 활성 식자재 이름이 정확히 하나로 일치할 때만 단가 키(제품코드 또는 수동 식자재 id)로 연결한다.
 * 기본은 dry-run이며 --apply를 붙여야 저장한다.
 */
import { getPrismaClient, disconnectPrismaClient } from '../lib/server/prisma.js';
import { applyStoreRowOperations } from '../lib/server/store-row-sync.js';

const apply = process.argv.includes('--apply');
const brandId = 'main';
const db = getPrismaClient();

const normName = value =>
  String(value ?? '')
    .trim()
    .toLowerCase()
    .replace(/\s+/g, '');

try {
  const rows = await db.storeRow.findMany({
    where: {
      brandId,
      storeName: { in: ['menu_master', 'menu_recipes', 'cost_ingredients'] },
    },
    select: { storeName: true, recordKey: true, data: true },
  });
  const byStore = name => rows.filter(row => row.storeName === name);
  const ingredients = byStore('cost_ingredients').map(row => row.data);
  const keysByName = new Map();
  for (const ingredient of ingredients) {
    if (ingredient?.discontinued || ingredient?.excluded) continue;
    const name = normName(ingredient?.ingredientName);
    const key = String(ingredient?.productCode || ingredient?.id || '').trim();
    if (!name || !key) continue;
    if (!keysByName.has(name)) keysByName.set(name, key);
    else keysByName.set(name, null);
  }

  const operations = [];
  const unresolved = [];
  let linkedComponents = 0;
  let changedRecipes = 0;
  let componentOnlyChanged = 0;

  for (const row of byStore('menu_master')) {
    const menu = row.data;
    if (menu?.menuCode !== 'S-SNK-003' && normName(menu?.menuName) !== normName('시나몬츄러스 2PCS'))
      continue;
    if (menu.componentOnly === true) continue;
    operations.push({
      type: 'upsert',
      storeName: 'menu_master',
      recordKey: row.recordKey,
      data: { ...menu, componentOnly: true, updatedAt: new Date().toISOString() },
    });
    componentOnlyChanged++;
  }

  for (const row of byStore('menu_recipes')) {
    const recipe = row.data;
    let changed = false;
    const components = (Array.isArray(recipe?.components) ? recipe.components : []).map(component => {
      if (String(component?.productCode ?? '').trim()) return component;
      const name = normName(component?.ingredientName || component?.productName);
      const key = keysByName.get(name);
      if (!key) {
        unresolved.push({ menuCode: recipe?.menuCode, ingredientName: component?.ingredientName });
        return component;
      }
      changed = true;
      linkedComponents++;
      return { ...component, productCode: key };
    });
    if (!changed) continue;
    changedRecipes++;
    operations.push({
      type: 'upsert',
      storeName: 'menu_recipes',
      recordKey: row.recordKey,
      data: { ...recipe, components, updatedAt: new Date().toISOString() },
    });
  }

  const summary = {
    mode: apply ? 'apply' : 'dry-run',
    componentOnlyChanged,
    linkedComponents,
    changedRecipes,
    unresolvedCount: unresolved.length,
    unresolved,
  };
  if (apply && operations.length > 0) {
    summary.result = await applyStoreRowOperations(db, { brandId, operations });
  }
  console.log(JSON.stringify(summary, null, 2));
} finally {
  await disconnectPrismaClient();
}
