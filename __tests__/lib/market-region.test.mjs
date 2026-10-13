import { describe, expect, test } from '@jest/globals';
import { readFileSync } from 'node:fs';
import { MARKET_RESEARCH_REGIONS, normalizeRegion } from '../../lib/note/market-research.js';
import {
  countByRegion,
  EMPTY_FORM,
  includesQuery,
  matchesRegion,
} from '../../app/note/market/marketUtils.js';
import { marketResearchToUnifiedRecord } from '../../lib/note/unified-records.js';

// 2026-10-13 주임님 요청: 시장조사를 국내 / 해외로 구분한다(표기는 "해외").
const read = p => readFileSync(new URL(`../../${p}`, import.meta.url), 'utf8');

const rows = [
  { id: 1, region: '국내', title: '가' },
  { id: 2, region: '해외', title: '나' },
  { id: 3, region: '해외', title: '다' },
  { id: 4, title: '이전 기록(구분 없음)' },
];

describe('시장조사 국내/해외 구분', () => {
  test('구분 값은 국내·해외 두 가지이고 그 밖의 값은 비운다', () => {
    expect(MARKET_RESEARCH_REGIONS).toEqual(['국내', '해외']);
    expect(normalizeRegion(' 해외 ')).toBe('해외');
    expect(normalizeRegion('국외')).toBe('');
    expect(normalizeRegion(undefined)).toBe('');
  });

  test('새 작성 폼의 기본은 국내', () => {
    expect(EMPTY_FORM.region).toBe('국내');
  });

  test('필터: 전체·국내·해외·미분류(이전 기록)', () => {
    expect(rows.filter(r => matchesRegion(r, 'all')).map(r => r.id)).toEqual([1, 2, 3, 4]);
    expect(rows.filter(r => matchesRegion(r, '국내')).map(r => r.id)).toEqual([1]);
    expect(rows.filter(r => matchesRegion(r, '해외')).map(r => r.id)).toEqual([2, 3]);
    expect(rows.filter(r => matchesRegion(r, 'none')).map(r => r.id)).toEqual([4]);
  });

  test('칩 건수와 키워드 검색(해외로도 찾는다)', () => {
    expect(countByRegion(rows)).toEqual({ all: 4, none: 1, 국내: 1, 해외: 2 });
    expect(includesQuery(rows[1], '해외')).toBe(true);
    expect(includesQuery(rows[0], '해외')).toBe(false);
  });

  test('연구일지로 넘어가는 기록 요약에 구분이 붙는다', () => {
    const record = marketResearchToUnifiedRecord({ id: 9, title: '벌집 토핑', region: '해외' });
    expect(record.testContent).toContain('시장조사 기록 작성 — 벌집 토핑 (해외)');
    expect(marketResearchToUnifiedRecord({ id: 10, title: '구기록' }).testContent).not.toContain(
      '('
    );
  });

  test('저장 정규화·작성 모달·목록·카드가 구분을 다룬다', () => {
    expect(read('lib/note/market-research.js')).toContain('region: normalizeRegion(data.region)');
    expect(read('app/note/market/_MarketWriteModal.jsx')).toContain('<RegionField');
    expect(read('app/note/market/_MarketListPanel.jsx')).toContain('onRegionChange');
    expect(read('app/note/market/_MarketRecordCard.jsx')).toContain('row.region');
  });
});
