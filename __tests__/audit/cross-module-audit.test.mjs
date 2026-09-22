/**
 * __tests__/audit/cross-module-audit.test.mjs — 모듈 간 연동 값 전수 대조 (읽기 전용 감사)
 *
 * 2026-09-22: "제때판매가-식자재관리-메뉴마스터-메뉴판매량-원가-영양성분 등 연결된 곳 전부
 * 값이 제대로 나가는지 확인" 요청에 따라, 화면이 실제로 호출하는 것과 같은 순수 계산
 * 함수(요약 loadMenuRecipeSummaryMap, 원가보고서 buildCostReportData, 원가마진표
 * buildDetailRows/buildEdgeMetadata/buildDerivedRows 등)를 서버에서 내려받은 실데이터
 * 스냅샷으로 그대로 돌려 화면 간 값을 대조한다. 데이터는 쓰지 않는다 — DB 접근 함수만
 * 스냅샷을 반환하도록 mock하고, 계산 함수는 실제 프로덕션 코드를 그대로 가져와 쓴다.
 *
 * RND_AUDIT_DATA_DIR 환경변수(scripts/pull-store-rows.mjs로 내려받은 data/ 폴더)가
 * 없으면 스킵한다 — 평소 CI(npm run test:ci)에는 영향 없음.
 */
import { existsSync, readFileSync } from 'node:fs';
import { join } from 'node:path';
import { beforeAll, describe, expect, jest, test } from '@jest/globals';

const DATA_DIR = process.env.RND_AUDIT_DATA_DIR || '';
const hasSnapshot = DATA_DIR && existsSync(join(DATA_DIR, '_manifest.json'));
const d = hasSnapshot ? describe : describe.skip;

function loadStore(name) {
  const path = join(DATA_DIR, `${name}.json`);
  if (!existsSync(path)) return [];
  const rows = JSON.parse(readFileSync(path, 'utf8'));
  return rows.map(r => (r && typeof r === 'object' && 'data' in r ? r.data : r)).filter(Boolean);
}

let snapshot = {};

if (hasSnapshot) {
  const STORES = [
    'menu_master',
    'cost_ingredients',
    'cost_selling_prices',
    'cost_edge_dough',
    'cost_recipe_groups',
    'menu_recipes',
    'price_files',
    'price_rows',
  ];
  snapshot = Object.fromEntries(STORES.map(name => [name, loadStore(name)]));

  // ── DB 접근 leaf 함수만 스냅샷으로 mock (계산 로직은 실제 프로덕션 코드를 그대로 씀) ──
  jest.unstable_mockModule('@/lib/ingredient', () => ({
    getAllIngredients: async () => snapshot.cost_ingredients,
  }));
  jest.unstable_mockModule('@/lib/price/store', () => ({
    getPriceFiles: async () =>
      [...snapshot.price_files].sort((a, b) =>
        String(b.updateDate || '').localeCompare(String(a.updateDate || ''))
      ),
    getPriceRowsByFileId: async fileId => snapshot.price_rows.filter(r => r.fileId === fileId),
  }));
  jest.unstable_mockModule('@/lib/price', async () => {
    const dup = await import('@/lib/price/duplicates');
    return {
      buildPriceRowMap: dup.buildPriceRowMap,
      getPriceFiles: async () =>
        [...snapshot.price_files].sort((a, b) =>
          String(b.updateDate || '').localeCompare(String(a.updateDate || ''))
        ),
      getPriceRowsByFileId: async fileId => snapshot.price_rows.filter(r => r.fileId === fileId),
    };
  });
  jest.unstable_mockModule('@/lib/cost/menu-price/store', () => ({
    getAllMenuPrices: async () => snapshot.cost_selling_prices,
  }));
  jest.unstable_mockModule('@/lib/cost/menu-price', async () => {
    const actual = await import('@/lib/cost/menu-price/code');
    return { ...actual, getAllMenuPrices: async () => snapshot.cost_selling_prices };
  });
  jest.unstable_mockModule('@/lib/cost/recipe-groups/store', () => ({
    getAllRecipeGroups: async () => snapshot.cost_recipe_groups,
  }));
  jest.unstable_mockModule('@/lib/cost/edge-dough', async () => {
    const calc = await import('@/lib/cost/edge-dough/calc');
    const template = await import('@/lib/cost/edge-dough/template');
    return { ...template, ...calc, getAllEdges: async () => snapshot.cost_edge_dough };
  });
  jest.unstable_mockModule('@/lib/cost/edge-dough/store', () => ({
    getAllEdges: async () => snapshot.cost_edge_dough,
  }));
  jest.unstable_mockModule('@/lib/menu-recipes', async () => {
    const legacy = await import('@/lib/menu-recipes/legacy');
    const store = await import('@/lib/menu-recipes/store');
    return {
      ...store,
      ...legacy,
      loadMenuRecipeMaps: async () => legacy.mergeCanonicalRecipeMaps(snapshot.menu_recipes),
    };
  });
  jest.unstable_mockModule('@/lib/menu-master', async () => {
    const actual = await import('@/lib/menu-master/index.js');
    return {
      ...actual,
      getAllMenuMaster: async () => snapshot.menu_master,
      getMenuMasterMap: async () =>
        new Map(snapshot.menu_master.filter(m => m.menuCode).map(m => [m.menuCode, m])),
    };
  });
}

