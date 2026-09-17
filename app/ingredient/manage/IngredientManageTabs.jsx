'use client';
import { TabButton } from '@/components/cost/shared/TabButton';

/** 식자재관리 상단 탭(관리/단가/이슈/분류·태그/공급업체/보고서). */
export function IngredientManageTabs({ view, onView, activeCount, issueCount }) {
  return (
    <div
      style={{
        display: 'flex',
        gap: 2,
        borderBottom: '1px solid var(--divider)',
        marginBottom: -12,
        overflowX: 'auto',
      }}
    >
      <TabButton active={view === 'manage'} onClick={() => onView('manage')}>
        관리 {activeCount}
      </TabButton>
      <TabButton active={view === 'price'} onClick={() => onView('price')}>
        단가
      </TabButton>
      <TabButton
        active={view === 'issues'}
        onClick={() => onView('issues')}
        badge={issueCount > 0 ? issueCount : null}
      >
        이슈
      </TabButton>
      <TabButton active={view === 'settings'} onClick={() => onView('settings')}>
        분류·태그
      </TabButton>
      <TabButton active={view === 'suppliers'} onClick={() => onView('suppliers')}>
        공급업체
      </TabButton>
      <TabButton active={view === 'report'} onClick={() => onView('report')}>
        보고서
      </TabButton>
    </div>
  );
}
