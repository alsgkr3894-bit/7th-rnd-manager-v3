import { formatNumber } from '@/lib/format';
import { downloadCsv, makeFileNameWithBrand } from '@/lib/download';
import { applyDiscount, calcNetRevenue, calcPlatformMargin } from './platforms';

function getCostEntry(costMap, label) {
  if (!Object.prototype.hasOwnProperty.call(costMap || {}, label)) {
    return { hasCost: false, cost: 0 };
  }
  const cost = Number(costMap[label]);
  return Number.isFinite(cost) ? { hasCost: true, cost } : { hasCost: false, cost: 0 };
}

export function exportMarginExcel(rows, sizeLabels, viewMode, activePlatform, discount) {
  const fees = activePlatform?.fees;
  const headers = [
    '메뉴명',
    '카테고리',
    ...sizeLabels.map(l => l + ' 원가'),
    ...sizeLabels.map(l => l + ' 판매가'),
    ...sizeLabels.map(l => l + (viewMode === 'margin' ? ' 마진율' : ' 원가율')),
  ];
  const csvRows = rows.map(r => [
    r.menuName,
    r.menuCategory || '기타',
    ...sizeLabels.map(l => {
      const { hasCost, cost } = getCostEntry(r.costMap, l);
      return hasCost ? Math.round(cost) : '';
    }),
    ...sizeLabels.map(l => {
      const s = r.sizes?.find(s => s.label === l);
      return s?.sellingPrice || '';
    }),
    ...sizeLabels.map(l => {
      // 화면(MarginRow)과 동일하게 할인·플랫폼수수료 차감 후 수령액(net) 기준으로 계산한다.
      const { hasCost, cost } = getCostEntry(r.costMap, l);
      const s = r.sizes?.find(s => s.label === l);
      if (!hasCost || !s?.sellingPrice) return '';
      const net = calcNetRevenue(applyDiscount(s.sellingPrice, discount), fees, l);
      const rate = calcPlatformMargin(cost, net);
      if (rate == null) return '';
      return viewMode === 'margin' ? (100 - rate).toFixed(1) + '%' : rate.toFixed(1) + '%';
    }),
  ]);
  downloadCsv([headers, ...csvRows], makeFileNameWithBrand('원가마진표', 'csv'));
}
