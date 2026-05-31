'use client';
import { SectionHubPage } from '@/components/ui/SectionHubPage';

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
  return (
    <SectionHubPage
      breadcrumb={['영양성분·원산지']}
      title="영양성분·원산지"
      sub="메뉴별 영양성분, 알레르기, 원산지 정보를 관리하고 출력하세요."
      groups={GROUPS}
    />
  );
}
