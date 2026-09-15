import { formatNumber } from '@/lib/format';
import { countIngredientPhotos, getPrimaryIngredientPhoto, sortHashTags } from '@/lib/ingredient';
import { getIngredientPackagePrice } from '@/lib/ingredient/price-status';
import { allergenText, originText } from '@/lib/ingredient/origin-allergen-text';
import { roundUnitPrice } from '@/lib/cost/unit-policy';
import { asDisplayText, asStringArray } from '@/lib/ui/prop-guards';

/**
 * 일괄 삭제 가능한 행인지 — 수동으로 등록했고(isManual) 실제 레코드(id)가 있고 제품코드가
 * 없는 행만 지원한다(제때 연동 행은 삭제 대신 단종 처리). buildManageRowModel의 `deletable`
 * 필드와 같은 규칙이지만, rows 배열(raw row) 단위로 직접 개수를 세야 하는 곳
 * (배치 삭제 확인 문구·버튼 라벨)에서 모델을 거치지 않고 쓸 수 있도록 분리해 둔다.
 */
export function isDeletableIngredientRow(row) {
  return !!(row?.isManual && row?.id != null && !row?.productCode);
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
    jetteMissing: r.jetteMissing === true,
    deletable: r.isManual && r.id != null && !productCode,
    // 일괄 삭제(deletable)와 달리 단종/분류 변경은 실제 cost_ingredients 레코드(id)만 있으면
    // 제때 연동 행에도 안전하게 적용된다 — bulkSetDiscontinued/bulkSetCategory는 id 기준이라
    // isManual 여부를 가리지 않는다. 선택 가능 범위를 deletable보다 넓힌다.
    selectable: r.id != null,
  };
}
