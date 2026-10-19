import { describe, expect, test } from '@jest/globals';
import { readFileSync } from 'node:fs';
import { PRINT_NO_SPLIT_CSS } from '../../lib/print/no-split-css.js';
import { buildJournalPrintHtml } from '../../lib/note/journal-print.js';
import { buildMarketPrintHtml } from '../../lib/note/market-print.js';

// 2026-10-19 주임님 지시: 모든 출력(PDF)에서 항목이 쪽 사이에서 반쪽으로 잘리지 않게 한다.
const read = p => readFileSync(new URL(`../../${p}`, import.meta.url), 'utf8');

describe('인쇄 공통 규칙', () => {
  test('표의 행·사진은 자르지 않고, 표 머리글은 쪽마다 다시 찍는다', () => {
    expect(PRINT_NO_SPLIT_CSS).toMatch(/tr \{[^}]*break-inside: avoid;/);
    expect(PRINT_NO_SPLIT_CSS).toMatch(/thead \{ display: table-header-group;/);
    expect(PRINT_NO_SPLIT_CSS).toMatch(/img, figure \{[^}]*break-inside: avoid;/);
  });

  test('표가 있는 모든 출력 문서가 공통 규칙을 스타일에 넣는다', () => {
    const files = [
      'lib/cost/usage-print.js',
      'lib/ingredient/manage-print/table-report.js',
      'lib/cost/margin/export-print.js',
      'lib/nutrition/origin/print.js',
      'lib/nutrition/label/print.js',
      'app/note/calendar/calendar-print.js',
      'lib/sample/report-print.js',
      'lib/note/report-print/document.js',
    ];
    for (const file of files) {
      const source = read(file);
      expect(source).toContain("from '@/lib/print/no-split-css'");
      expect(source).toContain('${PRINT_NO_SPLIT_CSS}');
    }
  });
});

describe('연구일지·시장조사 PDF', () => {
  const record = {
    id: 1,
    title: '긴 기록',
    date: '2026-10-19',
    type: '시장분석',
    marketTrend: '가'.repeat(900),
  };

  test('기록 카드와 본문 칸(길어도)을 쪽 사이에서 자르지 않는다', () => {
    for (const html of [
      buildMarketPrintHtml([record]),
      buildJournalPrintHtml('2026-10-19', [
        { noteType: '연구일지', title: '일지', testContent: '가'.repeat(900) },
      ]),
    ]) {
      expect(html).toMatch(
        /\.report-card \{[^}]*break-inside: avoid;[^}]*page-break-inside: avoid;/
      );
      expect(html).toMatch(/\.report-section \{[^}]*break-inside: avoid;/);
      expect(html).not.toContain('.report-section.long { break-inside: auto;');
    }
  });
});

describe('보고서(판매량·원가·단가·출고량) PDF', () => {
  test('구획(paper-section)이 쪽 사이에서 잘리지 않는다', () => {
    const source = read('lib/report/print.js');
    const block = source.slice(source.indexOf('.paper-section {'));
    expect(block.slice(0, 400)).toContain('break-inside: avoid !important;');
    expect(block.slice(0, 400)).not.toContain('break-inside: auto');
  });
});
