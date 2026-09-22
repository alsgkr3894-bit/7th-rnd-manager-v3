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
    'menu_recipes',
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
  let isMenuNutritionLinked, buildNutritionLinkedMenuCodeSet;
  let normalizeMenuName;
  let buildMenuReadinessMap;

  beforeAll(async () => {
    ({ buildDiscontinuedMenuNameSet, isDiscontinuedMenuName } =
      await import('@/lib/menu-master/discontinued-lookup'));
    ({ mapAlias: mapAliasStatic } = await import('@/lib/sales/alias'));
    ({ matchRule: matchRuleStatic } = await import('@/lib/sales/rule-matcher'));
    ({ buildClassifierFromDB } = await import('@/lib/sales/classifier-db'));
    ({ extractExcludedMenuSets } = await import('@/lib/nutrition/menu-exclusion'));
    ({ combineAllergenMenuSources } =
      await import('@/app/nutrition/allergen/allergenPageSourceUtils'));
    ({ isMenuNutritionLinked, buildNutritionLinkedMenuCodeSet } =
      await import('@/lib/menu-master/readiness-nutrition'));
    ({ normalizeMenuName } = await import('@/lib/sales/normalize'));
    ({ buildMenuReadinessMap } = await import('@/lib/menu-master/readiness'));
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

  test('A2-2(수정 후 회귀 확인): 판매량 "단종" 판정에 비정규메뉴(ref_discontinued)가 메뉴마스터 단종과 함께 반영된다', async () => {
    // 2026-09-22 수정 전엔 순위/비교 화면(RankRow.jsx)이 메뉴마스터 단종만 봐서, 사용자가
    // 순위표에서 "단종 처리"한 비정규메뉴는 판매량 보고서에만 배지가 뜨고 순위/비교엔 안
    // 떴다. RankRow.jsx가 이제 build-sales-report.js와 같은 조합
    // (isDiscontinuedMenuName || isIrregularMenuName)을 쓰도록 고쳤다 — 그 조합이 실제
    // ref_discontinued에 등록된 이름들을 빠짐없이 단종으로 잡는지 데이터로 고정한다.
    const { buildIrregularMenuNameSet, isIrregularMenuName } =
      await import('@/lib/sales/irregular-menu');
    const discontinuedNameSet = buildDiscontinuedMenuNameSet(snapshot.menu_master);
    const irregularNameSet = buildIrregularMenuNameSet(snapshot.ref_discontinued);

    const combinedDiscontinued = name =>
      isDiscontinuedMenuName(name, discontinuedNameSet) ||
      isIrregularMenuName(name, irregularNameSet);

    const missed = snapshot.ref_discontinued
      .map(r => r.menuName)
      .filter(Boolean)
      .filter(name => !combinedDiscontinued(name));

    // eslint-disable-next-line no-console
    console.log(
      `[audit] 비정규메뉴 단종 처리(ref_discontinued) 중 조합 판정에서 빠지는 이름: ${missed.length}건 / 전체 ${snapshot.ref_discontinued.length}개`
    );
    if (missed.length) console.log(JSON.stringify(missed, null, 2));
    expect(missed).toEqual([]);
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

  test('A2-9(수정 후 회귀 확인): 출시 준비 탭의 영양성분 판정 vs 목록 "영양 연동" 칩 — 같은 isMenuNutritionLinked를 쓰므로 항상 일치해야 한다', async () => {
    // 2026-09-22 수정 전엔 출시 준비 탭이 raw_values 코드 정확 일치만 보는 좁은
    // checkNutrition을 썼다 — 엣지·추가토핑처럼 토핑명/엣지 패밀리로만 연동된 메뉴가
    // 목록 칩(isMenuNutritionLinked)에는 "연동됨"으로 뜨는데 출시 준비 탭엔 "미작성"으로
    // 잘못 표시됐다. readiness.js가 이제 같은 isMenuNutritionLinked를 쓰도록 고쳤다.
    const readinessMap = await buildMenuReadinessMap(snapshot.menu_master, new Map());
    const linkedSet = await buildNutritionLinkedMenuCodeSet();

    const diffs = [];
    for (const menu of snapshot.menu_master) {
      if (!menu.menuCode) continue;
      const readinessOk = readinessMap.get(menu.menuCode)?.dims?.nutrition?.status === 'ok';
      const chipLinked = isMenuNutritionLinked(menu, linkedSet);
      if (readinessOk !== chipLinked) {
        diffs.push({
          code: menu.menuCode,
          name: menu.menuName,
          category: menu.category,
          readinessOk,
          chipLinked,
        });
      }
    }
    // eslint-disable-next-line no-console
    console.log(
      `[audit] 영양 연동 판정(출시 준비 탭 vs 목록 칩) 불일치: ${diffs.length}건 / 전체 ${snapshot.menu_master.length}개`
    );
    if (diffs.length) console.log(JSON.stringify(diffs.slice(0, 20), null, 2));
    expect(diffs).toEqual([]);
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
