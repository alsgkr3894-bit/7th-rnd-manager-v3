/**
 * 원가 흐름 전체 점검 (읽기 전용: DB에서 읽기만 하고 아무것도 쓰지 않는다)
 *
 *   node scripts/audit-cost-pipeline.mjs            # 요약을 화면에 출력
 *   node scripts/audit-cost-pipeline.mjs --json out.json   # 전체 상세를 파일로 저장
 *
 * 1) 같은 메뉴가 7곳(메뉴마스터·원가마진표·원가계산보고서·레시피출력·전체요약·홈·토핑)에서
 *    같은 원가를 내는지 비교한다. (기존 npm run audit:recipe-cost는 앞 4곳만 비교)
 * 2) 제때 단가 → 식자재 → 레시피 줄 단위 건강검진: 코드/대소문자/0원/수동 단가 낙하/단위 불일치/
 *    0.1원 단위 반올림이 메뉴 원가에 주는 오차.
 * DATABASE_URL(.env)이 필요하다.
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

const argv = process.argv.slice(2);
const jetteIndex = argv.indexOf('--jette');
const jetteFactor = jetteIndex >= 0 ? Number(argv[jetteIndex + 1]) || 1 : 1;
const positional = argv.filter(
  (_, i) => jetteIndex < 0 || (i !== jetteIndex && i !== jetteIndex + 1)
);
const factor = Number(positional[0]) || 1;
const imp = rel => import(pathToFileURL(path.join(root, rel)).href);

const { getPrismaClient, disconnectPrismaClient } = await imp('lib/server/prisma.js');
const { buildUnitPriceMap } = await imp('lib/recipe/index.js');
const { buildMenuRecipeSummaryMap } = await imp('lib/menu-master/recipe-summary.js');
const { mergeCanonicalRecipeMaps } = await imp('lib/menu-recipes/legacy.js');
const { dedupePriceRowsByProductCode } = await imp('lib/price/duplicates.js');
const { buildDetailRows } = await imp('lib/cost/margin/build-rows.js');
const { buildRecipePrintRows, buildRecipePrintMenus } = await imp(
  'lib/report/recipe-print-rows.js'
);
const { buildCostReportData } = await imp('lib/report/build-cost-report.js');

const STORES = [
  'menu_master',
  'menu_recipes',
  'cost_ingredients',
  'cost_recipe_groups',
  'cost_edge_dough',
  'price_files',
  'price_rows',
  'cost_selling_prices',
];
const KIND_TO_MARGIN_MAP = {
  pizza: 'pizzaMap',
  personal: 'personalMap',
  side: 'sideMap',
  set: 'setMap',
  topping: 'toppingMap',
};

const { buildRows: buildSummaryRows } = await imp('lib/cost/shared/buildSummaryRows.js');
const { buildCanonicalCostRateItems } = await imp('lib/stats/canonical-cost-rate.js');
const { buildToppingCostRows } = await imp('lib/cost/topping/rows.js');
const { effectiveComponentsRawCost } = await imp('lib/cost/shared/effective-cost.js');
const { buildEffectiveRecipeComponents } = await imp('lib/cost/recipe-groups/effective.js');
const { normalizeCostBaseUnit } = await imp('lib/cost/unit-policy.js');

const jsonIndex = process.argv.indexOf('--json');
const jsonOut = jsonIndex >= 0 ? process.argv[jsonIndex + 1] : null;

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

  // ── 단가표(원가 화면들과 같은 방식) ─────────────────────────────────────
  const file = [...data.price_files].sort((a, b) =>
    String(b.updateDate).localeCompare(String(a.updateDate))
  )[0];
  const fileRowsRaw = data.price_rows.filter(row => row.fileId === file.id);
  const latestRows = dedupePriceRowsByProductCode(fileRowsRaw).rows;
  const priceMap = new Map(
    latestRows
      .filter(row => row.productCode && Number.isFinite(Number(row.priceWithTax)))
      .map(row => [
        row.productCode,
        { productCode: row.productCode, priceWithTax: Number(row.priceWithTax) },
      ])
  );
  const unitPriceMap = buildUnitPriceMap(data.cost_ingredients, priceMap);
  const recipeMaps = mergeCanonicalRecipeMaps(data.menu_recipes);
  const menuByCode = new Map(data.menu_master.map(m => [m.menuCode, m]));

  // ── 1. 7곳 비교 ──────────────────────────────────────────────────────────
  const summaries = buildMenuRecipeSummaryMap(data.menu_master, recipeMaps, unitPriceMap, {
    ingredients: data.cost_ingredients,
    recipeGroups: data.cost_recipe_groups,
    edges: data.cost_edge_dough,
  });
  const discontinuedCodes = new Set(
    data.menu_master.filter(m => m.status === 'discontinued').map(m => m.menuCode)
  );
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
  const printCost = new Map();
  for (const row of buildRecipePrintRows({
    detailMaps: recipeMaps,
    unitPriceMap,
    recipeGroups: data.cost_recipe_groups,
  })) {
    printCost.set(row.menuCode, row.totalCost);
  }
  const CAT_KEYS = ['피자', '1인피자', '세트박스', '사이드', '엣지', '추가토핑'];
  const CAT_META = Object.fromEntries(CAT_KEYS.map(k => [k, { id: k, color: '#000', label: k }]));
  const costData = buildCostReportData(
    data.cost_selling_prices,
    {
      detailMaps: recipeMaps,
      edges: data.cost_edge_dough,
      recipeGroups: data.cost_recipe_groups,
      upm: unitPriceMap,
      discontinuedCodes,
    },
    CAT_KEYS,
    CAT_META
  );
  const reportCost = new Map();
  for (const cat of Object.values(costData)) {
    if (Array.isArray(cat?.menus)) for (const m of cat.menus) reportCost.set(m.code, m.cost);
  }

  // 전체요약: 메뉴명으로 묶는다
  const summaryMenuPrices = data.cost_selling_prices.map(p => ({
    menuCode: p.menuCode,
    menuName: p.menuName,
    category: p.category,
    size: p.size,
    price: p.price,
  }));
  const detailMapsForSummary = {
    pizza: recipeMaps.pizza,
    personal: recipeMaps.personal,
    side: recipeMaps.side,
    set: recipeMaps.set,
    topping: recipeMaps.topping,
  };
  const allSummary = new Map(
    buildSummaryRows(
      summaryMenuPrices,
      detailMapsForSummary,
      unitPriceMap,
      data.cost_recipe_groups
    ).map(r => [r.menuName, r])
  );

  // 홈: menu_recipes 직접 구성품만(공통묶음·엣지·하프앤하프 제외)
  const homeItems = buildCanonicalCostRateItems({
    recipes: data.menu_recipes,
    sellingPrices: data.cost_selling_prices,
    unitPriceMap,
  });
  const homeCost = new Map(homeItems.map(i => [i.menuCode, i.cost]));

  // 토핑
  const toppingRows = buildToppingCostRows({
    menus: data.menu_master,
    recipeMap: recipeMaps.topping,
    unitPriceMap,
    allIngredients: data.cost_ingredients,
  });
  const toppingCost = new Map(toppingRows.map(r => [r.menuCode, Math.round(r.cost)]));

  const compare = [];
  let comparedMenus = 0;
  for (const menu of data.menu_master) {
    if (menu.status === 'discontinued') continue;
    const summary = summaries.get(menu.menuCode);
    if (!summary || !summary.hasRecipe || summary.status === 'edge') continue;
    comparedMenus++;
    const cells = {
      메뉴마스터: summary.totalCost,
      원가마진표: marginCost.get(menu.menuCode) ?? null,
      원가계산보고서: reportCost.get(menu.menuCode) ?? null,
      레시피출력: printCost.get(menu.menuCode) ?? null,
      전체요약: allSummary.get(menu.menuName)?.cost ?? null,
      홈: homeCost.get(menu.menuCode) ?? null,
      토핑: toppingCost.get(menu.menuCode) ?? null,
    };
    const seen = Object.values(cells).filter(v => v != null);
    if (new Set(seen).size > 1) {
      compare.push({
        code: menu.menuCode,
        name: menu.menuName,
        category: menu.category,
        공통묶음구성품: summary.commonComponentCount || 0,
        ...cells,
      });
    }
  }

  // ── 2. 단가 건강검진 ─────────────────────────────────────────────────────
  const ingredients = data.cost_ingredients;
  const fileCodes = new Set(latestRows.map(r => r.productCode));
  const fileCodesUpper = new Set(latestRows.map(r => String(r.productCode).toUpperCase()));
  const health = {
    식자재수: ingredients.length,
    코드있는식자재: ingredients.filter(i => i.productCode).length,
    단가파일_코드_대소문자불일치: [],
    단가파일에없는_코드있는식자재: [],
    포장수량_0이하: [],
    단가없음_사용중: [],
    복합구성_0원포함: [],
    단위불일치_레시피줄: [],
  };
  const usedCodes = new Map();
  for (const recipe of data.menu_recipes) {
    const menu = menuByCode.get(recipe.menuCode);
    if (menu?.status === 'discontinued') continue;
    for (const c of Array.isArray(recipe.components) ? recipe.components : []) {
      const code = String(c.productCode ?? '').trim();
      if (!code) continue;
      if (!usedCodes.has(code)) usedCodes.set(code, []);
      usedCodes.get(code).push(`${recipe.menuCode}:${c.ingredientName}`);
      const ing = unitPriceMap.get(code);
      if (ing && c.unit && normalizeCostBaseUnit(c.unit) !== ing.baseUnitType) {
        health.단위불일치_레시피줄.push(
          `${recipe.menuCode} ${c.ingredientName}: 줄 ${c.unit} vs 식자재 ${ing.baseUnitType}`
        );
      }
    }
  }
  for (const ing of ingredients) {
    const code = String(ing.productCode ?? '').trim();
    if (code) {
      if (!fileCodes.has(code) && fileCodesUpper.has(code.toUpperCase())) {
        health.단가파일_코드_대소문자불일치.push(code);
      }
      if (!fileCodes.has(code) && !fileCodesUpper.has(code.toUpperCase()) && !ing.discontinued) {
        health.단가파일에없는_코드있는식자재.push(
          `${code} ${ing.ingredientName} (수동 ${ing.priceOverride ?? '없음'})`
        );
      }
    }
    if (!(Number(ing.baseQuantity) > 0)) {
      health.포장수량_0이하.push(`${code || ing.id} ${ing.ingredientName}`);
    }
    const info = unitPriceMap.get(code || String(ing.id));
    if (info && info.unitPrice == null && usedCodes.has(code)) {
      health.단가없음_사용중.push(
        `${code} ${ing.ingredientName} ← ${usedCodes.get(code).length}곳`
      );
    }
    if (Array.isArray(ing.compositeOf) && ing.compositeOf.length > 0) {
      const zero = ing.compositeOf.filter(c => {
        const row = priceMap.get(String(c));
        return row && !(row.priceWithTax > 0);
      });
      if (zero.length)
        health.복합구성_0원포함.push(`${code} ${ing.ingredientName}: ${zero.join(',')}`);
    }
  }

  // 단가 반올림(0.1원 단위)이 메뉴 원가에 주는 오차 — 반올림 안 한 단가로 같은 원가를 다시 계산
  const exactUnitPriceMap = new Map();
  for (const [key, info] of unitPriceMap) {
    const exact =
      info.priceWithTax > 0 && info.baseQuantity > 0 ? info.priceWithTax / info.baseQuantity : null;
    exactUnitPriceMap.set(key, { ...info, unitPrice: exact });
  }
  const rounding = [];
  for (const menu of data.menu_master) {
    if (menu.status === 'discontinued') continue;
    const kind = Object.keys(KIND_TO_MARGIN_MAP).find(k => recipeMaps[k]?.get(menu.menuCode));
    const recipe = kind ? recipeMaps[kind].get(menu.menuCode) : null;
    if (!recipe) continue;
    const comps = buildEffectiveRecipeComponents(
      {
        menuCode: menu.menuCode,
        menuName: menu.menuName,
        category: menu.category,
        size: recipe.size,
      },
      recipe,
      data.cost_recipe_groups
    );
    if (!comps.length) continue;
    const rounded = effectiveComponentsRawCost(comps, unitPriceMap);
    const exact = effectiveComponentsRawCost(comps, exactUnitPriceMap);
    const diff = rounded - exact;
    if (Math.abs(diff) >= 0.5) {
      rounding.push({
        code: menu.menuCode,
        name: menu.menuName,
        반올림단가_원가: Math.round(rounded),
        정확단가_원가: Math.round(exact),
        차이_원: Math.round(diff * 10) / 10,
        차이_퍼센트: exact ? Math.round((diff / exact) * 1000) / 10 : null,
      });
    }
  }
  rounding.sort((a, b) => Math.abs(b.차이_원) - Math.abs(a.차이_원));

  // 조용한 0원 줄: 단가가 없거나 수량이 비어 원가에 0으로 들어간 구성품이 있는 판매 중 메뉴
  const silentZero = [];
  for (const menu of data.menu_master) {
    if (menu.status === 'discontinued') continue;
    const sm = summaries.get(menu.menuCode);
    if (!sm?.hasRecipe) continue;
    if ((sm.missingPriceCount || 0) > 0 || (sm.missingQuantityCount || 0) > 0) {
      silentZero.push({
        code: menu.menuCode,
        name: menu.menuName,
        단가없는_줄: sm.missingPriceCount || 0,
        수량없는_줄: sm.missingQuantityCount || 0,
        상태: sm.status,
      });
    }
  }

  // 판매가 이원화: 메뉴마스터 price와 원가 쪽 판매가(cost_selling_prices)가 같은가
  const sellingByCode = new Map(data.cost_selling_prices.map(p => [p.menuCode, p]));
  const priceMismatch = [];
  for (const menu of data.menu_master) {
    if (menu.status === 'discontinued') continue;
    const mp = Number(menu.price) > 0 ? Number(menu.price) : null;
    const sp = sellingByCode.get(menu.menuCode);
    const spPrice = sp && Number(sp.price) > 0 ? Number(sp.price) : null;
    if (mp !== spPrice) {
      priceMismatch.push({
        code: menu.menuCode,
        name: menu.menuName,
        메뉴마스터: mp,
        원가쪽판매가: spPrice,
        원가쪽행없음: !sp,
      });
    }
  }
  const orphanSelling = data.cost_selling_prices
    .filter(
      p => !menuByCode.has(p.menuCode) || menuByCode.get(p.menuCode).status === 'discontinued'
    )
    .map(p => `${p.menuCode} ${p.menuName}`);

  const report = {
    기준: {
      최신단가파일: `${file.updateDate} (${latestRows.length}행 / 원본 ${fileRowsRaw.length}행)`,
      메뉴수: data.menu_master.length,
      비교한메뉴수: comparedMenus,
    },
    '7곳_원가_불일치': { 건수: compare.length, 목록: compare },
    단가_건강검진: health,
    판매가_불일치: priceMismatch,
    원가쪽에만_남은_판매가_행: orphanSelling,
    조용한_0원_줄_메뉴: silentZero,
    단가반올림오차: {
      반올림이_원가를_반원이상_바꾼_메뉴수: rounding.length,
      최대10: rounding.slice(0, 10),
    },
  };
  if (jsonOut) fs.writeFileSync(jsonOut, JSON.stringify(report, null, 2));
  const brief = JSON.parse(JSON.stringify(report));
  brief['7곳_원가_불일치'].목록 = brief['7곳_원가_불일치'].목록.slice(0, 40);
  console.log(JSON.stringify(brief, null, 2));
} finally {
  await disconnectPrismaClient();
}
