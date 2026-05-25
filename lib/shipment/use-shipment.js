'use client';
import { useEffect, useState } from 'react';
import { initDB } from '@/lib/db';
import { readExcelFile, readCsvFile } from '@/lib/excel';
import { showToast } from '@/components/Toast';
import {
  parseShipmentRows, filterTargetRows,
  aggregateShipmentRows,
  getShipmentFiles, getShipmentRowsByFileId, getManagedProducts,
  saveShipmentUpload, deleteShipmentFile,
  seedManagedProductsIfEmpty,
} from './index.js';
import { getPriceFiles, getPriceRowsByFileId } from '@/lib/price';

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

  useEffect(() => {
    (async () => {
      try {
        await initDB();
        await seedManagedProductsIfEmpty();
        await refreshFiles(true);
        setManagedProducts(await getManagedProducts());
        setReady(true);
      } catch (err) {
        console.error('[jette-shipment] 초기 로드 실패:', err);
        showToast('DB 초기화 실패', 'err');
      }
    })();
  }, []);

  async function refreshFiles(autoSelect = false) {
    const all = await getShipmentFiles();
    setFiles(all);
    if (autoSelect) {
      if (all.length > 0) setSelectedYM({ year: all[0].year, month: all[0].month });
      else setSelectedYM(null);
    }
  }

  // 선택 (year, month) → 같은 월의 모든 파일 rows 합쳐서 집계
  // 부가세포함가는 제때 가격 비교의 최신 단가에서 productCode lookup
  useEffect(() => {
    (async () => {
      if (!selectedYM) { setAggRows([]); return; }
      const sameMonth = files.filter(f => f.year === selectedYM.year && f.month === selectedYM.month);
      const all = [];
      for (const f of sameMonth) {
        const rs = await getShipmentRowsByFileId(f.id);
        all.push(...rs);
      }
      // 최신 가격 파일의 priceWithTax lookup 구축
      const priceLookup = await buildLatestPriceLookup();
      setAggRows(aggregateShipmentRows(all, managedProducts, priceLookup));
    })();
  }, [selectedYM, files, managedProducts]);

  /** 제때 가격 비교의 최신 파일에서 productCode → priceWithTax Map 빌드 */
  async function buildLatestPriceLookup() {
    try {
      const priceFiles = await getPriceFiles();
      if (priceFiles.length === 0) return new Map();
      const latest = priceFiles[0];
      const rows = await getPriceRowsByFileId(latest.id);
      const map = new Map();
      for (const r of rows) {
        if (r.productCode && r.priceWithTax != null) {
          map.set(r.productCode, r.priceWithTax);
        }
      }
      return map;
    } catch {
      return new Map();
    }
  }

  /**
   * @param {File} file
   * @param {{ year: number, month: number }} period
   */
  async function handleFile(file, period) {
    if (!file) return;
    if (!period?.year || !period?.month) {
      showToast('년도/월을 선택하세요', 'err');
      return;
    }
    setBusy(true);
    try {
      const ext = file.name.toLowerCase().slice(file.name.lastIndexOf('.'));
      const parsed = ext === '.csv'
        ? readCsvFile(await file.text())
        : await readExcelFile(await file.arrayBuffer());

      const { ok, success, failed, error } = parseShipmentRows(parsed.headers, parsed.rows);
      if (!ok) { showToast(error || '파싱 실패', 'err'); return; }
      if (success.length === 0) { showToast('저장할 행이 없습니다', 'err'); return; }

      // 70개 대상 제품만 저장 (정책)
      const targetRows = filterTargetRows(success, managedProducts);
      if (targetRows.length === 0) {
        showToast('70개 관리 대상 제품에 해당하는 행이 없습니다', 'err');
        return;
      }

      const now = new Date();
      const meta = {
        year: period.year, month: period.month,
        fileName: file.name, uploadedAt: now.toISOString(),
        totalRows: targetRows.length,
        sourceTotalRows: success.length,
      };
      const log = {
        module: 'shipment',
        fileName: file.name,
        at: now.toISOString(),
        year: period.year, month: period.month,
        totalRows: targetRows.length,
        sourceTotalRows: success.length,
        failedCount: failed.length,
        summary: `대상 ${targetRows.length}건 (원본 ${success.length}건 · 실패 ${failed.length}건)`,
      };
      await saveShipmentUpload({ meta, rows: targetRows, log });

      showToast(
        `${period.year}년 ${period.month}월 — 대상 ${targetRows.length}건 저장 (원본 ${success.length}건)`,
        'ok',
      );
      await refreshFiles(true);
    } catch (err) {
      console.error('[jette-shipment] 업로드 실패:', err);
      if (err.message === 'DUPLICATE_HASH') showToast('같은 내용의 파일이 이미 업로드됐어요', 'err');
      else showToast(err.message || '업로드 실패', 'err');
    } finally {
      setBusy(false);
    }
  }

  async function handleDelete(fileId) {
    try {
      await deleteShipmentFile(fileId);
      showToast('삭제됐어요', 'ok');
      // 삭제 후 같은 월에 다른 파일이 남아있으면 그 월 유지, 없으면 초기화
      await refreshFiles(false);
      const remaining = await getShipmentFiles();
      if (selectedYM) {
        const stillThere = remaining.some(f => f.year === selectedYM.year && f.month === selectedYM.month);
        if (!stillThere) setSelectedYM(remaining[0] ? { year: remaining[0].year, month: remaining[0].month } : null);
      }
    } catch (err) {
      console.error('[jette-shipment] 삭제 실패:', err);
      showToast('삭제 실패', 'err');
    }
  }

  return {
    ready, busy, files,
    selectedYM, setSelectedYM,
    managedProducts, aggRows,
    handleFile, handleDelete,
  };
}
