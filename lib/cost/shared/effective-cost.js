import { asDisplayText, asFiniteNumber, asObjectArray } from '@/lib/ui/prop-guards';

export function componentEffectiveUnitPrice(component, unitPriceMap = new Map()) {
  const productCode = asDisplayText(component?.productCode);
  const linked = productCode ? unitPriceMap.get(productCode) : null;
  const linkedUnitPrice = asFiniteNumber(linked?.unitPrice, null);
  if (linkedUnitPrice != null) return linkedUnitPrice;
  return asFiniteNumber(component?.unitPrice, null);
}

export function effectiveComponentSubtotal(component, unitPriceMap = new Map()) {
  const quantity = asFiniteNumber(component?.quantity, null);
  const unitPrice = componentEffectiveUnitPrice(component, unitPriceMap);
  if (quantity == null || unitPrice == null) return 0;
  return quantity * unitPrice;
}

export function effectiveComponentsRawCost(components, unitPriceMap = new Map()) {
  return asObjectArray(components).reduce(
    (sum, component) => sum + effectiveComponentSubtotal(component, unitPriceMap),
    0
  );
}

export function effectiveComponentsCost(components, unitPriceMap = new Map()) {
  return Math.round(effectiveComponentsRawCost(components, unitPriceMap));
}
