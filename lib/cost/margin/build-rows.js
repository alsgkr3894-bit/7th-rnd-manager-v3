/**
 * lib/cost/margin/build-rows.js — 원가마진표 행 빌더 순수 함수
 *
 * IO 없음, 사이드 이펙트 없음 → 단위 테스트 가능.
 * app/cost/margin/page.jsx load() 내 recipeRows·detailRows·derivedRows 생성 로직을 분리.
 */

import { hasDetailRecipeComponents } from '@/lib/cost/recipe-source-precedence';
import { effectiveComponentsCost } from '@/lib/cost/shared/effective-cost';
import {
  edgeTotalCost,
  defaultExpandInMargin,
  defaultMarginSuffix,
  normalizeMarginSuffix,
} from '@/lib/cost/edge-dough';
import { buildEffectiveRecipeComponents } from '@/lib/cost/recipe-groups/effective';
import { getMenuSubCategoryFromCode, parseCategoryFromCode } from '@/lib/cost/menu-price';
import { getMenuCodeBase } from '@/lib/menu-master/code-policy';
import { resolveMenuEdgeFamily } from '@/lib/menu-master/edge-family';
import {
  buildHalfHalfCostBySize,
  isHalfHalfBaseCategory,
  isHalfHalfCategory,
} from '@/lib/cost/half-half';

/** 판매가 정규화: 문자열 → 숫자/null */
export const toNum = v => {
  const n = parseFloat(v);
  return Number.isFinite(n) ? n : null;
};

const GROUPABLE_SIZE_LABELS = new Set(['L', 'R']);

function normalizeSizeLabel(value) {
  const label = String(value ?? '').trim();
  return label || '단일';
}

function isGroupableSize(size) {
  return GROUPABLE_SIZE_LABELS.has(normalizeSizeLabel(size).toUpperCase());
}

function stripMenuNameSizeSuffix(menuName, size) {
  const name = String(menuName ?? '').trim();
  if (!name || !isGroupableSize(size)) return name;
  const label = normalizeSizeLabel(size);
  const upperName = name.toUpperCase();
  const upperLabel = label.toUpperCase();
  const suffixes = [
    ` (${upperLabel})`,
    `[${upperLabel}]`,
    ` [${upperLabel}]`,
    `（${upperLabel}）`,
    ` （${upperLabel}）`,
    `-${upperLabel}`,
    `_${upperLabel}`,
    `/${upperLabel}`,
    ` ${upperLabel}`,
  ];
  for (const suffix of suffixes) {
    if (!upperName.endsWith(suffix)) continue;
    const next = name.slice(0, name.length - suffix.length).trim();
    if (next) return next;
  }
  return name;
}

function getMarginMenuGroupInfo(menuPriceRow) {
  const size = normalizeSizeLabel(menuPriceRow?.size);
  const menuCode = String(menuPriceRow?.menuCode ?? '').trim();
  const menuName = String(menuPriceRow?.menuName ?? '').trim();
  const category = String(menuPriceRow?.category ?? '').trim();
  const displayName = stripMenuNameSizeSuffix(menuName, size) || menuName;
  const baseCode = isGroupableSize(size) ? getMenuCodeBase({ menuCode, size }) : menuCode;
  const hasSizeCode = !!menuCode && !!baseCode && baseCode !== menuCode;

  // 비-L/R(코드 그룹화 불가) 항목은 menuCode까지 키에 포함해, 동명·동카테고리의
  // 서로 다른 메뉴가 한 행으로 병합되어 원가/가격이 덮어써지는 것을 방지한다.
  // menuCode가 없는 경우에만 name||category로 폴백한다.
  const fallbackKeyBody = menuCode
    ? `${displayName}||${category}||${menuCode}`
    : `${displayName}||${category}`;

  return {
    key: hasSizeCode ? `code:${baseCode}` : `name:${fallbackKeyBody}`,
    idKey: hasSizeCode ? `code||${baseCode}` : `name||${fallbackKeyBody}`,
    baseCode: hasSizeCode ? baseCode : '',
    displayName,
    size,
  };
}

