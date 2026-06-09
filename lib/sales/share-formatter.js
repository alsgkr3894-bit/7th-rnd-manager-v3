import { formatPeriodKor } from '@/lib/format';
import { asDisplayText, asFiniteNumber, asObjectArray } from '@/lib/ui/prop-guards';

function formatCount(value) {
  return (asFiniteNumber(value, 0) ?? 0).toLocaleString();
}

/**
 * 판매 순위 공유용 텍스트를 생성하는 순수 함수.
 * 클립보드 복사·토스트 등의 부수효과는 호출부에서 처리한다.
 */
export function formatShareText(input = {}) {
  const value = input && typeof input === 'object' && !Array.isArray(input) ? input : {};
  const mode = asDisplayText(value.mode, 'single');
  const periodA = value.periodA;
  const periodB = value.periodB;
  const singleMenus = asObjectArray(value.singleMenus);
  const singleCategory = asDisplayText(value.singleCategory);
  const compareRows = asObjectArray(value.compare?.rows);
  const lines = [`📊 판매 순위 ${formatPeriodKor(periodA)}`];

  if (mode === 'single') {
    // buildGroupRanking 결과: { name, category, quantity, sizes }
    const filtered = singleCategory
      ? singleMenus.filter(m => asDisplayText(m.category) === singleCategory)
      : singleMenus;
    filtered.slice(0, 10).forEach((m, i) => {
      lines.push(`${i + 1}위 ${asDisplayText(m.name, '-')} — ${formatCount(m.quantity)}개`);
    });
  } else {
    // buildPeriodCompare 결과: { rows: [{ name, category, a, b, diff, ... }], ... }
    if (compareRows.length) {
      const periodBStr = formatPeriodKor(periodB);
      if (periodBStr !== '-') lines.push(`비교 기간: ${periodBStr}`);
      const sorted = [...compareRows]
        .sort((a, b) => (asFiniteNumber(b.a, 0) ?? 0) - (asFiniteNumber(a.a, 0) ?? 0))
        .slice(0, 10);
      sorted.forEach((m, i) => {
        const a = asFiniteNumber(m.a, 0) ?? 0;
        const b = asFiniteNumber(m.b, 0) ?? 0;
        const diff = a - b;
        const diffStr = diff > 0
          ? `▲${diff.toLocaleString()}`
          : diff < 0
            ? `▼${Math.abs(diff).toLocaleString()}`
            : '±0';
        lines.push(`${i + 1}위 ${asDisplayText(m.name, '-')} — ${a.toLocaleString()}개 (${diffStr})`);
      });
    }
  }

  return lines.join('\n');
}
