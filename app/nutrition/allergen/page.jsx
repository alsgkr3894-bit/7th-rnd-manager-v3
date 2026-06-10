'use client';
import { useState, useMemo, useCallback, useEffect, useRef } from 'react';
import Link from 'next/link';
import { useVisibilityRefresh } from '@/hooks/useVisibilityRefresh';
import { Icon } from '@/components/icons';
import { PageHeader } from '@/components/ui/PageHeader';
import { downloadCsv } from '@/lib/download';
import { initDB } from '@/lib/db';
import { getAllIngredients } from '@/lib/ingredient';
import { getAllMenuMaster } from '@/lib/menu-master';
import { getAllRecipeGroups } from '@/lib/cost/recipe-groups/store';
import { getAllEdges } from '@/lib/cost/edge-dough';
import { getAllPizzaRecipes } from '@/lib/cost/pizza-detail';
import { getAllPersonalRecipes } from '@/lib/cost/personal-detail';
import { getAllSideRecipes } from '@/lib/cost/side-detail';
import { getAllSetRecipes } from '@/lib/cost/set-detail';
import { getAllRecipes } from '@/lib/recipe';
import { buildIngredientMenuMap, getMenusForIngredient } from '@/lib/cost/ingredient-menu-map';
import { ALLERGEN_SEED } from '@/lib/nutrition/allergen/store';
import { SmallStatCard } from '@/components/ui/SmallStatCard';
import { SearchBox } from '@/components/ui/SearchBox';
import { ReorderModal } from '@/components/ui/ReorderModal';
import { ModalFrame } from '@/components/ui/ModalFrame';
import {
  ALLERGEN_MENU_ORDER_KEY,
  ALLERGEN_ORDER_KEY,
  loadOrder,
  saveOrder,
} from '@/lib/nutrition/order';
import { extractExcludedMenuSets } from '@/lib/nutrition/menu-exclusion';
import { tagDetailRecipes } from '@/lib/cost/recipe-categories';
import {
  ALLERGEN_CRUST_VARIANTS as CRUST_VARIANTS,
  isDoughCategory,
  isPizzaCategory,
} from '@/lib/nutrition/crust-config';
import { loadMenuNames, saveMenuNames, applyMenuName } from '@/lib/nutrition/menu-name-override';
import { applyEdgeAllergenRules } from '@/lib/nutrition/allergen/rules';
import { MenuNameEditModal } from '@/components/nutrition/MenuNameEditModal';
import { asDisplayText, asObjectArray, asStringArray } from '@/lib/ui/prop-guards';

const EMPTY_MENU_MAP = new Map();
const asMenuMap = value => (value instanceof Map ? value : EMPTY_MENU_MAP);

/**
 * 알레르기 정보 페이지 — 자동 집계 뷰
 *
 * 식자재 관리(cost_ingredients)의 allergens 필드 + 레시피 매핑으로
 * 메뉴별 알레르기를 자동 집계. 수동 메뉴 연결 불필요.
 *
 * 두 가지 뷰:
 *   - 식자재별: 각 식자재의 알레르기 항목 + 매칭된 메뉴 수
 *   - 메뉴별 매트릭스: 메뉴 × 22종 알레르기 체크 (출력용)
 */
const normStr = s => asDisplayText(s).trim().toLowerCase().replace(/\s+/g, '');

function stripSizeSuffix(value) {
  return asDisplayText(value)
    .replace(/\s+L$/i, '')
    .replace(/\s+R$/i, '')
    .trim();
}

function logicalMenuKey(menuCode, menuName, category) {
  const code = asDisplayText(menuCode);
  const name = stripSizeSuffix(menuName);
  const cat = asDisplayText(category);
  if (isPizzaCategory(cat) && code) {
    const match = code.match(/^(.+?-\d{3})(?:-[LR])$/i);
    if (match) return match[1];
  }
  return code || normStr(name);
}

function edgeTypeForCrust(crust) {
  const label = asDisplayText(crust);
  if (label === '치즈크러스트') return '치즈크러스트';
  if (label === '골드스윗') return '골드스윗크러스트';
  if (label === '씬바사삭') return '씬도우';
  return null;
}

function nutritionEdgeCodeFor(edgeType) {
  if (edgeType === '치즈크러스트') return '치즈크러스트L';
  if (edgeType === '골드스윗크러스트') return '골드스윗L';
  if (edgeType === '씬도우') return '씬바사삭L';
  return null;
}

function sourceLabel(source) {
  const type = asDisplayText(source?.type, '직접');
  const name = asDisplayText(source?.name);
  return name ? `${type} · ${name}` : type;
}

