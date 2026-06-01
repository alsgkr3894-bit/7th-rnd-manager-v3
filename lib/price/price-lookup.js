import { getPriceFiles, getPriceRowsByFileId } from '@/lib/price/store';

/**
 * 최신 제때 단가 파일에서 productCode → priceWithTax Map을 빌드.
 * 파일이 없거나 에러 시 빈 Map 반환 (호출자가 null 여부 체크 불필요).
 *
 * @returns {Promise<Map<string, number>>}
 */
export async function buildLatestPriceLookup() {
  try {
    const files = await getPriceFiles();
    if (!files.length) return new Map();
    const rows = await getPriceRowsByFileId(files[0].id);
    const map = new Map();
    for (const r of rows) {
      if (r.productCode && r.priceWithTax != null) map.set(r.productCode, r.priceWithTax);
    }
    return map;
  } catch (e) {
    console.warn('[price-lookup] buildLatestPriceLookup 실패', e);
    return new Map();
  }
}
