'use client';
import { SectionHubPage } from '@/components/ui/SectionHubPage';

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
  return (
    <SectionHubPage
      breadcrumb={['메뉴 판매량']}
      title="메뉴 판매량"
      sub="판매 데이터를 업로드하고 메뉴별 순위·비교·미매칭 관리를 수행하세요."
      groups={GROUPS}
    />
  );
}
