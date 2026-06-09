'use client';
import { useEffect, useState } from 'react';
import { useRouter } from 'next/navigation';
import { SectionHubPage } from '@/components/ui/SectionHubPage';
import { SectionDashboard } from '@/components/ui/SectionDashboard';
import { RankCard } from '@/components/home/HomeWidgets';
import { initDB } from '@/lib/db';
import { getMenuSalesDashboard } from '@/lib/sales/dashboard';
import { formatNumber } from '@/lib/format';

const GROUPS = [
  {
    label: '데이터 입력',
    items: [
      { href: '/menu-sales/upload',       icon: 'upload', title: '파일 업로드',  sub: '메뉴 판매량 파일을 업로드합니다',        iconBg: 'var(--positive-soft)', iconColor: 'var(--positive)' },
    ],
  },
  {
    label: '분석',
    items: [
      { href: '/menu-sales/rank-compare', icon: 'chart',  title: '순위 및 비교', sub: '메뉴별 판매량 순위와 전월 비교',         iconBg: '#F0EBFF', iconColor: '#6B3FCB' },
      { href: '/menu-sales/compare',      icon: 'chart',  title: '기간 비교',    sub: '기간별 메뉴 판매량을 비교합니다',        iconBg: '#F0EBFF', iconColor: '#6B3FCB' },
      { href: '/menu-sales/rank',         icon: 'chart',  title: '판매 순위표',  sub: '메뉴 판매 순위를 확인합니다',           iconBg: '#F0EBFF', iconColor: '#6B3FCB' },
    ],
  },
  {
    label: '관리',
    items: [
      { href: '/menu-sales/unmatched',    icon: 'alert',  title: '미매칭 관리',  sub: '매칭되지 않은 메뉴를 관리합니다',       iconBg: 'var(--warn-soft)',     iconColor: 'var(--warn)' },
      { href: '/menu-sales/settings',     icon: 'gear',   title: '설정',        sub: '분류 규칙 및 메뉴 설정을 관리합니다',    iconBg: 'var(--surface-2)',     iconColor: 'var(--text-2)' },
    ],
  },
];

export default function Page() {
  const router = useRouter();
  const [data, setData] = useState(null);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    let alive = true;

    (async () => {
      try {
        await initDB();
        const nextData = await getMenuSalesDashboard();
        if (alive) setData(nextData);
      } catch (err) {
        if (alive) console.warn('[menu-sales hub] dashboard load failed:', err);
      } finally {
        if (alive) setLoading(false);
      }
    })();

    return () => {
      alive = false;
    };
  }, []);

  const kpi = data?.kpi;
  const cards = data ? [
    { label: '이번 달 판매량', value: kpi ? formatNumber(kpi.current) : 0, unit: '개' },
    {
      label: '전월 대비',
      value: kpi && kpi.deltaPct != null ? `${kpi.deltaPct > 0 ? '+' : ''}${kpi.deltaPct.toFixed(1)}` : '—',
      unit: kpi && kpi.deltaPct != null ? '%' : '',
      valueColor: kpi && kpi.deltaPct != null ? (kpi.deltaPct >= 0 ? 'var(--positive)' : 'var(--negative)') : undefined,
    },
    { label: '미매칭 메뉴', value: data.unmatchedCount, valueColor: data.unmatchedCount > 0 ? 'var(--warn)' : 'var(--positive)' },
    { label: '업로드 파일', value: data.fileCount },
  ] : [];

  const isEmpty = !loading && (!data || data.fileCount === 0);

  return (
    <SectionHubPage
      breadcrumb={['메뉴 판매량']}
      title="메뉴 판매량"
      sub="판매 데이터를 업로드하고 메뉴별 순위·비교·미매칭 관리를 수행하세요."
      groups={GROUPS}
    >
      <SectionDashboard
        loading={loading}
        cards={cards}
        isEmpty={isEmpty}
        emptyHint="아직 업로드된 판매 데이터가 없어요. ‘파일 업로드’에서 메뉴 판매량 파일을 올려보세요."
      >
        {!isEmpty && (data?.best?.length > 0 || data?.worst?.length > 0) && (
          <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(280px, 1fr))', gap: 12 }}>
            <RankCard title="베스트 메뉴" sub="피자 판매 TOP 5" items={data.best} emptyTitle="판매 데이터 없음" router={router} />
            <RankCard title="워스트 메뉴" sub="피자 판매 하위 5" items={data.worst} emptyTitle="판매 데이터 없음" accent="down" router={router} />
          </div>
        )}
      </SectionDashboard>
    </SectionHubPage>
  );
}
