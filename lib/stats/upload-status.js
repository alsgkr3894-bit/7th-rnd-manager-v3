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
import { asDisplayText, asFiniteNumber, asObjectArray } from '@/lib/ui/prop-guards';

export function previousMonthOf(now = new Date()) {
  const m = now.getMonth(); // 0-indexed current month
  return {
    year:  m === 0 ? now.getFullYear() - 1 : now.getFullYear(),
    month: m === 0 ? 12 : m, // 1-indexed last month
  };
}

function normalizePeriod(year, month) {
  const y = asFiniteNumber(year);
  const m = asFiniteNumber(month);
  if (y == null || m == null || m < 1 || m > 12) return null;
  return { year: Math.trunc(y), month: Math.trunc(m) };
}

export function isUploadPeriodStale(fileYear, fileMonth, target = previousMonthOf()) {
  const filePeriod = normalizePeriod(fileYear, fileMonth);
  const targetPeriod = normalizePeriod(target?.year, target?.month) || previousMonthOf();
  if (!filePeriod) return true;
  return filePeriod.year * 100 + filePeriod.month < targetPeriod.year * 100 + targetPeriod.month;
}

function statusFromPeriod(year, month, target) {
  const period = normalizePeriod(year, month);
  if (!period) {
    return {
      year: null,
      month: null,
      stale: true,
      never: false,
    };
  }

  return {
    year: period.year,
    month: period.month,
    stale: isUploadPeriodStale(period.year, period.month, target),
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

  const sf  = salesRes.status  === 'fulfilled' ? asObjectArray(salesRes.value)  : [];
  const shf = shipRes.status   === 'fulfilled' ? asObjectArray(shipRes.value)   : [];
  const pf  = priceRes.status  === 'fulfilled' ? asObjectArray(priceRes.value)  : [];

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
  const updateDate = asDisplayText(latestPrice?.updateDate);
  if (updateDate) {
    const d = new Date(updateDate);
    if (!isNaN(d)) {
      const py = d.getFullYear();
      const pm = d.getMonth() + 1;
      price = statusFromPeriod(py, pm, target);
    }
  }

  return { target, sales, shipment, price };
}
