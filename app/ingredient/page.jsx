'use client';
import { useEffect, useState } from 'react';
import { SectionHubPage } from '@/components/ui/SectionHubPage';
import { SectionDashboard } from '@/components/ui/SectionDashboard';
import { initDB } from '@/lib/db';
import { getIngredientDashboard } from '@/lib/ingredient/dashboard';

const GROUPS = [
  {
    label: '식자재 관리',
    items: [
      {
        href: '/ingredient/list',
        icon: 'tag',
        title: '식자재 목록',
        sub: '등록된 식자재 전체 목록을 조회합니다',
        iconBg: 'var(--positive-soft)',
        iconColor: 'var(--positive)',
      },
      {
        href: '/ingredient/manage',
        icon: 'edit',
        title: '식자재 관리',
        sub: '식자재 추가·수정·삭제를 수행합니다',
        iconBg: 'var(--accent-soft)',
        iconColor: 'var(--accent-text)',
      },
    ],
  },
  {
    label: '분석',
    items: [
      {
        href: '/ingredient/usage',
        icon: 'chart',
        title: '사용량 분석',
        sub: '레시피별 식자재 사용 현황을 확인합니다',
        iconBg: '#F0EBFF',
        iconColor: '#6B3FCB',
      },
    ],
  },
];

export default function Page() {
  const [stats, setStats] = useState(null);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    (async () => {
      try {
        await initDB();
        setStats(await getIngredientDashboard());
      } catch (err) {
        console.warn('[ingredient hub] dashboard load failed:', err);
      } finally {
        setLoading(false);
      }
    })();
  }, []);

  const cards = stats
    ? [
        { label: '전체 식자재', value: stats.totalCount },
        {
          label: '단가 연동',
          value: stats.linkedCount,
          unit: `개 · ${stats.linkPct}%`,
          valueColor: 'var(--positive)',
        },
        {
          label: '미분류',
          value: stats.uncategorizedCount,
          valueColor: stats.uncategorizedCount > 0 ? 'var(--warn)' : undefined,
        },
        {
          label: '포장수량 미설정',
          value: stats.noBaseQtyCount,
          valueColor: stats.noBaseQtyCount > 0 ? 'var(--warn)' : undefined,
        },
        { label: '최신 단가 반영', value: stats.latestPriceDate || '없음', unit: '' },
      ]
    : [];

  return (
    <SectionHubPage
      breadcrumb={['식자재']}
      title="식자재"
      sub="식자재 목록을 관리하고 레시피 사용량을 분석하세요."
      groups={GROUPS}
    >
      <SectionDashboard
        loading={loading}
        cards={cards}
        isEmpty={!loading && (!stats || stats.totalCount === 0)}
        emptyHint="아직 등록된 식자재가 없어요. ‘식자재 관리’에서 마스터를 시드하거나 제때 가격을 업로드하세요."
      />
    </SectionHubPage>
  );
}
