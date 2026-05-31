'use client';
import { SectionHubPage } from '@/components/ui/SectionHubPage';

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
  return (
    <SectionHubPage
      breadcrumb={['제트']}
      title="제트"
      sub="가격 비교, 배송 현황, 설정을 한 곳에서 관리하세요."
      groups={GROUPS}
    />
  );
}
