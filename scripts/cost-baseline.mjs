/**
 * scripts/cost-baseline.mjs — 대표 메뉴의 원가 기준값을 저장하고, 이후 변경 뒤에 비교한다.
 *
 *   npm run baseline:cost              # 지금 값을 .baseline/cost-baseline.json에 저장
 *   npm run baseline:cost -- --check   # 저장한 기준값과 비교(다르면 종료코드 1)
 *
 * 비교 대상: 수동 계산(원본 단가·포장수량·수량), 메뉴마스터, 원가마진표, 원가계산 보고서,
 * 실제로 만든 보고서 엑셀 파일의 셀 값, PDF 레시피 출력.
 * DB는 읽기 전용 연결로만 읽는다. 결과에는 업무 데이터(단가·원가)가 있어 저장소에 올리지 않는다.
 */
import 'dotenv/config';
import {
  existsSync,
  mkdirSync,
  mkdtempSync,
  readFileSync,
  readdirSync,
  rmSync,
  writeFileSync,
} from 'node:fs';
import { createRequire } from 'node:module';
import { tmpdir } from 'node:os';
import { join, resolve } from 'node:path';
import pg from 'pg';

import { createAppImporter } from './app-module-loader.mjs';
import {
  checkMenuValues,
  diffBaseline,
  manualMenuCost,
  pickRepresentatives,
} from './cost-baseline-core.mjs';

const ROOT = process.cwd();
const OUT_DIR = resolve(ROOT, '.baseline');
const OUT = join(OUT_DIR, 'cost-baseline.json');
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
const CAT_KEYS = ['피자', '1인피자', '세트박스', '사이드', '엣지', '추가토핑'];
const CAT_META = {
  피자: { id: 'pizza', color: '#3182F6', label: '피자' },
  '1인피자': { id: 'personal', color: '#10B981', label: '1인피자' },
  세트박스: { id: 'set', color: '#EC4899', label: '세트박스' },
  사이드: { id: 'side', color: '#F59E0B', label: '사이드' },
  엣지: { id: 'edge', color: '#8B5CF6', label: '엣지 & 도우' },
  추가토핑: { id: 'topping', color: '#14B8A6', label: '추가토핑' },
};

async function readData() {
  const connectionString = String(process.env.DATABASE_URL || '').trim();
  if (!connectionString) throw new Error('DATABASE_URL이 필요합니다.');
  const client = new pg.Client({
    connectionString,
    options: '-c default_transaction_read_only=on',
  });
  await client.connect();
  try {
    const data = {};
    for (const store of STORES) {
      const { rows } = await client.query(
        `select data from store_rows where brand_id = 'main' and store_name = $1
           and record_key not like '%\\_\\_client:%' order by legacy_numeric_id nulls last, record_key`,
        [store]
      );
      data[store] = rows.map(row => row.data);
    }
    return data;
  } finally {
    await client.end();
  }
}

/** 앱의 보고서 엑셀을 실제 파일로 만들고 셀을 다시 읽는다 */
async function readExportedExcel(imp, label, activeCats, recipeRows) {
  const { exportCostXlsx } = await imp('lib/report/export-cost-xlsx.js');
  const XLSX = createRequire(join(ROOT, 'package.json'))('xlsx');
  const dir = mkdtempSync(join(tmpdir(), 'rnd-cost-baseline-'));
  const cwd = process.cwd();
  try {
    process.chdir(dir);
    await exportCostXlsx(label, activeCats, recipeRows);
    const file = readdirSync(dir).find(name => name.endsWith('.xlsx'));
    if (!file) throw new Error('엑셀 파일이 만들어지지 않았습니다.');
    const book = XLSX.read(readFileSync(join(dir, file)), { type: 'buffer' });
    const sheet = index =>
      XLSX.utils.sheet_to_json(book.Sheets[book.SheetNames[index]], { header: 1, defval: '' });
    return { detail: sheet(1), recipes: sheet(2) };
  } finally {
    process.chdir(cwd);
    rmSync(dir, { recursive: true, force: true });
  }
}

