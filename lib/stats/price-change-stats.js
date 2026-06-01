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

/**
 * 최근 단가 변동 — 식자재별 가장 최근 변동 1건씩, 변동폭 큰 순.
 *
 * @param {number} [limit=6]
 * @returns {Promise<Array<{ name, sub, pct:number, dir:'up'|'down' }>>}
 */
export async function getRecentPriceChanges(limit = 6) {
  const items = [];
  const seen = new Set();

  const pushChange = (key, name, oldP, newP) => {
    if (key == null || key === '' || seen.has(key)) return;
    if (!(oldP > 0) || !(newP > 0) || oldP === newP) return;
    seen.add(key);
    const pct = ((newP - oldP) / oldP) * 100;
    items.push({
      name,
      sub: `${oldP.toLocaleString()}원 → ${newP.toLocaleString()}원`,
      pct,
      dir: pct > 0 ? 'up' : 'down',
    });
  };

  // 1) 수동 단가 변경 이력 (productCode 우선 키 — 파일 변동과 dedup 정합)
  try {
    const history = await getAllHistory(); // changedAt 내림차순
    for (const h of history) {
      pushChange(
        h.productCode || h.ingredientName || h.ingredientId,
        h.ingredientName || h.productCode || '식자재',
        Number(h.oldPrice), Number(h.newPrice),
      );
    }
  } catch { /* store 미초기화 등 무시 */ }

  // 2) 제때 가격파일 최신 vs 이전 비교
  try {
    const files = await getPriceFiles();
    if (files[0] && files[1]) {
      const [latest, prev] = await Promise.all([
        getPriceRowsByFileId(files[0].id),
        getPriceRowsByFileId(files[1].id),
      ]);
      const prevMap = new Map(prev.filter(r => r.productCode).map(r => [r.productCode, r.priceWithTax]));
      for (const r of latest) {
        if (!r.productCode) continue;
        pushChange(r.productCode, r.productName || r.productCode, Number(prevMap.get(r.productCode)), Number(r.priceWithTax));
      }
    }
  } catch { /* 가격파일 없음 등 무시 */ }

  return items
    .sort((a, b) => Math.abs(b.pct) - Math.abs(a.pct))
    .slice(0, limit);
}
