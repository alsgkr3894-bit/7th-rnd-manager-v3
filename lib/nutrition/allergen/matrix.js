import {
  ALLERGEN_CRUST_VARIANTS as CRUST_VARIANTS,
  isDoughCategory,
  isPizzaCategory,
} from '@/lib/nutrition/crust-config';
import { applyEdgeAllergenRules } from '@/lib/nutrition/allergen/rules';
import { applyMenuName } from '@/lib/nutrition/menu-name-override';
import { asDisplayText, asObjectArray, asStringArray } from '@/lib/ui/prop-guards';
import { getMenuCodeRank } from '@/lib/menu-categories';

const EMPTY_MENU_MAP = new Map();

export const asMenuMap = value => (value instanceof Map ? value : EMPTY_MENU_MAP);

export const normStr = s => asDisplayText(s).trim().toLowerCase().replace(/\s+/g, '');

export function stripSizeSuffix(value) {
  return asDisplayText(value).replace(/\s+L$/i, '').replace(/\s+R$/i, '').trim();
}

export function logicalMenuKey(menuCode, menuName, category) {
  const code = asDisplayText(menuCode);
  const name = stripSizeSuffix(menuName);
  const cat = asDisplayText(category);
  if (isPizzaCategory(cat) && code) {
    const match = code.match(/^(.+?-\d{3})(?:-[LR])$/i);
    if (match) return match[1];
  }
  return code || normStr(name);
}

export function edgeTypeForCrust(crust) {
  const label = asDisplayText(crust);
  if (label === '치즈크러스트') return '치즈크러스트';
  if (label === '골드스윗') return '골드스윗크러스트';
  if (label === '씬바사삭') return '씬도우';
  return null;
}

export function nutritionEdgeCodeFor(edgeType) {
  if (edgeType === '치즈크러스트') return '치즈크러스트L';
  if (edgeType === '골드스윗크러스트') return '골드스윗L';
  if (edgeType === '씬도우') return '씬바사삭L';
  return null;
}

export function sourceLabel(source) {
  const type = asDisplayText(source?.type, '직접');
  const name = asDisplayText(source?.name);
  return name ? `${type} · ${name}` : type;
}

/**
 * 메뉴별 알레르기 매트릭스 행 목록을 계산합니다.
 * @param {object[]} allergenIngredients
 * @param {object} baseMapData - { ingredientToMenus: Map }
 * @param {object[]} edges
 * @param {function} isExcludedMenu - (menuCode, menuName) => boolean
 * @param {string[]} menuOrder
 * @param {object} menuNameOverrides
 * @param {object[]} toppings
 * @returns {object[]}
 */
export function buildMenuMatrix(
  allergenIngredients,
  baseMapData,
  edges,
  isExcludedMenu,
  menuOrder,
  menuNameOverrides,
  toppings
) {
  const baseIngredientToMenus = asMenuMap(baseMapData?.ingredientToMenus);

  const ingByKey = new Map();
  for (const ing of allergenIngredients) {
    const productCode = asDisplayText(ing.productCode);
    if (productCode) ingByKey.set(`code:${productCode}`, ing);
    const n = normStr(ing.ingredientName);
    if (n) ingByKey.set(`name:${n}`, ing);
  }

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
    if (edgeCode)
      edgeAllergens.set(edgeType, applyEdgeAllergenRules(edgeCode, edgeAllergens.get(edgeType)));
  }

  const menuBase = new Map();
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

  for (const topping of asObjectArray(toppings)) {
    const toppingCode = asDisplayText(topping.toppingCode);
    const toppingName = asDisplayText(topping.toppingName, toppingCode || '추가토핑');
    if (!toppingCode && !toppingName) continue;
    const productCode = asDisplayText(topping.productCode);
    const ingredientName = asDisplayText(topping.ingredientName || toppingName);
    const key = productCode ? `code:${productCode}` : `name:${normStr(ingredientName)}`;
    const ing = ingByKey.get(key);
    const allergenCodes = new Set(asStringArray(ing?.allergens));
    if (!allergenCodes.size) continue;
    rows.push({
      rowKey: `topping__${toppingCode || normStr(toppingName)}`,
      kind: 'topping',
      menuCode: toppingCode || normStr(toppingName),
      sourceMenuCodes: [],
      originalMenuName: toppingName,
      menuName: toppingName,
      category: '추가토핑',
      crust: '',
      edgeType: null,
      toppingCode,
      productCode,
      ingredientName,
      allergenCodes,
    });
  }

  const rank = new Map(asStringArray(menuOrder).map((key, index) => [key, index]));
  const offset = rank.size;
  const crustOrder = new Map(CRUST_VARIANTS.map((v, i) => [v.key, i]));
  const rowRank = row => {
    const keys = [asDisplayText(row.menuCode), ...asStringArray(row.sourceMenuCodes)];
    const ranks = keys.filter(key => rank.has(key)).map(key => rank.get(key));
    return ranks.length
      ? Math.min(...ranks)
      : offset + getMenuCodeRank(asDisplayText(row.menuCode));
  };
  const sorted = [...rows].sort(
    (a, b) =>
      rowRank(a) - rowRank(b) ||
      asDisplayText(a.menuCode).localeCompare(asDisplayText(b.menuCode), 'ko') ||
      asDisplayText(a.menuName).localeCompare(asDisplayText(b.menuName), 'ko') ||
      (crustOrder.get(asDisplayText(a.crust)) ?? 99) -
        (crustOrder.get(asDisplayText(b.crust)) ?? 99)
  );
  return sorted.map(r => ({
    ...r,
    originalMenuName: asDisplayText(r.menuName),
    menuName: applyMenuName(
      asDisplayText(r.menuCode),
      asDisplayText(r.menuName),
      menuNameOverrides
    ),
  }));
}

/**
 * 특정 메뉴 행의 알레르기 상세 식자재 목록을 계산합니다.
 * @param {object|null} detailRow
 * @param {object} baseMapData
 * @param {object[]} edges
 * @param {Map} ingredientByKey
 * @returns {object[]}
 */
export function buildDetailRows(detailRow, baseMapData, edges, ingredientByKey) {
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

  if (detailRow.kind === 'topping') {
    const productCode = asDisplayText(detailRow.productCode);
    const key = productCode
      ? `code:${productCode}`
      : `name:${normStr(detailRow.ingredientName || detailRow.menuName)}`;
    const ing = ingredientByKey.get(key);
    if (ing) {
      pushRow({ ing, source: { type: '추가토핑', name: asDisplayText(detailRow.menuName) } });
    }
    return rows;
  }

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
      const sources =
        Array.isArray(meta?.sources) && meta.sources.length
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
}
