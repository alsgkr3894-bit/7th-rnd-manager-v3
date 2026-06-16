import {
  componentEffectiveUnitPrice,
  effectiveComponentsCost,
} from '@/lib/cost/shared/effective-cost';
import { edgeTotalCost } from '@/lib/cost/edge-dough';
import { buildEffectiveRecipeComponents } from '@/lib/cost/recipe-groups/effective';
import { parseMenuCode } from '@/lib/cost/menu-price/code';
import { hasDetailRecipeComponents } from '@/lib/cost/recipe-source-precedence';
import { getMenuCodeRank } from '@/lib/menu-categories';
import {
  isPizzaCategory,
  isPersonalPizzaCategory,
  isSetCategory,
  isSideCategory,
  isBeverageCategory,
} from '@/lib/menu-master/category-policy';

const matchEdge = cat => cat === '엣지' || cat === '엣지&도우' || cat === '엣지 & 도우';
const stripName = s => (s || '').replace(/\s/g, '');
const DETAIL_RECIPE_KINDS = [
  { id: 'pizza', label: '피자' },
  { id: 'personal', label: '1인피자' },
  { id: 'set', label: '세트박스' },
  { id: 'side', label: '사이드' },
];

const detailComponentCost = (comps, unitPriceMap = new Map()) =>
  effectiveComponentsCost(comps, unitPriceMap);

const text = value => (value == null ? '' : String(value).trim());
const sizeOrder = ['L', 'R', 'M', 'S', 'XL', '단일'];
const numOrNull = value => {
  if (value == null || value === '') return null;
  const n = Number(value);
  return Number.isFinite(n) ? n : null;
};

function detailStoreFor(rawCat, maps) {
  if (isPersonalPizzaCategory(rawCat)) return maps.personal;
  if (isSetCategory(rawCat)) return maps.set;
  if (isSideCategory(rawCat) || isBeverageCategory(rawCat)) return maps.side;
  if (isPizzaCategory(rawCat, { includePersonal: false })) return maps.pizza;
  return null;
}

function defaultEdgeCostForSize(edges, size) {
  if (!Array.isArray(edges) || edges.length === 0) return 0;
  const match =
    edges.find(
      e => (!size || size === '단일' || e.size === size) && stripName(e.edgeType) === '석쇠'
    ) ||
    edges.find(e => !size || size === '단일' || e.size === size) ||
    edges[0];
  return match ? edgeTotalCost(match) : 0;
}

function costForPrice(p, ctx) {
  if (matchEdge(p.category)) {
    const name = stripName(p.menuName);
    const edge = ctx.edges.find(
      e => stripName(e.edgeType) === name && (!p.size || p.size === '단일' || e.size === p.size)
    );
    return edge ? edgeTotalCost(edge) : 0;
  }
  const map = detailStoreFor(p.category, ctx.detailMaps);
  let baseCost = 0;
  if (map && p.menuCode) {
    const rec = map.get(p.menuCode);
    if (rec) {
      const effectiveComponents = buildEffectiveRecipeComponents(
        {
          menuCode: p.menuCode,
          menuName: p.menuName,
          category: p.category,
          size: p.size,
        },
        rec,
        ctx.recipeGroups
      );
      if (hasDetailRecipeComponents(rec) || effectiveComponents.length > 0) {
        baseCost = detailComponentCost(effectiveComponents, ctx.upm);
      }
    }
  }
  if (ctx.includeEdge && isPizzaCategory(p.category)) {
    baseCost += defaultEdgeCostForSize(ctx.edges, p.size);
  }
  return baseCost;
}

function normalizeReportComponent(component, index, unitPriceMap = new Map()) {
  const quantity = numOrNull(component?.quantity);
  const unitPrice = componentEffectiveUnitPrice(component, unitPriceMap);
  return {
    lineNo: index + 1,
    productCode: text(component?.productCode),
    ingredientName: text(component?.ingredientName || component?.productName),
    quantity,
    unit: text(component?.unit || component?.unitType || 'g'),
    unitPrice,
    subtotal: quantity != null && unitPrice != null ? Math.round(quantity * unitPrice) : null,
    note: text(component?.note),
  };
}

function recipeMenuBaseCode(menuCode) {
  const code = text(menuCode);
  const parsed = parseMenuCode(code);
  if (!parsed) return code;
  if (!parsed.size) return code;
  return `${parsed.prefix}-${String(parsed.base).padStart(3, '0')}`;
}

function recipeMenuGroupKey(row) {
  const name = stripName(text(row?.menuName)).toLowerCase();
  if (name) return `${text(row?.categoryLabel)}|name:${name}`;
  return `${text(row?.categoryLabel)}|code:${recipeMenuBaseCode(row?.menuCode)}`;
}

