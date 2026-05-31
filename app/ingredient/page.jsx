'use client';
import { SectionHubPage } from '@/components/ui/SectionHubPage';

const GROUPS = [
  {
    label: '식자재 관리',
    items: [
      { href: '/ingredient/list',   icon: 'tag',   title: '식자재 목록', sub: '등록된 식자재 전체 목록을 조회합니다', iconBg: 'var(--positive-soft)', iconColor: 'var(--positive)' },
      { href: '/ingredient/manage', icon: 'edit',  title: '식자재 관리', sub: '식자재 추가·수정·삭제를 수행합니다',   iconBg: 'var(--accent-soft)',   iconColor: 'var(--accent-text)' },
    ],
  },
  {
    label: '분석',
    items: [
      { href: '/ingredient/usage',  icon: 'chart', title: '사용량 분석', sub: '레시피별 식자재 사용 현황을 확인합니다', iconBg: '#F0EBFF', iconColor: '#6B3FCB' },
    ],
  },
];

export default function Page() {
  return (
    <SectionHubPage
      breadcrumb={['식자재']}
      title="식자재"
      sub="식자재 목록을 관리하고 레시피 사용량을 분석하세요."
      groups={GROUPS}
    />
  );
}
