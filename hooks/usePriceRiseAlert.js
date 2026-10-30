'use client';
import { useCallback, useState } from 'react';
import { clearPendingPriceRise, savePendingPriceRise } from '@/lib/cost/price-rise-pending';

/**
 * 원가 상승 팝업 상태.
 *  - showPriceRise(result): 원가가 오른 메뉴가 있으면 홈 알림으로 남기고 팝업을 띄운다(없으면 아무것도 안 함)
 *  - confirmPriceRise(): [확인] — 팝업을 닫고 홈에 남긴 알림도 지운다
 *  - laterPriceRise(): [나중에]·닫기 — 팝업만 닫고 홈 알림은 남긴다
 */
export function usePriceRiseAlert() {
  const [priceRise, setPriceRise] = useState(null);

  const showPriceRise = useCallback(result => {
    if (!(Number(result?.total) > 0)) return false;
    savePendingPriceRise(result);
    setPriceRise(result);
    return true;
  }, []);

  const confirmPriceRise = useCallback(() => {
    clearPendingPriceRise();
    setPriceRise(null);
  }, []);

  const laterPriceRise = useCallback(() => setPriceRise(null), []);

  return { priceRise, showPriceRise, confirmPriceRise, laterPriceRise };
}
