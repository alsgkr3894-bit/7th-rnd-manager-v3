import {
  workLogCutoffDate,
  filterOldWorkLogs,
  WORK_LOG_TYPES,
  WORK_LOG_RETENTION_DAYS,
} from '../../lib/work-log.js';

/**
 * 회귀 방지: 작업 로그 보관 정리(pruning)의 순수 로직과 타입 라벨 무결성.
 */
describe('work-log pruning 순수 로직', () => {
  test('workLogCutoffDate — keepDays만큼 과거 날짜(YYYY-MM-DD)', () => {
    const now = new Date('2026-06-05T12:00:00Z');
    expect(workLogCutoffDate(60, now)).toBe('2026-04-06');
    expect(workLogCutoffDate(0, now)).toBe('2026-06-05');
  });

  test('filterOldWorkLogs — cutoff 미만 로그만 반환', () => {
    const all = [
      { id: 1, date: '2026-04-01' }, // old
      { id: 2, date: '2026-04-06' }, // == cutoff → 유지(미만 아님)
      { id: 3, date: '2026-06-04' }, // recent
    ];
    const old = filterOldWorkLogs(all, '2026-04-06');
    expect(old.map(r => r.id)).toEqual([1]);
  });

  test('filterOldWorkLogs — 빈/누락 입력 안전', () => {
    expect(filterOldWorkLogs(null, '2026-01-01')).toEqual([]);
    expect(filterOldWorkLogs([], '2026-01-01')).toEqual([]);
  });

  test('보관 기간 기본값', () => {
    expect(WORK_LOG_RETENTION_DAYS).toBe(60);
  });
});

describe('work-log 타입 라벨 무결성', () => {
  test('신규 데이터 관리 타입(삭제/초기화/백업/복원/보안)이 모두 정의됨', () => {
    for (const t of ['DELETE', 'RESET', 'BACKUP', 'RESTORE', 'SECURITY', 'UPLOAD', 'OTHER']) {
      expect(WORK_LOG_TYPES[t]).toBeDefined();
      expect(typeof WORK_LOG_TYPES[t].label).toBe('string');
      expect(WORK_LOG_TYPES[t].label.length).toBeGreaterThan(0);
    }
  });

  test('모든 타입은 label·color·icon을 가진다', () => {
    for (const [, meta] of Object.entries(WORK_LOG_TYPES)) {
      expect(meta.label && meta.color && meta.icon).toBeTruthy();
    }
  });
});
