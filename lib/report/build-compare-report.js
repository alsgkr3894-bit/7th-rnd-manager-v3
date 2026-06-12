import { asDisplayText, asObjectArray } from '@/lib/ui/prop-guards';
import { safeYear, safeMonth, safeQuantity } from '@/lib/report/period';

/**
 * 판매 비교 보고서용 카테고리 시리즈 데이터를 계산합니다.
 * @param {object[]} rows - sales_rows 전체 행
 * @param {{ year: number, month: number }} periodA
 * @param {{ year: number, month: number }} periodB
 * @param {string} scope - 'all' 또는 카테고리 코드
 * @param {number} monthALabel - A 기간 월 표시 (레이블용)
 * @returns {object[]} recharts series array
 */
export function buildCompareSeries(rows, periodA, periodB, scope, monthALabel) {
  const catMap = new Map();
  for (const r of asObjectArray(rows)) {
    if (r.status !== 'classified') continue;
    if (scope !== 'all' && r.category !== scope) continue;
    const cat = asDisplayText(r.category, '기타') || '기타';
    if (!catMap.has(cat)) catMap.set(cat, { a: 0, b: 0 });
    const rowYear = safeYear(r.year, 0);
    const rowMonth = safeMonth(r.month, 0);
    const isA = rowYear === periodA.year && rowMonth === periodA.month;
    const isB = rowYear === periodB.year && rowMonth === periodB.month;
    if (isA) catMap.get(cat).a += safeQuantity(r.quantity);
    if (isB) catMap.get(cat).b += safeQuantity(r.quantity);
  }
  const cats = Array.from(catMap.entries()).filter(([, v]) => v.a > 0 || v.b > 0);
  if (cats.length === 0) return [];
  return [
    { name: `A (${monthALabel}월)`, data: cats.map(([, v]) => v.a) },
    { name: `B (${periodB.month}월)`, data: cats.map(([, v]) => v.b) },
  ];
}