export default function Page() {
  const [ingredients, setIngredients] = useState([]);
  const [menuMasters, setMenuMasters] = useState([]);
  const [mapData, setMapData] = useState({
    ingredientToMenus: new Map(),
    menuToIngredients: new Map(),
  });
  const [baseMapData, setBaseMapData] = useState({
    ingredientToMenus: new Map(),
    menuToIngredients: new Map(),
  });
  const [edges, setEdges] = useState([]);
  const [loading, setLoading] = useState(true);
  const [search, setSearch] = useState('');
  const [viewMode, setViewMode] = useState('ingredient'); // 'ingredient' | 'menu'
  const [menuOrder, setMenuOrder] = useState([]);
  const [allergenOrder, setAllergenOrder] = useState([]);
  const [reorderTarget, setReorderTarget] = useState(null); // 'menu' | 'allergen' | null
  const [menuNameEditOpen, setMenuNameEditOpen] = useState(false);
  const [menuNameOverrides, setMenuNameOverrides] = useState(() => loadMenuNames());
  const [detailRow, setDetailRow] = useState(null);
  const mountedRef = useRef(true);

  useEffect(() => {
    setMenuOrder(loadOrder(ALLERGEN_MENU_ORDER_KEY));
    setAllergenOrder(loadOrder(ALLERGEN_ORDER_KEY));
  }, []);

  // 알레르기 22종 표시 순서 — 저장된 순서 우선, 없으면 기본 displayOrder
  const orderedAllergens = useMemo(() => {
    const safeOrder = asStringArray(allergenOrder);
    if (!safeOrder.length) return ALLERGEN_SEED;
    const rank = new Map(safeOrder.map((c, i) => [c, i]));
    return [...ALLERGEN_SEED].sort((a, b) => {
      const aCode = asDisplayText(a.allergenCode);
      const bCode = asDisplayText(b.allergenCode);
      const ra = rank.has(aCode) ? rank.get(aCode) : Infinity;
      const rb = rank.has(bCode) ? rank.get(bCode) : Infinity;
      if (ra !== rb) return ra - rb;
      return (a.displayOrder ?? 999) - (b.displayOrder ?? 999);
    });
  }, [allergenOrder]);

  const load = useCallback(async () => {
    await initDB();
    const [ings, masters, groups, edges, pizzaRecs, personalRecs, sideRecs, setRecs, oldRecs] =
      await Promise.all([
        getAllIngredients(),
        getAllMenuMaster(),
        getAllRecipeGroups(),
        getAllEdges(),
        getAllPizzaRecipes(),
        getAllPersonalRecipes(),
        getAllSideRecipes(),
        getAllSetRecipes(),
        getAllRecipes(),
      ]);
    if (!mountedRef.current) return;
    const safeIngredients = asObjectArray(ings);
    const safeMenuMasters = asObjectArray(masters);
    const safeGroups = asObjectArray(groups);
    const safeEdges = asObjectArray(edges);
    const safeOldRecipes = asObjectArray(oldRecs);
    const detailRecipes = tagDetailRecipes(
      asObjectArray(pizzaRecs),
      asObjectArray(personalRecs),
      asObjectArray(sideRecs),
      asObjectArray(setRecs)
    );
    setIngredients(safeIngredients);
    setMenuMasters(safeMenuMasters);
    setEdges(safeEdges);
    setMapData(
      buildIngredientMenuMap({
        menuMasters: safeMenuMasters,
        detailRecipes,
        oldRecipes: safeOldRecipes,
        groups: safeGroups,
        edges: safeEdges,
      })
    );
    // 엣지 제외 base 맵 — 크러스트 변형별 알레르겐 분리용 (석쇠 = 엣지 없는 기본)
    setBaseMapData(
      buildIngredientMenuMap({
        menuMasters: safeMenuMasters,
        detailRecipes,
        oldRecipes: safeOldRecipes,
        groups: safeGroups,
        edges: [],
      })
    );
  }, []);

  useEffect(() => {
    mountedRef.current = true;
    load()
      .catch(err => {
        if (mountedRef.current) console.error(err);
      })
      .finally(() => {
        if (mountedRef.current) setLoading(false);
      });

    return () => {
      mountedRef.current = false;
    };
  }, [load]);
  useVisibilityRefresh(load);

  // 알레르기 있는 식자재
  const allergenIngredients = useMemo(
    () =>
      asObjectArray(ingredients).filter(
        i => asStringArray(i.allergens).length && !i.discontinued && !i.excluded
      ),
    [ingredients]
  );

  // 원산지·알레르기 출력에서 제외된 메뉴 — menuCode + menuName 양쪽 매칭
  const { excludedMenuCodes, excludedMenuNames } = useMemo(
    () => extractExcludedMenuSets(menuMasters),
    [menuMasters]
  );
  const isExcludedMenu = useCallback(
    (menuCode, menuName) =>
      excludedMenuCodes.has(menuCode) ||
      excludedMenuCodes.has(asDisplayText(menuCode)) ||
      excludedMenuNames.has(asDisplayText(menuName).trim()),
    [excludedMenuCodes, excludedMenuNames]
  );

  // ── 식자재 기준 뷰 ─────────────────────────────────────────
  const ingredientRows = useMemo(() => {
    const q = asDisplayText(search).toLowerCase().trim();
    return allergenIngredients.filter(ing => {
      if (!q) return true;
      const ingredientAllergens = asStringArray(ing.allergens);
      const allergenNames = ALLERGEN_SEED.filter(a => ingredientAllergens.includes(a.allergenCode))
        .map(a => asDisplayText(a.allergenName))
        .join(' ');
      return (
        asDisplayText(ing.ingredientName).toLowerCase().includes(q) ||
        asDisplayText(ing.productCode).toLowerCase().includes(q) ||
        allergenNames.toLowerCase().includes(q)
      );
    });
  }, [allergenIngredients, search]);

  // ── 메뉴별 매트릭스 뷰 (피자는 크러스트/엣지 변형별 행) ──────
  const menuMatrixAll = useMemo(() => {
    const baseIngredientToMenus = asMenuMap(baseMapData?.ingredientToMenus);
    // 알레르겐 보유 식자재 키맵
    const ingByKey = new Map();
    for (const ing of allergenIngredients) {
      const productCode = asDisplayText(ing.productCode);
      if (productCode) ingByKey.set(`code:${productCode}`, ing);
      const n = normStr(ing.ingredientName);
      if (n) ingByKey.set(`name:${n}`, ing);
    }

    // 엣지타입 → 알레르겐 집합 (해당 엣지 구성재료의 알레르겐)
    const edgeAllergens = new Map();
    for (const edge of asObjectArray(edges)) {
      const edgeType = asDisplayText(edge.edgeType);
      if (!edgeType) continue;
      if (!edgeAllergens.has(edgeType)) edgeAllergens.set(edgeType, new Set());
      const set = edgeAllergens.get(edgeType);
      for (const c of asObjectArray(edge.components)) {
        const productCode = asDisplayText(c.productCode);
        const key = productCode ? `code:${productCode}` : `name:${normStr(c.ingredientName)}`;
        const ing = ingByKey.get(key);
        if (ing) for (const code of asStringArray(ing.allergens)) set.add(code);
      }
    }
    for (const edgeType of ['치즈크러스트', '골드스윗크러스트', '씬도우']) {
      const edgeCode = nutritionEdgeCodeFor(edgeType);
      if (edgeCode) edgeAllergens.set(edgeType, applyEdgeAllergenRules(edgeCode, edgeAllergens.get(edgeType)));
    }

    // base(엣지 제외) 메뉴별 알레르겐 — 석쇠 기준.
    // codes=전체(도우 포함), nonDoughCodes=도우 재료 제외 (씬바사삭은 석쇠 도우를 씬도우로 교체)
    const menuBase = new Map(); // logicalKey → { meta, menuCodes:Set, codes:Set, nonDoughCodes:Set }
    for (const [key, menus] of baseIngredientToMenus) {
      if (!(menus instanceof Map)) continue;
      const ing = ingByKey.get(key);
      const allergenCodes = asStringArray(ing?.allergens);
      if (!allergenCodes.length) continue;
      const isDough = isDoughCategory(asDisplayText(ing.category));
      for (const [menuCode, meta] of menus) {
        if (isExcludedMenu(menuCode, meta?.menuName)) continue;
        const logicalKey = logicalMenuKey(menuCode, meta?.menuName, meta?.category);
        if (!menuBase.has(logicalKey)) {
          menuBase.set(logicalKey, {
            meta: {
              ...meta,
              menuName: stripSizeSuffix(meta?.menuName) || asDisplayText(meta?.menuName),
            },
            menuCode: logicalKey,
            menuCodes: new Set(),
            codes: new Set(),
            nonDoughCodes: new Set(),
          });
        }
        const e = menuBase.get(logicalKey);
        e.menuCodes.add(asDisplayText(menuCode));
        for (const code of allergenCodes) {
          e.codes.add(code);
          if (!isDough) e.nonDoughCodes.add(code);
        }
      }
    }

    // 행 생성: 피자는 4변형, 그 외 단일
    //  · 석쇠 = base 전체
    //  · 치즈크러스트/골드스윗 = base 전체 + 해당 엣지 (석쇠에 더함)
    //  · 씬바사삭 = base에서 도우 제외 + 씬도우 (도우만 교체)
    const rows = [];
    for (const [menuCode, { meta, menuCodes, codes, nonDoughCodes }] of menuBase) {
      const isPizza = isPizzaCategory(asDisplayText(meta?.category));
      if (!isPizza) {
        rows.push({
          rowKey: menuCode,
          menuCode,
          sourceMenuCodes: [...menuCodes],
          ...meta,
          crust: '',
          edgeType: null,
          allergenCodes: codes,
        });
        continue;
      }
      for (const v of CRUST_VARIANTS) {
        const merged = new Set(v.key === '씬바사삭' ? nonDoughCodes : codes);
        if (v.edgeType) for (const code of edgeAllergens.get(v.edgeType) || []) merged.add(code);
        rows.push({
          rowKey: `${menuCode}__${v.key}`,
          menuCode,
          sourceMenuCodes: [...menuCodes],
          ...meta,
          crust: v.label,
          edgeType: v.edgeType,
          allergenCodes: merged,
        });
      }
    }

    // 사용자 메뉴 순서 적용 — menuCode 단위로 정렬하므로 같은 메뉴의 변형(석쇠+엣지) 행이
    // 함께 묶여 이동하고, 변형 간 순서는 CRUST_VARIANTS 삽입순(안정 정렬)으로 유지됨.
    const rank = new Map(asStringArray(menuOrder).map((key, index) => [key, index]));
    const rowRank = row => {
      const keys = [asDisplayText(row.menuCode), ...asStringArray(row.sourceMenuCodes)];
      const ranks = keys.filter(key => rank.has(key)).map(key => rank.get(key));
      return ranks.length ? Math.min(...ranks) : Infinity;
    };
    const sorted = [...rows].sort(
      (a, b) =>
        rowRank(a) - rowRank(b) ||
        asDisplayText(a.menuName).localeCompare(asDisplayText(b.menuName), 'ko') ||
        asDisplayText(a.crust).localeCompare(asDisplayText(b.crust), 'ko') ||
        asDisplayText(a.menuCode).localeCompare(asDisplayText(b.menuCode), 'ko')
    );
    // 출력용 메뉴명 오버라이드 적용 (표시 전용, 원래 이름 보존)
    return sorted.map(r => ({
      ...r,
      originalMenuName: asDisplayText(r.menuName),
      menuName: applyMenuName(
        asDisplayText(r.menuCode),
        asDisplayText(r.menuName),
        menuNameOverrides
      ),
    }));
  }, [allergenIngredients, baseMapData, edges, isExcludedMenu, menuOrder, menuNameOverrides]);

  const ingredientByKey = useMemo(() => {
    const map = new Map();
    for (const ing of allergenIngredients) {
      const productCode = asDisplayText(ing.productCode);
      if (productCode) map.set(`code:${productCode}`, ing);
      const nameKey = normStr(ing.ingredientName);
      if (nameKey) map.set(`name:${nameKey}`, ing);
    }
    return map;
  }, [allergenIngredients]);

  const detailRows = useMemo(() => {
    if (!detailRow) return [];
    const sourceCodes = new Set(asStringArray(detailRow.sourceMenuCodes));
    const rows = [];
    const pushRow = ({ ing, source, fromEdge = false }) => {
      const allergens = asStringArray(ing?.allergens);
      if (!allergens.length) return;
      const ingredientName = asDisplayText(ing.ingredientName);
      const productCode = asDisplayText(ing.productCode);
      const sourceText = sourceLabel(source);
      const key = `${fromEdge ? 'edge' : 'base'}|${productCode || normStr(ingredientName)}|${sourceText}`;
      if (rows.some(row => row.key === key)) return;
      rows.push({
        key,
        sourceText,
        ingredientName,
        productCode,
        category: asDisplayText(ing.category),
        allergens,
      });
    };

    for (const [ingredientKey, menus] of asMenuMap(baseMapData?.ingredientToMenus)) {
      if (!(menus instanceof Map)) continue;
      const ing = ingredientByKey.get(ingredientKey);
      if (!ing) continue;
      if (
        asDisplayText(detailRow.crust) === '씬바사삭' &&
        isDoughCategory(asDisplayText(ing.category))
      ) {
        continue;
      }
      for (const [menuCode, meta] of menus) {
        if (!sourceCodes.has(asDisplayText(menuCode))) continue;
        const sources = Array.isArray(meta?.sources) && meta.sources.length
          ? meta.sources
          : [{ type: '직접', name: '' }];
        sources.forEach(source => pushRow({ ing, source }));
      }
    }

    const edgeType = asDisplayText(detailRow.edgeType);
    if (edgeType) {
      for (const edge of asObjectArray(edges)) {
        if (asDisplayText(edge.edgeType) !== edgeType) continue;
        for (const component of asObjectArray(edge.components)) {
          const productCode = asDisplayText(component.productCode);
          const key = productCode
            ? `code:${productCode}`
            : `name:${normStr(component.ingredientName)}`;
          const ing = ingredientByKey.get(key);
          if (!ing) continue;
          pushRow({
            ing,
            source: {
              type: '엣지관리',
              name: `${edgeType}${edge.size ? ` ${edge.size}` : ''}`,
            },
            fromEdge: true,
          });
        }
      }
    }

    return rows.sort(
      (a, b) =>
        a.sourceText.localeCompare(b.sourceText, 'ko') ||
        a.ingredientName.localeCompare(b.ingredientName, 'ko')
    );
  }, [baseMapData, detailRow, edges, ingredientByKey]);

  const menuMatrix = useMemo(() => {
    const q = asDisplayText(search).toLowerCase().trim();
    if (!q) return menuMatrixAll;
    return menuMatrixAll.filter(r => {
      const allergenCodes = r.allergenCodes instanceof Set ? r.allergenCodes : new Set();
      return (
        asDisplayText(r.menuName).toLowerCase().includes(q) ||
        asDisplayText(r.crust).toLowerCase().includes(q) ||
        ALLERGEN_SEED.filter(a => allergenCodes.has(a.allergenCode)).some(a =>
          asDisplayText(a.allergenName).toLowerCase().includes(q)
        )
      );
    });
  }, [menuMatrixAll, search]);

  // 순서 변경 모달용 — 메뉴 1개씩(변형 제외, menuCode 중복 제거)
  const menuListForOrder = useMemo(() => {
    const seen = new Set();
    const out = [];
    for (const r of menuMatrixAll) {
      const menuCode = asDisplayText(r.menuCode);
      if (!menuCode || seen.has(menuCode)) continue;
      seen.add(menuCode);
      out.push({ key: menuCode, label: asDisplayText(r.originalMenuName ?? r.menuName) });
    }
    return out;
  }, [menuMatrixAll]);

  const totalWithAllergen = allergenIngredients.length;
  const totalIngredients = asObjectArray(ingredients).filter(
    i => !i.discontinued && !i.excluded
  ).length;

  return (
    <main className="main">
      <PageHeader
        breadcrumb={['영양성분', '알레르기 정보']}
        title="알레르기 정보"
        masterSource
        sub="식자재 관리에서 식자재별 알레르기 항목을 체크하면 자동으로 메뉴에 매칭됩니다"
        actions={
          <button
            className="btn"
            onClick={() => {
              const headers = [
                '메뉴명',
                '크러스트',
                ...orderedAllergens.map(a => asDisplayText(a.allergenName)),
              ];
              const rows = menuMatrix.map(r => {
                const allergenCodes = r.allergenCodes instanceof Set ? r.allergenCodes : new Set();
                return [
                  asDisplayText(r.menuName),
                  asDisplayText(r.crust),
                  ...orderedAllergens.map(a =>
                    allergenCodes.has(asDisplayText(a.allergenCode)) ? '●' : ''
                  ),
                ];
              });
              downloadCsv([headers, ...rows], '알레르기매트릭스.csv');
            }}
            disabled={menuMatrix.length === 0}
          >
            <Icon.download style={{ width: 14, height: 14 }} /> CSV 내보내기
          </button>
        }
      />

      <div style={{ display: 'flex', gap: 12, marginTop: 20 }}>
        <SmallStatCard label="알레르기 등록 식자재" value={totalWithAllergen} />
        <SmallStatCard label="전체 식자재" value={totalIngredients} />
        <SmallStatCard label="알레르기 매칭 메뉴" value={menuMatrix.length} />
      </div>

      {/* 법정 22종 안내 */}
      <div className="card" style={{ marginTop: 16, padding: '12px 20px' }}>
        <div style={{ fontSize: 12, fontWeight: 600, color: 'var(--text-3)', marginBottom: 8 }}>
          한국 법정 알레르기 22종
        </div>
        <div style={{ display: 'flex', flexWrap: 'wrap', gap: 6 }}>
          {ALLERGEN_SEED.map(al => (
            <span
              key={asDisplayText(al.allergenCode)}
              style={{
                fontSize: 12,
                padding: '3px 10px',
                borderRadius: 20,
                background: 'var(--surface-2)',
                color: 'var(--text-2)',
              }}
            >
              {asDisplayText(al.allergenName)}
            </span>
          ))}
        </div>
      </div>

      {totalWithAllergen === 0 && (
        <div
          style={{
            marginTop: 12,
            padding: '10px 16px',
            borderRadius: 10,
            background: 'var(--warn-soft)',
            color: 'var(--warn)',
            fontSize: 13,
            fontWeight: 600,
            display: 'flex',
            alignItems: 'center',
            gap: 8,
          }}
        >
          <Icon.alert style={{ width: 16, height: 16, flexShrink: 0 }} />
          알레르기 등록 식자재 없음 —{' '}
          <Link href="/ingredient/manage" style={{ color: 'inherit', textDecoration: 'underline' }}>
            식자재 관리에서 입력
          </Link>
        </div>
      )}

      <div style={{ marginTop: 16, display: 'flex', gap: 8, alignItems: 'center' }}>
        <SearchBox
          value={search}
          onChange={setSearch}
          placeholder="식자재명·메뉴명·알레르기 검색"
        />
        <div style={{ display: 'flex', gap: 4, borderBottom: '1px solid var(--border)' }}>
          {['ingredient', 'menu'].map(mode => (
            <button
              key={mode}
              onClick={() => setViewMode(mode)}
              style={{
                padding: '8px 14px',
                border: 0,
                background: 'transparent',
                fontSize: 13,
                fontWeight: viewMode === mode ? 700 : 500,
                color: viewMode === mode ? 'var(--accent)' : 'var(--text-3)',
                borderBottom:
                  viewMode === mode ? '2px solid var(--accent)' : '2px solid transparent',
                cursor: 'pointer',
                marginBottom: -1,
              }}
            >
              {mode === 'ingredient' ? '식자재별' : '메뉴별 매트릭스'}
            </button>
          ))}
        </div>
        {viewMode === 'menu' && (
          <div style={{ marginLeft: 'auto', display: 'flex', gap: 6 }}>
            <button className="btn sm" onClick={() => setMenuNameEditOpen(true)}>
              메뉴명 편집
            </button>
            <button className="btn sm" onClick={() => setReorderTarget('menu')}>
              메뉴 순서
            </button>
            <button className="btn sm" onClick={() => setReorderTarget('allergen')}>
              알레르기 순서
            </button>
            {(menuOrder.length > 0 || allergenOrder.length > 0) && (
              <button
                className="btn sm"
                onClick={() => {
                  saveOrder(ALLERGEN_MENU_ORDER_KEY, []);
                  saveOrder(ALLERGEN_ORDER_KEY, []);
                  setMenuOrder([]);
                  setAllergenOrder([]);
                }}
                title="저장된 메뉴·알레르기 순서를 지우고 기본 순서로 복원"
              >
                순서 초기화
              </button>
            )}
          </div>
        )}
      </div>

      <div className="card table-card" style={{ marginTop: 12 }}>
        {loading ? (
          <div style={{ padding: 40, textAlign: 'center', color: 'var(--text-4)' }}>
            불러오는 중…
          </div>
        ) : viewMode === 'ingredient' ? (
          ingredientRows.length === 0 ? (
            <div className="empty-state">
              <div className="empty-icon-wrap">
                <Icon.beaker style={{ width: 28, height: 28 }} />
              </div>
              <div className="empty-title">알레르기 등록 식자재가 없어요</div>
              <div className="empty-sub">
                <Link href="/ingredient/manage">식자재 관리</Link>에서 식자재별 알레르기를
                체크하세요
              </div>
            </div>
          ) : (
            <table className="data-table">
              <thead>
                <tr>
                  <th>식자재명</th>
                  <th>제때 코드</th>
                  <th>알레르기 항목</th>
                  <th>매칭 메뉴 수</th>
                </tr>
              </thead>
              <tbody>
                {ingredientRows.map(ing => {
                  const ingredientToMenus = asMenuMap(mapData?.ingredientToMenus);
                  const productCode = asDisplayText(ing.productCode);
                  const ingredientName = asDisplayText(ing.ingredientName);
                  const ingredientAllergens = asStringArray(ing.allergens);
                  const allMenus = getMenusForIngredient(
                    ingredientToMenus,
                    productCode,
                    ingredientName
                  );
                  const menus = new Map(
                    [...allMenus].filter(([mc, m]) => !isExcludedMenu(mc, m?.menuName))
                  );
                  const allergenNames = ALLERGEN_SEED.filter(a =>
                    ingredientAllergens.includes(a.allergenCode)
                  ).map(a => asDisplayText(a.allergenName));
                  return (
                    <tr key={asDisplayText(ing.id) || productCode || ingredientName}>
                      <td style={{ fontWeight: 600 }}>{ingredientName}</td>
                      <td className="mono muted">{productCode || '—'}</td>
                      <td>
                        <div style={{ display: 'flex', flexWrap: 'wrap', gap: 4 }}>
                          {allergenNames.map(name => (
                            <span
                              key={name}
                              style={{
                                fontSize: 11,
                                padding: '2px 8px',
                                borderRadius: 999,
                                background: 'var(--accent)',
                                color: '#fff',
                                fontWeight: 700,
                              }}
                            >
                              {name}
                            </span>
                          ))}
                        </div>
                      </td>
                      <td style={{ textAlign: 'center' }}>
                        {menus.size > 0 ? (
                          <span style={{ fontWeight: 700, color: 'var(--positive)' }}>
                            {menus.size}
                          </span>
                        ) : (
                          <span style={{ color: 'var(--text-4)' }}>0</span>
                        )}
                      </td>
                    </tr>
                  );
                })}
              </tbody>
            </table>
          )
        ) : // 메뉴별 매트릭스
        menuMatrix.length === 0 ? (
          <div className="empty-state">
            <div className="empty-icon-wrap">
              <Icon.doc style={{ width: 28, height: 28 }} />
            </div>
            <div className="empty-title">표시할 메뉴가 없어요</div>
            <div className="empty-sub">
              식자재에 알레르기를 등록하고 원가 레시피에 구성품을 추가하면 자동 매칭됩니다
            </div>
          </div>
        ) : (
          <div style={{ overflowX: 'auto' }}>
            <table className="data-table" style={{ minWidth: 900 }}>
              <thead>
                <tr>
                  <th
                    style={{
                      minWidth: 160,
                      position: 'sticky',
                      left: 0,
                      background: 'var(--surface-2)',
                      zIndex: 2,
                    }}
                  >
                    메뉴명
                  </th>
                  <th style={{ width: 80 }}>카테고리</th>
                  {orderedAllergens.map(al => (
                    <th
                      key={al.allergenCode}
                      style={{
                        width: 46,
                        fontSize: 11,
                        textAlign: 'center',
                        padding: '8px 2px',
                        wordBreak: 'keep-all',
                        lineHeight: 1.3,
                      }}
                    >
                      {al.allergenName}
                    </th>
                  ))}
                </tr>
              </thead>
              <tbody>
                {menuMatrix.map(row => {
                  const rowKey =
                    asDisplayText(row.rowKey) ||
                    asDisplayText(row.menuCode) ||
                    asDisplayText(row.menuName);
                  const crust = asDisplayText(row.crust);
                  const allergenCodes =
                    row.allergenCodes instanceof Set ? row.allergenCodes : new Set();
                  return (
                    <tr key={rowKey}>
                      <td
                        style={{
                          fontWeight: 600,
                          position: 'sticky',
                          left: 0,
                          background: 'var(--surface)',
                          zIndex: 1,
                        }}
                      >
                        <button
                          type="button"
                          onClick={() => setDetailRow(row)}
                          style={{
                            border: 0,
                            background: 'transparent',
                            padding: 0,
                            cursor: 'pointer',
                            font: 'inherit',
                            color: 'inherit',
                            textAlign: 'left',
                          }}
                          title="식자재 알레르기 상세 보기"
                        >
                          {asDisplayText(row.menuName)}
                          {crust && (
                            <span
                              style={{
                                marginLeft: 6,
                                fontSize: 10,
                                fontWeight: 700,
                                padding: '1px 6px',
                                borderRadius: 999,
                                background: 'var(--surface-3)',
                                color: 'var(--text-2)',
                                whiteSpace: 'nowrap',
                              }}
                            >
                              {crust}
                            </span>
                          )}
                        </button>
                      </td>
                      <td>
                        <span className="chip">{asDisplayText(row.category)}</span>
                      </td>
                      {orderedAllergens.map(al => {
                        const allergenCode = asDisplayText(al.allergenCode);
                        const has = allergenCodes.has(allergenCode);
                        return (
                          <td key={allergenCode} style={{ textAlign: 'center' }}>
                            {has ? (
                              <span
                                style={{
                                  display: 'inline-block',
                                  width: 16,
                                  height: 16,
                                  borderRadius: '50%',
                                  background: 'var(--accent)',
                                }}
                              />
                            ) : (
                              <span style={{ color: 'var(--text-4)', fontSize: 11 }}>—</span>
                            )}
                          </td>
                        );
                      })}
                    </tr>
                  );
                })}
              </tbody>
            </table>
          </div>
        )}
      </div>
      <div style={{ marginTop: 8, fontSize: 12, color: 'var(--text-4)' }}>
        {viewMode === 'ingredient'
          ? `${ingredientRows.length}개 식자재`
          : `${menuMatrix.length}개 메뉴`}{' '}
        표시
      </div>

      {reorderTarget === 'menu' && (
        <ReorderModal
          title="메뉴 순서 (석쇠·엣지 변형 함께 이동)"
          items={menuListForOrder}
          onApply={keys => {
            saveOrder(ALLERGEN_MENU_ORDER_KEY, keys);
            setMenuOrder(keys);
          }}
          onClose={() => setReorderTarget(null)}
        />
      )}
      {reorderTarget === 'allergen' && (
        <ReorderModal
          title="알레르기 22종 순서"
          items={orderedAllergens
            .map(a => ({
              key: asDisplayText(a.allergenCode),
              label: asDisplayText(a.allergenName),
            }))
            .filter(item => item.key)}
          onApply={keys => {
            saveOrder(ALLERGEN_ORDER_KEY, keys);
            setAllergenOrder(keys);
          }}
          onClose={() => setReorderTarget(null)}
        />
      )}
      {menuNameEditOpen && (
        <MenuNameEditModal
          menus={menuListForOrder
            .map(m => ({ menuCode: asDisplayText(m.key), menuName: asDisplayText(m.label) }))
            .filter(menu => menu.menuCode)}
          overrides={menuNameOverrides}
          onApply={next => {
            saveMenuNames(next);
            setMenuNameOverrides(next);
          }}
          onClose={() => setMenuNameEditOpen(false)}
        />
      )}
      {detailRow && (
        <ModalFrame
          title={`${asDisplayText(detailRow.menuName)}${detailRow.crust ? ` · ${detailRow.crust}` : ''}`}
          onClose={() => setDetailRow(null)}
          width="min(760px, 96vw)"
          padding="22px 24px"
          zIndex={300}
        >
          <div style={{ fontSize: 12, color: 'var(--text-3)', marginBottom: 12 }}>
            직접 레시피, 묶음관리, 엣지관리에서 이 메뉴에 반영된 식자재 알레르기입니다.
          </div>
          {detailRows.length === 0 ? (
            <div className="empty-state" style={{ padding: '24px 16px' }}>
              <div className="empty-title">상세 식자재가 없습니다</div>
              <div className="empty-sub">알레르기 식자재 매칭 정보를 찾지 못했습니다.</div>
            </div>
          ) : (
            <div style={{ overflowX: 'auto' }}>
              <table className="data-table" style={{ minWidth: 680 }}>
                <thead>
                  <tr>
                    <th style={{ width: 140 }}>출처</th>
                    <th>식자재명</th>
                    <th style={{ width: 110 }}>코드</th>
                    <th style={{ width: 110 }}>카테고리</th>
                    <th style={{ width: 180 }}>알레르기</th>
                  </tr>
                </thead>
                <tbody>
                  {detailRows.map(row => (
                    <tr key={row.key}>
                      <td style={{ fontSize: 12, color: 'var(--text-2)', fontWeight: 700 }}>
                        {row.sourceText}
                      </td>
                      <td style={{ fontWeight: 700 }}>{row.ingredientName}</td>
                      <td className="mono muted">{row.productCode || '—'}</td>
                      <td>{row.category || '—'}</td>
                      <td>
                        <div style={{ display: 'flex', gap: 4, flexWrap: 'wrap' }}>
                          {row.allergens.map(code => {
                            const allergen = ALLERGEN_SEED.find(
                              item => asDisplayText(item.allergenCode) === code
                            );
                            return (
                              <span
                                key={code}
                                style={{
                                  fontSize: 11,
                                  fontWeight: 700,
                                  padding: '2px 7px',
                                  borderRadius: 999,
                                  background: 'var(--warn-soft)',
                                  color: 'var(--warn)',
                                }}
                              >
                                {asDisplayText(allergen?.allergenName, code)}
                              </span>
                            );
                          })}
                        </div>
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          )}
        </ModalFrame>
      )}
    </main>
  );
}
