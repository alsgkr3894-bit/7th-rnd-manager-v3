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
import { noteMetaPairs } from '../../lib/note/display.js';
import { buildJournalPrintHtml } from '../../lib/note/journal-print.js';

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

  // 2026-10-13: 시장조사가 연구일지 보고서(웹 카드·PDF)에 들어갈 때 국내/해외가 머리 줄에 나온다.
  test('보고서 머리 줄에 "시장 구분"이 나온다(구분 없는 이전 기록은 줄 없음)', () => {
    const overseas = marketResearchToUnifiedRecord({
      id: 11,
      title: '벌집 토핑',
      date: '2026-10-13',
      type: '시장분석',
      brand: '도미노',
      region: '해외',
    });
    expect(noteMetaPairs(overseas)).toEqual([
      ['작성일', '2026-10-13'],
      ['시장 구분', '해외'],
      ['유형', '시장분석'],
      ['브랜드 / 출처', '도미노'],
    ]);
    const legacy = marketResearchToUnifiedRecord({ id: 12, title: '구기록', type: '시장분석' });
    expect(noteMetaPairs(legacy).map(([label]) => label)).not.toContain('시장 구분');
  });

  test('연구일지 PDF HTML에 시장 구분이 실제로 렌더된다', () => {
    const html = buildJournalPrintHtml('2026-10-13', [
      marketResearchToUnifiedRecord({
        id: 13,
        title: '벌집 토핑',
        date: '2026-10-13',
        type: '시장분석',
        region: '해외',
      }),
      marketResearchToUnifiedRecord({
        id: 14,
        title: '국내 신메뉴',
        date: '2026-10-13',
        type: '시장분석',
        region: '국내',
      }),
    ]);
    expect(html).toContain('<b>시장 구분:</b> 해외');
    expect(html).toContain('<b>시장 구분:</b> 국내');
  });

  // 2026-10-19: 국가도 같은 머리 줄에 — 연구일지 웹 카드와 PDF가 같은 함수를 쓴다.
  test('보고서 머리 줄과 연구일지 PDF HTML에 국가가 나온다(국가 없는 기록은 줄 없음)', () => {
    const withCountry = marketResearchToUnifiedRecord({
      id: 21,
      title: '벌집 토핑',
      date: '2026-10-19',
      type: '시장분석',
      brand: '도미노',
      region: '해외',
      country: '일본',
    });
    expect(noteMetaPairs(withCountry)).toEqual([
      ['작성일', '2026-10-19'],
      ['시장 구분', '해외'],
      ['국가', '일본'],
      ['유형', '시장분석'],
      ['브랜드 / 출처', '도미노'],
    ]);
    const withoutCountry = marketResearchToUnifiedRecord({
      id: 22,
      title: '국가 미입력',
      date: '2026-10-19',
      type: '시장분석',
      region: '국내',
    });
    expect(noteMetaPairs(withoutCountry).map(([label]) => label)).not.toContain('국가');
    const html = buildJournalPrintHtml('2026-10-19', [withCountry, withoutCountry]);
    expect(html).toContain('<b>국가:</b> 일본');
    expect(html.split('<b>국가:</b>').length - 1).toBe(1);
  });

  test('저장 정규화·작성 모달·목록·카드가 구분을 다룬다', () => {
    expect(read('lib/note/market-research.js')).toContain('region: normalizeRegion(data.region)');
    expect(read('app/note/market/_MarketWriteModal.jsx')).toContain('<RegionField');
    expect(read('app/note/market/_MarketListPanel.jsx')).toContain('onRegionChange');
    expect(read('app/note/market/_MarketRecordCard.jsx')).toContain('row.region');
  });
});

// 2026-10-19 주임님 요청: 시장조사 작성에서 국가(한국·미국·일본 등)를 직접 입력할 수 있게 한다.
describe('시장조사 국가 입력', () => {
  const countryRows = [
    { id: 1, country: '일본', title: 'a' },
    { id: 2, country: '미국', title: 'b' },
    { id: 3, country: '일본', title: 'c' },
    { id: 4, title: '국가 없음' },
  ];

  test('국가는 자유 입력이라 목록에 없는 나라도 그대로 저장된다', async () => {
    const { MARKET_COUNTRY_SUGGESTIONS } = await import('../../lib/note/market-research.js');
    expect(MARKET_COUNTRY_SUGGESTIONS).toEqual(expect.arrayContaining(['한국', '미국', '일본']));
    expect(read('lib/note/market-research.js')).toContain('country: clean(data.country)');
  });

  test('쓴 나라는 자주 쓴 순, 입력 추천은 쓴 나라가 먼저 + 기본 추천(중복 제외)', async () => {
    const { usedCountriesOf, countryOptionsOf } =
      await import('../../app/note/market/marketPageUtils.js');
    expect(usedCountriesOf(countryRows)).toEqual([
      { country: '일본', count: 2 },
      { country: '미국', count: 1 },
    ]);
    expect(countryOptionsOf(countryRows, ['한국', '미국', '일본'])).toEqual([
      '일본',
      '미국',
      '한국',
    ]);
    expect(countryOptionsOf([], ['한국'])).toEqual(['한국']);
  });

  test('국가 필터·키워드 검색', async () => {
    const { matchesCountry } = await import('../../app/note/market/marketUtils.js');
    expect(countryRows.filter(r => matchesCountry(r, '일본')).map(r => r.id)).toEqual([1, 3]);
    expect(countryRows.filter(r => matchesCountry(r, '')).length).toBe(4);
    expect(includesQuery(countryRows[0], '일본')).toBe(true);
    expect(includesQuery(countryRows[1], '일본')).toBe(false);
  });

  test('연구일지 요약에 구분·국가가 함께 붙는다', () => {
    const record = marketResearchToUnifiedRecord({
      id: 11,
      title: '벌집 토핑',
      region: '해외',
      country: '일본',
    });
    expect(record.testContent).toContain('시장조사 기록 작성 — 벌집 토핑 (해외·일본)');
  });

  test('작성 모달·목록·카드가 국가를 다룬다', () => {
    expect(read('app/note/market/_MarketWriteModal.jsx')).toContain('<CountryField');
    expect(read('app/note/market/_MarketFields.jsx')).toContain('list="market-country-options"');
    expect(read('app/note/market/_MarketListPanel.jsx')).toContain('모든 국가');
    expect(read('app/note/market/_MarketRecordCard.jsx')).toContain('row.country');
  });
});
