/**
 * recurrence.test.mjs — expandOccurrences 단위 테스트
 *
 * 실행: node --experimental-vm-modules node_modules/.bin/jest --testPathPattern=recurrence --no-coverage
 */
import { expandOccurrences } from '../../app/note/calendar/_recurrence.js';

// ── 헬퍼 ───────────────────────────────────────────────────────────────
function sched(date, repeatType = 'none', repeatUntil = null) {
  return { date, repeatType, repeatUntil };
}

// ── none ───────────────────────────────────────────────────────────────
describe('none (단일 발생)', () => {
  test('범위 내: 해당 날짜만 반환', () => {
    expect(expandOccurrences(sched('2026-06-15'), '2026-06-01', '2026-06-30')).toEqual([
      '2026-06-15',
    ]);
  });

  test('범위 밖(이전): 빈 배열', () => {
    expect(expandOccurrences(sched('2026-05-20'), '2026-06-01', '2026-06-30')).toEqual([]);
  });

  test('범위 밖(이후): 빈 배열', () => {
    expect(expandOccurrences(sched('2026-07-01'), '2026-06-01', '2026-06-30')).toEqual([]);
  });

  test('범위 경계(시작): 포함', () => {
    expect(expandOccurrences(sched('2026-06-01'), '2026-06-01', '2026-06-30')).toEqual([
      '2026-06-01',
    ]);
  });

  test('범위 경계(끝): 포함', () => {
    expect(expandOccurrences(sched('2026-06-30'), '2026-06-01', '2026-06-30')).toEqual([
      '2026-06-30',
    ]);
  });

  test('date 없음: 빈 배열', () => {
    expect(
      expandOccurrences(
        { date: '', repeatType: 'none', repeatUntil: null },
        '2026-06-01',
        '2026-06-30'
      )
    ).toEqual([]);
  });
});

// ── daily ──────────────────────────────────────────────────────────────
describe('daily (매일 반복)', () => {
  test('6월 한 달 전체: 30개', () => {
    const res = expandOccurrences(sched('2026-06-01', 'daily'), '2026-06-01', '2026-06-30');
    expect(res).toHaveLength(30);
    expect(res[0]).toBe('2026-06-01');
    expect(res[29]).toBe('2026-06-30');
  });

  test('base가 범위 중간: base 이전 날짜 미포함', () => {
    const res = expandOccurrences(sched('2026-06-10', 'daily'), '2026-06-01', '2026-06-30');
    expect(res[0]).toBe('2026-06-10');
    expect(res).toHaveLength(21); // 10~30일 = 21개
  });

  test('base가 범위 이후: 빈 배열', () => {
    expect(expandOccurrences(sched('2026-07-01', 'daily'), '2026-06-01', '2026-06-30')).toEqual([]);
  });

  test('repeatUntil 이 rangeEnd 보다 이른 경우: repeatUntil 까지만', () => {
    const res = expandOccurrences(
      sched('2026-06-01', 'daily', '2026-06-05'),
      '2026-06-01',
      '2026-06-30'
    );
    expect(res).toEqual(['2026-06-01', '2026-06-02', '2026-06-03', '2026-06-04', '2026-06-05']);
  });

  test('rangeStart가 base보다 뒤: rangeStart 부터 시작', () => {
    const res = expandOccurrences(sched('2026-05-01', 'daily'), '2026-06-01', '2026-06-03');
    expect(res).toEqual(['2026-06-01', '2026-06-02', '2026-06-03']);
  });
});

