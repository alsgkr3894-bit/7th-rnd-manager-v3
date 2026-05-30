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
 * 원가율 KPI — 전체 레시피 평균 원가율, 전월 대비 델타, 최근 7개월 스파크라인.
 *
 * 스파크라인 각 포인트: 해당 월 말 이전 최신 가격 파일을 사용해 평균 원가율 계산.
 * 가격 파일이 여러 개 없으면 전 구간 동일 파일을 사용 (현실적 fallback).
 */
export async function getCostRateKpi() {
  if (!hasStore('cost_recipes') || !hasStore('cost_ingredients')) {
    return { rate: null, deltaPct: null, sparkline: [] };
  }

  const [recipes, allMeta, files] = await Promise.all([
    safeAll('cost_recipes'),
    safeAll('cost_ingredients'),
    getPriceFiles().catch(() => []),
  ]);

  if (!recipes.length || !allMeta.length) {
    return { rate: null, deltaPct: null, sparkline: [] };
  }

  // 가격 파일을 updateDate 오름차순으로 정렬 (getPriceFiles는 내림차순 반환)
  const sortedFiles = [...files].sort((a, b) =>
    (a.updateDate || '').localeCompare(b.updateDate || '')
  );

  /** 특정 월(year, month) 말 이전의 가장 최신 가격 파일 반환. 없으면 첫 번째 파일. */
  function fileForMonth(year, month) {
    if (!sortedFiles.length) return null;
    // 해당 월의 마지막 날 문자열 (YYYY-MM-31 은 존재하지 않아도 비교엔 충분)
    const ceiling = `${year}-${String(month).padStart(2, '0')}-31`;
    let best = null;
    for (const f of sortedFiles) {
      if ((f.updateDate || '') <= ceiling) best = f;
    }
    // 해당 월 이전 파일이 없으면 가장 오래된 파일로 fallback
    return best ?? sortedFiles[0];
  }

  // 가격 파일 rows 캐시 (fileId → Map<productCode, row>)
  const rowsCache = new Map();

  async function getUpmForFile(file) {
    if (!file) return buildUnitPriceMap(allMeta, new Map());
    if (!rowsCache.has(file.id)) {
      try {
        const rows = await getPriceRowsByFileId(file.id);
        const m = new Map();
        rows.forEach(r => { if (r.productCode) m.set(r.productCode, r); });
        rowsCache.set(file.id, m);
      } catch {
        rowsCache.set(file.id, new Map());
      }
    }
    return buildUnitPriceMap(allMeta, rowsCache.get(file.id));
  }

  const SIZE_PREF = ['L', 'R', '단일', '단품', '세트'];

  /** 주어진 unitPriceMap으로 전체 레시피 평균 원가율 계산. null = 데이터 없음. */
  function calcAvgRate(upm) {
    let sum = 0, count = 0;
    for (const r of recipes) {
      const costMap = calcCostBySizes(r, upm);
      const sizes = (r.sizes || []).filter(s => s.label && s.sellingPrice > 0);
      if (!sizes.length) continue;

      const rep = SIZE_PREF.map(p => sizes.find(s => s.label === p)).find(Boolean) || sizes[0];
      const cost = costMap[rep.label] || 0;
      if (cost <= 0) continue;

      const costRate = calcMarginRate(cost, Number(rep.sellingPrice));
      if (costRate == null) continue;

      sum += costRate;
      count += 1;
    }
    return count > 0 ? Math.round(sum / count * 10) / 10 : null;
  }

  const { year, month } = currentYearMonth();

  // 최근 7개월 스파크라인 (6개월 전 → 이번 달)
  const sparklineMonths = [];
  for (let i = 6; i >= 0; i--) {
    sparklineMonths.push(shiftMonth(year, month, -i));
  }

  // 각 월에 해당하는 파일 id 목록 (중복 제거해 최소한의 getPriceRowsByFileId 호출)
  const neededFiles = sparklineMonths.map(p => fileForMonth(p.year, p.month));

  // 병렬로 필요한 파일 rows 프리페치
  const uniqueFileIds = [...new Set(neededFiles.filter(Boolean).map(f => f.id))];
  await Promise.all(uniqueFileIds.map(id => {
    const file = sortedFiles.find(f => f.id === id);
    return file ? getUpmForFile(file) : Promise.resolve();
  }));

  // 스파크라인 값 계산
  const sparkline = await Promise.all(
    sparklineMonths.map(async (p, i) => {
      const file = neededFiles[i];
      const upm = await getUpmForFile(file);
      return calcAvgRate(upm);
    })
  );

  // 이번 달 및 전달 원가율
  const rate = sparkline[sparkline.length - 1];
  const prevRate = sparkline[sparkline.length - 2];
  const deltaPct = (rate != null && prevRate != null && prevRate > 0)
    ? Math.round((rate - prevRate) * 10) / 10   // 원가율 포인트 차이 (%)
    : null;

  return { rate, deltaPct, sparkline };
}
