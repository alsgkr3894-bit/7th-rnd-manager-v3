// 원가마진표 엑셀/미리보기 행 빌더 (헤더 + 사이즈별 판매가·원가·원가율/마진율)
import { applyDiscount, calcNetRevenue, calcPlatformMargin } from './platforms';
import { getCostEntry } from './export-format';

export function buildMarginExcelRows(rows, sizeLabels, viewMode, activePlatform, discount) {
  const fees = activePlatform?.fees;
  const rateSuffix = viewMode === 'margin' ? ' 마진율' : ' 원가율';
  const headers = [
    '카테고리',
    '메뉴명',
    ...sizeLabels.flatMap(l => [l + ' 판매가', l + ' 원가', l + rateSuffix]),
  ];
  const bodyRows = rows.map(r => [
    r.menuCategory || '기타',
    r.menuName,
    ...sizeLabels.flatMap(l => {
      // 화면(MarginRow)과 동일하게 할인·플랫폼수수료 차감 후 수령액(net) 기준으로 계산한다.
      const { hasCost, cost } = getCostEntry(r.costMap, l);
      const s = r.sizes?.find(s => s.label === l);
      const sellingPrice = s?.sellingPrice || '';
      const costValue = hasCost ? Math.round(cost) : '';
      if (!hasCost || !s?.sellingPrice) return [sellingPrice, costValue, ''];
      const net = calcNetRevenue(applyDiscount(s.sellingPrice, discount), fees, l);
      const rate = calcPlatformMargin(cost, net);
      const rateValue =
        rate == null
          ? ''
          : viewMode === 'margin'
            ? (100 - rate).toFixed(1) + '%'
            : rate.toFixed(1) + '%';
      return [sellingPrice, costValue, rateValue];
    }),
  ]);
  return [headers, ...bodyRows];
}

/**
 * 모든 플랫폼의 원가율/마진율을 사이즈별로 나란히 비교하는 행을 만든다
 * ("전체 비교" 모드 — 판매가·원가는 사이즈당 한 번, 원가율/마진율만 플랫폼 수만큼 반복).
 */
export function buildMarginExcelRowsAllPlatforms(rows, sizeLabels, viewMode, platforms, discount) {
  const safePlatforms = Array.isArray(platforms) ? platforms : [];
  const rateSuffix = viewMode === 'margin' ? '마진율' : '원가율';
  const headers = [
    '카테고리',
    '메뉴명',
    ...sizeLabels.flatMap(l => [
      l + ' 판매가',
      l + ' 원가',
      ...safePlatforms.map(p => `${l} ${p.name} ${rateSuffix}`),
    ]),
  ];
  const bodyRows = rows.map(r => [
    r.menuCategory || '기타',
    r.menuName,
    ...sizeLabels.flatMap(l => {
      const { hasCost, cost } = getCostEntry(r.costMap, l);
      const s = r.sizes?.find(s => s.label === l);
      const sellingPrice = s?.sellingPrice || '';
      const costValue = hasCost ? Math.round(cost) : '';
      if (!hasCost || !s?.sellingPrice) {
        return [sellingPrice, costValue, ...safePlatforms.map(() => '')];
      }
      const effectivePrice = applyDiscount(s.sellingPrice, discount);
      const rateValues = safePlatforms.map(p => {
        const net = calcNetRevenue(effectivePrice, p.fees, l);
        const rate = calcPlatformMargin(cost, net);
        if (rate == null) return '';
        return (viewMode === 'margin' ? 100 - rate : rate).toFixed(1) + '%';
      });
      return [sellingPrice, costValue, ...rateValues];
    }),
  ]);
  return [headers, ...bodyRows];
}
