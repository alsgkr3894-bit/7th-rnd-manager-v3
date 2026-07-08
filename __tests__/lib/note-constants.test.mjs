import {
  JOURNAL_NOTE_TYPE,
  MENU_DEVELOPMENT_NOTE_TYPES,
  NOTE_STATUS,
  NOTE_TYPES,
  CATEGORIES,
  STATUSES,
  getNoteCategoryOptionsForBrand,
  normalizeNoteCategoryForBrand,
  normalizeNoteStatus,
} from '../../lib/note/constants.js';

describe('NOTE_STATUS', () => {
  test('필수 상태 키 존재', () => {
    expect(NOTE_STATUS.TEST).toBe('테스트');
    expect(NOTE_STATUS.TEST_SCHEDULED).toBe('테스트예정');
    expect(NOTE_STATUS.TESTING).toBe('테스트중');
    expect(NOTE_STATUS.REPORTING).toBeUndefined();
  });
  test('추가 상태 키 검증', () => {
    expect(NOTE_STATUS.RETEST).toBeUndefined();
    expect(NOTE_STATUS.RELEASE_READY).toBeUndefined();
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

  test('차이나X4와 이천밥쌤은 메뉴/사이드 개발구분만 사용한다', () => {
    expect(getNoteCategoryOptionsForBrand('china4')).toEqual(['메뉴', '사이드']);
    expect(getNoteCategoryOptionsForBrand('icheon')).toEqual(['메뉴', '사이드']);
    expect(getNoteCategoryOptionsForBrand('main')).toEqual(CATEGORIES);
    expect(normalizeNoteCategoryForBrand('피자', 'china4')).toBe('메뉴');
    expect(normalizeNoteCategoryForBrand('사이드', 'icheon')).toBe('사이드');
  });
});

describe('NOTE_TYPES', () => {
  test('노트 작성 유형은 새 메뉴개발 체계만 노출한다', () => {
    expect(JOURNAL_NOTE_TYPE).toBe('연구일지');
    expect(NOTE_TYPES).toEqual(['메뉴개발', '메뉴개선', '샘플', JOURNAL_NOTE_TYPE]);
    expect(MENU_DEVELOPMENT_NOTE_TYPES).toEqual(['메뉴개발', '메뉴개선']);
    expect(NOTE_TYPES).not.toContain('아이디어');
    expect(NOTE_TYPES).not.toContain('메뉴테스트');
    expect(NOTE_TYPES).not.toContain('샘플테스트');
  });
});

describe('STATUSES', () => {
  test('노트 작성 상태는 운영 상태만 노출한다', () => {
    expect(STATUSES).toEqual(['테스트', '테스트예정', '보류', '출시', '폐기']);
    expect(STATUSES).not.toContain('아이디어');
    expect(STATUSES).not.toContain('메뉴테스트');
    expect(STATUSES).not.toContain('보고예정');
    expect(STATUSES).not.toContain('재테스트');
    expect(STATUSES).not.toContain('출시예정');
    expect(STATUSES).not.toContain('샘플테스트');
    expect(STATUSES).not.toContain('테스트중');
  });

  test('테스트예정 상태를 정규화한다', () => {
    expect(normalizeNoteStatus('테스트예정')).toBe('테스트예정');
    expect(normalizeNoteStatus(' 테스트 예정 ')).toBe('테스트예정');
  });
});
