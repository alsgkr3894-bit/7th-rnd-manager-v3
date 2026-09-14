import { formatNumber } from '@/lib/format';
import { countIngredientPhotos, getPrimaryIngredientPhoto, sortHashTags } from '@/lib/ingredient';
import { getIngredientPackagePrice } from '@/lib/ingredient/price-status';
import { allergensLabel, originLabel } from '@/lib/ingredient/manage-print/formatters';
import { roundUnitPrice } from '@/lib/cost/unit-policy';
import { asDisplayText, asStringArray } from '@/lib/ui/prop-guards';

/**
 * 목록 행에 표시할 원산지·알레르기 요약 텍스트.
 * - "없음"/"비표기"로 명시된 경우는 그 문구를 그대로 보여준다.
 * - 아무 정보도 없고 명시도 안 됐으면(입력 전) 빈 문자열 — 줄 자체를 숨긴다.
 */
function originText(r) {
  if (r.originHidden) return '비표기';
  if (r.originNone) return '없음';
  const label = originLabel(r);
  return label === '-' ? '' : label;
}

function allergenText(r) {
  if (r.allergenNone) return '없음';
  const label = allergensLabel(r);
  return label === '-' ? '' : label;
}

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
  const isPieceUnit = baseUnitType === '개';
  const unitPrice = Number.isFinite(Number(r.unitPrice)) ? Number(r.unitPrice) : null;
  const pieceWeightGrams = Number.isFinite(Number(r.pieceWeightGrams))
    ? Number(r.pieceWeightGrams)
    : null;
  // unitPrice는 baseUnitType이 '개'일 때 이미 "1개당 원가"다(calcUnitPrice가 baseQuantity로 나눔) —
  // 여기에 1개당 g을 더 나누면 g당 환산 원가가 나온다.
  const perGramPrice =
    isPieceUnit && unitPrice != null && pieceWeightGrams != null && pieceWeightGrams > 0
      ? roundUnitPrice(unitPrice / pieceWeightGrams)
      : null;

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
    isPieceUnit,
    unitPrice,
    pieceWeightGrams,
    perGramPrice,
    originText: originText(r),
    allergenText: allergenText(r),
    deletable: r.isManual && r.id != null && !productCode,
  };
}
