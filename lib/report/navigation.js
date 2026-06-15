import { KIND_META } from '@/lib/report/constants';

export const REPORT_NAV_ITEMS = [
  { id: 'report-home', label: '보고서센터', href: '/report' },
  ...Object.values(KIND_META).map(kind => ({
    id: `report-${kind.id}`,
    label: kind.title,
    href: kind.href,
  })),
];
