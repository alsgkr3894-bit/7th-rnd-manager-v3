import { calcUnitPrice } from '@/lib/cost/calc-unit-price';
import { sumCompositePrice } from '@/lib/cost/ingredient-price-helpers';
import { scopeLabelFor } from '@/lib/ingredient';
import { SCOPE_UNASSIGNED } from '@/lib/ingredient/constants';

/**
 * 단가 파일 + 마스터 메타 → 표시 행 배열 생성.
 * @param {object[]} allMeta - 식자재 마스터 전체
 * @param {Map} priceRowMap - productCode → price row
 * @param {Map} prevPriceMap - productCode → 이전 파일 가격 (전월 비교용)
 * @param {object|null} prev - 이전 가격 파일 객체 (신규 판단용)
 * @param {Set} priceCodeSet - 현재 파일에 있는 productCode 집합
 * @param {Map} typeMap - productCode → scope 타입
 */
export function buildIngredientPriceRows(
  allMeta,
  priceRowMap,
  prevPriceMap,
  prev,
  priceCodeSet,
  typeMap
) {
  const linkedRows = allMeta
    .filter(m => !m.discontinued && !m.excluded && m.productCode && priceCodeSet.has(m.productCode))
    .map(m => {
      const pr = priceRowMap.get(m.productCode);
      const baseQty = m.baseQuantity ?? null;
      const unitType = m.baseUnitType || pr?.salesUnit || 'g';
      const unitPrice = calcUnitPrice(pr?.priceWithTax, baseQty);
      const prevPrice = prevPriceMap.get(m.productCode);
      const priceDelta = prevPrice != null ? pr.priceWithTax - prevPrice : null;
      const isNew = prevPrice == null && prev != null;
      return {
        ...pr,
        meta: m,
        isLinked: true,
        scope: scopeLabelFor(typeMap, m.productCode),
        masterName: m.ingredientName || pr?.productName || '',
        category: m.category || '',
        baseQuantity: baseQty,
        baseUnitType: unitType,
        taxType: pr?.taxType || m.taxType || '과세',
        unitPrice,
        priceDelta,
        isNew,
      };
    });

  const manualRows = allMeta
    .filter(
      m => !m.discontinued && !m.excluded && (!m.productCode || !priceCodeSet.has(m.productCode))
    )
    .map(m => {
      const baseQty = m.baseQuantity ?? null;
      const unitType = m.baseUnitType || 'g';
      const compositePrice = sumCompositePrice(m.compositeOf, priceRowMap);
      const effectivePrice = compositePrice ?? m.priceOverride ?? null;
      const unitPrice = calcUnitPrice(effectivePrice, baseQty);
      return {
        productCode: m.productCode || '',
        productName: m.ingredientName || '',
        meta: m,
        isLinked: false,
        scope: m.scope || SCOPE_UNASSIGNED,
        isComposite: Array.isArray(m.compositeOf) && m.compositeOf.length > 0,
        masterName: m.ingredientName || '',
        category: m.category || '',
        taxType: m.taxType || '과세',
        priceWithTax: effectivePrice,
        baseQuantity: baseQty,
        baseUnitType: unitType,
        unitPrice,
        priceDelta: null,
        isNew: false,
      };
    });

  return [...linkedRows, ...manualRows];
}
