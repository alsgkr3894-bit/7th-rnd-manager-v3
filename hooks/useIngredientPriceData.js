import { useVisibilityRefresh } from '@/hooks/useVisibilityRefresh';
import { buildPriceRowMap, getPriceFiles, getPriceRowsByFileId } from '@/lib/price';
import { getAllIngredients, getIngredientMetaMap, buildProductTypeMap } from '@/lib/ingredient';
import { getManagedProducts, seedManagedProductsIfEmpty } from '@/lib/shipment';
import { buildIngredientPriceRows } from '@/lib/cost/ingredient-price/buildRows';
import { useDBLoad } from '@/hooks/useDBLoad';

export function useIngredientPriceData() {
  const { data, loading, error, reload } = useDBLoad(
    async () => {
      const files = await getPriceFiles();
      const latest = files[0] || null;
      const prev = files[1] || null;

      const [allMeta, , managed] = await Promise.all([
        getAllIngredients(),
        getIngredientMetaMap(),
        seedManagedProductsIfEmpty().then(() => getManagedProducts()),
      ]);
      const typeMap = buildProductTypeMap(managed);

      let prevPriceMap = new Map();
      let priceRows = [];
      let priceCodeSet = new Set();
      let fileInfo = null;

      if (latest) {
        fileInfo = {
          name: latest.fileName || latest.name || '',
          date: latest.updateDate || latest.date || '',
        };
        const [latestRows, prevRows] = await Promise.all([
          getPriceRowsByFileId(latest.id),
          prev ? getPriceRowsByFileId(prev.id) : Promise.resolve([]),
        ]);
        const latestPrice = buildPriceRowMap(latestRows);
        const prevPrice = buildPriceRowMap(prevRows);
        priceRows = latestPrice.rows;
        priceCodeSet = new Set(priceRows.map(r => r.productCode).filter(Boolean));
        if (prev) {
          prevPrice.rows.forEach(r => {
            if (r.productCode) prevPriceMap.set(r.productCode, r.priceWithTax);
          });
        }
      }

      const priceRowMap = buildPriceRowMap(priceRows).map;
      return {
        rows: buildIngredientPriceRows(allMeta, priceRowMap, prevPriceMap, prev, priceCodeSet, typeMap),
        fileInfo,
      };
    },
    {
      initialData: null,
      onError: err => console.error('[useIngredientPriceData] load failed', err),
    }
  );

  const rows = data?.rows ?? [];
  const fileInfo = data?.fileInfo ?? null;
  const dbError = error ? (error.message || '데이터 로드 실패') : null;

  useVisibilityRefresh(reload);

  return { rows, fileInfo, loading, dbError, reload };
}
