import { parseOptionalNonNegativeNumber, parseOptionalNumber } from '../../lib/parse.js';

describe('parseOptionalNumber', () => {
  test('빈 값은 선택 입력으로 보고 null 처리한다', () => {
    expect(parseOptionalNumber('')).toEqual({ ok: true, value: null });
    expect(parseOptionalNumber(null)).toEqual({ ok: true, value: null });
  });

  test('음수를 포함한 유효 숫자는 number로 정규화한다', () => {
    expect(parseOptionalNumber('-12.5')).toEqual({ ok: true, value: -12.5 });
    expect(parseOptionalNumber('1,234')).toEqual({ ok: true, value: 1234 });
  });

  test('잘못된 숫자는 실패로 표시한다', () => {
    expect(parseOptionalNumber('abc')).toEqual({ ok: false, value: null });
    expect(parseOptionalNumber('Infinity')).toEqual({ ok: false, value: null });
  });
});

describe('parseOptionalNonNegativeNumber', () => {
  test('빈 값은 선택 입력으로 보고 null 처리한다', () => {
    expect(parseOptionalNonNegativeNumber('')).toEqual({ ok: true, value: null });
    expect(parseOptionalNonNegativeNumber('   ')).toEqual({ ok: true, value: null });
    expect(parseOptionalNonNegativeNumber(null)).toEqual({ ok: true, value: null });
  });

  test('0 이상의 숫자는 number로 정규화한다', () => {
    expect(parseOptionalNonNegativeNumber('0')).toEqual({ ok: true, value: 0 });
    expect(parseOptionalNonNegativeNumber('1,234.5')).toEqual({ ok: true, value: 1234.5 });
  });

  test('음수와 잘못된 숫자는 실패로 표시한다', () => {
    expect(parseOptionalNonNegativeNumber('-1')).toEqual({ ok: false, value: null });
    expect(parseOptionalNonNegativeNumber('abc')).toEqual({ ok: false, value: null });
  });
});
