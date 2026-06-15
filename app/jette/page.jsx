'use client';
import { useEffect, useState } from 'react';
import { SectionHubPage } from '@/components/ui/SectionHubPage';
import { SectionDashboard } from '@/components/ui/SectionDashboard';
import { initDB } from '@/lib/db';
import { getJetteDashboard } from '@/lib/jette/dashboard';
import { JETTE_HUB_GROUPS } from '@/lib/jette/navigation';
import { formatNumber } from '@/lib/format';

export default function Page() {
  const [data, setData] = useState(null);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    let alive = true;

    (async () => {
      try {
        await initDB();
        const nextData = await getJetteDashboard();
        if (alive) setData(nextData);
      } catch (err) {
        if (alive) console.warn('[jette hub] dashboard load failed:', err);
      } finally {
        if (alive) setLoading(false);
      }
    })();

    return () => {
      alive = false;
    };
  }, []);

  const price = data?.price;
  const shipment = data?.shipment;
  const cards = [];
  if (price) {
    cards.push(
      { label: '최신 단가 반영', value: price.latestDate || '없음', unit: '' },
      {
        label: '단가 인상',
        value: price.upCount,
        valueColor: price.upCount > 0 ? 'var(--negative)' : undefined,
      },
      {
        label: '단가 인하',
        value: price.downCount,
        valueColor: price.downCount > 0 ? 'var(--positive)' : undefined,
      }
    );
  }
  if (shipment) {
    cards.push(
      {
        label: '최신 출고월',
        value: `${shipment.year}.${String(shipment.month).padStart(2, '0')}`,
        unit: '',
      },
      { label: '관리 품목', value: shipment.managedCount },
      { label: '출고 총액', value: formatNumber(shipment.totalAmount), unit: '원' }
    );
  }

  return (
    <SectionHubPage
      breadcrumb={['제때데이터']}
      title="제때데이터"
      sub="제때 단가, 제품 출고량, 관리품목을 한 흐름에서 관리하세요."
      groups={JETTE_HUB_GROUPS}
    >
      <SectionDashboard
        loading={loading}
        cards={cards}
        isEmpty={!loading && cards.length === 0}
        emptyHint="아직 업로드된 제때 단가·출고량 데이터가 없어요. ‘단가’ 또는 ‘출고량’에서 파일을 업로드하세요."
      />
    </SectionHubPage>
  );
}
