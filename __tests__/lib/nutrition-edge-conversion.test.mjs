import { describe, expect, test } from '@jest/globals';
import { convertEdgeTotalToPer100g } from '../../lib/nutrition/values/edge.js';

describe('convertEdgeTotalToPer100g', () => {
  test('실제 신고된 치즈크러스트 L 값(중량 170g 전체 기준 총량)을 100g 기준으로 환산한다', () => {
    const result = convertEdgeTotalToPer100g({
      weight: 170,
      kcal: 459,
      carbs: 7.65,
      sugar: 0,
      fat: 34.68,
      satFat: 21.76,
      transFat: 1.19,
      cholesterol: 116.11,
      protein: 29.41,
      sodium: 1559.24,
    });

    expect(result.weight).toBe(170);
    expect(result.kcal).toBeCloseTo(270, 1);
    expect(result.carbs).toBeCloseTo(4.5, 1);
    expect(result.fat).toBeCloseTo(20.4, 1);
    expect(result.satFat).toBeCloseTo(12.8, 1);
    expect(result.transFat).toBeCloseTo(0.7, 1);
    expect(result.cholesterol).toBeCloseTo(68.3, 1);
    expect(result.protein).toBeCloseTo(17.3, 1);
    expect(result.sodium).toBeCloseTo(917.2, 1);
  });

  test('중량이 정확히 100이면 값이 그대로 유지된다(변환 배수 1)', () => {
    const result = convertEdgeTotalToPer100g({ weight: 100, kcal: 250, sodium: 500 });
    expect(result).toMatchObject({ weight: 100, kcal: 250, sodium: 500 });
  });

  test('중량이 없거나 0 이하이면 null을 반환한다', () => {
    expect(convertEdgeTotalToPer100g({ kcal: 100 })).toBeNull();
    expect(convertEdgeTotalToPer100g({ weight: 0, kcal: 100 })).toBeNull();
    expect(convertEdgeTotalToPer100g({ weight: -10, kcal: 100 })).toBeNull();
    expect(convertEdgeTotalToPer100g(null)).toBeNull();
  });

  test('빈 문자열이거나 숫자로 변환할 수 없는 필드는 건드리지 않는다', () => {
    const result = convertEdgeTotalToPer100g({
      weight: 200,
      kcal: 400,
      sugar: '',
      protein: 'bad',
      sodium: null,
    });
    expect(result.kcal).toBeCloseTo(200, 1);
    expect(result.sugar).toBe('');
    expect(result.protein).toBe('bad');
    expect(result.sodium).toBeNull();
  });

  test('weight 필드 자체는 환산 대상에서 제외되고 그대로 유지된다', () => {
    const result = convertEdgeTotalToPer100g({ weight: 250, kcal: 500 });
    expect(result.weight).toBe(250);
    expect(result.kcal).toBeCloseTo(200, 1);
  });
});