function getMenuPriceCodeMeta(menuPriceRow) {
  const parsed = parseCategoryFromCode(menuPriceRow?.menuCode);
  const subMeta = getMenuSubCategoryFromCode(menuPriceRow?.menuCode);
  return {
    category: String(parsed.category || menuPriceRow?.category || '').trim(),
    subCategory: String(parsed.subCategory || menuPriceRow?.subCategory || '').trim(),
    subCategoryCode: subMeta?.code || '',
  };
}

/**
 * 메뉴 판매가 목록에서 디테일 스토어 기반 행을 생성.
 *
 * @param {object[]} allMenuPrices - getAllMenuPrices() 결과
 * @param {{ pizzaMap: Map, personalMap: Map, sideMap: Map, setMap: Map, toppingMap: Map }} detailMaps
 * @param {Map} unitPriceMap - 최신 유효 단가 맵
 * @returns {object[]}
 */
export function buildDetailRows(
  allMenuPrices,
  { pizzaMap, personalMap, sideMap, setMap, toppingMap },
  unitPriceMap = new Map(),
  recipeGroups = []
) {
  const DETAIL_STORE_MAP = {
    피자: pizzaMap,
    '피자/프리미엄 스페셜': pizzaMap,
    '피자/프리미엄': pizzaMap,
    '피자/오리지널': pizzaMap,
    '피자/하프앤하프': pizzaMap,
    '1인피자': personalMap,
    세트박스: setMap,
    사이드: sideMap,
    소스: sideMap,
    음료: sideMap,
    엣지: sideMap,
    추가토핑: toppingMap,
  };

  const calcComponentCost = components => effectiveComponentsCost(components, unitPriceMap);

  const menuGroups = new Map();
  for (const m of allMenuPrices) {
    const meta = getMenuPriceCodeMeta(m);
    if (!DETAIL_STORE_MAP[meta.category]) continue;
    const group = getMarginMenuGroupInfo({ ...m, category: meta.category });
    if (!menuGroups.has(group.key)) {
      menuGroups.set(group.key, {
        idKey: group.idKey,
        menuCodeBase: group.baseCode,
        menuName: group.displayName || m.menuName,
        category: meta.category,
        subCategory: meta.subCategory,
        subCategoryCode: meta.subCategoryCode,
        entries: [],
      });
    }
    const current = menuGroups.get(group.key);
    if (
      !current.menuName ||
      (group.displayName && group.displayName.length < current.menuName.length)
    ) {
      current.menuName = group.displayName;
    }
    if (!current.category && meta.category) current.category = meta.category;
    if (!current.subCategory && meta.subCategory) current.subCategory = meta.subCategory;
    if (!current.subCategoryCode && meta.subCategoryCode) {
      current.subCategoryCode = meta.subCategoryCode;
    }
    current.entries.push({
      menuCode: m.menuCode,
      size: group.size,
      price: m.price,
    });
  }

  const detailRows = [];
  for (const {
    idKey,
    menuCodeBase,
    menuName,
    category,
    subCategory,
    subCategoryCode,
    entries,
  } of menuGroups.values()) {
    const recMap = DETAIL_STORE_MAP[category];
    const costMap = {};
    const detailComponentSizes = new Set();
    const sizes = [];
    const sizeMenuCodes = {};
    for (const { menuCode, size, price } of entries) {
      sizes.push({ label: size, sellingPrice: price });
      if (menuCode) sizeMenuCodes[size] = menuCode;
      const recipe = recMap?.get(menuCode);
      if (recipe) {
        const effectiveComponents = buildEffectiveRecipeComponents(
          { menuCode, menuName, category, size },
          recipe,
          recipeGroups
        );
        if (hasDetailRecipeComponents(recipe) || effectiveComponents.length > 0) {
          detailComponentSizes.add(size);
        }
        if (hasDetailRecipeComponents(recipe) || effectiveComponents.length > 0) {
          costMap[size] = calcComponentCost(effectiveComponents);
        }
      }
    }
    const repCode = entries.find(e => e.menuCode)?.menuCode || '';
    const menuCodes = [...new Set(entries.map(e => e.menuCode).filter(Boolean))];
    detailRows.push({
      id: `detail||${idKey}`,
      menuCode: repCode,
      menuCodeBase,
      menuCodes,
      menuName,
      menuCategory: category,
      menuSubCategory: subCategory,
      menuSubCategoryCode: subCategoryCode,
      sizes,
      sizeMenuCodes,
      costMap,
      detailComponentSizes,
      isDetailStore: true,
    });
  }
  return detailRows;
}

