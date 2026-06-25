import {
  JOURNAL_NOTE_TYPE,
  NOTE_STATUS,
  NOTE_TYPES,
  CATEGORIES,
  STATUSES,
} from '../../lib/note/constants.js';

describe('NOTE_STATUS', () => {
  test('필수 상태 키 존재', () => {
    expect(NOTE_STATUS.TEST).toBe('테스트');
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
  test('노트 작성 유형은 새 메뉴개발 체계만 노출한다', () => {
    expect(JOURNAL_NOTE_TYPE).toBe('연구일지');
    expect(NOTE_TYPES).toEqual(['메뉴개발', '메뉴개선', '샘플', JOURNAL_NOTE_TYPE]);
    expect(NOTE_TYPES).not.toContain('아이디어');
    expect(NOTE_TYPES).not.toContain('메뉴테스트');
    expect(NOTE_TYPES).not.toContain('샘플테스트');
  });
});

describe('STATUSES', () => {
  test('노트 작성 상태는 운영 상태만 노출한다', () => {
    expect(STATUSES).toEqual(['테스트', '재테스트', '출시예정', '보류', '출시', '폐기']);
    expect(STATUSES).not.toContain('아이디어');
    expect(STATUSES).not.toContain('메뉴테스트');
    expect(STATUSES).not.toContain('보고예정');
    expect(STATUSES).not.toContain('샘플테스트');
    expect(STATUSES).not.toContain('테스트중');
  });
});
