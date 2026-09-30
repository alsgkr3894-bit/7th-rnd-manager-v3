'use client';
import { useCallback } from 'react';
import { getMenuMasterMap, upsertMenuMaster } from '@/lib/menu-master';
import { savePlatforms } from '@/lib/cost/margin/platforms';
import { saveSnapshot } from '@/lib/cost/margin/snapshots';
import { showToast } from '@/components/Toast';

export function useMarginActions({
  stats,
  snapshotStats,
  edgeFiltered,
  catFilter,
  load,
  setPlatforms,
  activePlatId,
  setActivePlatId,
  setShowSettings,
  canEdit = false,
}) {
  async function handleSaveSnapshot() {
    if (!canEdit) return;
    // 추이는 정가 기준(수수료·할인·검색 미적용)으로 저장해야 시점 간 비교가 된다.
    const source = snapshotStats || stats;
    if (!source) {
      showToast('집계할 메뉴 데이터가 없어요', 'error');
      return;
    }
    const avgCostRate = source.avg;
    const avgMargin = 100 - avgCostRate;
    const menuCount = snapshotStats ? snapshotStats.menuCount : edgeFiltered.length;
    const label = catFilter !== '전체' ? catFilter : '전체 메뉴';
    try {
      await saveSnapshot({ avgCostRate, avgMargin, menuCount, label });
      showToast('추이 스냅샷 저장 완료', 'ok');
    } catch (e) {
      console.error('[CostMargin] save snapshot failed', e);
      showToast('스냅샷 저장 실패: ' + e.message, 'error');
    }
  }

  async function handleSavePlatforms(newPlats) {
    if (!canEdit) return;
    try {
      await savePlatforms(newPlats);
      setPlatforms(newPlats);
      if (!newPlats.find(p => p.id === activePlatId)) setActivePlatId('default');
      setShowSettings(false);
      showToast('플랫폼 설정 저장됨', 'ok');
    } catch (e) {
      showToast('플랫폼 설정 저장 실패: ' + (e?.message || e), 'error');
    }
  }

  const handleToggleHide = useCallback(
    async r => {
      if (!canEdit) return;
      const codes =
        Array.isArray(r.menuCodes) && r.menuCodes.length
          ? r.menuCodes
          : r.menuCode
            ? [r.menuCode]
            : [];
      if (!codes.length) return;
      try {
        const map = await getMenuMasterMap();
        const masterRows = codes.map(code => map.get(code)).filter(Boolean);
        if (masterRows.length === 0) {
          showToast('마스터에 없는 메뉴라 숨길 수 없어요', 'error');
          return;
        }
        await Promise.all(
          masterRows.map(existing => upsertMenuMaster({ ...existing, hidden: !r.hidden }))
        );
        await load();
      } catch (e) {
        showToast('숨김 처리 실패: ' + e.message, 'error');
      }
    },
    [canEdit, load]
  );

  return { handleSaveSnapshot, handleSavePlatforms, handleToggleHide };
}
