import { describe, expect, test } from '@jest/globals';
import { buildManageRowModel } from '../../components/ingredient/manage-row/manageRowUtils.js';

describe('buildManageRowModel — 원산지·알레르기 표시 텍스트', () => {
  test('값이 있으면 이름을 나열한다(개수 아님)', () => {
    const model = buildManageRowModel({
      ingredientName: '치즈',
      origin: [{ displayName: '', country: '미국' }],
      allergens: ['AL06', 'AL05'], // 밀, 대두 순서(ALLERGEN_SEED 순)
    });
    expect(model.originText).toBe('미국');
    expect(model.allergenText).not.toBe('');
    expect(model.allergenText).toContain(',');
  });

  test('allergenNone이면 값과 무관하게 "없음"', () => {
    const model = buildManageRowModel({
      ingredientName: '치즈',
      allergens: ['AL06'],
      allergenNone: true,
    });
    expect(model.allergenText).toBe('없음');
  });

  test('originHidden이면 "비표기", originNone이면 "없음"', () => {
    const hidden = buildManageRowModel({ ingredientName: 'A', originHidden: true });
    expect(hidden.originText).toBe('비표기');

    const none = buildManageRowModel({ ingredientName: 'A', originNone: true });
    expect(none.originText).toBe('없음');
  });

  test('아무 정보도 없고 명시도 안 됐으면 빈 문자열(줄 숨김)', () => {
    const model = buildManageRowModel({ ingredientName: 'A' });
    expect(model.originText).toBe('');
    expect(model.allergenText).toBe('');
  });

  test('originHidden이 originNone보다 우선한다', () => {
    const model = buildManageRowModel({
      ingredientName: 'A',
      originHidden: true,
      originNone: true,
    });
    expect(model.originText).toBe('비표기');
  });
});