function componentKey(component) {
  const code = text(component?.productCode).toLowerCase();
  if (code) return `code:${code}`;
  return `name:${stripName(text(component?.ingredientName)).toLowerCase()}`;
}

function sortSizes(sizes) {
  return [...sizes].sort((a, b) => {
    const ia = sizeOrder.indexOf(a);
    const ib = sizeOrder.indexOf(b);
    if (ia !== -1 || ib !== -1) {
      if (ia === -1) return 1;
      if (ib === -1) return -1;
      return ia - ib;
    }
    return a.localeCompare(b, 'ko');
  });
}

function buildRecipeRow({ source, kind, categoryLabel, recipe, components, size }) {
  const safeComponents = Array.isArray(components) ? components : [];
  const totalCost = safeComponents.reduce((sum, component) => sum + (component.subtotal || 0), 0);
  return {
    id: `${source}-${kind}-${text(recipe?.menuCode) || text(recipe?.menuName)}-${size || '단일'}`,
    source,
    kind,
    categoryLabel,
    menuCode: text(recipe?.menuCode),
    menuName: text(recipe?.menuName || recipe?.setName),
    size: text(size || recipe?.size || '단일') || '단일',
    note: text(recipe?.note),
    components: safeComponents,
    componentCount: safeComponents.filter(
      component => component.ingredientName || component.productCode
    ).length,
    totalCost: Math.round(totalCost),
  };
}

/**
 * 원가계산 보고서의 레시피 출력 탭/엑셀 시트용 데이터를 만듭니다.
 * menu_recipes 기준으로 분리된 canonical recipe map만 출력합니다.
 */
export function buildRecipePrintRows({
  detailMaps = {},
  unitPriceMap = new Map(),
  recipeGroups = [],
} = {}) {
  const rows = [];

  for (const meta of DETAIL_RECIPE_KINDS) {
    const map = detailMaps[meta.id];
    const recipes = map instanceof Map ? [...map.values()] : [];
    for (const recipe of recipes) {
      const effectiveComponents = buildEffectiveRecipeComponents(
        {
          menuCode: recipe?.menuCode,
          menuName: recipe?.menuName,
          category: recipe?.category,
          size: recipe?.size,
        },
        recipe,
        recipeGroups
      );
      const components = effectiveComponents.map((component, index) =>
        normalizeReportComponent(component, index, unitPriceMap)
      );
      const row = buildRecipeRow({
        source: 'detail',
        kind: meta.id,
        categoryLabel: meta.label,
        recipe,
        components,
        size: recipe?.size,
      });
      rows.push(row);
    }
  }

  return rows.sort((a, b) => {
    const rank = getMenuCodeRank(a.menuCode) - getMenuCodeRank(b.menuCode);
    if (rank !== 0) return rank;
    const cat = (a.categoryLabel || '').localeCompare(b.categoryLabel || '', 'ko');
    if (cat !== 0) return cat;
    const name = (a.menuName || '').localeCompare(b.menuName || '', 'ko');
    if (name !== 0) return name;
    return (a.size || '').localeCompare(b.size || '', 'ko');
  });
}

