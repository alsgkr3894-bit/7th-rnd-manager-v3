import { describe, expect, test } from '@jest/globals';
import { calculateLeaveBalance, getLeaveCycle } from '../../lib/note/annual-leave.js';

const profile = { hireDate: '2024-06-10', annualLeaveDays: 15 };

function balance(today, schedules = []) {
  return calculateLeaveBalance({ ...profile, today, schedules });
}

describe('입사일 기준 연차', () => {
  test('6월 9일과 6월 10일에 주기가 바뀌고 이월되지 않는다', () => {
    expect(getLeaveCycle(profile.hireDate, '2026-06-09')).toEqual({
      start: '2025-06-10',
      end: '2026-06-09',
    });
    expect(getLeaveCycle(profile.hireDate, '2026-06-10')).toEqual({
      start: '2026-06-10',
      end: '2027-06-09',
    });
    const schedules = [
      { date: '2026-06-09', type: '연차', leaveCounted: true },
      { date: '2026-06-10', type: '반차', leaveCounted: true },
    ];
    expect(balance('2026-06-09', schedules)).toMatchObject({
      leaveYear: 2,
      daysRemaining: 1,
      used: 1,
      remaining: 14,
    });
    expect(balance('2026-06-10', schedules)).toMatchObject({
      leaveYear: 3,
      daysRemaining: 365,
      used: 0.5,
      remaining: 14.5,
    });
  });

  test('기존 일정과 예정 일정도 차감하고 다른 유형은 제외한다', () => {
    const schedules = [
      { date: '2026-12-01', type: '연차', leaveCounted: true },
      { date: '2027-01-04', type: '반차', leaveCounted: true },
      { date: '2026-12-02', type: '연차' },
      { date: '2026-12-03', type: '기타', leaveCounted: true },
    ];
    const result = balance('2026-10-21', schedules);
    expect(result).toMatchObject({ used: 2.5, remaining: 12.5 });
    expect(result.entries).toHaveLength(3);
    expect(result.entries.every(entry => entry.status === '예정')).toBe(true);
  });

  test('지난 일정은 사용, 오늘과 이후 일정은 예정으로 표시한다', () => {
    const result = balance('2026-10-21', [
      { date: '2026-10-20', type: '연차' },
      { date: '2026-10-21', type: '반차' },
      { date: '2026-10-22', type: '연차' },
    ]);
    expect(result).toMatchObject({ used: 2.5, remaining: 12.5 });
    expect(result.entries.map(entry => entry.status)).toEqual(['사용', '예정', '예정']);
  });

  test('22일부터 26일까지 연차는 주말을 빼고 평일 3일만 차감한다', () => {
    const result = balance('2026-10-21', [
      {
        id: 7,
        date: '2026-10-22',
        endDate: '2026-10-26',
        type: '연차',
        title: '휴가',
        leaveCounted: true,
      },
    ]);
    expect(result).toMatchObject({ used: 3, remaining: 12 });
    expect(result.entries[0]).toMatchObject({
      start: '2026-10-22',
      end: '2026-10-26',
      days: 3,
      status: '예정',
      countedDates: ['2026-10-22', '2026-10-23', '2026-10-26'],
    });
  });

  test('반차 기간과 연차 주기 경계를 날짜별로 계산한다', () => {
    const schedules = [
      { id: 1, date: '2026-06-08', endDate: '2026-06-12', type: '반차', leaveCounted: true },
    ];
    expect(balance('2026-06-09', schedules)).toMatchObject({ used: 1, remaining: 14 });
    expect(balance('2026-06-10', schedules)).toMatchObject({ used: 1.5, remaining: 13.5 });
    expect(balance('2026-06-10', schedules).entries[0]).toMatchObject({
      start: '2026-06-10',
      end: '2026-06-12',
      days: 1.5,
    });
  });

  test('수정·삭제된 일정 목록을 다시 계산하고 초과 사용을 표시할 수 있다', () => {
    const schedules = Array.from({ length: 16 }, () => ({
      date: '2026-10-01',
      type: '연차',
      leaveCounted: true,
    }));
    expect(balance('2026-10-21', schedules)).toMatchObject({ used: 16, remaining: -1 });
    expect(balance('2026-10-21', schedules.slice(1))).toMatchObject({ used: 15, remaining: 0 });
    expect(balance('2026-10-21', [{ ...schedules[0], type: '반차' }])).toMatchObject({
      used: 0.5,
      remaining: 14.5,
    });
  });

  test('입사일과 지급일수를 바꾸면 새 기준으로 계산한다', () => {
    expect(
      calculateLeaveBalance({
        hireDate: '2025-03-01',
        annualLeaveDays: 20,
        today: '2026-10-21',
        schedules: [],
      })
    ).toMatchObject({ start: '2026-03-01', end: '2027-02-28', remaining: 20 });
  });
});
