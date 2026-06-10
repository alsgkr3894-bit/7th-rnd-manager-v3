import { NOTE_STATUS, CATEGORIES } from '../../lib/note/constants.js';

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
