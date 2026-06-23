import { describe, expect, test } from '@jest/globals';
import {
  checklistJournalContent,
  checklistJournalTitle,
  daysInMonth,
  firstDow,
  groupByDate,
  normalizeChecklistMap,
  rollOverChecklistMap,
  toKey,
} from '../../app/note/calendar/_calendar-utils.js';

describe('calendar utils', () => {
  test('날짜 key와 월 정보 계산을 유지한다', () => {
    expect(toKey(2026, 6, 3)).toBe('2026-06-03');
    expect(daysInMonth(2026, 2)).toBe(28);
    expect(firstDow(2026, 6)).toBe(1);
  });

  test('날짜별 그룹핑은 빈 key를 무시한다', () => {
    const rows = [
      { date: '2026-06-01', title: 'a' },
      { date: '', title: 'b' },
    ];
    const grouped = groupByDate(rows, row => row.date);
    expect(grouped.get('2026-06-01')).toEqual([rows[0]]);
    expect(grouped.has('')).toBe(false);
  });

  test('체크리스트 저장값은 표시 가능한 항목만 보존한다', () => {
    expect(
      normalizeChecklistMap({
        '2026-06-12': [
          { id: 1, text: '테스트', done: true },
          { id: 2, text: '   ', done: true },
        ],
        broken: null,
      })
    ).toEqual({
      '2026-06-12': [{ id: '1', text: '테스트', done: true }],
    });
  });

  test('체크리스트 fallback id는 날짜와 내용 기준으로 안정적으로 생성한다', () => {
    const input = {
      '2026-06-12': [
        { text: '샘플 확인!', done: true },
        { text: '  메뉴 테스트  ', done: false },
      ],
    };

    expect(normalizeChecklistMap(input)).toEqual(normalizeChecklistMap(input));
    expect(normalizeChecklistMap(input)['2026-06-12'].map(item => item.id)).toEqual([
      '2026-06-12-1-샘플-확인',
      '2026-06-12-2-메뉴-테스트',
    ]);
  });

  test('미완료 체크리스트는 오늘로 이월하고 완료/미래 항목은 보존한다', () => {
    expect(
      rollOverChecklistMap(
        {
          '2026-06-21': [
            { id: 'old-done', text: '완료 보존', done: true },
            { id: 'old-pending', text: '이월 대상', done: false },
          ],
          '2026-06-22': [{ id: 'yesterday', text: '어제 미완료', done: false }],
          '2026-06-23': [{ id: 'today', text: '오늘 항목', done: false }],
          '2026-06-24': [{ id: 'future', text: '내일 항목', done: false }],
        },
        '2026-06-23'
      )
    ).toEqual({
      '2026-06-21': [{ id: 'old-done', text: '완료 보존', done: true }],
      '2026-06-23': [
        { id: 'old-pending', text: '이월 대상', done: false },
        { id: 'yesterday', text: '어제 미완료', done: false },
        { id: 'today', text: '오늘 항목', done: false },
      ],
      '2026-06-24': [{ id: 'future', text: '내일 항목', done: false }],
    });
  });

  test('이월된 항목은 오늘에 같은 id가 있으면 중복 추가하지 않는다', () => {
    expect(
      rollOverChecklistMap(
        {
          '2026-06-22': [{ id: 'same', text: '반복 방지', done: false }],
          '2026-06-23': [{ id: 'same', text: '반복 방지', done: false }],
        },
        '2026-06-23'
      )
    ).toEqual({
      '2026-06-23': [{ id: 'same', text: '반복 방지', done: false }],
    });
  });

  test('체크리스트 연구일지 텍스트를 생성한다', () => {
    expect(checklistJournalTitle('2026-06-12')).toBe('2026-06-12 체크리스트 완료');
    expect(checklistJournalContent([{ text: '샘플 확인' }])).toContain('오늘 한 일');
    expect(checklistJournalContent([{ text: '샘플 확인' }])).toContain('- 샘플 확인');
    expect(checklistJournalContent([])).toBe('완료 항목 없음');
  });
});
