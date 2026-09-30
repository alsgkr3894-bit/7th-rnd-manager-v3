/**
 * lib/cost/risk-threshold.js — 원가율 위험 판정 (순수)
 *
 * 화면마다 "N% 초과"라고 적으면서 어떤 곳은 >=, 어떤 곳은 >로 세어 정확히 N%인 메뉴가
 * 홈·전체 종합 원가표에서는 빠지고 원가마진표·원가 보고서에서는 잡히던 불일치를 없앤다.
 * 문구 그대로 "초과"(>)로 통일한다.
 */
export function isCostRateOverThreshold(rate, threshold) {
  const r = Number(rate);
  const t = Number(threshold);
  return Number.isFinite(r) && Number.isFinite(t) && r > t;
}
