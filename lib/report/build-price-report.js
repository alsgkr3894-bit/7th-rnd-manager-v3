import { comparePriceLists } from '@/lib/price/compare';
import { asObjectArray, asFiniteNumber, asDisplayText } from '@/lib/ui/prop-guards';

function safeChangeRate(value) {
  return asFiniteNumber(value, 0) ?? 0;
}

function safeCategory(value) {
  return asDisplayText(value, '기타') || '기타';
}

/**
 * 두 가격 파일을 비교해 보고서용 변동 목록과 카테고리 요약을 반환합니다.
 * @param {object[]} baseRows - 기준 파일 행
 * @param {object[]} latestRows - 최신 파일 행
 * @param {number} threshold - 최소 변동률(%) 필터 (0이면 전체)
 * @returns {{ changes: object[], catSummary: object[] }}
 */
export function buildPriceReportData(baseRows, latestRows, threshold) {
  const diff = asObjectArray(comparePriceLists(baseRows, latestRows)).filter(
    c => c.changeStatus !== '변동없음'
  );
  const safeThreshold = asFiniteNumber(threshold, 0) ?? 0;
  const changes = diff.filter(c => {
    if (c.changeStatus === '신규' || c.changeStatus === '삭제') return true;
    return Math.abs(safeChangeRate(c.changeRate) * 100) >= safeThreshold;
  });

  const catMap = new Map();
  for (const c of changes) {
    const cat = safeCategory(c.temperature);
    const entry = catMap.get(cat) || {
      cat,
      total: 0,
      up: 0,
      down: 0,
      newItem: 0,
      del: 0,
      sum: 0,
      count: 0,
    };
    entry.total++;
    const pct = Math.abs(safeChangeRate(c.changeRate) * 100);
    if (c.changeStatus === '인상') {
      entry.up++;
      entry.sum += pct;
      entry.count++;
    }
    if (c.changeStatus === '인하') {
      entry.down++;
      entry.sum += pct;
      entry.count++;
    }
    if (c.changeStatus === '신규') entry.newItem++;
    if (c.changeStatus === '삭제') entry.del++;
    catMap.set(cat, entry);
  }
  return { changes, catSummary: Array.from(catMap.values()) };
}