async function collect(codes) {
  const imp = createAppImporter(ROOT);
  const data = await readData();
  const [recipeLib, summaryLib, legacy, dedupe, margin, printRows, report, display] =
    await Promise.all([
      imp('lib/recipe/index.js'),
      imp('lib/menu-master/recipe-summary.js'),
      imp('lib/menu-recipes/legacy.js'),
      imp('lib/price/duplicates.js'),
      imp('lib/cost/margin/build-rows.js'),
      imp('lib/report/recipe-print-rows.js'),
      imp('lib/report/build-cost-report.js'),
      imp('lib/report/cost-menu-display.js'),
    ]);

  const file = [...data.price_files].sort((a, b) =>
    String(b.updateDate).localeCompare(String(a.updateDate))
  )[0];
  const latestRows = dedupe.dedupePriceRowsByProductCode(
    data.price_rows.filter(row => row.fileId === file.id)
  ).rows;
  const latestPrices = new Map(
    latestRows.filter(row => row.productCode).map(row => [row.productCode, row.priceWithTax])
  );
  const priceMap = new Map(
    [...latestPrices].map(([productCode, priceWithTax]) => [
      productCode,
      { productCode, priceWithTax },
    ])
  );
  const upm = recipeLib.buildUnitPriceMap(data.cost_ingredients, priceMap);
  const recipeMaps = legacy.mergeCanonicalRecipeMaps(data.menu_recipes);
  const discontinued = new Set(
    data.menu_master.filter(m => m.status === 'discontinued').map(m => m.menuCode)
  );

  // 메뉴마스터
  const summaries = summaryLib.buildMenuRecipeSummaryMap(data.menu_master, recipeMaps, upm, {
    ingredients: data.cost_ingredients,
    recipeGroups: data.cost_recipe_groups,
    edges: data.cost_edge_dough,
  });
  // 원가마진표
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
    ['pizza', 'personal', 'side', 'set', 'topping'].map(kind => [
      `${kind}Map`,
      recipeMaps[kind] ?? new Map(),
    ])
  );
  const marginCost = new Map();
  for (const row of margin.buildDetailRows(menuPrices, marginMaps, upm, data.cost_recipe_groups)) {
    for (const [size, code] of Object.entries(row.sizeMenuCodes || {})) {
      if (row.costMap && size in row.costMap) marginCost.set(code, row.costMap[size]);
    }
  }
  // 원가계산 보고서(화면)와 레시피 출력
  const ctx = {
    detailMaps: recipeMaps,
    edges: data.cost_edge_dough,
    recipeGroups: data.cost_recipe_groups,
    upm,
    discontinuedCodes: discontinued,
  };
  const costData = report.buildCostReportData(data.cost_selling_prices, ctx, CAT_KEYS, CAT_META);
  const reportByCode = new Map();
  for (const meta of Object.values(CAT_META)) {
    for (const menu of costData[meta.id]?.menus || []) reportByCode.set(menu.code, menu);
  }
  const recipeRows = printRows.buildRecipePrintRows({
    detailMaps: recipeMaps,
    unitPriceMap: upm,
    recipeGroups: data.cost_recipe_groups,
    excludeMenuCodes: discontinued,
  });
  const printMenus = printRows.buildRecipePrintMenus(recipeRows);
  // 보고서 엑셀 파일
  const activeCats = CAT_KEYS.map(key => CAT_META[key]).map(meta => [
    meta.id,
    costData[meta.id] || { label: meta.label, color: meta.color, menus: [] },
  ]);
  const excel = await readExportedExcel(imp, '기준값', activeCats, recipeRows);
  // 상세 시트의 (카테고리, 메뉴명) 행과 규격별 열을 메뉴코드에 다시 연결한다
  const excelCost = new Map();
  for (const [, category] of activeCats) {
    for (const group of display.groupCostMenusBySize(category.menus)) {
      const row = excel.detail.find(r => r[0] === category.label && r[1] === group.name);
      if (!row) continue;
      for (const [slot, column] of [
        [group.sizes.L, 3],
        [group.sizes.R, 6],
        [group.single, 9],
      ]) {
        if (slot?.code) excelCost.set(slot.code, row[column] === '' ? null : Number(row[column]));
      }
    }
  }
  const sheetTotal = new Map(
    excel.recipes
      .slice(1)
      .filter(row => row[12] !== '')
      .map(row => [row[1], Number(row[12])])
  );

  const rawByCode = new Map(data.menu_recipes.map(recipe => [recipe.menuCode, recipe]));
  const menus = recipeRows
    .filter(row => row.components.length > 0 && reportByCode.has(row.menuCode))
    .map(row => {
      const raw = rawByCode.get(row.menuCode);
      const stored = Array.isArray(raw?.components) ? raw.components : [];
      let directIndex = 0;
      const lines = row.components.map(component => {
        const direct = component.sourceType !== 'common';
        const source = direct ? stored[directIndex++] : null;
        return {
          ingredientName: component.ingredientName,
          productCode: component.productCode,
          // 직접 구성품의 수량은 저장된 레시피 원본에서 읽는다
          quantity: direct ? source?.quantity : component.quantity,
          storedUnitPrice: direct ? source?.unitPrice : component.unitPrice,
        };
      });
      const manual = manualMenuCost(lines, data.cost_ingredients, latestPrices);
      const printed = printMenus.find(
        item => item.menuName === row.menuName && item.categoryLabel === row.categoryLabel
      );
      const printSum = printed?.components.reduce(
        (sum, component) => sum + (component.sizeSubtotals?.[row.size] || 0),
        0
      );
      return {
        code: row.menuCode,
        name: row.menuName,
        category: row.categoryLabel,
        size: row.size,
        eligible:
          manual.unresolved === 0 &&
          !discontinued.has(row.menuCode) &&
          summaries.get(row.menuCode)?.totalCost > 0,
        directLinesMatch: directIndex === stored.length,
        manual,
        values: {
          master: summaries.get(row.menuCode)?.totalCost ?? null,
          margin: marginCost.get(row.menuCode) ?? null,
          report: reportByCode.get(row.menuCode)?.cost ?? null,
          excel: excelCost.get(row.menuCode) ?? null,
          recipeSheet: sheetTotal.get(row.menuCode) ?? null,
          print: printSum ? Math.round(printSum) : null,
          sale: reportByCode.get(row.menuCode)?.sale ?? null,
        },
      };
    });

  const chosen = codes || pickRepresentatives(menus, 5);
  return {
    createdAt: new Date().toISOString(),
    priceFile: { updateDate: file.updateDate, rows: latestRows.length },
    menus: menus.filter(menu => chosen.includes(menu.code)),
    allMenus: Object.fromEntries(
      [...summaries].map(([code, summary]) => [code, summary.totalCost ?? null])
    ),
  };
}

