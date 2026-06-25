import {
  JOURNAL_NOTE_TYPE,
  NOTE_STATUS,
  NOTE_TYPES,
  CATEGORIES,
  STATUSES,
} from '../../lib/note/constants.js';

describe('NOTE_STATUS', () => {
  test('필수 상태 키 존재', () => {
    expect(NOTE_STATUS.IDEA).toBe('아이디어');
    expect(NOTE_STATUS.TESTING).toBe('테스트중');
    expect(NOTE_STATUS.REPORTING).toBe('보고예정');
  });
  test('추가 상태 키 검증', () => {
    expect(NOTE_STATUS.RETEST).toBe('재테스트');
    expect(NOTE_STATUS.RELEASE_READY).toBe('출시예정');
    expect(NOTE_STATUS.RELEASE).toBe('출시');
    expect(NOTE_STATUS.ABANDON).toBe('폐기');
  });
  test('객체 타입', () => {
    expect(typeof NOTE_STATUS).toBe('object');
    expect(NOTE_STATUS).not.toBeNull();
  });
});

describe('CATEGORIES', () => {
  test('배열 타입', () => {
    expect(Array.isArray(CATEGORIES)).toBe(true);
    expect(CATEGORIES.length).toBeGreaterThan(0);
  });
  test('필수 카테고리 포함', () => {
    expect(CATEGORIES).toContain('피자');
    expect(CATEGORIES).toContain('사이드');
  });
});

describe('NOTE_TYPES', () => {
  test('연구일지 전용 유형을 포함한다', () => {
    expect(JOURNAL_NOTE_TYPE).toBe('연구일지');
    expect(NOTE_TYPES).toContain(JOURNAL_NOTE_TYPE);
  });

  test('노트 작성 유형에서 샘플테스트를 노출하지 않는다', () => {
    expect(NOTE_TYPES).not.toContain('샘플테스트');
  });
});

describe('STATUSES', () => {
  test('노트 작성 상태에서 샘플테스트와 테스트중을 노출하지 않는다', () => {
    expect(STATUSES).not.toContain('샘플테스트');
    expect(STATUSES).not.toContain('테스트중');
  });
});