/**
 * 하프앤하프 행의 원가를 오리지널 피자 (최대 원가 + 최소 원가) ÷ 2로 채운다(lib/cost/half-half.js).
 * 하프앤하프에 자체 레시피 원가가 있는 사이즈는 그대로 둔다. detailRows를 그 자리에서 고친다.
 *
 * @param {object[]} detailRows - buildDetailRows 결과
 * @param {{ discontinuedCodes?: Set<string> }} [options] - 후보에서 뺄 단종 메뉴코드
 * @returns {object[]} 같은 detailRows
 */
export function applyHalfHalfCosts(detailRows, { discontinuedCodes = new Set() } = {}) {
  const rows = Array.isArray(detailRows) ? detailRows : [];
  const candidates = [];
  for (const row of rows) {
    if (!isHalfHalfBaseCategory(row?.menuCategory)) continue;
    for (const [size, cost] of Object.entries(row.costMap || {})) {
      const menuCode = row.sizeMenuCodes?.[size] || '';
      if (menuCode && discontinuedCodes.has(menuCode)) continue;
      candidates.push({ menuCode, menuName: row.menuName, size, cost });
    }
  }
  const halfBySize = buildHalfHalfCostBySize(candidates);
  for (const row of rows) {
    if (!isHalfHalfCategory(row?.menuCategory)) continue;
    const halfHalf = {};
    for (const { label } of row.sizes || []) {
      const half = halfBySize[label];
      if (!half || Object.prototype.hasOwnProperty.call(row.costMap || {}, label)) continue;
      row.costMap = { ...(row.costMap || {}), [label]: half.cost };
      halfHalf[label] = { max: half.max, min: half.min, count: half.count };
    }
    if (Object.keys(halfHalf).length) row.halfHalf = halfHalf;
  }
  return rows;
}

/**
 * 엣지 유형별 메타데이터 계산.
 *
 * @param {object[]} edges         - getAllEdges() 결과
 * @param {object[]} allMenuPrices - getAllMenuPrices() 결과
 * @param {Map} [unitPriceMap]     - 있으면 엣지 원가를 최신 제때 단가로 다시 계산
 * @returns {{ EXPAND_EDGES: string[], edgeSuffixByType: object, edgeCostByType: object, edgePriceByType: object }}
 */
export function buildEdgeMetadata(edges, allMenuPrices, unitPriceMap) {
  const isExpandEdge = e => {
    const edgeType = String(e?.edgeType || '').trim();
    if (edgeType === '씬도우') return true;
    return e.expandInMargin != null ? !!e.expandInMargin : defaultExpandInMargin(edgeType);
  };

  const EXPAND_EDGES = [...new Set(edges.filter(isExpandEdge).map(e => e.edgeType))];

  const edgeSuffixByType = {};
  for (const e of edges) {
    if (!isExpandEdge(e)) continue;
    if (!edgeSuffixByType[e.edgeType]) {
      edgeSuffixByType[e.edgeType] = normalizeMarginSuffix(
        e.edgeType,
        e.marginSuffix || defaultMarginSuffix(e.edgeType)
      );
    }
  }

  const edgeCostByType = {};
  for (const e of edges) {
    if (!isExpandEdge(e)) continue;
    if (!edgeCostByType[e.edgeType]) edgeCostByType[e.edgeType] = {};
    edgeCostByType[e.edgeType][e.size] = edgeTotalCost(e, unitPriceMap);
  }

  // 엣지 판매가(cost_selling_prices)의 menuName과 cost_edge_dough의 edgeType은 서로 다른
  // 화면에서 각자 입력돼('골드스윗' vs '골드스윗크러스트' 등) 정확 일치만으로는 놓친다.
  // resolveMenuEdgeFamily로 먼저 시도하고, 그래도 못 찾으면 기존 정확 일치를 폴백으로 둔다.
  // edgeType → { L, R, single } — 치즈크러스트·골드스윗은 L/R 판매가 행이 따로 있고(edge-size-
  // split.js), 사이즈 없는 옛 행은 single로 둬 모든 사이즈의 폴백으로 쓴다.
  const edgePriceByType = {};
  const setEdgePrice = (edgeType, p) => {
    if (!edgePriceByType[edgeType]) edgePriceByType[edgeType] = {};
    const sizeKey = p.size === 'L' || p.size === 'R' ? p.size : 'single';
    edgePriceByType[edgeType][sizeKey] = p.price;
  };
  for (const p of allMenuPrices) {
    if (p.category !== '엣지' || !p.price) continue;
    const family = resolveMenuEdgeFamily(p);
    if (family?.costEdgeType && EXPAND_EDGES.includes(family.costEdgeType)) {
      setEdgePrice(family.costEdgeType, p);
      continue;
    }
    const name = (p.menuName || '').replace(/\s+[LR]$/i, '').replace(/\s/g, '');
    for (const edgeType of EXPAND_EDGES) {
      if (name === edgeType.replace(/\s/g, '')) {
        setEdgePrice(edgeType, p);
        break;
      }
    }
  }

  return { EXPAND_EDGES, edgeSuffixByType, edgeCostByType, edgePriceByType };
}

