import { describe, expect, test } from '@jest/globals';
import {
  buildSubstituteOptions,
  findSubstituteByLabel,
  substituteOptionLabel,
  substituteRowCode,
  substituteRowLabel,
} from '../../lib/ingredient/substitute-options.js';

describe('substitute-options', () => {
  const rows = [
    { productCode: 'A1', ingredientName: '올리브 A' },
    { productCode: 'A2', ingredientName: '올리브 B', discontinued: true },
    { productCode: 'A3', ingredientName: '올리브 C', excluded: true },
    { productCode: 'A4', ingredientName: '올리브 D' },
    { productCode: '', ingredientName: '코드없음' },
  ];

  test('buildSubstituteOptions는 자기 자신·단종·숨김·코드없는 행을 제외하고 가나다순 정렬한다', () => {
    const options = buildSubstituteOptions(rows, 'A1');
    expect(options.map(r => r.productCode)).toEqual(['A4']);
  });

  test('substituteRowLabel/Code/OptionLabel', () => {
    const row = { productCode: 'X1', ingredientName: '치즈' };
    expect(substituteRowLabel(row)).toBe('치즈');
    expect(substituteRowCode(row)).toBe('X1');
    expect(substituteOptionLabel(row)).toBe('치즈 (X1)');
  });

  test('findSubstituteByLabel은 라벨 문자열로 원본 행을 되찾는다', () => {
    const options = [{ productCode: 'X1', ingredientName: '치즈' }];
    expect(findSubstituteByLabel(options, '치즈 (X1)')).toEqual(options[0]);
    expect(findSubstituteByLabel(options, '없는거')).toBeNull();
    expect(findSubstituteByLabel(options, '')).toBeNull();
  });
});
