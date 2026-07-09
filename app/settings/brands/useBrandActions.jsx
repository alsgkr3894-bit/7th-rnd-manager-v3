'use client';
import { useEffect, useRef } from 'react';
import { showToast } from '@/components/Toast';
import { logBackupCreate, logBackupRestore } from '@/lib/change-log';
import {
  getBrands,
  normalizeBrandId,
  setBrandHidden,
  setDefaultBrandId,
  upsertBrand,
} from '@/lib/brand-master';
import { setActiveBrandId } from '@/lib/active-brand';
import { exportAllForBrand, importAllToBrand, MODULE_KEYS } from '@/lib/db';
import { drainServerStoreSyncQueue } from '@/lib/db/server-sync';
import { validateBackupPayload } from '@/lib/backup/validation';
import { backupSourceMetadataOf, isBackupSourceMismatch } from '@/lib/backup/brand-source';
import { addEntry } from '@/lib/backup-history';
import { downloadJson, makeFileName, readFileAsText } from '@/lib/download';
import { formatNumber } from '@/lib/format';
import { UPLOAD_EXT, UPLOAD_MAX_MB, checkFileExt, checkFileSize } from '@/lib/upload-policy';
import { countRows } from './brandUtils';

const SHARED_SKIP_STORE = '__shared_skipped__';

/**
 * 브랜드마스터 액션 훅.
 * 저장·숨김·기본 브랜드·전환·백업·복원 핸들러를 반환한다.
 */
