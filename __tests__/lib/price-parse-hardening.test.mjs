import { describe, expect, test } from '@jest/globals';
import { parsePriceRows } from '../../lib/price/parse.js';
import { tryParsePrice } from '../../lib/parse.js';
import { matchColumn, normalizeHeaderKey, readCsvFile } from '../../lib/excel.js';

// 2026-10-30 원가 흐름 점검(1단계: 제때 단가 업로드) — 조용히 잘못 저장되던 경우를 막는다.

const H = ['제품코드', '제품명', '과세구분', '단가'];
const row = (code, name, tax, price) => ({
  제품코드: code,
  제품명: name,
  과세구분: tax,
  단가: price,
});

describe('제때 단가 파싱 — 제품코드 열', () => {
  test('제품코드 열이 없으면 저장 전에 막는다(전 식자재가 수동 단가로 떨어지는 것 방지)', () => {
    const result = parsePriceRows(
      ['제품명', '과세구분', '단가'],
      [{ 제품명: '치즈', 과세구분: '과세', 단가: 1000 }]
    );
    expect(result.ok).toBe(false);
    expect(result.error).toContain('productCode');
  });

  test('제품코드가 있으면 정상 저장, 부가세는 과세만 1.1배', () => {
    const result = parsePriceRows(H, [
      row('CC1', '치즈', '과세', 10000),
      row('CC2', '소금', '면세', 500),
    ]);
    expect(result.ok).toBe(true);
    expect(result.success.map(r => [r.productCode, r.priceWithTax])).toEqual([
      ['CC1', 11000],
      ['CC2', 500],
    ]);
  });

  test('같은 이름의 열이 둘이면 어느 값이 쓰였는지 알 수 없어 막는다', () => {
    const result = parsePriceRows(
      ['제품코드', '제품명', '과세구분', '단가', '단가'],
      [{ 제품코드: 'CC1', 제품명: '치즈', 과세구분: '과세', 단가: 2000 }]
    );
    expect(result.ok).toBe(false);
    expect(result.error).toContain('단가');
  });
});

describe('제때 단가 파싱 — 단가 값', () => {
  test.each(['1e3', '0x1A', 'Infinity', '-Infinity', 'NaN', '12abc', '1,2,3x'])(
    '숫자처럼 보이는 문자열 %s는 단가로 받지 않는다',
    raw => {
      expect(tryParsePrice(raw)).toBeNull();
    }
  );

  test('일반 표기는 그대로 받는다(통화기호·콤마·원·소수·숫자 셀)', () => {
    expect(tryParsePrice('₩12,500원')).toBe(12500);
    expect(tryParsePrice('1,000')).toBe(1000);
    expect(tryParsePrice('.5')).toBe(0.5);
    expect(tryParsePrice('12.')).toBe(12);
    expect(tryParsePrice(3300)).toBe(3300);
    expect(tryParsePrice(Number.POSITIVE_INFINITY)).toBeNull();
    expect(tryParsePrice('')).toBeNull();
    expect(tryParsePrice(null)).toBeNull();
  });

  test('음수 단가 행은 실패로 모아 저장하지 않는다', () => {
    const result = parsePriceRows(H, [
      row('CC1', '치즈', '과세', -500),
      row('CC2', '소금', '면세', 500),
    ]);
    expect(result.success.map(r => r.productCode)).toEqual(['CC2']);
    expect(result.failed).toEqual([
      expect.objectContaining({ productCode: 'CC1', reason: '음수 단가' }),
    ]);
  });
});

describe('제때 단가 파싱 — 날짜 칸', () => {
  test('SheetJS가 주는 Date 객체도 날짜로 읽는다(문자열로 바뀌어 깨지던 것)', () => {
    const result = parsePriceRows(
      [...H, '주문기준일', '배송일'],
      [
        {
          ...row('CC1', '치즈', '과세', 1000),
          주문기준일: new Date(2026, 9, 20, 0, 0, 0),
          배송일: '2026/10/21',
        },
      ]
    );
    expect(result.success[0].orderBaseDate).toBe('2026-10-20');
    expect(result.success[0].deliveryDate).toBe('2026-10-21');
  });
});

describe('헤더 매칭', () => {
  test('공백·단위 괄호가 붙은 변형도 찾는다', () => {
    expect(normalizeHeaderKey('단 가')).toBe('단가');
    expect(normalizeHeaderKey('단가(원)')).toBe('단가');
    expect(normalizeHeaderKey('제품 코드 [필수]')).toBe('제품코드');
    expect(matchColumn(['제품 코드', '제품명', '단가(원)'], ['제품코드'])).toBe('제품 코드');
    expect(matchColumn(['제품코드', '제품명', '단가(원)'], ['단가'])).toBe('단가(원)');
  });

  test('정확히 같은 헤더가 있으면 변형보다 그것이 우선', () => {
    expect(matchColumn(['단가(원)', '단가'], ['단가'])).toBe('단가');
  });

  test('다른 열을 잘못 잡지 않는다(부분 일치는 하지 않는다)', () => {
    expect(matchColumn(['지점코드', '제품명'], ['코드'])).toBeNull();
    expect(matchColumn(['이전단가', '신규 판매가'], ['단가'])).toBeNull();
  });

  test('변형 헤더 파일도 끝까지 파싱된다', () => {
    const result = parsePriceRows(
      ['제품 코드', '제품명', '과세 구분', '단가(원)'],
      [{ '제품 코드': 'CC1', 제품명: '치즈', '과세 구분': '과세', '단가(원)': '10,000' }]
    );
    expect(result.ok).toBe(true);
    expect(result.success[0]).toMatchObject({ productCode: 'CC1', priceWithTax: 11000 });
  });
});

describe('업로드 헤더 → 객체 변환', () => {
  test('__proto__ 헤더가 객체의 프로토타입을 바꾸지 못한다', () => {
    const csv = '제품코드,__proto__,단가\nCC1,{"polluted":true},1000\n';
    const { rows } = readCsvFile(csv);
    expect(Object.getPrototypeOf(rows[0])).toBe(Object.prototype);
    expect(rows[0].polluted).toBeUndefined();
    expect(rows[0].제품코드).toBe('CC1');
    expect({}.polluted).toBeUndefined();
  });
});

describe('제품코드 표기', () => {
  test('소문자·앞뒤 공백 코드도 식자재 마스터와 같은 대문자로 저장한다', () => {
    const result = parsePriceRows(H, [row(' cc410251 ', '고르곤졸라치즈', '과세', 5000)]);
    expect(result.success[0].productCode).toBe('CC410251');
  });
});
