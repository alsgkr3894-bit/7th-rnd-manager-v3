/**
 * lib/report/recipe-print-rows.js — 원가계산 보고서의 "레시피 출력" 데이터 빌더
 *
 * menu_recipes 기준 canonical recipe를 출력(인쇄/엑셀)용 행·메뉴 구조로 변환한다.
 * 원가 계산(buildCostReportData)과 분리된 출력(presentation) 빌더 — build-cost-report.js가 re-export한다.
 */
import { componentEffectiveUnitPrice } from '@/lib/cost/shared/effective-cost';
import { buildAppliedRecipeGroupComponents } from '@/lib/cost/recipe-groups/effective';
import { parseMenuCode } from '@/lib/cost/menu-price/code';
import { getMenuCodeRank } from '@/lib/menu-categories';

const stripName = s => (s || '').replace(/\s/g, '');
const text = value => (value == null ? '' : String(value).trim());
const sizeOrder = ['L', 'R', 'M', 'S', 'XL', '단일'];
const numOrNull = value => {
  if (value == null || value === '') return null;
  const n = Number(value);
  return Number.isFinite(n) ? n : null;
};

const DETAIL_RECIPE_KINDS = [
  { id: 'pizza', label: '피자' },
  { id: 'personal', label: '1인피자' },
  { id: 'set', label: '세트박스' },
  { id: 'side', label: '사이드' },
];

const COMPONENT_SOURCE = {
  DIRECT: 'direct',
  COMMON: 'common',
};

function normalizeReportComponent(component, index, unitPriceMap = new Map(), sourceType = 'direct') {
  const quantity = numOrNull(component?.quantity);
  const unitPrice = componentEffectiveUnitPrice(component, unitPriceMap);
  const isCommon = sourceType === COMPONENT_SOURCE.COMMON || component?.source === 'recipe-group';
  const groupName = text(component?.groupName);
  return {
    lineNo: index + 1,
    sourceType: isCommon ? COMPONENT_SOURCE.COMMON : COMPONENT_SOURCE.DIRECT,
    sourceLabel: isCommon ? groupName || '공통관리' : '직접 입력',
    groupName,
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
  const sourceType = text(component?.sourceType || COMPONENT_SOURCE.DIRECT).toLowerCase();
  const sourceLabel = stripName(text(component?.sourceLabel || component?.groupName)).toLowerCase();
  const code = text(component?.productCode).toLowerCase();
  if (code) return `${sourceType}:${sourceLabel}:code:${code}`;
  return `${sourceType}:${sourceLabel}:name:${stripName(text(component?.ingredientName)).toLowerCase()}`;
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
      const directComponents = (Array.isArray(recipe?.components) ? recipe.components : []).map(
        (component, index) =>
          normalizeReportComponent(component, index, unitPriceMap, COMPONENT_SOURCE.DIRECT)
      );
      const commonComponents = buildAppliedRecipeGroupComponents(
        {
          menuCode: recipe?.menuCode,
          menuName: recipe?.menuName,
          category: recipe?.category,
          size: recipe?.size,
        },
        recipeGroups,
        recipe?.selectedRecipeGroupIds
      ).map((component, index) =>
        normalizeReportComponent(
          component,
          directComponents.length + index,
          unitPriceMap,
          COMPONENT_SOURCE.COMMON
        )
      );
      const components = [...directComponents, ...commonComponents];
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
          sourceType: text(component?.sourceType || COMPONENT_SOURCE.DIRECT),
          sourceLabel: text(component?.sourceLabel || '직접 입력'),
          groupName: text(component?.groupName),
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