d('모듈 간 연동 값 전수 대조', () => {
  let loadMenuRecipeSummaryMap;
  let buildCostReportData;
  let buildUnitPriceMap;
  let getAllIngredients;
  let getAllMenuPrices;
  let getAllEdges;
  let loadMenuRecipeMaps;
  let getAllRecipeGroups;
  let buildDetailRows, buildEdgeMetadata, buildDerivedRows;
  let getMenuCodeBase, getMenuCodeRank;
  let buildDiscontinuedMenuNameSet, buildMenuMasterNameSet, isDiscontinuedMenuName;

  beforeAll(async () => {
    ({ loadMenuRecipeSummaryMap } = await import('@/lib/menu-master/recipe-summary'));
    ({ buildCostReportData } = await import('@/lib/report/build-cost-report'));
    ({ buildUnitPriceMap } = await import('@/lib/recipe'));
    ({ getAllIngredients } = await import('@/lib/ingredient'));
    ({ getAllMenuPrices } = await import('@/lib/cost/menu-price/store'));
    ({ getAllEdges } = await import('@/lib/cost/edge-dough'));
    ({ loadMenuRecipeMaps } = await import('@/lib/menu-recipes'));
    ({ getAllRecipeGroups } = await import('@/lib/cost/recipe-groups/store'));
    ({ buildDetailRows, buildEdgeMetadata, buildDerivedRows } =
      await import('@/lib/cost/margin/build-rows'));
    ({ getMenuCodeBase } = await import('@/lib/menu-master/code-policy'));
    ({ getMenuCodeRank } = await import('@/lib/menu-categories'));
    ({ buildDiscontinuedMenuNameSet, buildMenuMasterNameSet, isDiscontinuedMenuName } =
      await import('@/lib/menu-master/discontinued-lookup'));
  });

  const CAT_KEYS = ['피자', '1인피자', '세트박스', '사이드', '엣지', '추가토핑'];
  const CAT_META = {
    피자: { id: 'pizza', color: '#3182F6', label: '피자' },
    '1인피자': { id: 'personal', color: '#10B981', label: '1인피자' },
    세트박스: { id: 'set', color: '#EC4899', label: '세트박스' },
    사이드: { id: 'side', color: '#F59E0B', label: '사이드' },
    엣지: { id: 'edge', color: '#8B5CF6', label: '엣지 & 도우' },
    추가토핑: { id: 'topping', color: '#14B8A6', label: '추가토핑' },
  };

  test('메뉴마스터 요약 vs 원가계산 보고서 vs 원가마진표 — 메뉴별 원가·판매가·원가율 대조', async () => {
    const menus = snapshot.menu_master.filter(m => m.status !== 'test');
    const ingredients = await getAllIngredients();
    const prices = await getAllMenuPrices();
    const edges = await getAllEdges();
    const recipeMaps = await loadMenuRecipeMaps();
    const recipeGroups = await getAllRecipeGroups();

    // ── app/report/cost/page.jsx의 load()와 동일한 ctx 조립 ──
    const files = [...snapshot.price_files].sort((a, b) =>
      String(b.updateDate || '').localeCompare(String(a.updateDate || ''))
    );
    const latestFile = files[0];
    const latestPriceRows = latestFile
      ? snapshot.price_rows
          .filter(r => r.fileId === latestFile.id)
          .map(r => ({ productCode: r.productCode, priceWithTax: r.priceWithTax }))
      : [];
    const latestPriceMap = new Map(
      latestPriceRows.map(r => [
        r.productCode,
        { productCode: r.productCode, priceWithTax: r.priceWithTax },
      ])
    );
    const reportUpm = buildUnitPriceMap(ingredients, latestPriceMap);
    const reportCtx = { detailMaps: recipeMaps, edges, recipeGroups, upm: reportUpm };
    const reportData = buildCostReportData(prices, reportCtx, CAT_KEYS, CAT_META);
    const reportByCode = new Map();
    for (const key of CAT_KEYS) {
      const meta = CAT_META[key];
      for (const menu of reportData[meta.id]?.menus || []) {
        if (menu.code) reportByCode.set(menu.code, menu);
      }
    }

    // ── 메뉴마스터 요약(app/menu-master/page.jsx) ──
    const summaryMap = await loadMenuRecipeSummaryMap(menus);

    // ── 원가마진표(app/cost/margin/useMarginData.js)와 동일한 ctx 조립 ──
    let priceRowMap = new Map();
    if (latestFile) {
      const dup = await import('@/lib/price/duplicates');
      priceRowMap = dup.buildPriceRowMap(
        snapshot.price_rows.filter(r => r.fileId === latestFile.id)
      ).map;
    }
    const marginUpm = buildUnitPriceMap(ingredients, priceRowMap);
    const detailRows = buildDetailRows(
      prices,
      {
        pizzaMap: recipeMaps.pizza,
        personalMap: recipeMaps.personal,
        sideMap: recipeMaps.side,
        setMap: recipeMaps.set,
        toppingMap: recipeMaps.topping,
      },
      marginUpm,
      recipeGroups
    );
    // menuCode(개별 사이즈 포함) → 그 코드가 속한 detail row에서 자기 사이즈의 원가/판매가.
    const marginByCode = new Map();
    for (const row of detailRows) {
      const codes = row.menuCodes?.length ? row.menuCodes : row.menuCode ? [row.menuCode] : [];
      for (const code of codes) {
        const menu = snapshot.menu_master.find(m => m.menuCode === code);
        const sizeLabel = menu?.size || row.sizes?.[0]?.label;
        const sizeEntry = (row.sizes || []).find(s => s.label === sizeLabel) || row.sizes?.[0];
        if (!sizeEntry) continue;
        marginByCode.set(code, {
          cost: row.costMap?.[sizeEntry.label],
          sale: sizeEntry.sellingPrice,
        });
      }
    }

    const mismatches = [];
    const marginMismatches = [];
    for (const menu of menus) {
      const code = menu.menuCode;
      if (!code) continue;
      const summary = summaryMap.get(code);
      const reportRow = reportByCode.get(code);
      const marginEntry = marginByCode.get(code);
      if (!summary) continue;
      if (summary.status === 'unsupported') continue;
      const summaryCost = summary.totalCost ?? null;
      if (reportRow) {
        const reportCost = reportRow.cost ?? null;
        if (summaryCost != null && reportCost != null && Math.abs(summaryCost - reportCost) >= 1) {
          mismatches.push({
            code,
            name: menu.menuName,
            menuMasterCost: summaryCost,
            reportCost,
            diff: summaryCost - reportCost,
          });
        }
      }
      if (marginEntry) {
        const marginCost = marginEntry.cost ?? null;
        if (summaryCost != null && marginCost != null && Math.abs(summaryCost - marginCost) >= 1) {
          marginMismatches.push({
            code,
            name: menu.menuName,
            menuMasterCost: summaryCost,
            marginCost,
            diff: summaryCost - marginCost,
          });
        }
      }
    }

    // eslint-disable-next-line no-console
    console.log(
      `[audit] 메뉴마스터 vs 원가보고서 원가 불일치: ${mismatches.length}건 / 대상 ${menus.length}개`
    );
    // eslint-disable-next-line no-console
    console.log(
      `[audit] 메뉴마스터 vs 원가마진표 원가 불일치: ${marginMismatches.length}건 / 매칭된 ${marginByCode.size}개`
    );
    if (marginMismatches.length > 0) {
      // eslint-disable-next-line no-console
      console.log(JSON.stringify(marginMismatches.slice(0, 20), null, 2));
    }
    if (mismatches.length > 0) {
      // eslint-disable-next-line no-console
      console.log(JSON.stringify(mismatches.slice(0, 20), null, 2));
    }

    expect(Array.isArray(mismatches)).toBe(true);
  });

  test('base 코드 계산 — getMenuCodeBase(size 필드) vs 정규식(-(L|R)$) 결과가 다른 메뉴코드', async () => {
    const regexBase = code => String(code || '').replace(/-(L|R)$/i, '');
    const diffs = [];
    for (const menu of snapshot.menu_master) {
      const a = getMenuCodeBase(menu);
      const b = regexBase(menu.menuCode);
      if (a !== b) diffs.push({ code: menu.menuCode, size: menu.size, fieldBase: a, regexBase: b });
    }
    // eslint-disable-next-line no-console
    console.log(`[audit] base 코드 계산 불일치: ${diffs.length}건`);
    if (diffs.length) console.log(JSON.stringify(diffs.slice(0, 20), null, 2));
    expect(Array.isArray(diffs)).toBe(true);
  });

  test('단종 집합 — 이름 기준 vs base 코드 기준 판정이 갈리는 메뉴', async () => {
    const byName = buildDiscontinuedMenuNameSet(snapshot.menu_master);
    const allNames = buildMenuMasterNameSet(snapshot.menu_master);

    const byBaseCode = new Map();
    for (const menu of snapshot.menu_master) {
      const base = getMenuCodeBase(menu);
      if (!byBaseCode.has(base)) byBaseCode.set(base, []);
      byBaseCode.get(base).push(menu);
    }
    const discontinuedBaseCodes = new Set(
      [...byBaseCode.entries()]
        .filter(([, rows]) => rows.every(r => r.status === 'discontinued'))
        .map(([base]) => base)
    );

    const diffs = [];
    for (const [base, rows] of byBaseCode) {
      const nameDiscontinued = rows.some(r => isDiscontinuedMenuName(r.menuName, byName));
      const baseDiscontinued = discontinuedBaseCodes.has(base);
      if (nameDiscontinued !== baseDiscontinued) {
        diffs.push({
          base,
          names: rows.map(r => r.menuName),
          statuses: rows.map(r => r.status),
          nameDiscontinued,
          baseDiscontinued,
        });
      }
    }
    // eslint-disable-next-line no-console
    console.log(`[audit] 단종 판정(이름 vs base코드) 불일치: ${diffs.length}건`);
    if (diffs.length) console.log(JSON.stringify(diffs.slice(0, 20), null, 2));
    expect(allNames.size).toBeGreaterThan(0);
  });

  test('판매가 미러 — menu_master.price vs cost_selling_prices.price (서버 재전송 이후 재확인)', async () => {
    const spByCode = new Map(snapshot.cost_selling_prices.map(p => [p.menuCode, p.price]));
    const diffs = [];
    for (const menu of snapshot.menu_master) {
      if (!spByCode.has(menu.menuCode)) continue;
      const spPrice = spByCode.get(menu.menuCode);
      if ((menu.price ?? null) !== (spPrice ?? null)) {
        diffs.push({
          code: menu.menuCode,
          name: menu.menuName,
          menuMasterPrice: menu.price,
          sellingPrice: spPrice,
        });
      }
    }
    // eslint-disable-next-line no-console
    console.log(
      `[audit] 판매가 미러 불일치(menu_master vs cost_selling_prices): ${diffs.length}건`
    );
    if (diffs.length) console.log(JSON.stringify(diffs, null, 2));
    expect(diffs.length).toBe(0);
  });

  test('엣지 원가 — 저장된 component.unitPrice 기준 vs 최신 제때 단가로 재계산', async () => {
    const { componentEffectiveUnitPrice } = await import('@/lib/cost/shared/effective-cost');
    const ingredients = await getAllIngredients();
    const files = [...snapshot.price_files].sort((a, b) =>
      String(b.updateDate || '').localeCompare(String(a.updateDate || ''))
    );
    const latestFile = files[0];
    const latestPriceMap = latestFile
      ? new Map(
          snapshot.price_rows
            .filter(r => r.fileId === latestFile.id)
            .map(r => [r.productCode, { productCode: r.productCode, priceWithTax: r.priceWithTax }])
        )
      : new Map();
    const upm = buildUnitPriceMap(ingredients, latestPriceMap);

    const diffs = [];
    for (const edge of snapshot.cost_edge_dough) {
      let storedCost = 0;
      let freshCost = 0;
      for (const c of edge.components || []) {
        const qty = Number(c.quantity) || 0;
        storedCost += qty * (Number(c.unitPrice) || 0);
        freshCost += qty * (componentEffectiveUnitPrice(c, upm) ?? (Number(c.unitPrice) || 0));
      }
      storedCost = Math.round(storedCost);
      freshCost = Math.round(freshCost);
      if (Math.abs(storedCost - freshCost) >= 1) {
        diffs.push({
          edgeType: edge.edgeType,
          size: edge.size,
          storedCost,
          freshCost,
          diff: storedCost - freshCost,
        });
      }
    }
    // eslint-disable-next-line no-console
    console.log(
      `[audit] 엣지 원가(저장값 vs 최신 재계산) 불일치: ${diffs.length}건 / 전체 ${snapshot.cost_edge_dough.length}행`
    );
    if (diffs.length) console.log(JSON.stringify(diffs, null, 2));
    expect(Array.isArray(diffs)).toBe(true);
  });

  test('원가율 위험 기준 — 홈(35%) vs 원가마진표(40%) 기준으로 위험 판정이 갈리는 메뉴 수', async () => {
    const menus = snapshot.menu_master.filter(m => m.status === 'active');
    const ingredients = await getAllIngredients();
    const prices = await getAllMenuPrices();
    const edges = await getAllEdges();
    const recipeMaps = await loadMenuRecipeMaps();
    const recipeGroups = await getAllRecipeGroups();
    const files = [...snapshot.price_files].sort((a, b) =>
      String(b.updateDate || '').localeCompare(String(a.updateDate || ''))
    );
    const latestFile = files[0];
    const latestPriceMap = latestFile
      ? new Map(
          snapshot.price_rows
            .filter(r => r.fileId === latestFile.id)
            .map(r => [r.productCode, { productCode: r.productCode, priceWithTax: r.priceWithTax }])
        )
      : new Map();
    const upm = buildUnitPriceMap(ingredients, latestPriceMap);
    const reportCtx = { detailMaps: recipeMaps, edges, recipeGroups, upm };
    const reportData = buildCostReportData(prices, reportCtx, CAT_KEYS, CAT_META);

    const rates = [];
    for (const key of CAT_KEYS) {
      const meta = CAT_META[key];
      for (const menu of reportData[meta.id]?.menus || []) {
        if (menu.cost > 0 && menu.sale > 0)
          rates.push({ code: menu.code, name: menu.name, rate: menu.rate });
      }
    }
    const over35 = rates.filter(r => r.rate >= 35);
    const over40 = rates.filter(r => r.rate > 40);
    const onlyInBoth = new Set(over40.map(r => r.code));
    const between35And40 = over35.filter(r => !onlyInBoth.has(r.code));

    // eslint-disable-next-line no-console
    console.log(
      `[audit] 원가율 위험 기준: 보고서(>=35%) ${over35.length}개 vs 홈/마진표(>40%) ${over40.length}개 — 기준 차이로만 위험군에 들어가는 메뉴 ${between35And40.length}개`
    );
    if (between35And40.length) {
      // eslint-disable-next-line no-console
      console.log(JSON.stringify(between35And40.slice(0, 10), null, 2));
    }
    expect(rates.length).toBeGreaterThan(0);
  });

  test('복합(compositeOf) 식자재 단가 — 식자재 관리 표시값(priceOverride 우선) vs 레시피 실제 적용값(제때 합산)', async () => {
    const ingredients = await getAllIngredients();
    const files = [...snapshot.price_files].sort((a, b) =>
      String(b.updateDate || '').localeCompare(String(a.updateDate || ''))
    );
    const latestFile = files[0];
    const priceRowMap = new Map(
      latestFile
        ? snapshot.price_rows
            .filter(r => r.fileId === latestFile.id)
            .map(r => [r.productCode, { productCode: r.productCode, priceWithTax: r.priceWithTax }])
        : []
    );
    const upm = buildUnitPriceMap(ingredients, priceRowMap);

    const composites = ingredients.filter(
      i => Array.isArray(i.compositeOf) && i.compositeOf.length > 0
    );
    const diffs = [];
    for (const ing of composites) {
      const key = ing.productCode || String(ing.id);
      const recipeUnitPrice = upm.get(key)?.unitPrice ?? null;
      // 식자재 관리 화면(lib/ingredient/index.js mergeIngredientRows)이 실제로 보여주는 값과
      // 동일한 우선순위: priceOverride가 있으면 그걸 그대로 쓰고, compositeOf 합산은 보지 않음.
      const displayedUnitPrice =
        ing.priceOverride != null && ing.baseQuantity > 0
          ? ing.priceOverride / ing.baseQuantity
          : null;
      if (
        recipeUnitPrice != null &&
        displayedUnitPrice != null &&
        Math.abs(recipeUnitPrice - displayedUnitPrice) >= 1
      ) {
        diffs.push({
          productCode: ing.productCode,
          name: ing.ingredientName,
          displayedUnitPrice: Math.round(displayedUnitPrice),
          recipeUnitPrice: Math.round(recipeUnitPrice),
        });
      }
    }
    // eslint-disable-next-line no-console
    console.log(
      `[audit] 복합 식자재 단가 불일치(식자재관리 표시 vs 레시피 적용): ${diffs.length}건 / 복합 식자재 ${composites.length}개`
    );
    if (diffs.length) console.log(JSON.stringify(diffs.slice(0, 20), null, 2));
    expect(Array.isArray(diffs)).toBe(true);
  });
});
