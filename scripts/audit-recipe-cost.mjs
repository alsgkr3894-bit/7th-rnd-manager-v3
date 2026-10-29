/**
 * 식자재 → 레시피 → 원가 일관성 점검 (읽기 전용: DB에서 읽기만 하고 아무것도 쓰지 않는다)
 *
 *   npm run audit:recipe-cost            # 현재 데이터 기준
 *   npm run audit:recipe-cost -- 1.2     # 제품코드 없는 수동 식자재 단가를 20% 올렸다고 가정(메모리 안에서만)
 *
 * 메뉴마스터 요약 / 원가마진표 / 레시피 출력이 같은 메뉴에 같은 원가를 내는지 비교하고,
 * 끊어진 연결·단종 식자재 사용·판매가 없는 메뉴 등을 함께 보고한다. DATABASE_URL(.env)이 필요하다.
 */
import { register } from 'node:module';
import { pathToFileURL, fileURLToPath } from 'node:url';
import path from 'node:path';
import fs from 'node:fs';

const root = path.resolve(path.dirname(fileURLToPath(import.meta.url)), '..');

// 앱 코드의 '@/' 별칭과 확장자 없는 상대 import를 Node가 읽을 수 있게 하는 resolve 훅
const hook = `
import fs from 'node:fs';
import path from 'node:path';
import { pathToFileURL, fileURLToPath } from 'node:url';
const root = ${JSON.stringify(root)};
const tryFile = base => [base, base + '.js', base + '.mjs', path.join(base, 'index.js')].find(f => fs.existsSync(f) && fs.statSync(f).isFile());
export async function resolve(specifier, context, next) {
  let base = null;
  if (specifier.startsWith('@/')) base = path.join(root, specifier.slice(2));
  else if (specifier.startsWith('.') && context.parentURL?.startsWith('file:') && !context.parentURL.includes('node_modules')) {
    base = path.resolve(path.dirname(fileURLToPath(context.parentURL)), specifier);
  }
  const file = base && tryFile(base);
  if (file) return next(pathToFileURL(file).href, context);
  return next(specifier, context);
}
`;
register('data:text/javascript,' + encodeURIComponent(hook), pathToFileURL(root + path.sep));
process.chdir(root);

const factor = Number(process.argv[2]) || 1;
const imp = rel => import(pathToFileURL(path.join(root, rel)).href);

const { getPrismaClient, disconnectPrismaClient } = await imp('lib/server/prisma.js');
const { buildUnitPriceMap } = await imp('lib/recipe/index.js');
const { buildMenuRecipeSummaryMap } = await imp('lib/menu-master/recipe-summary.js');
const { mergeCanonicalRecipeMaps } = await imp('lib/menu-recipes/legacy.js');
const { dedupePriceRowsByProductCode } = await imp('lib/price/duplicates.js');
const { buildDetailRows } = await imp('lib/cost/margin/build-rows.js');
const { buildRecipePrintRows } = await imp('lib/report/recipe-print-rows.js');

const STORES = [
  'menu_master',
  'menu_recipes',
  'cost_ingredients',
  'cost_recipe_groups',
  'cost_edge_dough',
  'price_files',
  'price_rows',
];
const KIND_TO_MARGIN_MAP = {
  pizza: 'pizzaMap',
  personal: 'personalMap',
  side: 'sideMap',
  set: 'setMap',
  topping: 'toppingMap',
};

