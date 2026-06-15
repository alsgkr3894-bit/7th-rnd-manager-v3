import { useMemo } from 'react';
import { buildRestoreImpact, selectedStoresMissingFromBackup } from '@/lib/backup/restore-impact';

/**
 * 백업 파일과 현재 DB의 영향도를 계산하는 순수 derived-state hook.
 * IO 없음, 사이드이펙트 없음.
 *
 * @param {object|null} parsed        - validateBackupPayload 결과
 * @param {object|null} currentStats  - collectStoreStats() 결과
 * @param {string[]}    selectedStores - storesForScopes(selectedKeys)
 * @returns {{ impact, unchangedSelectedStores, dangerRows, wipeRows }}
 */
export function useRestoreImpact(parsed, currentStats, selectedStores) {
  const impact = useMemo(() => {
    if (!parsed || !currentStats) return null;
    return buildRestoreImpact(parsed.stores, currentStats, selectedStores);
  }, [parsed, currentStats, selectedStores]);

  const unchangedSelectedStores = useMemo(() => {
    if (!parsed || !currentStats) return [];
    return selectedStoresMissingFromBackup(parsed.stores, currentStats, selectedStores);
  }, [parsed, currentStats, selectedStores]);

  const dangerRows = useMemo(
    () => (impact?.rows || []).filter(r => r.now > 0 && r.after < r.now),
    [impact]
  );

  const wipeRows = useMemo(() => dangerRows.filter(r => r.after === 0), [dangerRows]);

  return { impact, unchangedSelectedStores, dangerRows, wipeRows };
}
