/**
 * __tests__/audit/cross-module-audit-sales-nutrition.test.mjs — 판매량↔영양성분↔원산지↔
 * 알레르기 연동 값 전수 대조 (읽기 전용 감사, A2 클러스터)
 *
 * __tests__/audit/cross-module-audit.test.mjs(A1: 제때단가→원가)와 같은 방법론이지만,
 * 여기서는 `@/lib/db`의 getAll/getById/getByIndex/hasStore/initDB 자체를 스냅샷 라우터로
 * 한 번만 mock한다 — A2 쪽 화면들이 쓰는 repository 함수가 훨씬 많고(getAllMenuRefs,
 * getAllRawValues, getAllToppings, getAllCompositions, getAllOrigins …) 전부 결국
 * `getAll('store_name')`을 그대로 감싸는 얇은 함수라, 개별 함수 mock보다 이 방식이
 * 더 정확하고 유지보수가 쉽다. 계산 함수는 실제 프로덕션 코드를 그대로 가져와 쓴다.
 *
 * RND_AUDIT_DATA_DIR 환경변수가 없으면 스킵 — 평소 CI에는 영향 없음.
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
    'cost_recipe_groups',
    'cost_edge_dough',
    'nutrition_menu_ref',
    'nutrition_raw_values',
    'nutrition_topping_master',
    'nutrition_edge_master',
    'nutrition_set_composition',
    'sales_rows',
    'sales_rules',
    'ref_sales_aliases',
    'ref_excluded',
    'ref_discontinued',
    'ref_registered_overrides',
  ];
  snapshot = Object.fromEntries(STORES.map(name => [name, loadStore(name)]));

  // ── @/lib/db 자체를 스냅샷 라우터로 mock (모든 getAllX()가 결국 이걸 감싼다) ──
  // 읽기 전용 감사라 쓰기 계열(put/bulkPut/runTransaction 등)은 호출되면 바로 드러나게
  // 실패시키고, import 시점에 이름이 없어 터지지 않도록 export 이름만 채워둔다.
  const notImplemented = name => () => {
    throw new Error(
      `[audit] 읽기 전용 감사에서 쓰기 함수(${name})가 호출됨 — 실제로 호출되면 안 됨`
    );
  };
  const dbMock = {
    initDB: async () => true,
    hasStore: () => true,
    getAll: async storeName => snapshot[storeName] || [],
    getById: async (storeName, id) => (snapshot[storeName] || []).find(r => r.id === id) || null,
    getByIndex: async (storeName, indexName, value) =>
      (snapshot[storeName] || []).filter(r => r[indexName] === value),
    put: notImplemented('put'),
    bulkPut: notImplemented('bulkPut'),
    deleteById: notImplemented('deleteById'),
    runTransaction: notImplemented('runTransaction'),
    clearStore: notImplemented('clearStore'),
    deleteWithChildren: notImplemented('deleteWithChildren'),
    checkUploadHash: notImplemented('checkUploadHash'),
    deleteFileWithLog: notImplemented('deleteFileWithLog'),
    exportAll: notImplemented('exportAll'),
    exportAllForBrand: notImplemented('exportAllForBrand'),
    exportSelected: notImplemented('exportSelected'),
    exportSelectedForBrand: notImplemented('exportSelectedForBrand'),
    importAll: notImplemented('importAll'),
    importAllToBrand: notImplemented('importAllToBrand'),
    deleteDatabase: notImplemented('deleteDatabase'),
    restoreRecord: notImplemented('restoreRecord'),
    replaceStoreForBrand: notImplemented('replaceStoreForBrand'),
  };
  jest.unstable_mockModule('@/lib/db', () => dbMock);
  jest.unstable_mockModule('../../lib/db/index.js', () => dbMock);
}

d('판매량↔영양성분↔원산지↔알레르기 연동 값 전수 대조', () => {
  let buildDiscontinuedMenuNameSet, isDiscontinuedMenuName;
  let mapAliasStatic, matchRuleStatic, buildClassifierFromDB;
  let extractExcludedMenuSets, combineAllergenMenuSources;
  let checkNutrition, isMenuNutritionLinked, buildNutritionLinkedMenuCodeSet;
  let normalizeMenuName;

  beforeAll(async () => {
    ({ buildDiscontinuedMenuNameSet, isDiscontinuedMenuName } =
      await import('@/lib/menu-master/discontinued-lookup'));
    ({ mapAlias: mapAliasStatic } = await import('@/lib/sales/alias'));
    ({ matchRule: matchRuleStatic } = await import('@/lib/sales/rule-matcher'));
    ({ buildClassifierFromDB } = await import('@/lib/sales/classifier-db'));
    ({ extractExcludedMenuSets } = await import('@/lib/nutrition/menu-exclusion'));
    ({ combineAllergenMenuSources } =
      await import('@/app/nutrition/allergen/allergenPageSourceUtils'));
    ({ checkNutrition, isMenuNutritionLinked, buildNutritionLinkedMenuCodeSet } =
      await import('@/lib/menu-master/readiness-nutrition'));
    ({ normalizeMenuName } = await import('@/lib/sales/normalize'));
  });

  test('A2-1: 단종 메뉴 그룹명 — 정적 matchRule(discontinued-lookup.js가 씀) vs DB 규칙 포함 classifier(실제 판매량 분류가 씀)', async () => {
    const classifier = await buildClassifierFromDB();
    const discontinued = snapshot.menu_master.filter(m => m.status === 'discontinued');

    const diffs = [];
    for (const menu of discontinued) {
      const normalized = normalizeMenuName(menu.menuName);
      if (!normalized) continue;
      const staticGroup = matchRuleStatic(mapAliasStatic(normalized))?.groupName || null;
      const dbGroup = classifier.matchRule(classifier.mapAlias(normalized))?.groupName || null;
      if (staticGroup !== dbGroup) {
        diffs.push({ code: menu.menuCode, name: menu.menuName, staticGroup, dbGroup });
      }
    }
    // eslint-disable-next-line no-console
    console.log(
      `[audit] 단종 메뉴 그룹명 판정(정적 vs DB규칙) 불일치: ${diffs.length}건 / 단종 메뉴 ${discontinued.length}개`
    );
    if (diffs.length) console.log(JSON.stringify(diffs.slice(0, 20), null, 2));
    expect(Array.isArray(diffs)).toBe(true);
  });

  test('A2-2: 판매량 화면의 "단종" 정의 — 순위/비교(메뉴마스터만) vs 보고서(메뉴마스터 ∪ ref_discontinued)', async () => {
    const { buildIrregularMenuNameSet, isIrregularMenuName } =
      await import('@/lib/sales/irregular-menu');
    const discontinuedNameSet = buildDiscontinuedMenuNameSet(snapshot.menu_master);
    const irregularNameSet = buildIrregularMenuNameSet(snapshot.ref_discontinued);

    // 실제 판매 데이터에 등장하는 표시명(그룹명 우선, 없으면 원본명) 집합만 대상으로 한다 —
    // 팔린 적 없는 이름까지 비교하면 노이즈만 늘어난다.
    const displayNames = new Set(
      snapshot.sales_rows.map(r => r.groupName || r.mappedMenuName || r.rawMenuName).filter(Boolean)
    );

    const diffs = [];
    for (const name of displayNames) {
      const rankCompareDiscontinued = isDiscontinuedMenuName(name, discontinuedNameSet);
      const reportDiscontinued =
        rankCompareDiscontinued || isIrregularMenuName(name, irregularNameSet);
      if (rankCompareDiscontinued !== reportDiscontinued) {
        diffs.push({ name, rankCompareDiscontinued, reportDiscontinued });
      }
    }
    // eslint-disable-next-line no-console
    console.log(
      `[audit] 판매량 "단종" 정의(순위/비교 vs 보고서) 불일치: ${diffs.length}건 / 판매 데이터 표시명 ${displayNames.size}개`
    );
    if (diffs.length) console.log(JSON.stringify(diffs.slice(0, 30), null, 2));
    expect(Array.isArray(diffs)).toBe(true);
  });

  test('A2-6: 알레르기 페이지 — status 없는 nutrition_menu_ref 병합이 단종 제외를 깨는지', async () => {
    const mastersOnlyExcluded = extractExcludedMenuSets(snapshot.menu_master);
    const combined = combineAllergenMenuSources(snapshot.menu_master, snapshot.nutrition_menu_ref);
    const combinedExcluded = extractExcludedMenuSets(combined);

    const diffs = [];
    for (const code of mastersOnlyExcluded.excludedMenuCodes) {
      if (!combinedExcluded.excludedMenuCodes.has(code)) {
        diffs.push({ code, reason: '마스터 기준으론 제외 대상인데 병합 목록에선 빠짐' });
      }
    }
    // eslint-disable-next-line no-console
    console.log(
      `[audit] 알레르기 페이지 단종/원산지제외 집합(마스터 단독 vs menu_ref 병합) 불일치: ${diffs.length}건`
    );
    if (diffs.length) console.log(JSON.stringify(diffs.slice(0, 20), null, 2));
    expect(Array.isArray(diffs)).toBe(true);
  });

  test('A2-9: readiness "영양 연동" 칩 — checkNutrition(원산지·알레르기 커버리지 등이 씀, raw_values만) vs isMenuNutritionLinked(목록 칩이 씀, 토핑명·엣지 패밀리 포함)', async () => {
    const rawValueMenuCodes = new Set(
      snapshot.nutrition_raw_values.map(r => r.menuCode).filter(Boolean)
    );
    const linkedSet = await buildNutritionLinkedMenuCodeSet();

    const diffs = [];
    for (const menu of snapshot.menu_master) {
      if (!menu.menuCode) continue;
      const narrow = checkNutrition(menu.menuCode, rawValueMenuCodes).status === 'ok';
      const broad = isMenuNutritionLinked(menu, linkedSet);
      if (narrow !== broad) {
        diffs.push({
          code: menu.menuCode,
          name: menu.menuName,
          category: menu.category,
          narrow,
          broad,
        });
      }
    }
    // eslint-disable-next-line no-console
    console.log(
      `[audit] 영양 연동 판정(readiness narrow vs 목록칩 broad) 불일치: ${diffs.length}건 / 전체 ${snapshot.menu_master.length}개`
    );
    if (diffs.length) console.log(JSON.stringify(diffs.slice(0, 20), null, 2));
    expect(Array.isArray(diffs)).toBe(true);
  });

  test('A2-3: 판매량 보고서 제외 목록 키 — rawMenuName 기준 표시 vs 실제 분류에 쓰이는 normalizedMenuName 기준', async () => {
    // ref_excluded/sales_rules '품목제외' 카테고리는 rawMenuName으로 저장되는데, 실제 제외
    // 판정(classifyMenuStatus)은 normalizedMenuName으로 한다 — 공백/괄호 표기가 다르면
    // "제외 목록에 있다고 표시되는데 실제로는 제외 안 되는" 케이스가 생긴다.
    const excludedRaw = new Set(snapshot.ref_excluded.map(r => r.menuName).filter(Boolean));
    const diffs = [];
    for (const raw of excludedRaw) {
      const normalized = normalizeMenuName(raw);
      if (raw !== normalized) diffs.push({ raw, normalized });
    }
    // eslint-disable-next-line no-console
    console.log(
      `[audit] 품목제외 목록 rawMenuName vs normalizedMenuName 표기 차이: ${diffs.length}건 / 전체 ${excludedRaw.size}개`
    );
    if (diffs.length) console.log(JSON.stringify(diffs, null, 2));
    expect(Array.isArray(diffs)).toBe(true);
  });
});
