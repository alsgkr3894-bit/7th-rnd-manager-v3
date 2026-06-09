'use client';
import { useEffect, useState } from 'react';
import { SectionHubPage } from '@/components/ui/SectionHubPage';
import { SectionDashboard } from '@/components/ui/SectionDashboard';
import { initDB } from '@/lib/db';
import { getNutritionDashboard } from '@/lib/nutrition/dashboard';

const GROUPS = [
  {
    label: '영양성분',
    items: [
      { href: '/nutrition/menu',     icon: 'doc',      title: '메뉴 영양성분',  sub: '메뉴별 영양성분 데이터를 관리합니다',     iconBg: 'var(--accent-soft)',   iconColor: 'var(--accent-text)' },
    ],
  },
  {
    label: '표시 정보',
    items: [
      { href: '/nutrition/allergen', icon: 'alert',    title: '알레르기 정보',  sub: '메뉴별 알레르기 항목을 확인합니다',       iconBg: 'var(--warn-soft)',     iconColor: 'var(--warn)' },
      { href: '/nutrition/origin',   icon: 'tag',      title: '원산지 정보',    sub: '식자재 원산지 정보를 관리합니다',         iconBg: 'var(--positive-soft)', iconColor: 'var(--positive)' },
    ],
  },
  {
    label: '출력',
    items: [
      { href: '/nutrition/export',   icon: 'download', title: '출력·내보내기',  sub: '영양성분·원산지·알레르기 표를 출력합니다', iconBg: '#F0EBFF',             iconColor: '#6B3FCB' },
    ],
  },
];

export default function Page() {
  const [stats, setStats] = useState(null);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    let alive = true;

    (async () => {
      try {
        await initDB();
        const nextStats = await getNutritionDashboard();
        if (alive) setStats(nextStats);
      } catch (err) {
        if (alive) console.warn('[nutrition hub] dashboard load failed:', err);
      } finally {
        if (alive) setLoading(false);
      }
    })();

    return () => {
      alive = false;
    };
  }, []);

  const cards = stats ? [
    { label: '등록 메뉴', value: stats.menuCount },
    { label: '영양성분 입력', value: stats.nutritionDone, unit: `개 · ${stats.nutritionRate}%`, valueColor: 'var(--accent-text)' },
    { label: '알레르기 커버리지', value: stats.allergenRate, unit: '%', valueColor: stats.allergenRate >= 80 ? 'var(--positive)' : 'var(--warn)' },
    { label: '원산지 미등록', value: stats.originMissing, valueColor: stats.originMissing > 0 ? 'var(--warn)' : 'var(--positive)' },
    { label: '파생 메뉴', value: stats.compositionCount },
  ] : [];

  return (
    <SectionHubPage
      breadcrumb={['영양성분·원산지']}
      title="영양성분·원산지"
      sub="메뉴별 영양성분, 알레르기, 원산지 정보를 관리하고 출력하세요."
      groups={GROUPS}
    >
      <SectionDashboard
        loading={loading}
        cards={cards}
        isEmpty={!loading && (!stats || stats.menuCount === 0)}
        emptyHint="아직 등록된 메뉴 영양성분이 없어요. ‘메뉴 영양성분’에서 데이터를 입력하세요."
      />
    </SectionHubPage>
  );
}
