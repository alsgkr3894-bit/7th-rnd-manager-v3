'use client';
import { useRouter } from 'next/navigation';
import { SectionHubPage } from '@/components/ui/SectionHubPage';
import { SectionDashboard } from '@/components/ui/SectionDashboard';
import { RankCard } from '@/components/home/HomeWidgets';
import { useDBLoad } from '@/hooks/useDBLoad';
import { getMenuSalesDashboard } from '@/lib/sales/dashboard';
import { formatNumber } from '@/lib/format';
import { MENU_SALES_HUB_GROUPS } from '@/lib/sales/navigation';

export default function Page() {
  const router = useRouter();
  const { data, loading } = useDBLoad(() => getMenuSalesDashboard(), {
    onError: err => console.warn('[menu-sales hub] dashboard load failed:', err),
  });

  const kpi = data?.kpi;
  const cards = data
    ? [
        { label: '이번 달 판매량', value: kpi ? formatNumber(kpi.current) : 0, unit: '개' },
        {
          label: '전월 대비',
          value:
            kpi && kpi.deltaPct != null
              ? `${kpi.deltaPct > 0 ? '+' : ''}${kpi.deltaPct.toFixed(1)}`
              : '—',
          unit: kpi && kpi.deltaPct != null ? '%' : '',
          valueColor:
            kpi && kpi.deltaPct != null
              ? kpi.deltaPct >= 0
                ? 'var(--positive)'
                : 'var(--negative)'
              : undefined,
        },
        {
          label: '미매칭 메뉴',
          value: data.unmatchedCount,
          valueColor: data.unmatchedCount > 0 ? 'var(--warn)' : 'var(--positive)',
        },
        { label: '업로드 파일', value: data.fileCount },
      ]
    : [];

  const isEmpty = !loading && (!data || data.fileCount === 0);

  return (
    <SectionHubPage
      breadcrumb={['메뉴 판매량']}
      title="메뉴 판매량"
      sub="판매 데이터를 업로드하고 메뉴별 순위·비교·미매칭 관리를 수행하세요."
      groups={MENU_SALES_HUB_GROUPS}
    >
      <SectionDashboard
        loading={loading}
        cards={cards}
        isEmpty={isEmpty}
        emptyHint="아직 업로드된 판매 데이터가 없어요. '파일 업로드'에서 메뉴 판매량 파일을 올려보세요."
      >
        {!isEmpty && (data?.best?.length > 0 || data?.worst?.length > 0) && (
          <div
            style={{
              display: 'grid',
              gridTemplateColumns: 'repeat(auto-fit, minmax(280px, 1fr))',
              gap: 12,
            }}
          >
            <RankCard
              title="베스트 메뉴"
              sub="피자 판매 TOP 5"
              items={data.best}
              emptyTitle="판매 데이터 없음"
              router={router}
            />
            <RankCard
              title="워스트 메뉴"
              sub="피자 판매 하위 5"
              items={data.worst}
              emptyTitle="판매 데이터 없음"
              accent="down"
              router={router}
            />
          </div>
        )}
      </SectionDashboard>
    </SectionHubPage>
  );
}
