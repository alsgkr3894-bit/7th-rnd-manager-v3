import { formatPeriodKor } from '@/lib/format';

/**
 * 판매 순위 공유용 텍스트를 생성하는 순수 함수.
 * 클립보드 복사·토스트 등의 부수효과는 호출부에서 처리한다.
 */
export function formatShareText({ mode, periodA, periodB, singleMenus, singleCategory, compare }) {
  const lines = [`📊 판매 순위 ${formatPeriodKor(periodA)}`];

  if (mode === 'single') {
    // buildGroupRanking 결과: { name, category, quantity, sizes }
    const filtered = singleCategory
      ? singleMenus.filter(m => m.category === singleCategory)
      : singleMenus;
    filtered.slice(0, 10).forEach((m, i) => {
      lines.push(`${i + 1}위 ${m.name} — ${(m.quantity ?? 0).toLocaleString()}개`);
    });
  } else {
    // buildPeriodCompare 결과: { rows: [{ name, category, a, b, diff, ... }], ... }
    if (compare?.rows?.length) {
      const periodBStr = formatPeriodKor(periodB);
      if (periodBStr !== '-') lines.push(`비교 기간: ${periodBStr}`);
      const sorted = [...compare.rows]
        .sort((a, b) => (b.a ?? 0) - (a.a ?? 0))
        .slice(0, 10);
      sorted.forEach((m, i) => {
        const diff = (m.a ?? 0) - (m.b ?? 0);
        const diffStr = diff > 0
          ? `▲${diff.toLocaleString()}`
          : diff < 0
            ? `▼${Math.abs(diff).toLocaleString()}`
            : '±0';
        lines.push(`${i + 1}위 ${m.name} — ${(m.a ?? 0).toLocaleString()}개 (${diffStr})`);
      });
    }
  }

  return lines.join('\n');
}
