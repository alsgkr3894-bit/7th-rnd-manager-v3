'use client';
import { Suspense, useEffect, useMemo, useState } from 'react';
import { usePathname, useRouter, useSearchParams } from 'next/navigation';
import { Icon } from '@/components/icons';
import { PageHeader } from '@/components/ui/PageHeader';
import { TabButton } from '@/components/cost/shared/TabButton';
import { CommonManageView } from '@/components/cost/manage/CommonManageView';
import { MENU_MASTER_ROUTE } from '@/lib/cost/routes';

const VALID_TABS = new Set(['groups', 'edges']);

function tabFromParams(searchParams) {
  const requested = searchParams?.get('tab');
  return VALID_TABS.has(requested) ? requested : 'groups';
}

export default function Page() {
  return (
    <Suspense
      fallback={
        <main className="main">
          <div style={{ padding: 48, textAlign: 'center', color: 'var(--text-3)' }}>로딩 중…</div>
        </main>
      }
    >
      <CostCommonManageContent />
    </Suspense>
  );
}

function CostCommonManageContent() {
  const router = useRouter();
  const pathname = usePathname();
  const searchParams = useSearchParams();
  const requestedTab = searchParams?.get('tab');
  const legacyRecipeIntent =
    requestedTab === 'recipe' ||
    searchParams?.has('from') ||
    searchParams?.has('name') ||
    searchParams?.has('cat');
  const normalizedParamTab = useMemo(() => tabFromParams(searchParams), [searchParams]);
  const [tab, setTab] = useState(normalizedParamTab);

  useEffect(() => {
    if (legacyRecipeIntent) router.replace(MENU_MASTER_ROUTE);
  }, [legacyRecipeIntent, router]);

  useEffect(() => {
    setTab(normalizedParamTab);
  }, [normalizedParamTab]);

  useEffect(() => {
    if (legacyRecipeIntent) return;
    const params = new URLSearchParams();
    params.set('tab', tab);
    window.history.replaceState(null, '', `${pathname}?${params.toString()}`);
  }, [legacyRecipeIntent, pathname, tab]);

  if (legacyRecipeIntent) {
    return (
      <main className="main">
        <div style={{ padding: 48, textAlign: 'center', color: 'var(--text-3)' }}>
          메뉴 마스터로 이동 중…
        </div>
      </main>
    );
  }

  return (
    <main className="main">
      <PageHeader
        breadcrumb={['원가계산', '공통 원가 관리']}
        title="공통 원가 관리"
        masterSource
        sub="공통묶음 · 엣지 원가"
        actions={
          <button className="btn" onClick={() => router.push(MENU_MASTER_ROUTE)}>
            <Icon.doc style={{ width: 14, height: 14 }} /> 메뉴 마스터
          </button>
        }
      />

      <div
        style={{ display: 'flex', gap: 4, borderBottom: '1px solid var(--border)', marginTop: 8 }}
      >
        <TabButton active={tab === 'groups'} onClick={() => setTab('groups')}>
          묶음 관리
        </TabButton>
        <TabButton active={tab === 'edges'} onClick={() => setTab('edges')}>
          엣지 관리
        </TabButton>
      </div>

      <div style={{ marginTop: 16 }}>
        <CommonManageView key={tab} tab={tab} />
      </div>
    </main>
  );
}
