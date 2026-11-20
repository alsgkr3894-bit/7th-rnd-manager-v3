import { getPriceFiles, getPriceRowsByFileId } from '../price';
import { getManagedProducts } from '../shipment';
import {
  buildMetaOnlyRow,
  computeIngredientIssues,
  getAllIngredients,
  getIngredientMetaMap,
  mergeIngredientRows,
} from './index.js';
import { isGhostIngredientMeta } from './normalize.js';

/** 식자재관리 이슈 탭과 같은 행 구성·판정으로 현재 이슈 식자재 수를 계산한다. */
export async function getIngredientIssueCount() {
  const files = await getPriceFiles();
  const latest = files[0] || null;
  const prev = files[1] || null;
  const [allMeta, metaMap, managed] = await Promise.all([
    getAllIngredients().then(list => list.filter(meta => !isGhostIngredientMeta(meta))),
    getIngredientMetaMap(),
    getManagedProducts(),
  ]);

  if (!latest) {
    const rows = allMeta.map(meta => buildMetaOnlyRow(meta, { jetteMissing: false }));
    return computeIngredientIssues(rows, null).length;
  }

  const priceRows = await getPriceRowsByFileId(latest.id);
  const typeMap = new Map(
    managed
      .filter(product => product.productCode)
      .map(product => [product.productCode, product.productType])
  );
  const merged = mergeIngredientRows(priceRows, metaMap, typeMap).filter(row => row.hasRecord);
  const priceCodeSet = new Set(priceRows.map(row => row.productCode).filter(Boolean));
  const orphanRows = allMeta
    .filter(meta => !meta.productCode || !priceCodeSet.has(meta.productCode))
    .map(meta => buildMetaOnlyRow(meta, { jetteMissing: !!meta.productCode }));

  let prevPriceMap = null;
  if (prev) {
    const prevRows = await getPriceRowsByFileId(prev.id);
    prevPriceMap = new Map(prevRows.map(row => [row.productCode, row.priceWithTax]));
  }

  return computeIngredientIssues([...merged, ...orphanRows], prevPriceMap).length;
}
