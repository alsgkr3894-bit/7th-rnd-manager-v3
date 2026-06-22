/**
 * lib/impact/ingredient-impact.js — 식자재 변경의 영향 메뉴 계산
 *
 * 주어진 식자재(productCode)가 사용된 레시피와 원가율 변화를 계산한다.
 * DB 쓰기 없이 read-only 계산만 한다.
 */
import { getAllMenuRecipes } from '@/lib/menu-recipes/store';
import { getAllMenuPrices } from '@/lib/cost/menu-price/store';
import { getAllMenuMaster } from '@/lib/menu-master';
import { hasStore } from '@/lib/db';
import { asFiniteNumber, asObjectArray } from '@/lib/ui/prop-guards';
import { calcUnitPrice } from '@/lib/cost/calc-unit-price';

function unitPriceFromPackage(priceWithTax, baseQuantity) {
  const price = asFiniteNumber(priceWithTax, null);
  const qty = asFiniteNumber(baseQuantity, null);
  return calcUnitPrice(price, qty);
}

function emptyImpactResult({
  productCode,
  oldPackagePrice = null,
  newPackagePrice = null,
  oldUnit = null,
  newUnit = null,
} = {}) {
  return {
    affectedMenus: [],
    totalAffected: 0,
    productCode,
    oldPriceWithTax: oldPackagePrice,
    newPriceWithTax: newPackagePrice,
    oldUnitPrice: oldUnit,
    newUnitPrice: newUnit,
    priceDelta:
      newPackagePrice != null && oldPackagePrice != null ? newPackagePrice - oldPackagePrice : null,
    priceDeltaPct:
      oldPackagePrice && oldPackagePrice > 0 && newPackagePrice != null
        ? ((newPackagePrice - oldPackagePrice) / oldPackagePrice) * 100
        : null,
    unitPriceDelta: newUnit != null && oldUnit != null ? newUnit - oldUnit : null,
    unitPriceDeltaPct:
      oldUnit && oldUnit > 0 && newUnit != null ? ((newUnit - oldUnit) / oldUnit) * 100 : null,
  };
}

/** 단가 변경 시 영향받는 메뉴 계산
 *
 * @param {string} productCode - 변경 식자재 제품코드
 * @param {number|null} oldPriceWithTax - 이전 포장가 (부가세포함)
 * @param {number|null} newPriceWithTax - 새 포장가 (부가세포함)
 * @param {{ oldBaseQuantity?: number|null, newBaseQuantity?: number|null }} [options]
 * @returns {Promise<ImpactResult>}
 */