/**
 * 피자 베이스 행에 엣지를 합성해 파생 행을 생성.
 *
 * @param {object[]} pizzaSources - enrichedDetailRows + filteredRecipeRows 중 피자 카테고리
 * @param {{ EXPAND_EDGES: string[], edgeSuffixByType: object, edgeCostByType: object, edgePriceByType: object }} edgeMeta
 * @param {Set<string>} detailKeySet - `menuName||menuCategory` 키 세트 (중복 방지)
 * @returns {object[]}
 */
export function buildDerivedRows(pizzaSources, edgeMeta, detailKeySet) {
  const { EXPAND_EDGES, edgeSuffixByType, edgeCostByType, edgePriceByType } = edgeMeta;
  const derivedRows = [];
  for (const r of pizzaSources) {
    // 하프앤하프는 엣지 파생 행을 만들지 않는다(2026-09-30 주임님 결정 — 기본 행만).
    if (isHalfHalfCategory(r?.menuCategory)) continue;
    const sourceMenuCodes =
      Array.isArray(r.menuCodes) && r.menuCodes.length
        ? r.menuCodes.filter(Boolean)
        : r.menuCode
          ? [r.menuCode]
          : [];
    for (const edgeType of EXPAND_EDGES) {
      const edgeCosts = edgeCostByType[edgeType];
      if (!edgeCosts) continue;
      const newCostMap = {};
      for (const s of r.sizes || []) {
        if (!s.label) continue;
        newCostMap[s.label] = (r.costMap?.[s.label] || 0) + (edgeCosts[s.label] || 0);
      }
      const derivedName = `${r.menuName} ${edgeType}`;
      if (detailKeySet.has(`${derivedName}||${r.menuCategory}`)) continue;
      const edgePrices = edgePriceByType[edgeType] || {};
      const edgePriceFor = sizeLabel => edgePrices[sizeLabel] ?? edgePrices.single ?? null;
      const sfx = edgeSuffixByType[edgeType];
      derivedRows.push({
        id: `derived||${r.id}||${edgeType}`,
        menuCode: r.menuCode && sfx ? `${r.menuCode}-${sfx}` : '',
        menuCodes: [...sourceMenuCodes],
        sourceRowId: r.id,
        sourceMenuCode: r.menuCode || '',
        isDerivedEdge: true,
        edgeType,
        menuName: derivedName,
        menuCategory: r.menuCategory,
        menuSubCategory: r.menuSubCategory,
        menuSubCategoryCode: r.menuSubCategoryCode,
        sizes: (r.sizes || []).map(s => ({
          ...s,
          sellingPrice:
            s.sellingPrice != null ? s.sellingPrice + (edgePriceFor(s.label) ?? 0) : null,
        })),
        costMap: newCostMap,
      });
    }
  }
  return derivedRows;
}
