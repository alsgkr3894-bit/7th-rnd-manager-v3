export const JETTE_HUB_GROUPS = [
  {
    label: '단가',
    items: [
      {
        href: '/jette/price-compare',
        icon: 'chart',
        title: '단가',
        sub: '제때 단가 업로드와 비교를 확인합니다',
        iconBg: '#F0EBFF',
        iconColor: '#6B3FCB',
      },
    ],
  },
  {
    label: '출고량',
    items: [
      {
        href: '/jette/shipment',
        icon: 'box',
        title: '출고량',
        sub: '제품 출고량을 업로드하고 집계합니다',
        iconBg: 'var(--surface-2)',
        iconColor: 'var(--text-2)',
      },
    ],
  },
  {
    label: '관리품목',
    items: [
      {
        href: '/jette/settings',
        icon: 'gear',
        title: '관리품목',
        sub: '출고량 집계 대상 제품을 관리합니다',
        iconBg: 'var(--accent-soft)',
        iconColor: 'var(--accent-text)',
      },
    ],
  },
];

export const JETTE_NAV_ITEMS = [
  { id: 'jette-price-compare', label: '단가', href: '/jette/price-compare' },
  { id: 'jette-shipment', label: '출고량', href: '/jette/shipment' },
  { id: 'jette-settings', label: '관리품목', href: '/jette/settings' },
];