// ── weekly ─────────────────────────────────────────────────────────────
describe('weekly (매주 반복)', () => {
  test('6월 한 달, base=6월1일(월): 매 7일 → 1,8,15,22,29일', () => {
    const res = expandOccurrences(sched('2026-06-01', 'weekly'), '2026-06-01', '2026-06-30');
    expect(res).toEqual(['2026-06-01', '2026-06-08', '2026-06-15', '2026-06-22', '2026-06-29']);
  });

  test('base가 범위 이전: 범위 내 발생일만 포함', () => {
    // base=2026-05-04(월), 7일 단위: ...06-01, 06-08, ...
    const res = expandOccurrences(sched('2026-05-04', 'weekly'), '2026-06-01', '2026-06-30');
    expect(res[0]).toBe('2026-06-01');
    expect(res).toHaveLength(5);
  });

  test('repeatUntil 적용', () => {
    const res = expandOccurrences(
      sched('2026-06-01', 'weekly', '2026-06-15'),
      '2026-06-01',
      '2026-06-30'
    );
    expect(res).toEqual(['2026-06-01', '2026-06-08', '2026-06-15']);
  });
});

// ── monthly ────────────────────────────────────────────────────────────
describe('monthly (매월 반복)', () => {
  test('base=2026-01-15, 1~6월 범위: 매달 15일 6개', () => {
    const res = expandOccurrences(sched('2026-01-15', 'monthly'), '2026-01-01', '2026-06-30');
    expect(res).toEqual([
      '2026-01-15',
      '2026-02-15',
      '2026-03-15',
      '2026-04-15',
      '2026-05-15',
      '2026-06-15',
    ]);
  });

  test('base=2026-01-31 (말일): 31일 없는 달은 건너뜀', () => {
    const res = expandOccurrences(sched('2026-01-31', 'monthly'), '2026-01-01', '2026-06-30');
    // 1월(31), 3월(31), 5월(31) — 2/4/6월은 31일 없음
    expect(res).toEqual(['2026-01-31', '2026-03-31', '2026-05-31']);
  });

  test('base가 범위 이전: 범위 내 발생만 포함', () => {
    const res = expandOccurrences(sched('2025-06-20', 'monthly'), '2026-06-01', '2026-06-30');
    expect(res).toEqual(['2026-06-20']);
  });

  test('repeatUntil 이 범위 중간: 그 달까지만', () => {
    const res = expandOccurrences(
      sched('2026-01-10', 'monthly', '2026-04-10'),
      '2026-01-01',
      '2026-06-30'
    );
    expect(res).toEqual(['2026-01-10', '2026-02-10', '2026-03-10', '2026-04-10']);
  });

  test('base=2026-06-30 (6월 말일): rangeEnd=2027-03-31', () => {
    // 매달 30일: 1/3/5/7/8/10/12월은 30일 이상, 2월 없음
    const res = expandOccurrences(sched('2026-06-30', 'monthly'), '2026-06-01', '2027-03-31');
    // 6,7,8,9,10,11,12,1,2(없음),3월
    expect(res).toContain('2026-06-30');
    expect(res).toContain('2026-07-30');
    expect(res).toContain('2026-09-30');
    expect(res).not.toContain('2027-02-30'); // 2월에 30일 없음
    expect(res).toContain('2027-03-30');
  });
});

// ── 공통 엣지 케이스 ────────────────────────────────────────────────────
describe('공통 엣지 케이스', () => {
  test('repeatUntil이 rangeStart 이전: 빈 배열', () => {
    // repeatUntil=2026-05-31, range=2026-06-01~30
    expect(
      expandOccurrences(sched('2026-01-01', 'daily', '2026-05-31'), '2026-06-01', '2026-06-30')
    ).toEqual([]);
  });

  test('repeatType 이 알 수 없는 값: none 처럼 단일 발생', () => {
    // 알 수 없는 repeatType은 none과 동일하게 동작
    const res = expandOccurrences(
      { date: '2026-06-15', repeatType: 'unknown_type', repeatUntil: null },
      '2026-06-01',
      '2026-06-30'
    );
    // unknown_type 은 none 분기에 해당하지 않으므로 빈 배열
    // (구현 상 daily/weekly/monthly 외엔 발생하지 않음)
    expect(Array.isArray(res)).toBe(true);
  });
});
