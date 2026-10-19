import { describe, expect, test } from '@jest/globals';
import { readFileSync } from 'node:fs';
import { buildMarketPrintHtml } from '../../lib/note/market-print.js';
import { buildJournalPrintHtml } from '../../lib/note/journal-print.js';
import { describeMarketFilters } from '../../app/note/market/marketFilterUtils.js';

// 2026-10-19 주임님 요청: 시장조사 화면에서도 PDF로 출력한다(목록 전체·한 건).
const read = p => readFileSync(new URL(`../../${p}`, import.meta.url), 'utf8');

const rows = [
  {
    id: 1,
    title: '일본 치킨 신메뉴',
    date: '2026-10-19',
    type: '시장분석',
    brand: 'KFC',
    region: '해외',
    country: '일본',
    brandType: '치킨',
    competitor: '냉동 치킨',
    marketTrend: '간장 마늘 맛이 늘고 있다',
    photos: [{ data: 'data:image/png;base64,AAAA', caption: '매장 사진' }],
  },
  {
    id: 2,
    title: '국내 피자 가격',
    date: '2026-10-18',
    type: '올해트렌드',
    region: '국내',
    country: '한국',
    brandType: '피자',
    marketTrend: '1인 피자 수요',
  },
];

describe('시장조사 PDF HTML', () => {
  const html = buildMarketPrintHtml(rows, { filterLabel: '해외 · 치킨', brandName: '7번가피자' });

  test('문서 이름·머리 문구가 시장조사로 나온다(연구일지 문구 없음)', () => {
    expect(html).toContain('<div class="doc-title">시장조사 보고서</div>');
    expect(html).toContain('시장조사</div>');
    expect(html).toContain('<span class="summary-label">조회 조건</span>해외 · 치킨');
    expect(html).toContain('<span class="summary-label">문서 구분</span>시장조사');
    expect(html).toContain('시장조사 보고서 해외 · 치킨');
    expect(html).not.toContain('R&amp;D 연구일지');
    expect(html).not.toContain('대상 기간');
  });

  test('기록마다 보고서 카드가 있고 시장 구분·국가·브랜드 업종이 머리 줄에 나온다', () => {
    expect(html.split('시장조사 보고 #').length - 1).toBe(2);
    expect(html).toContain('<b>시장 구분:</b> 해외');
    expect(html).toContain('<b>국가:</b> 일본');
    expect(html).toContain('<b>브랜드 업종:</b> 치킨');
    expect(html).toContain('<b>시장 구분:</b> 국내');
    expect(html).toContain('<b>브랜드 업종:</b> 피자');
    expect(html).toContain('<span class="summary-label">보고 건수</span>2건');
  });

  test('본문 내용과 사진이 함께 나온다', () => {
    expect(html).toContain('간장 마늘 맛이 늘고 있다');
    expect(html).toContain('data:image/png;base64,AAAA');
    expect(html).toContain('매장 사진');
  });

  test('필터 설명이 비면 "전체"로 적고, 기록이 없어도 깨지지 않는다', () => {
    expect(buildMarketPrintHtml(rows)).toContain(
      '<span class="summary-label">조회 조건</span>전체'
    );
    expect(buildMarketPrintHtml([], {})).toContain('보고 건수</span>0건');
  });

  test('연구일지 PDF는 그대로 연구일지 문구를 쓴다(공용 빌더의 기본값)', () => {
    const journal = buildJournalPrintHtml('2026-10-19', []);
    expect(journal).toContain('R&amp;D 연구일지');
    expect(journal).toContain('대상 기간');
    expect(journal).toContain('<span class="summary-label">문서 구분</span>연구일지');
  });
});

describe('조회 조건 문구', () => {
  test('걸어 둔 필터·검색어를 순서대로 잇고, 없으면 전체', () => {
    expect(describeMarketFilters({})).toBe('전체');
    expect(describeMarketFilters({ region: 'all', brandType: '', country: '', query: ' ' })).toBe(
      '전체'
    );
    expect(
      describeMarketFilters({ region: '해외', brandType: '치킨', country: '일본', query: '벌집' })
    ).toBe('해외 · 치킨 · 일본 · 벌집');
    expect(describeMarketFilters({ region: 'none' })).toBe('미분류');
  });
});

