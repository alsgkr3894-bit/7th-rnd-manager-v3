/**
 * lib/shipment/store.js — shipment_files / shipment_rows / ref_shipment_products / upload_log
 *
 * 정책:
 *   - 70개 대상 제품만 shipment_rows에 저장 (filterTargetRows 적용 후)
 *   - 대상 외 행은 DB 저장 / 집계 / CSV 다운로드에서 제외 — 오류 아님
 *   - 같은 fileHash는 중복 차단 (DUPLICATE_HASH)
 */

import { getAll, getByIndex, runTransaction, hasStore } from '../db';
import { INITIAL_MANAGED_PRODUCTS } from './products.js';
import { normalizeProductName } from '../normalize';

/** 모든 shipment_files (최신순) */
export async function getShipmentFiles() {
  if (!hasStore('shipment_files')) return [];
  const files = await getAll('shipment_files');
  return files.sort((a, b) => {
    if (a.year !== b.year) return b.year - a.year;
    if (a.month !== b.month) return b.month - a.month;
    return (b.uploadedAt || '').localeCompare(a.uploadedAt || '');
  });
}

/** fileId에 연결된 shipment_rows */
export async function getShipmentRowsByFileId(fileId) {
  if (!hasStore('shipment_rows')) return [];
  return getByIndex('shipment_rows', 'fileId', fileId);
}

/** 같은 fileHash가 upload_log에 있는지 (module=shipment) */
export async function checkHashExists(fileHash) {
  if (!hasStore('upload_log') || !fileHash) return false;
  const logs = await getByIndex('upload_log', 'fileHash', fileHash);
  return logs.some(l => l.module === 'shipment');
}

/**
 * 관리품목 70개 시드 (앱 진입 시 ref_shipment_products가 비어 있으면 1회 실행).
 *
 * 데이터 모델:
 *   - productType: 'generic' (범용상품) | 'exclusive' (전용상품)
 *   - isManaged:   boolean — 관리품목 체크 여부 (주로 범용상품 안에서 사용)
 */
export async function seedManagedProductsIfEmpty() {
  if (!hasStore('ref_shipment_products')) return;
  const existing = await getAll('ref_shipment_products');
  if (existing.length > 0) return; // 이미 시드됨
  await runTransaction(['ref_shipment_products'], 'readwrite', tx => {
    const store = tx.objectStore('ref_shipment_products');
    for (const p of INITIAL_MANAGED_PRODUCTS) {
      store.add({
        productCode: p.productCode,
        productName: p.productName,
        normalizedProductName: normalizeProductName(p.productName),
        enable: true,
        productType: p.productType || 'generic',
        isManaged: !!p.isManaged,
        createdAt: new Date().toISOString(),
      });
    }
  });
}

/** 모든 관리품목 (enable=true만) */
export async function getManagedProducts() {
  if (!hasStore('ref_shipment_products')) return [];
  const all = await getAll('ref_shipment_products');
  return all.filter(p => p.enable !== false);
}

/** 모든 관리품목 (비활성 포함) — 설정 페이지용 */
export async function getAllManagedProducts() {
  if (!hasStore('ref_shipment_products')) return [];
  return getAll('ref_shipment_products');
}

/**
 * 대상 제품 추가.
 * @param {{ productCode, productName, productType?, isManaged? }} input
 * @throws Error('CODE_REQUIRED' | 'CODE_DUPLICATE')
 */
export async function addManagedProduct({
  productCode, productName,
  productType = 'generic', isManaged = false,
}) {
  if (!productCode?.trim() || !productName?.trim()) throw new Error('CODE_REQUIRED');
  const existing = await getByIndex('ref_shipment_products', 'productCode', productCode.trim());
  if (existing.length > 0) throw new Error('CODE_DUPLICATE');

  await runTransaction(['ref_shipment_products'], 'readwrite', tx => {
    tx.objectStore('ref_shipment_products').add({
      productCode: productCode.trim(),
      productName: productName.trim(),
      normalizedProductName: normalizeProductName(productName.trim()),
      enable: true,
      productType: normalizeProductType(productType),
      isManaged: !!isManaged,
      createdAt: new Date().toISOString(),
    });
  });
}

