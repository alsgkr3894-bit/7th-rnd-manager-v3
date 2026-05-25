'use client';
import { useEffect, useState } from 'react';
import { initDB } from '@/lib/db';
import { readExcelFile, readCsvFile } from '@/lib/excel';
import { showToast } from '@/components/Toast';
import {
  parsePriceRows,
  savePriceUpload,
  getPriceFiles,
  getPriceRowsByFileId,
  deletePriceFile,
  comparePriceLists,
} from './index.js';

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

  // 초기 로드
  useEffect(() => {
    (async () => {
      try {
        await initDB();
        await refreshFiles(true);
        setReady(true);
      } catch (err) {
        console.error('[jette-price] 초기 로드 실패:', err);
        showToast('DB 초기화 실패', 'err');
      }
    })();
  }, []);

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
    setBusy(true);
    try {
      // 1. 파싱
      const ext = file.name.toLowerCase().slice(file.name.lastIndexOf('.'));
      const parsed = ext === '.csv'
        ? readCsvFile(await file.text())
        : await readExcelFile(await file.arrayBuffer());

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

  return {
    ready, busy, files,
    baseFileId, setBaseFileId,
    latestFileId, setLatestFileId,
    diffRows,
    handleFile, handleDelete,
  };
}