export async function computeIngredientPriceImpact(
  productCode,
  oldPriceWithTax,
  newPriceWithTax,
  options = {}
) {
  const oldPackagePrice = asFiniteNumber(oldPriceWithTax, null);
  const newPackagePrice = asFiniteNumber(newPriceWithTax, null);
  const oldUnit = unitPriceFromPackage(oldPackagePrice, options.oldBaseQuantity);
  const newUnit = unitPriceFromPackage(newPackagePrice, options.newBaseQuantity);

  if (!productCode) {
    return emptyImpactResult({ productCode, oldPackagePrice, newPackagePrice, oldUnit, newUnit });
  }

  if (oldUnit == null || newUnit == null) {
    return emptyImpactResult({ productCode, oldPackagePrice, newPackagePrice, oldUnit, newUnit });
  }

  const [allRecipes, allPrices, allMenus] = await Promise.all([
    hasStore('menu_recipes') ? getAllMenuRecipes().catch(() => []) : Promise.resolve([]),
    hasStore('cost_selling_prices') ? getAllMenuPrices().catch(() => []) : Promise.resolve([]),
    hasStore('menu_master') ? getAllMenuMaster().catch(() => []) : Promise.resolve([]),
  ]);

  // 메뉴코드 → 판매가 매핑
  const priceMap = new Map();
  asObjectArray(allPrices).forEach(p => {
    if (p.menuCode)
      priceMap.set(
        p.menuCode,
        asFiniteNumber(p.price, null) ?? asFiniteNumber(p.sellingPrice, null)
      );
  });

  // 메뉴코드 → 메뉴명 매핑
  const menuNameMap = new Map();
  asObjectArray(allMenus).forEach(m => {
    if (m.menuCode) menuNameMap.set(m.menuCode, m.menuName);
  });

  // 이 productCode를 사용하는 레시피 찾기
  const affected = [];

  for (const recipe of asObjectArray(allRecipes)) {
    const components = asObjectArray(recipe.components).filter(c => c.productCode === productCode);
    if (components.length === 0) continue;

    const menuCode = recipe.menuCode;
    if (!menuCode) continue;

    const sellingPrice = priceMap.get(menuCode);
    const menuName = menuNameMap.get(menuCode) || menuCode;

    // 모든 구성품의 원가 합산 (해당 재료 제외)
    let baseCost = 0;
    let oldComponentCost = 0;
    let newComponentCost = 0;

    for (const comp of asObjectArray(recipe.components)) {
      const qty = asFiniteNumber(comp.quantity, 0) ?? 0;
      if (comp.productCode === productCode) {
        oldComponentCost += qty * (oldUnit ?? 0);
        newComponentCost += qty * (newUnit ?? 0);
      } else {
        const unitPrice = asFiniteNumber(comp.unitPrice, null) ?? 0;
        baseCost += qty * unitPrice;
      }
    }

    const oldTotalCost = baseCost + oldComponentCost;
    const newTotalCost = baseCost + newComponentCost;

    const oldCostRate =
      sellingPrice && sellingPrice > 0 ? (oldTotalCost / sellingPrice) * 100 : null;
    const newCostRate =
      sellingPrice && sellingPrice > 0 ? (newTotalCost / sellingPrice) * 100 : null;

    const delta = oldCostRate != null && newCostRate != null ? newCostRate - oldCostRate : null;

    affected.push({
      menuCode,
      menuName,
      componentCount: components.length,
      oldCostRate,
      newCostRate,
      delta,
      sellingPrice,
    });
  }

  // 원가율 변화 크기 기준 정렬
  affected.sort((a, b) => Math.abs(b.delta ?? 0) - Math.abs(a.delta ?? 0));

  return {
    affectedMenus: affected,
    totalAffected: affected.length,
    productCode,
    oldPriceWithTax: oldPackagePrice,
    newPriceWithTax: newPackagePrice,
    oldUnitPrice: oldUnit,
    newUnitPrice: newUnit,
    priceDelta:
      newPackagePrice != null && oldPackagePrice != null ? newPackagePrice - oldPackagePrice : null,
    priceDeltaPct:
      oldPackagePrice && oldPackagePrice > 0 && newPackagePrice != null
        ? ((newPackagePrice - oldPackagePrice) / oldPackagePrice) * 100
        : null,
    unitPriceDelta: newUnit != null && oldUnit != null ? newUnit - oldUnit : null,
    unitPriceDeltaPct:
      oldUnit && oldUnit > 0 && newUnit != null ? ((newUnit - oldUnit) / oldUnit) * 100 : null,
  };
}

/**
 * 원산지/알레르기 변경 시 영향 메뉴 계산 (간소화 버전)
 * — 해당 식자재가 포함된 레시피 메뉴 목록 반환
 */
export async function computeIngredientLinkImpact(productCode) {
  if (!productCode) return { affectedMenus: [], totalAffected: 0 };

  const allRecipes = hasStore('menu_recipes') ? await getAllMenuRecipes().catch(() => []) : [];
  const allMenus = hasStore('menu_master') ? await getAllMenuMaster().catch(() => []) : [];

  const menuNameMap = new Map();
  asObjectArray(allMenus).forEach(m => {
    if (m.menuCode) menuNameMap.set(m.menuCode, m.menuName);
  });

  const affected = [];
  for (const recipe of asObjectArray(allRecipes)) {
    const hasIngredient = asObjectArray(recipe.components).some(c => c.productCode === productCode);
    if (!hasIngredient) continue;
    const menuCode = recipe.menuCode;
    if (!menuCode) continue;
    affected.push({ menuCode, menuName: menuNameMap.get(menuCode) || menuCode });
  }

  return { affectedMenus: affected, totalAffected: affected.length };
}
