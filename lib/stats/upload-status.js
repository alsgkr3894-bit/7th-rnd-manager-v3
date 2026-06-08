/**
 * lib/stats/upload-status.js — 업로드 신선도 체크
 *
 * 지난달 기준: 최신 업로드 월 < 지난달이면 stale.
 * sales/shipment/price 3개 모듈 각각 체크.
 * initDB()가 이미 호출된 컨텍스트에서만 사용할 것.
 */
import { getUploadedFiles } from '@/lib/sales';
import { getShipmentFiles } from '@/lib/shipment/store-files';
import { getPriceFiles } from '@/lib/price';

export function previousMonthOf(now = new Date()) {
  const m = now.getMonth(); // 0-indexed current month
  return {
    year:  m === 0 ? now.getFullYear() - 1 : now.getFullYear(),
    month: m === 0 ? 12 : m, // 1-indexed last month
  };
}

export function isUploadPeriodStale(fileYear, fileMonth, target = previousMonthOf()) {
  return fileYear * 100 + fileMonth < target.year * 100 + target.month;
}

function statusFromPeriod(year, month, target) {
  return {
    year,
    month,
    stale: isUploadPeriodStale(year, month, target),
    never: false,
  };
}

/**
 * 판매량·출고량·단가 업로드 신선도 조회
 * @returns {{ sales, shipment, price }} 각 `{ year, month, stale, never }`
 */
export async function getUploadFreshness(now = new Date()) {
  const target = previousMonthOf(now);
  const [salesRes, shipRes, priceRes] = await Promise.allSettled([
    getUploadedFiles(),
    getShipmentFiles(),
    getPriceFiles(),
  ]);

  const sf  = salesRes.status  === 'fulfilled' ? salesRes.value  : [];
  const shf = shipRes.status   === 'fulfilled' ? shipRes.value   : [];
  const pf  = priceRes.status  === 'fulfilled' ? priceRes.value  : [];

  const latestSales  = sf[0];
  const latestShip   = shf[0];
  const latestPrice  = pf[0];

  const sales = latestSales
    ? statusFromPeriod(latestSales.year, latestSales.month, target)
    : { year: null, month: null, stale: true, never: true };

  const shipment = latestShip
    ? statusFromPeriod(latestShip.year, latestShip.month, target)
    : { year: null, month: null, stale: true, never: true };

  let price = { year: null, month: null, stale: true, never: true };
  if (latestPrice?.updateDate) {
    const d = new Date(latestPrice.updateDate);
    if (!isNaN(d)) {
      const py = d.getFullYear();
      const pm = d.getMonth() + 1;
      price = statusFromPeriod(py, pm, target);
    }
  }

  return { target, sales, shipment, price };
}
