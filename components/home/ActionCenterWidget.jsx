'use client';
import { useState, useCallback, useMemo } from 'react';
import { buildAllActions } from '@/lib/action-center/build';
import { partitionByState } from '@/lib/action-center/state';
import { ActionCenterPanel } from '@/components/action-center/ActionCenterPanel';
import { TodayChecklistSection } from '@/components/home/TodayChecklistSection';

/**
 * ActionCenterWidget — 홈 대시보드 업무 액션 위젯
 *
 * useHomeDashboardData에서 로드된 데이터를 받아 ActionItem 목록을 빌드한다.
 */
export function ActionCenterWidget({
  unmatchedCount = 0,
  uploadFreshness,
  backupReminder,
  ingredientHealth,
  priceRisePending = null,
  isMain = true,
  canEdit = false,
}) {
  const [rev, setRev] = useState(0);
  const refresh = useCallback(() => setRev(v => v + 1), []);

  const allItems = useMemo(
    () =>
      buildAllActions({
        unmatchedCount,
        uploadFreshness: isMain ? uploadFreshness : { ...uploadFreshness, shipment: null },
        backupReminder,
        ingredientHealth,
        priceRisePending,
        canEdit,
      }),
    [
      unmatchedCount,
      uploadFreshness,
      backupReminder,
      ingredientHealth,
      priceRisePending,
      canEdit,
      isMain,
    ]
  );

  // rev가 변경될 때(dismiss/snooze 후 refresh) localStorage 상태를 재읽음
  const { visible: visibleItems, hidden: hiddenItems } = useMemo(
    () => partitionByState(allItems),
    // eslint-disable-next-line react-hooks/exhaustive-deps
    [allItems, rev]
  );

  // 경고 항목이 없어도 카드는 보인다 — 오늘 하루 체크리스트가 같은 카드에 붙어 있다

  const criticalCount = visibleItems.filter(i => i.severity === 'critical').length;
  const warnCount = visibleItems.filter(i => i.severity === 'warn').length;

  return (
    <section className="card" style={{ padding: '14px 16px', marginBottom: 0 }}>
      <div style={{ display: 'flex', alignItems: 'center', gap: 8, marginBottom: 10 }}>
        <span style={{ fontSize: 16 }}>📋</span>
        <span style={{ fontWeight: 700, fontSize: 14, color: 'var(--text)' }}>오늘 할 일</span>
        {visibleItems.length > 0 && (
          <span
            style={{
              background:
                criticalCount > 0
                  ? 'var(--negative)'
                  : warnCount > 0
                    ? 'var(--warn)'
                    : 'var(--accent)',
              color: '#fff',
              borderRadius: 99,
              fontSize: 11,
              fontWeight: 700,
              padding: '1px 7px',
            }}
          >
            {visibleItems.length}
          </span>
        )}
        {allItems.length > 0 && visibleItems.length === 0 && hiddenItems.length === 0 && (
          <span style={{ fontSize: 12, color: 'var(--positive)', fontWeight: 600 }}>
            ✓ 모두 처리됨
          </span>
        )}
      </div>
      {allItems.length > 0 && (
        <ActionCenterPanel
          key={rev}
          items={visibleItems}
          allItems={allItems}
          onRefresh={refresh}
          compact
        />
      )}
      <TodayChecklistSection canEdit={canEdit} />
    </section>
  );
}
