import { describe, expect, test } from '@jest/globals';
import { readFileSync } from 'node:fs';

// 2026-10-13 주임님 지시: 모든 보고서의 "포함 섹션" 기본값은 각 보고서의 전체 내용 하나만 체크하고
// 요약·비교 같은 나머지는 체크하지 않는다(필요할 때 직접 켠다).
const read = p => readFileSync(new URL(`../../${p}`, import.meta.url), 'utf8');

/** 소스에서 `키: true/false` 값을 읽는다(기본 opts 객체 안) */
function flag(source, key) {
  const match = source.match(new RegExp('(?:^|[^A-Za-z])' + key + ': (true|false)(?![A-Za-z])'));
  return match ? match[1] === 'true' : undefined;
}

const REPORTS = {
  'app/report/sales/page.jsx': {
    on: ['rankTable'],
    off: [
      'summary',
      'catShare',
      'pizzaMover',
      'catBar',
      'prevComp',
      'variant',
      'revenue',
      'excluded',
    ],
  },
  'app/report/shipment/page.jsx': {
    on: ['fullList'],
    off: ['chart', 'catSummary', 'amountSummary', 'notShippedList'],
  },
  'app/report/cost/page.jsx': {
    on: ['perCategory'],
    off: ['summary', 'catTable', 'riskList', 'recipeAppendix'],
  },
  'app/report/price/page.jsx': {
    on: ['catSummary'],
    off: ['costImpact'],
  },
};

describe('보고서 포함 섹션 기본값 — 전체 내용만 체크', () => {
  for (const [file, { on, off }] of Object.entries(REPORTS)) {
    test(`${file}: ${on.join(', ')}만 켜져 있다`, () => {
      const source = read(file);
      for (const key of on) expect(flag(source, key)).toBe(true);
      for (const key of off) expect(flag(source, key)).toBe(false);
    });
  }
});
