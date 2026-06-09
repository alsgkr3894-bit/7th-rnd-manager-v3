'use client';
import { useEffect, useRef, useState } from 'react';
import { initDB } from '@/lib/db';
import { readSpreadsheetFile, computeFileHash } from '@/lib/excel';
import { showToast } from '@/components/Toast';
import {
  parseShipmentRows,
  filterTargetRows,
  aggregateShipmentRows,
  getShipmentFiles,
  getShipmentRowsByFileId,
  getManagedProducts,
  saveShipmentUpload,
  deleteShipmentFile,
  seedManagedProductsIfEmpty,
  onManagedProductsChange,
} from './index.js';
import { buildLatestPriceLookup } from '@/lib/price/price-lookup';

/**
 * useJetteShipment — 출고량 페이지 hook
 */
export function useJetteShipment() {
  const [ready, setReady] = useState(false);
  const [busy, setBusy] = useState(false);
  const [files, setFiles] = useState([]);
  const [selectedYM, setSelectedYM] = useState(null); // { year, month }
  const [managedProducts, setManagedProducts] = useState([]);
  const [aggRows, setAggRows] = useState([]);
  const mountedRef = useRef(true);

  useEffect(() => {
    mountedRef.current = true;

    (async () => {
      try {
        await initDB();
        await seedManagedProductsIfEmpty();
        await refreshFiles(true);
        const products = await getManagedProducts();
        if (!mountedRef.current) return;
        setManagedProducts(products);
        setReady(true);
      } catch (err) {
        if (!mountedRef.current) return;
        console.error('[jette-shipment] 초기 로드 실패:', err);
        showToast('DB 초기화 실패', 'err');
      }
    })();

    return () => {
      mountedRef.current = false;
    };
  }, []);

  // 다른 화면(대상 제품 관리·가격비교)에서 분류를 바꾸면 즉시 재집계
  useEffect(
    () =>
      onManagedProductsChange(() => {
        getManagedProducts()
          .then(products => {
            if (mountedRef.current) setManagedProducts(products);
          })
          .catch(() => {});
      }),
    []
  );

  async function refreshFiles(autoSelect = false) {
    const all = await getShipmentFiles();
    if (!mountedRef.current) return all;
    setFiles(all);
    if (autoSelect) {
      setSelectedYM(all.length > 0 ? { year: all[0].year, month: all[0].month } : null);
    }
    return all;
  }

  // 선택 (year, month) → 같은 월의 모든 파일 rows 합쳐서 집계
  // 부가세포함가는 제때 가격 비교의 최신 단가에서 productCode lookup
  useEffect(() => {
    let alive = true;

    (async () => {
      if (!selectedYM) {
        setAggRows([]);
        return;
      }
      const sameMonth = files.filter(
        f => f.year === selectedYM.year && f.month === selectedYM.month
      );
      const all = [];
      for (const f of sameMonth) {
        const rs = await getShipmentRowsByFileId(f.id);
        all.push(...rs);
      }
      const priceLookup = await buildLatestPriceLookup();
      if (alive && mountedRef.current) {
        setAggRows(aggregateShipmentRows(all, managedProducts, priceLookup));
      }
    })();

    return () => {
      alive = false;
    };
  }, [selectedYM, files, managedProducts]);

  /**
   * @param {File} file
   * @param {{ year: number, month: number }} period
   */
  async function handleFile(file, period) {
    if (!file) return;
    if (file.size > 30 * 1024 * 1024) {
      showToast('파일이 너무 큽니다 (최대 30MB)', 'err');
      return;
    }
    if (!period?.year || !period?.month) {
      showToast('년도/월을 선택하세요', 'err');
      return;
    }
    setBusy(true);
    try {
      const parsed = await readSpreadsheetFile(file);
      const fileHash = await computeFileHash(file);

      const { ok, success, failed, error } = parseShipmentRows(parsed.headers, parsed.rows);
      if (!ok) {
        showToast(error || '파싱 실패', 'err');
        return;
      }
      if (success.length === 0) {
        showToast('저장할 행이 없습니다', 'err');
        return;
      }

      const targetRows = filterTargetRows(success, managedProducts);
      if (targetRows.length === 0) {
        showToast('70개 관리 대상 제품에 해당하는 행이 없습니다', 'err');
        return;
      }

      const now = new Date();
      const meta = {
        year: period.year,
        month: period.month,
        fileName: file.name,
        uploadedAt: now.toISOString(),
        totalRows: targetRows.length,
        sourceTotalRows: success.length,
      };
      const log = {
        module: 'shipment',
        fileName: file.name,
        fileHash,
        at: now.toISOString(),
        year: period.year,
        month: period.month,
        totalRows: targetRows.length,
        sourceTotalRows: success.length,
        failedCount: failed.length,
        summary: `대상 ${targetRows.length}건 (원본 ${success.length}건 · 실패 ${failed.length}건)`,
      };
      await saveShipmentUpload({ meta, rows: targetRows, log });

      showToast(
        `${period.year}년 ${period.month}월 — 대상 ${targetRows.length}건 저장 (원본 ${success.length}건)`,
        'ok'
      );
      await refreshFiles(true);
    } catch (err) {
      console.error('[jette-shipment] 업로드 실패:', err);
      if (err.message === 'DUPLICATE_HASH')
        showToast('같은 내용의 파일이 이미 업로드됐어요', 'err');
      else showToast(err.message || '업로드 실패', 'err');
    } finally {
      setBusy(false);
    }
  }

  async function handleDelete(fileId) {
    try {
      await deleteShipmentFile(fileId);
      showToast('삭제됐어요', 'ok');
      const remaining = await refreshFiles(false);
      if (selectedYM) {
        const stillExists = remaining.some(
          f => f.year === selectedYM.year && f.month === selectedYM.month
        );
        if (!stillExists) {
          setSelectedYM(
            remaining[0] ? { year: remaining[0].year, month: remaining[0].month } : null
          );
        }
      }
    } catch (err) {
      console.error('[jette-shipment] 삭제 실패:', err);
      showToast('삭제 실패', 'err');
    }
  }

  return {
    ready,
    busy,
    files,
    selectedYM,
    setSelectedYM,
    managedProducts,
    aggRows,
    handleFile,
    handleDelete,
  };
}
