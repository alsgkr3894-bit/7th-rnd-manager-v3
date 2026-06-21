'use client';
import { useEffect, useMemo, useRef, useState } from 'react';
import { initDB } from '@/lib/db';
import { readSpreadsheetFile } from '@/lib/excel';
import { showToast } from '@/components/Toast';
import { UPLOAD_MAX_MB, checkFileSize } from '@/lib/upload-policy';
import {
  parsePriceRows,
  savePriceUpload,
  getPriceFiles,
  getPriceRowsByFileId,
  deletePriceFile,
  comparePriceLists,
  dedupePriceRowsByProductCode,
} from './index.js';
import {
  getManagedProducts,
  addManagedProduct,
  updateManagedProduct,
  onManagedProductsChange,
} from '@/lib/shipment';
import { useLocalStorage } from '@/hooks/useLocalStorage';
import {
  DEFAULT_JETTE_SETTINGS,
  JETTE_SETTINGS_KEY,
  normalizeJetteSettings,
} from '@/lib/jette/settings';
import { buildAutoRegisterCandidates } from '@/lib/jette/auto-register';

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
  const [jetteSettings] = useLocalStorage(
    JETTE_SETTINGS_KEY,
    DEFAULT_JETTE_SETTINGS,
    normalizeJetteSettings
  );
  const mountedRef = useRef(true);

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
    mountedRef.current = true;

    (async () => {
      try {
        await initDB();
        await refreshFiles(true);
        const products = await getManagedProducts();
        if (!mountedRef.current) return;
        setManagedProducts(products);
        setReady(true);
      } catch (err) {
        if (!mountedRef.current) return;
        console.error('[jette-price] 초기 로드 실패:', err);
        showToast('DB 초기화 실패', 'error');
      }
    })();

    return () => {
      mountedRef.current = false;
    };
  }, []);

  // 다른 화면에서 분류(전용/범용/관리품목)를 바꾸면 동기화
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

  async function refreshFiles(setDefault = false) {
    const all = await getPriceFiles();
    if (!mountedRef.current) return all;
    setFiles(all);
    if (setDefault && all.length >= 2) {
      setLatestFileId(all[0].id);
      setBaseFileId(all[1].id);
    } else if (setDefault && all.length === 1) {
      setLatestFileId(all[0].id);
      setBaseFileId(null);
    }
  }

  async function autoRegisterNewProducts(rows) {
    if (normalizeJetteSettings(jetteSettings).autoRegisterNew !== 'auto') {
      return { added: 0, failed: 0 };
    }

    let existingProducts = [];
    try {
      existingProducts = await getManagedProducts();
    } catch (err) {
      console.error('[jette-price] 신규 제품 자동등록 기준 조회 실패:', err);
      return { added: 0, failed: 1 };
    }

    const candidates = buildAutoRegisterCandidates(rows, existingProducts);
    let added = 0;
    let failed = 0;
    const failedCodes = [];

    for (const candidate of candidates) {
      try {
        await addManagedProduct(candidate);
        added++;
      } catch (err) {
        if (err?.message === 'CODE_DUPLICATE') continue;
        failed++;
        failedCodes.push(candidate?.productCode || candidate?.productName || '(코드미상)');
        console.error('[jette-price] 신규 제품 자동등록 실패:', candidate?.productCode, err);
      }
    }
    // 어떤 제품이 미등록됐는지 추적 가능하도록 호출부로 전달.
    if (failedCodes.length > 0) {
      console.warn('[jette-price] 자동등록 누락 제품코드:', failedCodes.join(', '));
    }

    if (added > 0 && mountedRef.current) {
      try {
        setManagedProducts(await getManagedProducts());
      } catch (err) {
        failed++;
        console.error('[jette-price] 신규 제품 자동등록 후 목록 갱신 실패:', err);
      }
    }

    return { added, failed, failedCodes };
  }

  // 비교 재계산
  useEffect(() => {
    let alive = true;

    (async () => {
      if (!latestFileId) {
        setDiffRows([]);
        return;
      }
      try {
        const latestRows = await getPriceRowsByFileId(latestFileId);
        const baseRows = baseFileId ? await getPriceRowsByFileId(baseFileId) : [];
        if (alive && mountedRef.current) setDiffRows(comparePriceLists(baseRows, latestRows));
      } catch (err) {
        // DB 읽기 실패가 unhandled rejection으로 새어 비교 테이블이 멈추지 않도록 방어.
        console.error('[jette-price] 비교 계산 실패:', err);
        if (alive && mountedRef.current) setDiffRows([]);
      }
    })();

    return () => {
      alive = false;
    };
  }, [baseFileId, latestFileId]);

  /**
   * @param {File} file
   * @param {string} [customDate] — YYYY-MM-DD, 없으면 오늘
   */
  async function handleFile(file, customDate) {
    if (!file) return;
    const sizeErr = checkFileSize(file, UPLOAD_MAX_MB.jette);
    if (sizeErr) {
      showToast(sizeErr, 'error');
      return;
    }
    setBusy(true);
    try {
      const parsed = await readSpreadsheetFile(file);

      const { ok, success, failed, error } = parsePriceRows(parsed.headers, parsed.rows);
      if (!ok) {
        showToast(error || '파일을 파싱할 수 없습니다. 형식을 확인해주세요.', 'error');
        return;
      }
      if (success.length === 0) {
        showToast('저장할 행이 없습니다', 'error');
        return;
      }
      const { rows: rowsToSave, diagnostics } = dedupePriceRowsByProductCode(success);
      const duplicateText = diagnostics.hasDuplicates
        ? ` · 중복 ${diagnostics.duplicateRows}건 정리`
        : '';

      // 2. 저장 — updateDate는 사용자 지정 또는 오늘
      const now = new Date();
      const updateDate =
        customDate ||
        `${now.getFullYear()}-${String(now.getMonth() + 1).padStart(2, '0')}-${String(now.getDate()).padStart(2, '0')}`;
      await savePriceUpload({
        meta: {
          updateDate,
          fileName: file.name,
          uploadedAt: now.toISOString(),
          totalRows: rowsToSave.length,
        },
        rows: rowsToSave,
        log: {
          module: 'price',
          fileName: file.name,
          at: now.toISOString(),
          totalRows: rowsToSave.length,
          failedCount: failed.length,
          duplicateCount: diagnostics.duplicateRows,
          summary: `${rowsToSave.length}건 성공 · ${failed.length}건 실패${duplicateText}`,
        },
      });
      const autoRegisterResult = await autoRegisterNewProducts(rowsToSave);
      const failedCodesText = autoRegisterResult.failedCodes?.length
        ? ` (${autoRegisterResult.failedCodes.slice(0, 3).join(', ')}${
            autoRegisterResult.failedCodes.length > 3
              ? ` 외 ${autoRegisterResult.failedCodes.length - 3}개`
              : ''
          })`
        : '';
      const autoRegisterText = autoRegisterResult.added
        ? ` · 신규 ${autoRegisterResult.added}개 자동등록${autoRegisterResult.failed ? ` · ${autoRegisterResult.failed}개 등록실패${failedCodesText}` : ''}`
        : autoRegisterResult.failed
          ? ` · 신규 ${autoRegisterResult.failed}개 자동등록 실패${failedCodesText}`
          : '';
      showToast(
        `${rowsToSave.length}건 반영${failed.length ? ` · ${failed.length}건 실패` : ''}${duplicateText}${autoRegisterText}`,
        autoRegisterResult.failed ? 'warn' : 'ok'
      );
      import('@/lib/work-log')
        .then(m =>
          m.logWork(
            'UPLOAD',
            `제때 단가 업로드: ${file.name} (${rowsToSave.length}건${duplicateText})`
          )
        )
        .catch(() => {});
      await refreshFiles(true);
    } catch (err) {
      console.error('[jette-price] 업로드 실패:', err);
      if (err.message === 'DUPLICATE_DATE')
        showToast('같은 날짜로 업로드된 파일이 있어요', 'error');
      else if (err.message === 'DUPLICATE_HASH')
        showToast('같은 내용의 파일이 이미 업로드됐어요', 'error');
      else showToast(err.message || '업로드 실패', 'error');
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
      showToast('삭제 실패', 'error');
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
      // add/update가 커밋 후 emitManagedProductsChange를 발화하므로 위 구독 effect(88-98)가
      // 목록을 갱신한다 — 여기서 다시 getManagedProducts를 읽으면 같은 변경에 중복 조회/setState.
    } catch (err) {
      showToast(err.message || '분류 변경 실패', 'error');
    }
  }

  return {
    ready,
    busy,
    files,
    baseFileId,
    setBaseFileId,
    latestFileId,
    setLatestFileId,
    diffRows,
    productTypeLookup,
    jetteSettings,
    handleFile,
    handleDelete,
    handleTypeChange,
  };
}
