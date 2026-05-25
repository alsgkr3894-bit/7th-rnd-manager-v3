/**
 * lib/shipment/store-migration.js — 가격비교 → 출고량 대상 제품 일괄 마이그레이션
 */

import { getAll, runTransaction, hasStore } from '../db';
import { normalizeProductName } from '../normalize';

/**
 * 가격비교 productCode 목록 기준으로 ref에 없는 항목을 'exclusive'로 일괄 추가.
 *
 * @param {Array<{productCode, productName}>} priceProducts
 * @returns {{ added: number, skipped: number }}
 */
export async function migrateExclusiveFromPriceList(priceProducts) {
  if (!hasStore('ref_shipment_products')) return { added: 0, skipped: 0 };
  if (!Array.isArray(priceProducts) || priceProducts.length === 0) return { added: 0, skipped: 0 };

  const existing = await getAll('ref_shipment_products');
  const existingCodes = new Set(existing.map(p => p.productCode).filter(Boolean));

  const toAdd = [];
  for (const p of priceProducts) {
    const code = (p.productCode || '').trim();
    if (!code) continue;
    if (existingCodes.has(code)) continue;
    if (!p.productName?.trim()) continue;
    toAdd.push(p);
    existingCodes.add(code); // batch 내 중복 제거
  }

  if (toAdd.length === 0) return { added: 0, skipped: priceProducts.length };

  await runTransaction(['ref_shipment_products'], 'readwrite', tx => {
    const store = tx.objectStore('ref_shipment_products');
    const now = new Date().toISOString();
    for (const p of toAdd) {
      store.add({
        productCode: p.productCode.trim(),
        productName: p.productName.trim(),
        normalizedProductName: normalizeProductName(p.productName.trim()),
        enable: true,
        productType: 'exclusive',
        isManaged: false,
        createdAt: now,
      });
    }
  });

  return { added: toAdd.length, skipped: priceProducts.length - toAdd.length };
}
