import { describe, expect, test } from '@jest/globals';
import {
  isSampleSelectionId,
  toSampleSelectionIds,
  toggleSampleSelection,
} from '../../lib/sample/selection.js';

describe('sample selection helpers', () => {
  test('숫자와 빈 문자열이 아닌 문자열 ID만 선택값으로 허용한다', () => {
    expect(isSampleSelectionId(1)).toBe(true);
    expect(isSampleSelectionId('sample-1')).toBe(true);
    expect(isSampleSelectionId('  ')).toBe(false);
    expect(isSampleSelectionId(null)).toBe(false);
    expect(isSampleSelectionId({ id: 1 })).toBe(false);
    expect(isSampleSelectionId(NaN)).toBe(false);
  });

  test('선택 ID 배열은 잘못된 값을 제거하고 기존 ID 값을 보존한다', () => {
    expect(toSampleSelectionIds(new Set([1, '', 'sample-1', undefined, { id: 2 }]))).toEqual([
      1,
      'sample-1',
    ]);
    expect(toSampleSelectionIds('sample-1')).toEqual([]);
  });

  test('토글은 잘못된 ID를 무시하고 최대 선택 개수를 지킨다', () => {
    expect([...toggleSampleSelection(new Set([1]), 1)]).toEqual([]);
    expect([...toggleSampleSelection(new Set([1]), null)]).toEqual([1]);
    expect([...toggleSampleSelection(new Set([1, 2, 3]), 4, { maxSize: 3 })]).toEqual([1, 2, 3]);
    expect([...toggleSampleSelection(new Set([1]), 2, null)]).toEqual([1, 2]);
  });
});
