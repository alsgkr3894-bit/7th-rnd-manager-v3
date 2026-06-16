'use client';
import { useEffect, useMemo, useState } from 'react';
import { ALL_STORES, hasStore } from '@/lib/db';
import { SHARED_STORE_NAMES } from '@/lib/db/module-stores';
import { getActiveBrand } from '@/lib/active-brand';
import { backupSourceMetadataOf, isBackupSourceMismatch } from '@/lib/backup/brand-source';
import { RestoreImpactPanel } from '@/components/settings/restore/RestoreImpactPanel';
import { RestorePreviewSummary } from '@/components/settings/restore/RestorePreviewSummary';
import { RestoreScopePanel } from '@/components/settings/restore/RestoreScopePanel';

/**
 * 복원 미리보기·범위·예상 변경 사항 (섹션 2·3·4).
 *
 * @param {{
 *   parsed: object,
 *   ready: boolean,
 *   impact: object|null,
 *   dangerRows: object[],
 *   wipeRows: object[],
 *   unchangedSelectedStores: string[],
 *   scopes: object,
 *   toggleScope: (key: string) => void,
 *   setAllScopes: (v: boolean) => void,
 *   selectedKeys: string[],
 * }} props
 */
export function RestorePreview({
  parsed,
  ready,
  impact,
  dangerRows,
  wipeRows,
  unchangedSelectedStores,
  scopes,
  toggleScope,
  setAllScopes,
  selectedKeys,
}) {
  const [targetBrand, setTargetBrand] = useState(null);
  useEffect(() => {
    setTargetBrand(getActiveBrand());
  }, []);

  const missingStores =
    parsed && ready
      ? Object.keys(parsed.stores).filter(name => ALL_STORES.includes(name) && !hasStore(name))
      : [];
  const unknownStores = parsed?._summary?.unknownStores || [];
  const backupTotalRows =
    parsed?._summary?.totalRows ??
    (parsed
      ? Object.values(parsed.stores).reduce((sum, rows) => sum + (Array.isArray(rows) ? rows.length : 0), 0)
      : 0);
  const backupAgeDays = parsed?.exportedAt
    ? Math.floor((Date.now() - new Date(parsed.exportedAt).getTime()) / 86400000)
    : null;
  const selectedRestoreStoreCount = impact?.storeCount ?? 0;
  const source = backupSourceMetadataOf(parsed);
  const sourceMismatch = isBackupSourceMismatch(parsed, targetBrand?.id);
  const storeSplit = useMemo(() => {
    const names = Object.keys(parsed?.stores || {}).filter(name => ALL_STORES.includes(name));
    const shared = names.filter(name => SHARED_STORE_NAMES.has(name));
    const brandScoped = names.filter(name => !SHARED_STORE_NAMES.has(name));
    return { shared, brandScoped };
  }, [parsed]);

  return (
    <>
      <RestorePreviewSummary
        parsed={parsed}
        missingStores={missingStores}
        unknownStores={unknownStores}
        backupTotalRows={backupTotalRows}
        backupAgeDays={backupAgeDays}
        source={source}
        sourceMismatch={sourceMismatch}
        targetBrand={targetBrand}
        storeSplit={storeSplit}
      />
      <RestoreScopePanel
        parsed={parsed}
        scopes={scopes}
        toggleScope={toggleScope}
        setAllScopes={setAllScopes}
        selectedKeys={selectedKeys}
        unchangedSelectedStores={unchangedSelectedStores}
        selectedRestoreStoreCount={selectedRestoreStoreCount}
      />
      <RestoreImpactPanel impact={impact} dangerRows={dangerRows} wipeRows={wipeRows} />
    </>
  );
}
