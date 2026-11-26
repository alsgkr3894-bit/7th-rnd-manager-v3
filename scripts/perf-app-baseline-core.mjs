/**
 * scripts/perf-app-baseline-core.mjs — 속도 기준 측정의 순수 계산
 */
export function median(values) {
  const sorted = values.filter(Number.isFinite).sort((a, b) => a - b);
  if (sorted.length === 0) return null;
  const middle = Math.floor(sorted.length / 2);
  return sorted.length % 2 ? sorted[middle] : Math.round((sorted[middle - 1] + sorted[middle]) / 2);
}

/** 여러 번 측정한 { ms, getAll, heapMb } → 대표값 */
export function summarizeRuns(runs) {
  const stores = {};
  for (const run of runs) {
    for (const [store, count] of Object.entries(run.getAll || {})) {
      (stores[store] ||= []).push(count);
    }
  }
  const byStore = Object.fromEntries(
    Object.entries(stores).map(([store, counts]) => [
      store,
      // 어떤 실행에서 안 읽었으면 0으로 센다
      median([...counts, ...Array(runs.length - counts.length).fill(0)]),
    ])
  );
  return {
    ms: median(runs.map(run => run.ms)),
    msAll: runs.map(run => run.ms),
    getAllTotal: median(
      runs.map(run => Object.values(run.getAll || {}).reduce((sum, n) => sum + n, 0))
    ),
    repeatedStores: Object.fromEntries(
      Object.entries(byStore)
        .filter(([, count]) => count > 1)
        .sort((a, b) => b[1] - a[1])
    ),
    heapMb: median(runs.map(run => run.heapMb)),
  };
}

/** 점검 문서 15절의 목표와 비교 */
export const TARGETS = { homeMs: 2000, navigationMs: 500 };

export function formatRow(label, summary, targetMs) {
  const over = targetMs && summary.ms > targetMs ? ` (목표 ${targetMs}ms 초과)` : '';
  const repeated = Object.entries(summary.repeatedStores)
    .slice(0, 4)
    .map(([store, count]) => `${store}×${count}`)
    .join(', ');
  return `${label}: ${summary.ms}ms${over} · 전체 조회 ${summary.getAllTotal}회 · 힙 ${summary.heapMb}MB${
    repeated ? ` · 반복 ${repeated}` : ''
  }`;
}
