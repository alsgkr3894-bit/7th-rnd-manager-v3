export const MENU_SALES_HUB_GROUPS = [
  {
    label: '데이터 입력',
    items: [
      {
        href: '/menu-sales/upload',
        icon: 'upload',
        title: '파일 업로드',
        sub: '메뉴 판매량 파일을 업로드합니다',
        iconBg: 'var(--positive-soft)',
        iconColor: 'var(--positive)',
        requiresEdit: true,
      },
    ],
  },
  {
    label: '정리',
    items: [
      {
        href: '/menu-sales/unmatched',
        icon: 'alert',
        title: '미매칭 관리',
        sub: '매칭되지 않은 메뉴를 관리합니다',
        iconBg: 'var(--warn-soft)',
        iconColor: 'var(--warn)',
      },
    ],
  },
  {
    label: '분석',
    items: [
      {
        href: '/menu-sales/rank-compare',
        icon: 'chart',
        title: '순위 및 비교',
        sub: '메뉴별 판매량 순위와 기간 비교',
        iconBg: '#F0EBFF',
        iconColor: '#6B3FCB',
      },
    ],
  },
  {
    label: '설정',
    items: [
      {
        href: '/menu-sales/settings',
        icon: 'gear',
        title: '분류 규칙',
        sub: '분류 규칙 및 메뉴 설정을 관리합니다',
        iconBg: 'var(--surface-2)',
        iconColor: 'var(--text-2)',
      },
    ],
  },
];

export const MENU_SALES_ANALYSIS_ROUTE = '/menu-sales/rank-compare';
export const MENU_SALES_LEGACY_ANALYSIS_ROUTES = ['/menu-sales/rank', '/menu-sales/compare'];
