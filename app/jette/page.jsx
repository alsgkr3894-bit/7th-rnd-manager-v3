'use client';
import { useEffect, useState } from 'react';
import { SectionHubPage } from '@/components/ui/SectionHubPage';
import { SectionDashboard } from '@/components/ui/SectionDashboard';
import { initDB } from '@/lib/db';
import { getJetteDashboard } from '@/lib/jette/dashboard';
import { formatNumber } from '@/lib/format';

const GROUPS = [
  {
    label: '가격 분석',
    items: [
      { href: '/jette/price-compare', icon: 'chart', title: '가격 비교', sub: '경쟁사·플랫폼 가격을 비교합니다', iconBg: '#F0EBFF', iconColor: '#6B3FCB' },
    ],
  },
  {
    label: '물류',
    items: [
      { href: '/jette/shipment', icon: 'box', title: '배송 현황', sub: '배송 건수 및 현황을 확인합니다', iconBg: 'var(--surface-2)', iconColor: 'var(--text-2)' },
    ],
  },
  {
    label: '설정',
    items: [
      { href: '/jette/settings', icon: 'gear', title: '설정', sub: '제트 관련 설정을 관리합니다', iconBg: 'var(--accent-soft)', iconColor: 'var(--accent-text)' },
    ],
  },
];

export default function Page() {
  const [data, setData] = useState(null);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    (async () => {
      try {
        await initDB();
        setData(await getJetteDashboard());
      } catch (err) {
        console.warn('[jette hub] dashboard load failed:', err);
      } finally {
        setLoading(false);
      }
    })();
  }, []);

  const price = data?.price;
  const shipment = data?.shipment;
  const cards = [];
  if (price) {
    cards.push(
      { label: '최신 단가 반영', value: price.latestDate || '없음', unit: '' },
      { label: '단가 인상', value: price.upCount, valueColor: price.upCount > 0 ? 'var(--negative)' : undefined },
      { label: '단가 인하', value: price.downCount, valueColor: price.downCount > 0 ? 'var(--positive)' : undefined },
    );
  }
  if (shipment) {
    cards.push(
      { label: '최신 출고월', value: `${shipment.year}.${String(shipment.month).padStart(2, '0')}`, unit: '' },
      { label: '관리 품목', value: shipment.managedCount },
      { label: '출고 총액', value: formatNumber(shipment.totalAmount), unit: '원' },
    );
  }

  return (
    <SectionHubPage
      breadcrumb={['제트']}
      title="제트"
      sub="가격 비교, 배송 현황, 설정을 한 곳에서 관리하세요."
      groups={GROUPS}
    >
      <SectionDashboard
        loading={loading}
        cards={cards}
        isEmpty={!loading && cards.length === 0}
        emptyHint="아직 업로드된 제때 가격·출고 데이터가 없어요. ‘가격 비교’ 또는 ‘배송 현황’에서 파일을 업로드하세요."
      />
    </SectionHubPage>
  );
}
