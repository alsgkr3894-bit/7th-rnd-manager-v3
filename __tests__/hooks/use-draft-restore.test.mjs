import { describe, expect, jest, test } from '@jest/globals';

jest.unstable_mockModule('@/components/Toast', () => ({
  showToast: () => {},
}));

const { normalizeDraftRestoreValue, parseDraftRestoreValue } =
  await import('../../hooks/useDraftRestore.js');

describe('normalizeDraftRestoreValue', () => {
  test('복원 가능한 객체는 그대로 반환한다', () => {
    const draft = { periodMode: 'latest', opts: { summary: true } };

    expect(normalizeDraftRestoreValue(draft)).toBe(draft);
  });

  test('배열, null, primitive는 복원하지 않는다', () => {
    expect(normalizeDraftRestoreValue(null)).toBeNull();
    expect(normalizeDraftRestoreValue([])).toBeNull();
    expect(normalizeDraftRestoreValue('bad')).toBeNull();
    expect(normalizeDraftRestoreValue(10)).toBeNull();
  });
});

describe('parseDraftRestoreValue', () => {
  test('JSON 문자열에서 복원 가능한 객체만 반환한다', () => {
    expect(parseDraftRestoreValue('{"year":2026,"month":6}')).toEqual({
      year: 2026,
      month: 6,
    });
  });

  test('빈 문자열, 잘못된 JSON, 객체가 아닌 JSON은 null로 처리한다', () => {
    expect(parseDraftRestoreValue('')).toBeNull();
    expect(parseDraftRestoreValue('not-json')).toBeNull();
    expect(parseDraftRestoreValue('[{"year":2026}]')).toBeNull();
    expect(parseDraftRestoreValue('"draft"')).toBeNull();
  });
});