const db = getPrismaClient();
try {
  const data = {};
  for (const name of STORES) {
    const rows = await db.storeRow.findMany({
      where: { storeName: name, brandId: 'main' },
      select: { data: true },
    });
    data[name] = rows.map(row => row.data);
  }

  const file = [...data.price_files].sort((a, b) =>
    String(b.updateDate).localeCompare(String(a.updateDate))
  )[0];
  const latestRows = dedupePriceRowsByProductCode(
    data.price_rows.filter(row => row.fileId === file.id)
  ).rows;
  const priceMap = new Map(
    latestRows
      .filter(row => row.productCode && Number.isFinite(Number(row.priceWithTax)))
      .map(row => [
        row.productCode,
        { productCode: row.productCode, priceWithTax: Number(row.priceWithTax) },
      ])
  );
  const unitPriceMap = buildUnitPriceMap(data.cost_ingredients, priceMap);

  // 가정: 제품코드 없는 수동 식자재(맵 키 = id) 단가를 factor배
  const manualKeys = new Set(
    data.cost_ingredients.filter(i => !String(i.productCode ?? '').trim()).map(i => String(i.id))
  );
  if (factor !== 1) {
    for (const [key, info] of unitPriceMap) {
      if (manualKeys.has(key) && info?.unitPrice != null) info.unitPrice = info.unitPrice * factor;
    }
  }

  const recipeMaps = mergeCanonicalRecipeMaps(data.menu_recipes);
  const summaries = buildMenuRecipeSummaryMap(data.menu_master, recipeMaps, unitPriceMap, {
    ingredients: data.cost_ingredients,
    recipeGroups: data.cost_recipe_groups,
    edges: data.cost_edge_dough,
  });

  // 원가마진표 — 판매가가 있는 활성 메뉴
  const menuPrices = data.menu_master
    .filter(m => m.status !== 'discontinued' && Number(m.price) > 0)
    .map(m => ({
      menuCode: m.menuCode,
      menuName: m.menuName,
      category: m.category,
      size: /-(L|R)$/.test(m.menuCode) ? m.menuCode.slice(-1) : '',
      price: Number(m.price),
    }));
  const marginMaps = Object.fromEntries(
    Object.entries(KIND_TO_MARGIN_MAP).map(([kind, key]) => [key, recipeMaps[kind] ?? new Map()])
  );
  const marginCost = new Map();
  for (const row of buildDetailRows(
    menuPrices,
    marginMaps,
    unitPriceMap,
    data.cost_recipe_groups
  )) {
    for (const [size, code] of Object.entries(row.sizeMenuCodes || {})) {
      if (row.costMap && size in row.costMap) marginCost.set(code, row.costMap[size]);
    }
  }

  // 레시피 출력
  const printCost = new Map();
  for (const row of buildRecipePrintRows({
    detailMaps: recipeMaps,
    unitPriceMap,
    recipeGroups: data.cost_recipe_groups,
  })) {
    printCost.set(row.menuCode, row.totalCost);
  }

  const mismatches = [];
  for (const menu of data.menu_master) {
    const summary = summaries.get(menu.menuCode);
    if (!summary || summary.status === 'edge' || !summary.hasRecipe) continue;
    const cells = {
      메뉴마스터: summary.totalCost,
      원가마진표: marginCost.get(menu.menuCode),
      레시피출력: printCost.get(menu.menuCode),
    };
    const seen = Object.values(cells).filter(v => v != null);
    if (new Set(seen).size > 1) {
      mismatches.push({ code: menu.menuCode, name: menu.menuName, ...cells });
    }
  }

  // 데이터 점검
  const ingredientKeys = new Set(unitPriceMap.keys());
  const orphanCodes = [];
  const discontinuedUsed = [];
  const codeless = [];
  for (const recipe of data.menu_recipes) {
    const menu = data.menu_master.find(m => m.menuCode === recipe.menuCode);
    for (const c of Array.isArray(recipe.components) ? recipe.components : []) {
      const code = String(c.productCode ?? '').trim();
      if (!code) {
        codeless.push(`${recipe.menuCode} ${c.ingredientName}`);
        continue;
      }
      if (!ingredientKeys.has(code))
        orphanCodes.push(`${recipe.menuCode} ${c.ingredientName}(${code})`);
      else if (unitPriceMap.get(code)?.discontinued && menu && menu.status !== 'discontinued') {
        discontinuedUsed.push(`${recipe.menuCode} ${c.ingredientName}`);
      }
    }
  }
  const menusWithoutPrice = data.menu_master
    .filter(
      m =>
        m.status !== 'discontinued' &&
        summaries.get(m.menuCode)?.hasRecipe &&
        !(Number(m.price) > 0)
    )
    .map(m => `${m.menuCode} ${m.menuName}`);

  console.log(
    JSON.stringify(
      {
        가정: factor === 1 ? '현재 데이터' : `수동 식자재 단가 x${factor}`,
        최신단가파일: `${file.updateDate} (${latestRows.length}행)`,
        메뉴수: data.menu_master.length,
        화면간원가불일치: mismatches.length,
        불일치목록: mismatches.slice(0, 30),
        없는제품코드: orphanCodes,
        판매중메뉴의단종식자재: discontinuedUsed,
        코드없는구성품: codeless.length,
        판매가없는데레시피있는메뉴: menusWithoutPrice,
      },
      null,
      2
    )
  );
  process.exitCode = mismatches.length ? 1 : 0;
} finally {
  await disconnectPrismaClient();
}