export function buildRecipePrintMenus(recipeRows = []) {
  const menuMap = new Map();

  for (const row of Array.isArray(recipeRows) ? recipeRows : []) {
    const groupKey = recipeMenuGroupKey(row);
    const baseCode = recipeMenuBaseCode(row?.menuCode);
    const size = text(row?.size || '단일') || '단일';
    if (!menuMap.has(groupKey)) {
      menuMap.set(groupKey, {
        id: groupKey,
        categoryLabel: text(row?.categoryLabel) || '기타',
        menuCode: baseCode,
        menuCodes: new Set(),
        menuName: text(row?.menuName),
        sizes: new Set(),
        rows: [],
        note: text(row?.note),
        components: new Map(),
        totalCost: 0,
      });
    }

    const menu = menuMap.get(groupKey);
    if (baseCode) menu.menuCodes.add(baseCode);
    if (row?.menuCode) menu.menuCodes.add(text(row.menuCode));
    if (size) menu.sizes.add(size);
    menu.rows.push(row);
    menu.totalCost += Number(row?.totalCost) || 0;
    if (!menu.note && row?.note) menu.note = text(row.note);

    const components = Array.isArray(row?.components) ? row.components : [];
    components.forEach((component, index) => {
      const key = componentKey(component);
      if (!key || key === 'name:') return;
      if (!menu.components.has(key)) {
        menu.components.set(key, {
          key,
          lineNo: index + 1,
          productCode: text(component?.productCode),
          ingredientName: text(component?.ingredientName || component?.productName),
          unit: text(component?.unit || 'g') || 'g',
          note: text(component?.note),
          sizeQuantities: {},
          sizeSubtotals: {},
          totalQuantity: 0,
          totalCost: 0,
        });
      }
      const item = menu.components.get(key);
      if (!item.productCode && component?.productCode)
        item.productCode = text(component.productCode);
      if (!item.ingredientName && component?.ingredientName) {
        item.ingredientName = text(component.ingredientName);
      }
      if (!item.note && component?.note) item.note = text(component.note);
      const quantity = Number(component?.quantity);
      const safeQuantity = Number.isFinite(quantity) ? quantity : 0;
      const subtotal = Number(component?.subtotal);
      const safeSubtotal = Number.isFinite(subtotal) ? subtotal : 0;
      const unit = text(component?.unit || item.unit || 'g') || 'g';
      const prevQuantity = item.sizeQuantities[size]?.quantity || 0;
      const prevSubtotal = item.sizeSubtotals[size] || 0;
      item.sizeQuantities[size] = {
        quantity: prevQuantity + safeQuantity,
        unit,
      };
      item.sizeSubtotals[size] = prevSubtotal + safeSubtotal;
      item.totalQuantity += safeQuantity;
      item.totalCost += safeSubtotal;
    });
  }

  return [...menuMap.values()]
    .map(menu => {
      const sizes = sortSizes(menu.sizes);
      const menuCodes = [...menu.menuCodes].filter(Boolean);
      const components = [...menu.components.values()].sort((a, b) => a.lineNo - b.lineNo);
      for (const component of components) {
        for (const size of sizes) {
          if (!component.sizeQuantities[size]) {
            component.sizeQuantities[size] = { quantity: 0, unit: component.unit || 'g' };
          }
          if (component.sizeSubtotals[size] == null) component.sizeSubtotals[size] = 0;
        }
      }
      return {
        ...menu,
        menuCode: menu.menuCode || menuCodes[0] || '',
        menuCodes,
        sizes,
        componentCount: menu.components.size,
        components,
        totalCost: Math.round(menu.totalCost),
      };
    })
    .sort((a, b) => {
      const rank = getMenuCodeRank(a.menuCode) - getMenuCodeRank(b.menuCode);
      if (rank !== 0) return rank;
      const cat = (a.categoryLabel || '').localeCompare(b.categoryLabel || '', 'ko');
      if (cat !== 0) return cat;
      return (a.menuName || '').localeCompare(b.menuName || '', 'ko');
    });
}

/**
 * 원가계산 보고서용 카테고리별 메뉴 원가 데이터를 계산합니다.
 * @param {object[]} prices - getAllMenuPrices() 결과
 * @param {{ detailMaps, edges, upm }} ctx
 * @param {string[]} catKeys - 카테고리 순서
 * @param {object} catMeta - catKey → { id, color, label }
 * @returns {object} catMeta.id → { label, color, menus }, plus _diagnostics: 원가 미연결 메뉴 목록
 */
export function buildCostReportData(prices, ctx, catKeys, catMeta) {
  const updated = {};
  const unconnected = [];
  for (const catLabel of catKeys) {
    const meta = catMeta[catLabel];
    if (!meta) continue;
    const catPrices = prices.filter(p =>
      catLabel === '엣지'
        ? matchEdge(p.category)
        : catLabel === '피자'
          ? isPizzaCategory(p.category, { includePersonal: false })
          : p.category === catLabel
    );
    const menus = catPrices.map(p => {
      const cost = Math.round(costForPrice(p, ctx));
      const sale = p.price || 0;
      const rate = cost > 0 && sale > 0 ? (cost / sale) * 100 : 0;
      if (cost === 0 && !matchEdge(p.category)) {
        const map = detailStoreFor(p.category, ctx.detailMaps);
        let reason;
        if (!map) reason = '분류 미매핑';
        else if (!p.menuCode) reason = '메뉴코드 없음';
        else if (!map.get(p.menuCode)) reason = '레시피 미등록';
        else reason = '레시피 원가 0';
        unconnected.push({
          catLabel: meta.label,
          code: p.menuCode || '—',
          name: p.size && p.size !== '단일' ? `${p.menuName} ${p.size}` : p.menuName,
          category: p.category || '—',
          reason,
        });
      }
      return {
        code: p.menuCode || '',
        name: p.size && p.size !== '단일' ? `${p.menuName} ${p.size}` : p.menuName,
        cost,
        sale,
        rate,
      };
    });
    menus.sort(
      (a, b) =>
        getMenuCodeRank(a.code) - getMenuCodeRank(b.code) ||
        (a.code || '').localeCompare(b.code || '', 'ko')
    );
    updated[meta.id] = { label: meta.label, color: meta.color, menus };
  }
  return { ...updated, _diagnostics: unconnected };
}
