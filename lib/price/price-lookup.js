import { getPriceFiles, getPriceRowsByFileId } from '@/lib/price/store';
import { asDisplayText, asFiniteNumber, asObjectArray } from '@/lib/ui/prop-guards';
import { dedupePriceRowsByProductCode } from '@/lib/price/duplicates';

/**
 * 최신 제때 단가 파일에서 productCode → priceWithTax Map을 빌드.
 * 파일이 없거나 에러 시 빈 Map 반환 (호출자가 null 여부 체크 불필요).
 *
 * @returns {Promise<Map<string, number>>}
 */
export async function buildLatestPriceLookup() {
  try {
    const files = asObjectArray(await getPriceFiles());
    if (!files.length) return new Map();
    const latestFileId = files[0]?.id;
    if (latestFileId == null) return new Map();

    const rows = dedupePriceRowsByProductCode(
      asObjectArray(await getPriceRowsByFileId(latestFileId))
    ).rows;
    const map = new Map();
    for (const r of rows) {
      const productCode = asDisplayText(r.productCode);
      const priceWithTax = asFiniteNumber(r.priceWithTax, null);
      if (productCode && priceWithTax != null) map.set(productCode, priceWithTax);
    }
    return map;
  } catch (e) {
    console.warn('[price-lookup] buildLatestPriceLookup 실패', e);
    return new Map();
  }
}
