/**
 * lib/cost/price-rise-pending.js — 아직 확인 안 한 "원가 상승 메뉴" 알림 보관(브랜드별 localStorage)
 *
 * 팝업에서 [확인]을 누르기 전에 창을 닫아도, 홈 맨 위 "오늘 할 일" 카드에 "원가 상승 메뉴 N개"로
 * 남겨 두기 위한 저장소다. 백업 대상이 아닌 일시 상태라 PERSISTENT_LS_KEYS에는 넣지 않는다.
 * 저장 크기를 줄이려고 메뉴 상위 일부와 원인 식자재 이름만 남긴다.
 */
import { getActiveBrandId } from '@/lib/active-brand';
import { getJSONLS, setJSONLS } from '@/lib/note/storage';

const KEY_PREFIX = 'v3:price-rise-pending';
const MAX_STORED_ITEMS = 30;

export function priceRisePendingKey(brandId = getActiveBrandId()) {
  return `${KEY_PREFIX}:${brandId || 'main'}`;
}

/** 저장용으로 줄인 알림 — 홈 카드에 필요한 것만 */
export function toPendingPriceRise(result, now = Date.now()) {
  const items = (Array.isArray(result?.items) ? result.items : []).slice(0, MAX_STORED_ITEMS);
  return {
    createdAt: now,
    source: result?.source || 'jette',
    label: result?.label || '',
    baseDate: result?.baseDate || null,
    targetDate: result?.targetDate || null,
    total: Number(result?.total) || items.length,
    items: items.map(item => ({
      menuCode: item.menuCode,
      menuName: item.menuName,
      beforeCost: item.beforeCost,
      afterCost: item.afterCost,
      costDelta: item.costDelta,
      costDeltaPct: item.costDeltaPct,
      cause: item.causes?.[0]?.name || '',
    })),
  };
}

export function readPendingPriceRise() {
  const value = getJSONLS(priceRisePendingKey());
  if (!value || typeof value !== 'object' || Array.isArray(value)) return null;
  if (!Array.isArray(value.items) || !(Number(value.total) > 0)) return null;
  return value;
}

/** 새 알림을 남긴다. 이미 확인 안 한 알림이 있으면 합치지 않고 새 것으로 바꾼다(가장 최근 변동이 기준). */
export function savePendingPriceRise(result) {
  if (!(Number(result?.total) > 0)) return null;
  const pending = toPendingPriceRise(result);
  setJSONLS(priceRisePendingKey(), pending);
  return pending;
}

export function clearPendingPriceRise() {
  setJSONLS(priceRisePendingKey(), null);
}
