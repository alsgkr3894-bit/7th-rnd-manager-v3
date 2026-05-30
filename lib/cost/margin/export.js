import { formatNumber } from '@/lib/format';

export function exportMarginExcel(rows, sizeLabels, viewMode) {
  const headers = [
    '메뉴명', '카테고리',
    ...sizeLabels.map(l => l + ' 원가'),
    ...sizeLabels.map(l => l + ' 판매가'),
    ...sizeLabels.map(l => l + (viewMode === 'margin' ? ' 마진율' : ' 원가율')),
  ];
  const csvRows = rows.map(r => [
    r.menuName,
    r.menuCategory || '기타',
    ...sizeLabels.map(l => { const c = r.costMap?.[l] || 0; return c > 0 ? Math.round(c) : ''; }),
    ...sizeLabels.map(l => { const s = r.sizes?.find(s => s.label === l); return s?.sellingPrice || ''; }),
    ...sizeLabels.map(l => {
      const cost = r.costMap?.[l] || 0;
      const s = r.sizes?.find(s => s.label === l);
      const p = s?.sellingPrice || 0;
      if (cost == null || !p) return '';
      const rate = cost / p * 100;
      return viewMode === 'margin' ? (100 - rate).toFixed(1) + '%' : rate.toFixed(1) + '%';
    }),
  ]);
  const csv = [headers, ...csvRows].map(r => r.join(',')).join('\n');
  const blob = new Blob(['﻿' + csv], { type: 'text/csv;charset=utf-8' });
  const a = document.createElement('a');
  a.href = URL.createObjectURL(blob);
  a.download = '원가마진표.csv';
  a.click();
  URL.revokeObjectURL(a.href);
}
