'use client';
import { useEffect, useMemo, useState } from 'react';
import { initDB } from '@/lib/db';
import { readSpreadsheetFile } from '@/lib/excel';
import { showToast } from '@/components/Toast';
import {
  parsePriceRows,
  savePriceUpload,
  getPriceFiles,
  getPriceRowsByFileId,
  deletePriceFile,
  comparePriceLists,
} from './index.js';
import { getManagedProducts, addManagedProduct, updateManagedProduct, onManagedProductsChange } from '@/lib/shipment';

/**
 * useJettePrice — 제때 가격 페이지의 모든 상태/액션 통합 hook
 *
 * 흐름:
 *   1. initDB → files 조회
 *   2. 기본 비교: 최신 vs 그 직전
 *   3. 파일 업로드 → 파싱 → 저장 → 비교 갱신
 *   4. 파일 삭제
 */
export function useJettePrice() {
  const [ready, setReady] = useState(false);
  const [files, setFiles] = useState([]);
  const [baseFileId, setBaseFileId] = useState(null);
  const [latestFileId, setLatestFileId] = useState(null);
  const [diffRows, setDiffRows] = useState([]);
  const [busy, setBusy] = useState(false);
  const [managedProducts, setManagedProducts] = useState([]);

  // 제품 분류 Map: productCode → ManagedProduct
  const productTypeLookup = useMemo(() => {
    const map = new Map();
    for (const p of managedProducts) {
      if (p.productCode) map.set(p.productCode, p);
    }
    return map;
  }, [managedProducts]);

  // 초기 로드
  useEffect(() => {
    (async () => {
      try {
        await initDB();
        await refreshFiles(true);
        setManagedProducts(await getManagedProducts());
        setReady(true);
      } catch (err) {
        console.error('[jette-price] 초기 로드 실패:', err);
        showToast('DB 초기화 실패', 'err');
      }
    })();
  }, []);

  // 다른 화면에서 분류(전용/범용/관리품목)를 바꾸면 동기화
  useEffect(() => onManagedProductsChange(() => {
    getManagedProducts().then(setManagedProducts).catch(() => {});
  }), []);

  async function refreshFiles(setDefault = false) {
    const all = await getPriceFiles();
    setFiles(all);
    if (setDefault && all.length >= 2) {
      setLatestFileId(all[0].id);
      setBaseFileId(all[1].id);
    } else if (setDefault && all.length === 1) {
      setLatestFileId(all[0].id);
      setBaseFileId(null);
    }
  }

  // 비교 재계산
  useEffect(() => {
    (async () => {
      if (!latestFileId) { setDiffRows([]); return; }
      const latestRows = await getPriceRowsByFileId(latestFileId);
      const baseRows = baseFileId ? await getPriceRowsByFileId(baseFileId) : [];
      setDiffRows(comparePriceLists(baseRows, latestRows));
    })();
  }, [baseFileId, latestFileId]);

  /**
   * @param {File} file
   * @param {string} [customDate] — YYYY-MM-DD, 없으면 오늘
   */
  async function handleFile(file, customDate) {
    if (!file) return;
    if (file.size > 30 * 1024 * 1024) { showToast('파일이 너무 큽니다 (최대 30MB)', 'err'); return; }
    setBusy(true);
    try {
      const parsed = await readSpreadsheetFile(file);

      const { ok, success, failed, error } = parsePriceRows(parsed.headers, parsed.rows);
      if (!ok) {
        showToast(error || '파싱 실패', 'err');
        return;
      }
      if (success.length === 0) {
        showToast('저장할 행이 없습니다', 'err');
        return;
      }

      // 2. 저장 — updateDate는 사용자 지정 또는 오늘
      const now = new Date();
      const updateDate = customDate
        || `${now.getFullYear()}-${String(now.getMonth() + 1).padStart(2, '0')}-${String(now.getDate()).padStart(2, '0')}`;
      await savePriceUpload({
        meta: { updateDate, fileName: file.name, uploadedAt: now.toISOString(), totalRows: success.length },
        rows: success,
        log: {
          module: 'price',
          fileName: file.name,
          at: now.toISOString(),
          totalRows: success.length,
          failedCount: failed.length,
          summary: `${success.length}건 성공 · ${failed.length}건 실패`,
        },
      });
      showToast(`${success.length}건 반영${failed.length ? ` · ${failed.length}건 실패` : ''}`, 'ok');
      await refreshFiles(true);
    } catch (err) {
      console.error('[jette-price] 업로드 실패:', err);
      if (err.message === 'DUPLICATE_DATE') showToast('같은 날짜로 업로드된 파일이 있어요', 'err');
      else if (err.message === 'DUPLICATE_HASH') showToast('같은 내용의 파일이 이미 업로드됐어요', 'err');
      else showToast(err.message || '업로드 실패', 'err');
    } finally {
      setBusy(false);
    }
  }

  async function handleDelete(fileId) {
    try {
      await deletePriceFile(fileId);
      showToast('삭제됐어요', 'ok');
      if (baseFileId === fileId) setBaseFileId(null);
      if (latestFileId === fileId) setLatestFileId(null);
      await refreshFiles(true);
    } catch (err) {
      console.error('[jette-price] 삭제 실패:', err);
      showToast('삭제 실패', 'err');
    }
  }

  /** 가격 비교 테이블에서 직접 제품 분류 변경 */
  async function handleTypeChange(productCode, productName, productType) {
    if (!productCode || !productType) return;
    try {
      const existing = managedProducts.find(p => p.productCode === productCode);
      if (existing) {
        await updateManagedProduct({ id: existing.id, productType });
      } else {
        await addManagedProduct({ productCode, productName, productType });
      }
      setManagedProducts(await getManagedProducts());
    } catch (err) {
      showToast(err.message || '분류 변경 실패', 'err');
    }
  }

  return {
    ready, busy, files,
    baseFileId, setBaseFileId,
    latestFileId, setLatestFileId,
    diffRows,
    productTypeLookup,
    handleFile, handleDelete, handleTypeChange,
  };
}
