import { describe, expect, test } from '@jest/globals';
import { FIXED_BEVERAGE_SHEET } from '../../lib/nutrition/label/fixed-beverages.js';

// 2026-10-12 주임님 지시: 영양성분표 Beverage 블록의 코카콜라·코카콜라 제로는
// 기존 500ml 행을 510ml(총 용량) 값으로 대체한다. 음료는 입력 데이터와 무관한 고정표다.
const find = (name, weight) =>
  FIXED_BEVERAGE_SHEET.find(row => row.menuName === name && row.weight === weight);

describe('영양성분표 고정 음료표', () => {
  test('코카-콜라 510ml: 열량 219 · 당류 55 · 단백질 0 · 포화지방 0 · 나트륨 15', () => {
    expect(find('코카-콜라', 510)).toMatchObject({
      menuCode: 'D-CC-510',
      kcal: 219,
      sugar: 55,
      protein: 0,
      fat: 0,
      sodium: 15,
      fixed: true,
    });
  });

  test('코카-콜라 제로 510ml: 0 · 0 · 0 · 0 · 나트륨 31', () => {
    expect(find('코카-콜라 제로', 510)).toMatchObject({
      menuCode: 'D-CZ-510',
      kcal: 0,
      sugar: 0,
      protein: 0,
      fat: 0,
      sodium: 31,
    });
  });

  test('콜라·콜라 제로의 500ml 행은 더 이상 없다(510ml로 대체)', () => {
    expect(find('코카-콜라', 500)).toBeUndefined();
    expect(find('코카-콜라 제로', 500)).toBeUndefined();
  });

  test('나머지 음료 행은 그대로(1.25L·355ml 콜라, 스프라이트 500ml 등)', () => {
    expect(find('코카-콜라', 1250)).toMatchObject({ kcal: 550, sugar: 138, sodium: 38 });
    expect(find('코카-콜라', 355)).toMatchObject({ kcal: 152, sugar: 38, sodium: 11 });
    expect(find('코카-콜라 제로', 355)).toMatchObject({ sodium: 22 });
    expect(find('스프라이트', 500)).toMatchObject({ kcal: 228, sugar: 57, sodium: 47 });
  });

  test('콜라 계열은 큰 용량 → 작은 용량 순서를 유지한다(1250 → 510 → 355)', () => {
    const cola = FIXED_BEVERAGE_SHEET.filter(row => row.menuName === '코카-콜라').map(
      r => r.weight
    );
    expect(cola).toEqual([1250, 510, 355]);
    const zero = FIXED_BEVERAGE_SHEET.filter(row => row.menuName === '코카-콜라 제로').map(
      r => r.weight
    );
    expect(zero).toEqual([1250, 510, 355]);
  });
});
