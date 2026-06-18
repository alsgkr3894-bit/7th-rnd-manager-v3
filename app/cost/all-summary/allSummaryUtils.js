import { downloadCsv, makeFileNameWithBrand } from '@/lib/download';
import { CAT_ORDER } from '@/lib/cost/shared/buildSummaryRows';

export function exportAllSummaryCsv(rows) {
  const headers = ['메뉴명', '카테고리', '원가', '판매가', '원가율'];
  const body = rows.map(row => [
    row.menuName,
    row.rawCategory || row.category,
    row.cost != null ? row.cost : '',
    row.sellingPrice != null ? row.sellingPrice : '',
    row.costRate != null ? row.costRate.toFixed(1) + '%' : '',
  ]);
  downloadCsv([headers, ...body], makeFileNameWithBrand('전메뉴원가종합', 'csv'));
}

export function buildAllSummaryStats(rows) {
  const withCost = rows.filter(row => row.hasCost);
  const rates = withCost.filter(row => row.costRate != null).map(row => row.costRate);
  const avgRate = rates.length ? rates.reduce((sum, rate) => sum + rate, 0) / rates.length : null;
  const alertCnt = rates.filter(rate => rate > 40).length;

  return {
    total: rows.length,
    withCost: withCost.length,
    avgRate,
    alertCnt,
  };
}

export function buildAllSummaryCategories(rows) {
  const present = [...new Set(rows.map(row => row.category))];
  const sorted = CAT_ORDER.filter(category => present.includes(category));
  if (present.some(category => !CAT_ORDER.includes(category))) sorted.push('기타');
  return ['전체', ...sorted];
}

export function filterAllSummaryRows(rows, category) {
  if (category === '전체') return rows;
  return rows.filter(row => row.category === category);
}