describe('화면 연결', () => {
  test('헤더 PDF 출력 버튼과 상세 창 PDF 버튼이 출력 훅을 부른다', () => {
    const page = read('app/note/market/page.jsx');
    expect(page).toContain('PDF 출력');
    expect(page).toContain('print.printList');
    expect(page).toContain('print.printOne(detailRow)');
    expect(read('app/note/market/_MarketDetailModal.jsx')).toContain('onPdf');
    const hook = read('app/note/market/useMarketPrint.js');
    expect(hook).toContain('buildMarketPrintHtml');
    expect(hook).toContain('openPrintWindow');
  });
});

// 2026-10-19 주임님 요청: 시장조사를 연·월 단위로 조회하고, PDF 출력도 그 조건으로 낸다.
describe('시장조사 연·월 조회', () => {
  const dated = [
    { id: 1, date: '2026-10-19', title: 'a' },
    { id: 2, date: '2026-10-02', title: 'b' },
    { id: 3, date: '2026-09-30', title: 'c' },
    { id: 4, date: '2025-12-31', title: 'd' },
    { id: 5, title: '날짜 없음' },
  ];

  test('연도만 고르면 그 해 전체, 월까지 고르면 그 달만, 안 고르면 전부', async () => {
    const { matchesPeriod } = await import('../../app/note/market/marketFilterUtils.js');
    const ids = (year, month) => dated.filter(r => matchesPeriod(r, year, month)).map(r => r.id);
    expect(ids('', '')).toEqual([1, 2, 3, 4, 5]);
    expect(ids('2026', '')).toEqual([1, 2, 3]);
    expect(ids('2026', '10')).toEqual([1, 2]);
    expect(ids('2026', '9')).toEqual([3]); // 한 자리 월도 받는다
    expect(ids('2025', '12')).toEqual([4]);
    expect(ids('2024', '')).toEqual([]);
    // 기간을 고르면 날짜 없는 기록은 빠진다
    expect(ids('2026', '')).not.toContain(5);
  });

  test('연도 목록은 최근 연도 먼저 건수와 함께, 월별 건수는 고른 해 안에서만', async () => {
    const { yearOptionsOf, monthCountsOf } =
      await import('../../app/note/market/marketFilterUtils.js');
    expect(yearOptionsOf(dated)).toEqual([
      { year: '2026', count: 3 },
      { year: '2025', count: 1 },
    ]);
    expect(monthCountsOf(dated, '2026')).toEqual({ 10: 2, '09': 1 });
    expect(monthCountsOf(dated, '')).toEqual({});
  });

  test('조회 조건 문구에 연·월이 맨 앞에 붙는다(PDF 머리에 그대로 적힘)', () => {
    expect(describeMarketFilters({ year: '2026', month: '10' })).toBe('2026년 10월');
    expect(describeMarketFilters({ year: '2026', month: '' })).toBe('2026년');
    expect(
      describeMarketFilters({ year: '2026', month: '09', region: '해외', brandType: '치킨' })
    ).toBe('2026년 9월 · 해외 · 치킨');
    expect(describeMarketFilters({ month: '10' })).toBe('전체'); // 연도 없이 월만 있으면 무시
  });

  test('고른 연도가 목록에서 사라지면 연·월 조회를 푼다', async () => {
    const { staleFilterResets } = await import('../../app/note/market/marketFilterUtils.js');
    const years = [{ year: '2026', count: 3 }];
    expect(staleFilterResets({ year: '2025', month: '12', yearOptions: years })).toEqual({
      year: '',
      month: '',
    });
    expect(staleFilterResets({ year: '2026', month: '10', yearOptions: years })).toBeNull();
    expect(staleFilterResets({ year: '', month: '10', yearOptions: years })).toEqual({ month: '' });
  });

  test('PDF가 고른 연·월 기록만 담고 머리에 조회 기간을 적는다', async () => {
    const { matchesPeriod } = await import('../../app/note/market/marketFilterUtils.js');
    const october = dated.filter(r => matchesPeriod(r, '2026', '10'));
    const html = buildMarketPrintHtml(october, {
      filterLabel: describeMarketFilters({ year: '2026', month: '10' }),
    });
    expect(html).toContain('<span class="summary-label">조회 조건</span>2026년 10월');
    expect(html).toContain('<span class="summary-label">보고 건수</span>2건');
    expect(html).toContain('시장조사 보고서 2026년 10월');
  });

  test('목록·PDF가 같은 연·월 조건을 쓴다', () => {
    const list = read('app/note/market/useMarketResearchList.js');
    expect(list).toContain('matchesPeriod(row, year, month)');
    expect(read('app/note/market/useMarketPrint.js')).toContain('year: filters?.year');
    expect(read('app/note/market/_MarketFilters.jsx')).toContain('aria-label="월별 보기"');
  });
});
