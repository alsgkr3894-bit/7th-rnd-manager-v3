'use client';
import { useEffect, useRef, useState } from 'react';
import { initDB } from '@/lib/db';
import { readSpreadsheetFromBuffer, computeBufferHash } from '@/lib/excel';
import { showToast } from '@/components/Toast';
import { logShipmentUpload } from '@/lib/change-log';
import { UPLOAD_EXT, UPLOAD_MAX_MB, checkFileExt, checkFileSize } from '@/lib/upload-policy';
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
import { onPriceUpload } from '@/lib/price/price-events';

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
  // 단가(제때 가격) 변경 감지용 — 부가세포함가 재집계 트리거.
  const [priceVersion, setPriceVersion] = useState(0);
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
        showToast('DB 초기화 실패', 'error');
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

  // 단가가 바뀌면(다른 화면의 가격 업로드/삭제) 부가세포함가를 재집계해야 한다.
  // 분류 변경만 구독하던 비대칭을 해소.
  useEffect(
    () =>
      onPriceUpload(() => {
        if (mountedRef.current) setPriceVersion(v => v + 1);
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
      try {
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
      } catch (err) {
        // DB 읽기 실패가 unhandled rejection으로 새어 집계 테이블이 멈추지 않도록 방어.
        console.error('[jette-shipment] 집계 실패:', err);
        if (alive && mountedRef.current) setAggRows([]);
      }
    })();

    return () => {
      alive = false;
    };
  }, [selectedYM, files, managedProducts, priceVersion]);

  /**
   * @param {File} file
   * @param {{ year: number, month: number }} period
   */
  async function handleFile(file, period) {
    if (!file) return;
    const extErr = checkFileExt(file, UPLOAD_EXT.excelOrCsv);
    if (extErr) {
      showToast(extErr, 'error');
      return;
    }
    const sizeErr = checkFileSize(file, UPLOAD_MAX_MB.jette);
    if (sizeErr) {
      showToast(sizeErr, 'error');
      return;
    }
    if (!period?.year || !period?.month) {
      showToast('년도/월을 선택하세요', 'error');
      return;
    }
    setBusy(true);
    try {
      // 파일을 한 번만 읽어 파싱·해시에 공유(이전엔 readSpreadsheetFile + computeFileHash가
      // 각각 파일 전체를 읽어 30MB 파일을 두 번 읽었다).
      const buffer = await file.arrayBuffer();
      const parsed = await readSpreadsheetFromBuffer(buffer, file.name);
      const fileHash = await computeBufferHash(buffer);

      const { ok, success, failed, error } = parseShipmentRows(parsed.headers, parsed.rows);
      if (!ok) {
        showToast(error || '파일을 파싱할 수 없습니다. 형식을 확인해주세요.', 'error');
        return;
      }
      if (success.length === 0) {
        showToast('저장할 행이 없습니다', 'error');
        return;
      }

      const targetRows = filterTargetRows(success, managedProducts);
      if (targetRows.length === 0) {
        showToast('70개 관리 대상 제품에 해당하는 행이 없습니다', 'error');
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
      logShipmentUpload(file.name, targetRows.length);
      await refreshFiles(true);
    } catch (err) {
      console.error('[jette-shipment] 업로드 실패:', err);
      if (err.message === 'DUPLICATE_HASH')
        showToast('같은 내용의 파일이 이미 업로드됐어요', 'error');
      else showToast(err.message || '업로드 실패', 'error');
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
      showToast('삭제 실패', 'error');
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