export function useBrandActions({
  isAdmin,
  form,
  activeId,
  busyBrandId,
  setBusyBrandId,
  restoreTarget,
  setRestoreTarget,
  restoreInputRef,
  reloadBrands,
  resetForm,
  showConfirm,
}) {
  const restoreFrameRef = useRef(null);
  const reloadTimerRef = useRef(null);

  // 전환/숨김 직후 window.reload()로 메모리 큐가 사라지기 전에 서버 동기화를 최대한 비운다.
  // 실패(API 미가용 등)해도 전환 자체를 막지 않도록 best-effort로 처리한다.
  async function flushSyncBestEffort() {
    try {
      await drainServerStoreSyncQueue();
    } catch (err) {
      console.warn('[brand] reload 전 서버 동기화 flush 실패(무시):', err?.message || String(err));
    }
  }

  useEffect(
    () => () => {
      if (restoreFrameRef.current) cancelAnimationFrame(restoreFrameRef.current);
      clearTimeout(reloadTimerRef.current);
    },
    []
  );

  function handleSave(e) {
    e.preventDefault();
    if (!isAdmin) return;
    try {
      const next = {
        ...form,
        id: normalizeBrandId(form.id),
        name: form.name.trim(),
        sub: form.sub.trim() || '브랜드',
      };
      if (!next.id || !next.name) {
        showToast('브랜드 ID와 브랜드명을 입력하세요.', 'warn');
        return;
      }
      upsertBrand(next);
      reloadBrands();
      resetForm();
      showToast('브랜드 정보를 저장했습니다.', 'ok');
    } catch (err) {
      showToast(err.message || '브랜드 저장에 실패했습니다.', 'error');
    }
  }

  async function handleHide(brand, hidden) {
    if (!isAdmin) return;
    try {
      setBrandHidden(brand.id, hidden);
      if (hidden && brand.id === activeId) {
        const next = getBrands().find(item => item.isDefault && !item.hidden);
        if (next && setActiveBrandId(next.id)) {
          showToast('활성 브랜드가 숨김 처리되어 기본 브랜드로 전환합니다.', 'warn');
          await flushSyncBestEffort();
          window.location.reload();
          return;
        }
      }
      reloadBrands();
      showToast(hidden ? '브랜드를 숨김 처리했습니다.' : '브랜드 숨김을 해제했습니다.', 'ok');
    } catch (err) {
      showToast(err.message || '브랜드 상태 변경에 실패했습니다.', 'error');
    }
  }

  function handleDefault(brand) {
    if (!isAdmin) return;
    try {
      setDefaultBrandId(brand.id);
      reloadBrands();
      showToast('기본 브랜드를 변경했습니다.', 'ok');
    } catch (err) {
      showToast(err.message || '기본 브랜드 변경에 실패했습니다.', 'error');
    }
  }

  async function handleSwitch(brand) {
    if (brand.hidden) {
      showToast('숨김 브랜드는 상단 전환 대상이 아닙니다.', 'warn');
      return;
    }
    if (brand.id === activeId) return;
    if (setActiveBrandId(brand.id)) {
      await flushSyncBestEffort();
      window.location.reload();
    }
  }

  async function handleBackup(brand) {
    if (!isAdmin || busyBrandId) return;
    setBusyBrandId(brand.id);
    try {
      const data = await exportAllForBrand(
        brand.id,
        {
          brandId: brand.id,
          brandName: brand.name,
          backupScope: 'brand',
        },
        { includeLocalStorage: false }
      );
      const fileName = makeFileName(`${brand.name}_브랜드백업`, 'json');
      downloadJson(data, fileName);
      addEntry({
        scopes: MODULE_KEYS,
        totalRows: countRows(data.stores),
        fileName,
      });
      logBackupCreate(fileName);
      showToast(`${brand.name} 백업 파일을 다운로드했습니다.`, 'ok');
    } catch (err) {
      console.error('[BrandMaster] 브랜드 백업 실패:', err);
      showToast('브랜드 백업에 실패했습니다.', 'error');
    } finally {
      setBusyBrandId(null);
    }
  }

  function openRestore(brand) {
    if (!isAdmin || busyBrandId) return;
    setRestoreTarget(brand);
    if (restoreFrameRef.current) cancelAnimationFrame(restoreFrameRef.current);
    restoreFrameRef.current = requestAnimationFrame(() => {
      restoreFrameRef.current = null;
      restoreInputRef.current?.click();
    });
  }

  async function handleRestoreFile(e) {
    const file = e.target.files?.[0];
    const target = restoreTarget;
    e.target.value = '';
    setRestoreTarget(null);
    if (!isAdmin || !file || !target || busyBrandId) return;

    setBusyBrandId(target.id);
    try {
      const extErr = checkFileExt(file, UPLOAD_EXT.json);
      if (extErr) {
        showToast(extErr, 'error');
        return;
      }
      const sizeErr = checkFileSize(file, UPLOAD_MAX_MB.backup);
      if (sizeErr) {
        showToast(sizeErr, 'error');
        return;
      }
      const text = await readFileAsText(file, UPLOAD_EXT.json);
      let raw;
      try {
        raw = JSON.parse(text);
      } catch {
        showToast(
          '잘못된 JSON 형식입니다 — 백업 파일이 손상되었거나 완전히 다운로드되지 않았습니다.',
          'error'
        );
        return;
      }
      const { backup, summary } = validateBackupPayload(raw);
      const source = backupSourceMetadataOf(backup);
      const sourceMismatch = isBackupSourceMismatch(backup, target.id);
      const failedStores = summary.failedStores;
      const localStorageSummary = summary.localStorageSummary;
      const restoreOk = await showConfirm({
        title: `${target.name} 브랜드 복원`,
        message: (
          <div>
            <div>
              <b>파일:</b> {file.name}
            </div>
            <div>
              <b>백업 브랜드:</b>{' '}
              {source.hasSourceBrand
                ? `${source.sourceBrandName || source.sourceBrandId} (${source.sourceBrandId})`
                : '출처 정보 없음'}
            </div>
            <div>
              <b>복원 대상:</b> {target.name} ({target.id})
            </div>
            <div>
              <b>복원 행수:</b> {formatNumber(summary.totalRows)}건 · store{' '}
              {formatNumber(summary.knownStores.length)}개
            </div>
            {sourceMismatch && (
              <div style={{ color: 'var(--warn)', fontWeight: 700 }}>
                백업 브랜드와 복원 대상 브랜드가 다릅니다. 덮어쓰기 전 파일을 다시 확인하세요.
              </div>
            )}
            {failedStores.length > 0 && (
              <div style={{ color: 'var(--warn)', fontWeight: 700 }}>
                백업 생성 당시 읽기 실패 store {failedStores.length}개가 있어 해당 store는 복원되지
                않습니다. 별도 위험 승인 전까지 복원을 진행하지 않습니다.
              </div>
            )}
            {localStorageSummary?.invalidShape && (
              <div style={{ color: 'var(--warn)', fontWeight: 700 }}>
                백업 설정값(localStorage) 섹션 형식이 맞지 않습니다.
              </div>
            )}
            {localStorageSummary?.hasLocalStorage && (
              <div style={{ color: 'var(--text-2)' }}>
                설정값(localStorage) {formatNumber(localStorageSummary.restorableKeyCount)}개가
                감지됐지만, 브랜드 복원에서는 브라우저 설정값을 적용하지 않습니다.
              </div>
            )}
            <div style={{ marginTop: 8 }}>
              복원 전 자동 백업 파일을 만든 뒤, 선택 브랜드 데이터를 이 파일 내용으로 덮어씁니다.
            </div>
          </div>
        ),
        confirmLabel: '덮어쓰기 복원',
        danger: true,
      });
      if (!restoreOk) return;

      if (failedStores.length > 0) {
        const riskOk = await showConfirm({
          title: '불완전 백업 위험 승인',
          message: (
            <div>
              <div style={{ color: 'var(--warn)', fontWeight: 700, marginBottom: 8 }}>
                이 백업은 생성 당시 store {failedStores.length}개 읽기에 실패했습니다.
              </div>
              <div>
                누락 store:{' '}
                {failedStores
                  .map(item => item.store)
                  .slice(0, 5)
                  .join(', ')}
                {failedStores.length > 5 ? ` 외 ${failedStores.length - 5}개` : ''}
              </div>
              <div style={{ marginTop: 8 }}>
                누락된 store는 현재 브랜드 데이터가 유지됩니다. 완전한 시점 복원이 아니라는 점을
                확인한 경우에만 진행하세요.
              </div>
            </div>
          ),
          confirmLabel: '누락 감수하고 복원',
          danger: true,
        });
        if (!riskOk) return;
      }

      const before = await exportAllForBrand(
        target.id,
        {
          brandId: target.id,
          brandName: target.name,
          backupScope: 'brand-before-restore',
        },
        { includeLocalStorage: false }
      );
      const beforeFileName = makeFileName(`${target.name}_복원전자동백업`, 'json');
      downloadJson(before, beforeFileName);

      const result = await importAllToBrand(backup, target.id);
      const restoreErrors = Array.isArray(result.errors) ? result.errors : [];
      const realErrors = restoreErrors.filter(e => e?.store !== SHARED_SKIP_STORE);
      const sharedSkip = restoreErrors.find(e => e?.store === SHARED_SKIP_STORE);
      if (realErrors.length > 0) {
        showToast(
          `${target.name} 복원 일부 완료 — 성공 ${result.imported}개 / 오류 ${realErrors.length}개`,
          'warn',
          7000
        );
        console.warn('[BrandMaster] 브랜드 복원 일부 실패:', restoreErrors);
      } else if (sharedSkip) {
        showToast(
          `${target.name} 복원 완료 — ${result.imported}개 store, 공유 store는 7번가 보호로 건너뜀`,
          'ok',
          7000
        );
      } else {
        showToast(
          `${target.name} 복원 완료 — ${result.imported}개 store, ${formatNumber(summary.totalRows)}건`,
          'ok'
        );
      }
      logBackupRestore(`${target.name} 브랜드 복원`);
      if (target.id === activeId) {
        clearTimeout(reloadTimerRef.current);
        reloadTimerRef.current = setTimeout(() => {
          reloadTimerRef.current = null;
          window.location.reload();
        }, 800);
      }
    } catch (err) {
      console.error('[BrandMaster] 브랜드 복원 실패:', err);
      showToast(err.message || '브랜드 복원에 실패했습니다.', 'error');
    } finally {
      setBusyBrandId(null);
    }
  }

  return {
    handleSave,
    handleHide,
    handleDefault,
    handleSwitch,
    handleBackup,
    openRestore,
    handleRestoreFile,
  };
}
