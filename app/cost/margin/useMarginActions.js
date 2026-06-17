'use client';
import { useCallback } from 'react';
import { getMenuMasterMap, upsertMenuMaster } from '@/lib/menu-master';
import { savePlatforms } from '@/lib/cost/margin/platforms';
import { saveSnapshot } from '@/lib/cost/margin/snapshots';
import { showToast } from '@/components/Toast';

export function useMarginActions({
  stats,
  edgeFiltered,
  catFilter,
  load,
  setPlatforms,
  activePlatId,
  setActivePlatId,
  setShowSettings,
}) {
  async function handleSaveSnapshot() {
    if (!stats) {
      showToast('집계할 메뉴 데이터가 없어요', 'error');
      return;
    }
    const avgCostRate = stats.avg;
    const avgMargin = 100 - avgCostRate;
    const menuCount = edgeFiltered.length;
    const label = catFilter !== '전체' ? catFilter : '전체 메뉴';
    try {
      await saveSnapshot({ avgCostRate, avgMargin, menuCount, label });
      showToast('추이 스냅샷 저장 완료', 'ok');
    } catch (e) {
      console.error('[CostMargin] save snapshot failed', e);
      showToast('스냅샷 저장 실패: ' + e.message, 'error');
    }
  }

  function handleSavePlatforms(newPlats) {
    savePlatforms(newPlats);
    setPlatforms(newPlats);
    if (!newPlats.find(p => p.id === activePlatId)) setActivePlatId('default');
    setShowSettings(false);
    showToast('플랫폼 설정 저장됨', 'ok');
  }

  const handleToggleHide = useCallback(
    async r => {
      if (!r.menuCode) return;
      try {
        const map = await getMenuMasterMap();
        const existing = map.get(r.menuCode);
        if (!existing) {
          showToast('마스터에 없는 메뉴라 숨길 수 없어요', 'error');
          return;
        }
        await upsertMenuMaster({ ...existing, hidden: !r.hidden });
        await load();
      } catch (e) {
        showToast('숨김 처리 실패: ' + e.message, 'error');
      }
    },
    [load]
  );

  return { handleSaveSnapshot, handleSavePlatforms, handleToggleHide };
}
