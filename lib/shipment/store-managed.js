/**
 * lib/shipment/store-managed.js — ref_shipment_products CRUD + seed
 *
 * 데이터 모델:
 *   - productType: 'generic' (범용상품) | 'exclusive' (전용상품)
 *   - isManaged:   boolean — 관리품목 체크 여부 (주로 범용상품 안에서 사용)
 */

import { getAll, getByIndex, runTransaction, hasStore } from '../db';
import { INITIAL_MANAGED_PRODUCTS } from './products.js';
import { normalizeProductName } from '../normalize';
import { emitManagedProductsChange } from './products-events.js';
import { getActiveBrandId } from '../active-brand';
import { asObjectArray } from '../ui/prop-guards.js';
import {
  isLegacyManagedProductType,
  normalizeManagedFlag,
  normalizeManagedProductRecord,
  normalizeProductType,
} from '../jette/product-types.js';
import { assertActiveAdmin } from '@/lib/auth/guard';

// 동시 호출 중복 방지 — StrictMode 이중 마운트나 멀티탭에서 두 번 시드되면
// productCode 유니크 인덱스 충돌로 트랜잭션이 abort된다. 진행 중인 시드를 공유한다.
let _seedInFlight = null;

/** 시드 — ref_shipment_products가 비어 있으면 INITIAL_MANAGED_PRODUCTS 등록 */
export async function seedManagedProductsIfEmpty() {
  if (!hasStore('ref_shipment_products')) return;
  // 7번가(main) 전용 시드 — 다른 브랜드는 빈 상태로 시작(7번가 데이터 유출 방지)
  if (getActiveBrandId() !== 'main') return;
  try {
    await assertActiveAdmin('제때 관리품목 초기 시드');
  } catch (error) {
    if (error?.code === 'PERMISSION_DENIED') return;
    throw error;
  }
  if (_seedInFlight) return _seedInFlight;

  _seedInFlight = (async () => {
    const existing = asObjectArray(await getAll('ref_shipment_products'));
    if (existing.length > 0) return;
    await runTransaction(['ref_shipment_products'], 'readwrite', tx => {
      const store = tx.objectStore('ref_shipment_products');
      for (const p of INITIAL_MANAGED_PRODUCTS) {
        const normalized = normalizeManagedProductRecord(p);
        store.add({
          productCode: p.productCode,
          productName: p.productName,
          normalizedProductName: normalizeProductName(p.productName),
          enable: true,
          productType: normalized.productType,
          isManaged: normalized.isManaged,
          createdAt: new Date().toISOString(),
        });
      }
    });
  })();

  try {
    await _seedInFlight;
  } finally {
    _seedInFlight = null;
  }
}

/** 모든 관리품목 (enable=true만) */
export async function getManagedProducts() {
  if (!hasStore('ref_shipment_products')) return [];
  const all = asObjectArray(await getAll('ref_shipment_products'));
  return all.map(normalizeManagedProductRecord).filter(p => p.enable !== false);
}

/** 모든 관리품목 (비활성 포함) — 설정 페이지용 */
export async function getAllManagedProducts() {
  if (!hasStore('ref_shipment_products')) return [];
  return asObjectArray(await getAll('ref_shipment_products')).map(normalizeManagedProductRecord);
}

/**
 * 대상 제품 추가.
 * @param {{ productCode, productName, productType?, isManaged? }} input
 * @throws Error('CODE_REQUIRED' | 'CODE_DUPLICATE')
 */
export async function addManagedProduct({
  productCode,
  productName,
  productType = 'generic',
  isManaged = false,
}) {
  await assertActiveAdmin('제때 관리품목 추가');
  if (!productCode?.trim() || !productName?.trim()) throw new Error('CODE_REQUIRED');
  const existing = asObjectArray(
    await getByIndex('ref_shipment_products', 'productCode', productCode.trim())
  );
  if (existing.length > 0) throw new Error('CODE_DUPLICATE');
  const normalized = normalizeManagedProductRecord({ productType, isManaged });

  await runTransaction(['ref_shipment_products'], 'readwrite', tx => {
    tx.objectStore('ref_shipment_products').add({
      productCode: productCode.trim(),
      productName: productName.trim(),
      normalizedProductName: normalizeProductName(productName.trim()),
      enable: true,
      productType: normalized.productType,
      isManaged: normalized.isManaged,
      createdAt: new Date().toISOString(),
    });
  });
  emitManagedProductsChange();
}

/** 대상 제품 삭제 */
export async function deleteManagedProduct(id) {
  await assertActiveAdmin('제때 관리품목 삭제');
  await runTransaction(['ref_shipment_products'], 'readwrite', tx => {
    tx.objectStore('ref_shipment_products').delete(id);
  });
  emitManagedProductsChange();
}

/** 대상 제품 부분 수정 — enable / productType / isManaged / productName */
export async function updateManagedProduct({ id, enable, productType, isManaged, productName }) {
  await assertActiveAdmin('제때 관리품목 수정');
  await runTransaction(['ref_shipment_products'], 'readwrite', tx => {
    const store = tx.objectStore('ref_shipment_products');
    const req = store.get(id);
    req.onsuccess = () => {
      const cur = req.result;
      if (!cur) {
        tx.abort();
        return;
      }
      const next = { ...cur, updatedAt: new Date().toISOString() };
      if (enable !== undefined) next.enable = !!enable;
      const rawProductType = productType !== undefined ? productType : cur.productType;
      const normalizedProductType = normalizeProductType(rawProductType);
      const inferredManaged =
        (isManaged !== undefined ? isManaged : cur.isManaged) ||
        (isManaged === undefined && isLegacyManagedProductType(rawProductType));
      next.productType = normalizedProductType;
      next.isManaged = normalizeManagedFlag(normalizedProductType, inferredManaged);
      if (productName !== undefined) {
        next.productName = productName.trim();
        next.normalizedProductName = normalizeProductName(productName.trim());
      }
      store.put(next);
    };
    req.onerror = () => tx.abort();
  });
  emitManagedProductsChange();
}
