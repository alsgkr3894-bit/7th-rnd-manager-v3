'use client';
import { useState, useCallback, useMemo } from 'react';
import { buildAllActions } from '@/lib/action-center/build';
import { partitionByState } from '@/lib/action-center/state';
import { ActionCenterPanel } from '@/components/action-center/ActionCenterPanel';

/**
 * ActionCenterWidget — 홈 대시보드 업무 액션 위젯
 *
 * useHomeDashboardData에서 로드된 데이터를 받아 ActionItem 목록을 빌드한다.
 */
export function ActionCenterWidget({
  unmatchedCount = 0,
  reportingCount = 0,
  uploadFreshness,
  backupReminder,
  ingredientHealth,
  costAlertData,
  isMain = true,
  canEdit = false,
}) {
  const [rev, setRev] = useState(0);
  const refresh = useCallback(() => setRev(v => v + 1), []);

  const allItems = useMemo(
    () =>
      buildAllActions({
        unmatchedCount,
        reportingCount,
        uploadFreshness: isMain ? uploadFreshness : { ...uploadFreshness, shipment: null },
        backupReminder,
        ingredientHealth,
        costAlertData,
        canEdit,
      }),
    [unmatchedCount, reportingCount, uploadFreshness, backupReminder, ingredientHealth, costAlertData, canEdit, isMain]
  );

  // rev가 변경될 때(dismiss/snooze 후 refresh) localStorage 상태를 재읽음
  const { visible: visibleItems, hidden: hiddenItems } = useMemo(
    () => partitionByState(allItems),
    // eslint-disable-next-line react-hooks/exhaustive-deps
    [allItems, rev]
  );

  // 처리할 항목이 없고, 숨긴 항목도 없으면 위젯 자체를 숨긴다
  if (allItems.length === 0) return null;

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
        {visibleItems.length === 0 && hiddenItems.length === 0 && (
          <span style={{ fontSize: 12, color: 'var(--positive)', fontWeight: 600 }}>
            ✓ 모두 처리됨
          </span>
        )}
      </div>
      <ActionCenterPanel
        key={rev}
        items={visibleItems}
        allItems={allItems}
        onRefresh={refresh}
        compact
      />
    </section>
  );
}
