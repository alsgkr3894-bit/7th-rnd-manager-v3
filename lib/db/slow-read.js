/**
 * lib/db/slow-read.js — 1초가 넘는 전체 조회를 저장소별로 모아 알린다.
 * 같은 경고가 콘솔을 덮지 않게 처음과 그 뒤 10회마다만 쓰고, 횟수와 가장 오래 걸린 시간을 함께 적는다.
 */
export const SLOW_READ_MS = 1000;
const REPEAT_EVERY = 10;
const stats = new Map();

export function noteReadDuration(storeName, ms, rows) {
  if (!(ms > SLOW_READ_MS)) return;
  const entry = stats.get(storeName) || { count: 0, maxMs: 0 };
  entry.count += 1;
  entry.maxMs = Math.max(entry.maxMs, ms);
  stats.set(storeName, entry);
  if (entry.count !== 1 && entry.count % REPEAT_EVERY !== 0) return;
  const total = entry.count > 1 ? ` (누적 ${entry.count}회, 최대 ${entry.maxMs}ms)` : '';
  console.warn(`[DB] getAll('${storeName}') ${ms}ms — 데이터 ${rows}건${total}`);
}

export function getSlowReadStats() {
  return [...stats].map(([storeName, entry]) => ({ storeName, ...entry }));
}
