import { stripPersonalSuffix } from '../../lib/menu-master/normalize.js';

describe('stripPersonalSuffix', () => {
  test('P-ONE-004-ONE → P-ONE-004', () => {
    expect(stripPersonalSuffix('P-ONE-004-ONE')).toBe('P-ONE-004');
  });
  test('P-ONE-001-ONE → P-ONE-001', () => {
    expect(stripPersonalSuffix('P-ONE-001-ONE')).toBe('P-ONE-001');
  });
  test('소문자도 정규화 (대문자 반환)', () => {
    expect(stripPersonalSuffix('p-one-004-one')).toBe('P-ONE-004');
  });
  test('이미 정규화된 코드 → null (변경 불필요)', () => {
    expect(stripPersonalSuffix('P-ONE-004')).toBeNull();
  });
  test('일반 피자 코드 → null', () => {
    expect(stripPersonalSuffix('P-OR-005-L')).toBeNull();
    expect(stripPersonalSuffix('P-PS-003-L-C')).toBeNull();
  });
  test('빈 값/유효하지 않은 코드 → null', () => {
    expect(stripPersonalSuffix('')).toBeNull();
    expect(stripPersonalSuffix(null)).toBeNull();
    expect(stripPersonalSuffix('P-ONE')).toBeNull();
    expect(stripPersonalSuffix('P-ONE-ONE')).toBeNull(); // 숫자 3자리 없음
  });
});