function reportMenus(result) {
  let problems = 0;
  for (const menu of result.menus) {
    const found = checkMenuValues(menu);
    if (!menu.directLinesMatch) found.push('레시피 원본과 줄 수가 다름');
    problems += found.length;
    const v = menu.values;
    console.log(
      `${found.length ? '확인' : '일치'}  ${menu.code} ${menu.name} (${menu.size}) — 수동 ${menu.manual.rounded}` +
        ` (반올림 전 ${menu.manual.exact}) · 마스터 ${v.master} · 마진표 ${v.margin} · 보고서 ${v.report}` +
        ` · 엑셀 ${v.excel} · 레시피시트 ${v.recipeSheet} · 인쇄 ${v.print}` +
        (found.length ? `\n      ${found.join(' / ')}` : '')
    );
  }
  return problems;
}

async function main() {
  const check = process.argv.includes('--check');
  if (check && !existsSync(OUT)) throw new Error('저장한 기준값이 없습니다. 먼저 저장해 주세요.');
  const saved = check ? JSON.parse(readFileSync(OUT, 'utf8')) : null;
  const current = await collect(saved?.menus.map(menu => menu.code));
  console.log(
    `단가 파일 ${current.priceFile.updateDate} (${current.priceFile.rows}행) · 대표 메뉴 ${current.menus.length}개`
  );
  const problems = reportMenus(current);
  if (current.menus.length < 5) throw new Error('대표 메뉴를 5개 이상 고르지 못했습니다.');
  if (check) {
    const changes = diffBaseline(saved, current);
    console.log(
      `\n기준값(${saved.createdAt.slice(0, 10)}, 단가 ${saved.priceFile.updateDate})과 다른 항목 ${changes.length}건`
    );
    for (const change of changes.slice(0, 40)) {
      console.log(`  ${change.code} ${change.what}: ${change.before} → ${change.after}`);
    }
    if (changes.length || problems) process.exitCode = 1;
    return;
  }
  mkdirSync(OUT_DIR, { recursive: true });
  writeFileSync(OUT, `${JSON.stringify(current, null, 2)}\n`, 'utf8');
  console.log(
    `\n저장: .baseline/cost-baseline.json (메뉴 전체 ${Object.keys(current.allMenus).length}개 원가 포함)`
  );
  if (problems) process.exitCode = 1;
}

main().catch(error => {
  console.error(error?.stack || error);
  process.exitCode = 1;
});