/** productType 정규화 — 'exclusive' | 'generic' (2가지로 단순화) */
function normalizeProductType(t) {
  return t === 'exclusive' ? 'exclusive' : 'generic';
}

/** 대상 제품 삭제 */
export async function deleteManagedProduct(id) {
  await runTransaction(['ref_shipment_products'], 'readwrite', tx => {
    tx.objectStore('ref_shipment_products').delete(id);
  });
}

/** 대상 제품 부분 수정 — enable / productType / isManaged / productName */
export async function updateManagedProduct({ id, enable, productType, isManaged, productName }) {
  await runTransaction(['ref_shipment_products'], 'readwrite', tx => {
    const store = tx.objectStore('ref_shipment_products');
    const req = store.get(id);
    req.onsuccess = () => {
      const cur = req.result;
      if (!cur) { tx.abort(); return; }
      const next = { ...cur, updatedAt: new Date().toISOString() };
      if (enable      !== undefined) next.enable = !!enable;
      if (productType !== undefined) next.productType = normalizeProductType(productType);
      if (isManaged   !== undefined) next.isManaged = !!isManaged;
      if (productName !== undefined) {
        next.productName = productName.trim();
        next.normalizedProductName = normalizeProductName(productName.trim());
      }
      store.put(next);
    };
    req.onerror = () => tx.abort();
  });
}

/**
 * 가격비교 productCode 목록 기준으로 ref에 없는 항목을 'exclusive'로 일괄 추가.
 *
 * @param {Array<{productCode, productName, unit?, temperature?, taxType?}>} priceProducts
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
    existingCodes.add(code); // dedup within batch
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

/**
 * shipment_files + shipment_rows + upload_log 원자적 저장.
 *
 * @param {{ meta, rows, log }} payload
 * @returns {number} fileId
 * @throws Error('DUPLICATE_HASH')
 */
export async function saveShipmentUpload({ meta, rows, log }) {
  if (await checkHashExists(log.fileHash)) throw new Error('DUPLICATE_HASH');

  let fileId;
  await runTransaction(['shipment_files', 'shipment_rows', 'upload_log'], 'readwrite', (tx) => {
    const fileReq = tx.objectStore('shipment_files').add(meta);
    fileReq.onerror = () => tx.abort();
    fileReq.onsuccess = () => {
      fileId = fileReq.result;
      const rowStore = tx.objectStore('shipment_rows');
      for (const r of rows) {
        rowStore.add({ ...r, fileId, year: meta.year, month: meta.month });
      }
      tx.objectStore('upload_log').add({ ...log, linkedFileId: fileId });
    };
  });
  return fileId;
}

/**
 * shipment_files 단건 삭제 + 연결된 shipment_rows / upload_log 모두 삭제.
 */
export async function deleteShipmentFile(fileId) {
  const rowIds = hasStore('shipment_rows')
    ? (await getByIndex('shipment_rows', 'fileId', fileId)).map(r => r.id)
    : [];
  const logIds = hasStore('upload_log')
    ? (await getAll('upload_log')).filter(l => l.linkedFileId === fileId).map(l => l.id)
    : [];

  const stores = [];
  if (hasStore('shipment_files')) stores.push('shipment_files');
  if (hasStore('shipment_rows'))  stores.push('shipment_rows');
  if (hasStore('upload_log'))     stores.push('upload_log');

  await runTransaction(stores, 'readwrite', tx => {
    if (hasStore('shipment_files'))   tx.objectStore('shipment_files').delete(fileId);
    if (rowIds.length > 0) {
      const s = tx.objectStore('shipment_rows');
      for (const id of rowIds) s.delete(id);
    }
    if (logIds.length > 0) {
      const s = tx.objectStore('upload_log');
      for (const id of logIds) s.delete(id);
    }
  });
}
