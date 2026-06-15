import { readFileSync } from 'node:fs';
import { resolve } from 'node:path';

const DOC = readFileSync(resolve('docs/DEFERRED_WORK.md'), 'utf8');

function completedBugItems() {
  return new Set([...DOC.matchAll(/^####\s+(B-\d+)\..*✅\s*완료/gm)].map(match => match[1]));
}

function bugIndexRows() {
  return DOC.split(/\r?\n/)
    .filter(line => /^\|\s*\d+\s*\|\s+\*\*B-\d+\*\*/.test(line))
    .map(line => {
      const cells = line
        .split('|')
        .slice(1, -1)
        .map(cell => cell.trim());
      return {
        item: cells[1]?.replace(/\*/g, ''),
        status: cells[3] || '',
        gate: cells[4] || '',
        line,
      };
    });
}

describe('deferred work doc policy', () => {
  test('완료된 B 항목은 버그 우선 처리 색인에 게이트/보류로 남기지 않는다', () => {
    const completed = completedBugItems();
    const staleRows = bugIndexRows().filter(
      row => completed.has(row.item) && !row.status.includes('✅ 완료')
    );

    expect(staleRows).toEqual([]);
  });

  test('게이트 대기 요약은 완료된 B 항목을 다시 지목하지 않는다', () => {
    const completed = completedBugItems();
    const gateSummaryLine = DOC.split(/\r?\n/).find(line => line.includes('게이트 대기 버그'));
    const staleItems = [...completed].filter(item => gateSummaryLine?.includes(item));

    expect(staleItems).toEqual([]);
  });
});
