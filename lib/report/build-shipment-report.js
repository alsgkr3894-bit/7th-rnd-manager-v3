import { asObjectArray } from '@/lib/ui/prop-guards';
import { aggregateShipmentRows } from '@/lib/shipment/aggregate';
import { safeYear, safeMonth, safeQuantity } from '@/lib/report/period';

/**
 * 출고 파일 목록을 연월별로 그룹핑합니다.
 * @param {object[]} files - getShipmentFiles() 결과
 * @returns {Array<{ year: number, month: number, files: object[] }>} 최신 월 순 목록
 */
export function buildShipmentMonthMap(files) {
  const monthMap = new Map();
  for (const f of asObjectArray(files)) {
    const yearValue = safeYear(f.year, 0);
    const monthValue = safeMonth(f.month, 0);
    if (!yearValue || !monthValue) continue;
    const key = `${yearValue}-${monthValue}`;
    if (!monthMap.has(key)) {
      monthMap.set(key, { year: yearValue, month: monthValue, files: [] });
    }
    monthMap.get(key).files.push(f);
  }
  return [...monthMap.values()];
}

/**
 * 월별 추이 차트용 전용/범용 수량 데이터를 계산합니다.
 * @param {Array<object[]>} monthlyRows - 각 월의 출고 행 배열 (최대 7개월, 오래된 달부터)
 * @param {object[]} managedProducts - 제때 관리 품목 목록
 * @returns {{ exclusiveData: number[], genericData: number[] }}
 */
export function buildShipmentTrendSeries(monthlyRows, managedProducts) {
  const exclusiveData = [];
  const genericData = [];
  for (const rows of monthlyRows) {
    const a = aggregateShipmentRows(rows, managedProducts);
    exclusiveData.push(
      a
        .filter(x => x.productType === 'exclusive')
        .reduce((s, x) => s + safeQuantity(x.totalQuantity), 0)
    );
    genericData.push(
      a
        .filter(x => x.productType !== 'exclusive')
        .reduce((s, x) => s + safeQuantity(x.totalQuantity), 0)
    );
  }
  return { exclusiveData, genericData };
}
