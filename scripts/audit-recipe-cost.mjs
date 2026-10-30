/**
 * 식자재 → 레시피 → 원가 일관성 점검 (읽기 전용: DB에서 읽기만 하고 아무것도 쓰지 않는다)
 *
 *   npm run audit:recipe-cost            # 현재 데이터 기준
 *   npm run audit:recipe-cost -- 1.2     # 제품코드 없는 수동 식자재 단가를 20% 올렸다고 가정(메모리 안에서만)
 *   npm run audit:recipe-cost -- --jette 1.1   # 제때 연동(제품코드) 식자재 단가를 10% 올렸다고 가정
 *   (두 가정은 함께 쓸 수 있다: -- 1.2 --jette 1.1)
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
  if (factor !== 1 || jetteFactor !== 1) {
    for (const [key, info] of unitPriceMap) {
      if (info?.unitPrice == null) continue;
      if (manualKeys.has(key)) info.unitPrice = info.unitPrice * factor;
      else info.unitPrice = info.unitPrice * jetteFactor;
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

  // ── 원가계산 보고서 출력(웹·PDF·엑셀) 점검 ──────────────────────────────
  // 보고서 화면(app/report/cost/page.jsx)과 같은 입력으로 같은 빌더를 돌려, 엑셀 3개 시트와
  // PDF 레시피 출력이 쓰는 값이 메뉴마스터·서로 간에 맞는지 비교한다.
  const CAT_KEYS = ['피자', '1인피자', '세트박스', '사이드', '엣지', '추가토핑'];
  const CAT_META = {
    피자: { id: 'pizza', color: '#3182F6', label: '피자' },
    '1인피자': { id: 'personal', color: '#10B981', label: '1인피자' },
    세트박스: { id: 'set', color: '#EC4899', label: '세트박스' },
    사이드: { id: 'side', color: '#F59E0B', label: '사이드' },
    엣지: { id: 'edge', color: '#8B5CF6', label: '엣지 & 도우' },
    추가토핑: { id: 'topping', color: '#14B8A6', label: '추가토핑' },
  };
  const discontinuedCodes = new Set(
    data.menu_master.filter(m => m.status === 'discontinued').map(m => m.menuCode)
  );
  const reportCtx = {
    detailMaps: recipeMaps,
    edges: data.cost_edge_dough,
    recipeGroups: data.cost_recipe_groups,
    upm: unitPriceMap,
    discontinuedCodes,
  };
  const reportPrices = data.cost_selling_prices;
  const costData = buildCostReportData(reportPrices, reportCtx, CAT_KEYS, CAT_META);
  const recipeRows = buildRecipePrintRows({
    detailMaps: recipeMaps,
    unitPriceMap,
    recipeGroups: data.cost_recipe_groups,
    excludeMenuCodes: discontinuedCodes,
  });

  // 줄마다 반올림해 보여 주는 소계의 합은 총액과 1~2원 어긋날 수 있다(표시 반올림). 그 이상만 불일치로 본다.
  const ROUNDING_TOLERANCE = 2;

  // (1) 엑셀 '메뉴 상세'·웹·PDF 원가표의 원가 = 메뉴마스터 원가
  const tableVsMaster = [];
  let tableChecked = 0;
  for (const cat of Object.values(costData)) {
    if (!Array.isArray(cat?.menus)) continue;
    for (const m of cat.menus) {
      const summary = summaries.get(m.code);
      if (!summary || discontinuedCodes.has(m.code) || m.halfHalf) continue;
      if (!summary.hasRecipe && summary.status !== 'edge') continue;
      tableChecked++;
      if (m.cost !== summary.totalCost) {
        tableVsMaster.push({
          code: m.code,
          name: m.name,
          원가표: m.cost,
          메뉴마스터: summary.totalCost,
        });
      }
    }
  }

  // (2) 엑셀 '레시피 출력' 시트: 레시피합계(첫 줄) vs 줄 소계 합 — 화면에 보이는 숫자끼리 맞는가
  const sheet3SumDiff = [];
  for (const row of recipeRows) {
    const lineSum = row.components.reduce((sum, c) => sum + (c.subtotal ?? 0), 0);
    if (Math.abs(lineSum - row.totalCost) > ROUNDING_TOLERANCE) {
      sheet3SumDiff.push({
        code: row.menuCode,
        name: row.menuName,
        합계: row.totalCost,
        줄소계합: lineSum,
      });
    }
  }

  // (3) 엑셀 레시피합계 = 원가표 원가 (같은 메뉴코드)
  const rowCostByCode = new Map(recipeRows.map(r => [r.menuCode, r.totalCost]));
  const sheet3VsTable = [];
  for (const cat of Object.values(costData)) {
    if (!Array.isArray(cat?.menus)) continue;
    for (const m of cat.menus) {
      if (!rowCostByCode.has(m.code) || m.halfHalf) continue;
      if (rowCostByCode.get(m.code) !== m.cost) {
        sheet3VsTable.push({
          code: m.code,
          name: m.name,
          원가표: m.cost,
          레시피시트: rowCostByCode.get(m.code),
        });
      }
    }
  }

  // (4) PDF 레시피 출력(메뉴 카드): 규격별 줄 소계 합 vs 원가표 원가
  const pdfVsTable = [];
  const costByCode = new Map();
  for (const cat of Object.values(costData)) {
    if (Array.isArray(cat?.menus)) for (const m of cat.menus) costByCode.set(m.code, m.cost);
  }
  for (const menu of buildRecipePrintMenus(recipeRows)) {
    // 하프앤하프는 레시피 없이 오리지널 피자 평균으로 계산되는 메뉴라 비교 대상이 아니다
    if (!menu.components.length) continue;
    for (const size of menu.sizes) {
      const code = recipeRows.find(
        r =>
          r.menuName === menu.menuName && r.categoryLabel === menu.categoryLabel && r.size === size
      )?.menuCode;
      const sum = menu.components.reduce((s, c) => s + (c.sizeSubtotals[size] || 0), 0);
      if (
        code != null &&
        costByCode.has(code) &&
        Math.abs(Math.round(sum) - costByCode.get(code)) > ROUNDING_TOLERANCE
      ) {
        pdfVsTable.push({
          menu: menu.menuName,
          size,
          PDF줄합: Math.round(sum),
          원가표: costByCode.get(code),
        });
      }
    }
  }

  // (5) 연결된 구성품의 단가 = 식자재 현재 단가 (엑셀 '단가' 열)
  const stalePrice = [];
  for (const row of recipeRows) {
    for (const c of row.components) {
      const info = c.productCode ? unitPriceMap.get(c.productCode) : null;
      if (info && info.unitPrice != null && Math.abs((c.unitPrice ?? 0) - info.unitPrice) > 1e-9) {
        stalePrice.push(`${row.menuCode} ${c.ingredientName}`);
      }
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
        가정:
          factor === 1 && jetteFactor === 1
            ? '현재 데이터'
            : `수동 식자재 단가 x${factor}, 제때 연동 단가 x${jetteFactor}`,
        최신단가파일: `${file.updateDate} (${latestRows.length}행)`,
        메뉴수: data.menu_master.length,
        화면간원가불일치: mismatches.length,
        불일치목록: mismatches.slice(0, 30),
        없는제품코드: orphanCodes,
        판매중메뉴의단종식자재: discontinuedUsed,
        코드없는구성품: codeless.length,
        판매가없는데레시피있는메뉴: menusWithoutPrice,
        보고서출력: {
          원가표_메뉴마스터_비교건수: tableChecked,
          원가표_vs_메뉴마스터_불일치: tableVsMaster,
          레시피시트_합계_vs_줄소계합_불일치: sheet3SumDiff,
          레시피시트_vs_원가표_불일치: sheet3VsTable,
          PDF레시피_vs_원가표_불일치: pdfVsTable,
          단가가_식자재와_다른_줄: stalePrice,
          원가표_미연결: costData._diagnostics,
        },
      },
      null,
      2
    )
  );
  process.exitCode =
    mismatches.length || tableVsMaster.length || sheet3VsTable.length || pdfVsTable.length ? 1 : 0;
} finally {
  await disconnectPrismaClient();
}
