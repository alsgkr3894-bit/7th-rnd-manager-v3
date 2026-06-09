/**
 * lib/stats/price-change-stats.js — 식자재 단가 변동
 *
 * 두 소스를 합쳐 최근 변동을 만든다:
 *   1) 수동 단가 변경 이력 (cost_ingredient_price_history) — 마스터 수정·일괄 업데이트
 *   2) 제때 가격파일 최신 vs 이전 비교 — 가격파일 업로드로 생긴 변동
 * (기존엔 1)만 봐서, 가격파일 업로드로 단가가 바뀌어도 홈 위젯이 비어 보였다.)
 */

import { getAllHistory } from '@/lib/cost/price-history';
import { getPriceFiles, getPriceRowsByFileId } from '@/lib/price';
import { asDisplayText, asFiniteNumber, asObjectArray, clampInteger } from '@/lib/ui/prop-guards';

/**
 * 최근 단가 변동 — 식자재별 가장 최근 변동 1건씩, 변동폭 큰 순.
 *
 * @param {number} [limit=6]
 * @returns {Promise<Array<{ name, sub, pct:number, dir:'up'|'down' }>>}
 */
export async function getRecentPriceChanges(limit = 6) {
  const safeLimit = clampInteger(limit, { min: 0, fallback: 6 });
  const items = [];
  const seen = new Set();

  const pushChange = (key, name, oldP, newP) => {
    const safeKey = asDisplayText(key);
    const oldPrice = asFiniteNumber(oldP);
    const newPrice = asFiniteNumber(newP);
    if (!safeKey || seen.has(safeKey)) return;
    if (!(oldPrice > 0) || !(newPrice > 0) || oldPrice === newPrice) return;
    seen.add(safeKey);
    const pct = ((newPrice - oldPrice) / oldPrice) * 100;
    items.push({
      name: asDisplayText(name, '식자재'),
      sub: `${oldPrice.toLocaleString()}원 → ${newPrice.toLocaleString()}원`,
      pct,
      dir: pct > 0 ? 'up' : 'down',
    });
  };

  // 1) 수동 단가 변경 이력 (productCode 우선 키 — 파일 변동과 dedup 정합)
  try {
    const history = asObjectArray(await getAllHistory()); // changedAt 내림차순
    for (const h of history) {
      pushChange(
        h.productCode || h.ingredientName || h.ingredientId,
        h.ingredientName || h.productCode || '식자재',
        h.oldPrice,
        h.newPrice
      );
    }
  } catch {
    /* store 미초기화 등 무시 */
  }

  // 2) 제때 가격파일 최신 vs 이전 비교
  try {
    const files = asObjectArray(await getPriceFiles());
    if (files[0]?.id != null && files[1]?.id != null) {
      const [latest, prev] = await Promise.all([
        getPriceRowsByFileId(files[0].id),
        getPriceRowsByFileId(files[1].id),
      ]);
      const prevMap = new Map(
        asObjectArray(prev)
          .map(r => [asDisplayText(r.productCode), asFiniteNumber(r.priceWithTax)])
          .filter(([code]) => code)
      );
      for (const r of asObjectArray(latest)) {
        const productCode = asDisplayText(r.productCode);
        if (!productCode) continue;
        pushChange(
          productCode,
          r.productName || productCode,
          prevMap.get(productCode),
          r.priceWithTax
        );
      }
    }
  } catch {
    /* 가격파일 없음 등 무시 */
  }

  return items.sort((a, b) => Math.abs(b.pct) - Math.abs(a.pct)).slice(0, safeLimit);
}
