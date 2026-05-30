/**
 * lib/stats/note-stats.js — 메뉴개발노트 통계
 */

import { safeAll, currentYearMonth, shiftMonth, buildSparkline, isInMonth } from './_helpers';
import { getPriceFiles, getPriceRowsByFileId } from '@/lib/price';
import { buildUnitPriceMap, calcCostBySizes, calcMarginRate } from '@/lib/recipe';
import { hasStore } from '@/lib/db';

export async function getNoteKpi() {
  const notes = await safeAll('menu_dev_notes');
  const total = notes.length;
  const reporting = notes.filter(n => n.status === '보고예정').length;

  const { year, month } = currentYearMonth();
  const sparkline = buildSparkline(year, month, (y, m) =>
    notes.filter(n => isInMonth(n.createdAt, y, m)).length
  );

  return { total, reporting, sparkline };
}

/** 상세 통계 — 노트 목록 통계 섹션용 */
export async function getNoteDetailStats() {
  const notes = await safeAll('menu_dev_notes');
  if (!notes.length) return null;

  const { year, month } = currentYearMonth();
  const thisMonthStart = new Date(year, month - 1, 1).getTime();
  const thisMonthEnd   = new Date(year, month, 1).getTime();

  const thisMonth = notes.filter(n => {
    const t = n.createdAt ? new Date(n.createdAt).getTime() : 0;
    return t >= thisMonthStart && t < thisMonthEnd;
  }).length;

  const released    = notes.filter(n => n.status === '출시').length;
  const releaseRate = notes.length > 0 ? Math.round(released / notes.length * 100) : 0;

  // 상태별·카테고리별 분포 — 단일 순회
  const byStatus = {}, byCategory = {};
  for (const n of notes) {
    byStatus[n.status]     = (byStatus[n.status]     || 0) + 1;
    byCategory[n.category] = (byCategory[n.category] || 0) + 1;
  }

  // 최근 6개월 월별 작성 수 — 단일 순회로 Map 누적
  const buckets = new Map();
  const monthKeys = [];
  for (let i = 5; i >= 0; i--) {
    const p   = shiftMonth(year, month, -i);
    const key = `${p.year}-${String(p.month).padStart(2, '0')}`;
    buckets.set(key, { label: `${p.month}월`, count: 0 });
    monthKeys.push(key);
  }
  for (const n of notes) {
    if (!n.createdAt) continue;
    const d   = new Date(n.createdAt);
    const key = `${d.getFullYear()}-${String(d.getMonth() + 1).padStart(2, '0')}`;
    if (buckets.has(key)) buckets.get(key).count += 1;
  }
  const monthly = monthKeys.map(k => buckets.get(k));

  return {
    total: notes.length, thisMonth, released, releaseRate,
    byStatus, byCategory, monthly,
  };
}

/**
 * 원가율 KPI — cost_selling_prices 기반 단순 평균 원가율.
 *
 * 계산 흐름:
 * 1. cost_recipes + cost_ingredients + 가격 파일로 unitPriceMap 빌드
 * 2. cost_selling_prices 에서 (menuName, size) → 판매가 맵 빌드
 * 3. 각 레시피의 대표 사이즈 원가를 calcCostBySizes 로 계산
 * 4. 판매가가 있는 레시피만 원가율 산출 후 평균
 * 5. { rate, deltaPct: null, sparkline: [] } 반환
 *
 * cost_selling_prices 가 없거나 비어있으면 recipe.sizes[].sellingPrice 로 fallback.
 */
export async function getCostRateKpi() {
  if (!hasStore('cost_recipes')) {
    return { rate: null, deltaPct: null, sparkline: [] };
  }

  const [recipes, allMeta, sellingPrices, files] = await Promise.all([
    safeAll('cost_recipes'),
    safeAll('cost_ingredients'),
    safeAll('cost_selling_prices'),
    getPriceFiles().catch(() => []),
  ]);

  if (!recipes.length) {
    return { rate: null, deltaPct: null, sparkline: [] };
  }

  // 판매가 맵: `${menuName}|${size}` → price
  const spMap = new Map();
  for (const sp of sellingPrices) {
    if (sp.price > 0) {
      spMap.set(`${sp.menuName}|${sp.size}`, sp.price);
    }
  }

  // 단가 맵 빌드 (가격 파일이 없어도 priceOverride 기반으로 부분 빌드됨)
  const priceRowMap = new Map();
  if (files.length > 0) {
    try {
      const rows = await getPriceRowsByFileId(files[0].id);
      rows.forEach(r => { if (r.productCode) priceRowMap.set(r.productCode, r); });
    } catch { /* ignore */ }
  }
  const upm = buildUnitPriceMap(allMeta, priceRowMap);

  const SIZE_PREF = ['L', 'R', '단일', '단품', '세트'];

  let sum = 0, count = 0;
  for (const r of recipes) {
    const costMap = calcCostBySizes(r, upm);

    // 대표 사이즈 결정: cost_selling_prices 에 등록된 사이즈 우선
    const spSizes = SIZE_PREF
      .filter(p => spMap.has(`${r.menuName}|${p}`))
      .map(p => ({ label: p, sellingPrice: spMap.get(`${r.menuName}|${p}`) }));

    // fallback: recipe.sizes[].sellingPrice 직접 기입된 경우
    const recipeSizes = (r.sizes || []).filter(s => s.label && Number(s.sellingPrice) > 0);

    const candidates = spSizes.length > 0 ? spSizes : recipeSizes;
    if (!candidates.length) continue;

    const rep = SIZE_PREF.map(p => candidates.find(s => s.label === p)).find(Boolean) || candidates[0];
    const cost = costMap[rep.label] || 0;
    if (cost <= 0) continue;

    const costRate = calcMarginRate(cost, Number(rep.sellingPrice));
    if (costRate == null) continue;

    sum += costRate;
    count += 1;
  }

  if (count === 0) {
    return { rate: null, deltaPct: null, sparkline: [] };
  }

  const rate = Math.round(sum / count * 10) / 10;
  const sparkline = Array(7).fill(rate);
  return { rate, deltaPct: null, sparkline };
}
