import { formatNumber } from '@/lib/format';
import { countIngredientPhotos, getPrimaryIngredientPhoto, sortHashTags } from '@/lib/ingredient';
import { getIngredientPackagePrice } from '@/lib/ingredient/price-status';
import { asDisplayText, asStringArray } from '@/lib/ui/prop-guards';

export function buildManageRowModel(rawRow = {}) {
  const r = rawRow && typeof rawRow === 'object' ? rawRow : {};
  const productCode = asDisplayText(r.productCode);
  const productName = asDisplayText(r.productName);
  const name = asDisplayText(r.ingredientName || r.displayName || productName, '-');
  const baseUnitType = asDisplayText(r.baseUnitType);
  const salesUnit = asDisplayText(r.salesUnit, '-');
  const baseQuantity = Number(r.baseQuantity);
  const unitLabel =
    Number.isFinite(baseQuantity) && baseQuantity > 0 && baseUnitType
      ? `${formatNumber(baseQuantity)}${baseUnitType}`
      : salesUnit;
  const priceWithTax = getIngredientPackagePrice(r);

  return {
    r,
    productCode,
    productName,
    name,
    unitLabel,
    tags: sortHashTags(asStringArray(r.tags)),
    temperature: asDisplayText(r.temperature, '-'),
    scope: asDisplayText(r.scope, '-'),
    category: asDisplayText(r.category),
    manufacturer: asDisplayText(r.manufacturer, '-'),
    photo: getPrimaryIngredientPhoto(r),
    photoCount: countIngredientPhotos(r),
    priceWithTax,
    originCount: Array.isArray(r.origin) ? r.origin.length : 0,
    allergenCount: Array.isArray(r.allergens) ? r.allergens.length : 0,
    deletable: r.isManual && r.id != null && !productCode,
  };
}
