import { describe, expect, test } from '@jest/globals';
import { buildDuplicateDiagnostics } from '../../app/ingredient/manage/_duplicate-diagnostics.js';

describe('buildDuplicateDiagnostics — 표시명 오탐 방지', () => {
  test('용량만 다른 제품은 displayName이 같아져도 productName이 다르면 중복으로 잡지 않는다', () => {
    const rows = [
      { id: 1, productCode: 'A1', productName: '모짜렐라 치즈 2.5kg', displayName: '모짜렐라치즈' },
      { id: 2, productCode: 'A2', productName: '모짜렐라 치즈 1kg', displayName: '모짜렐라치즈' },
    ];
    const diagnostics = buildDuplicateDiagnostics(rows);
    const displayNameCheck = diagnostics.find(d => d.key === 'displayName');
    expect(displayNameCheck).toBeUndefined();
  });

  test('제품명이 실제로 같으면 여전히 중복으로 잡는다', () => {
    const rows = [
      { id: 1, productCode: 'A1', productName: '설탕 1kg' },
      { id: 2, productCode: 'A2', productName: '설탕 1kg' },
    ];
    const diagnostics = buildDuplicateDiagnostics(rows);
    const displayNameCheck = diagnostics.find(d => d.key === 'displayName');
    expect(displayNameCheck.groups).toHaveLength(1);
    expect(displayNameCheck.groups[0].rows).toHaveLength(2);
  });

  test('ingredientName이 있으면 그걸 우선 사용한다', () => {
    const rows = [
      { id: 1, productCode: 'A1', ingredientName: '치즈A', productName: '다른이름 1kg' },
      { id: 2, productCode: 'A2', ingredientName: '치즈A', productName: '완전다른이름 2kg' },
    ];
    const diagnostics = buildDuplicateDiagnostics(rows);
    const displayNameCheck = diagnostics.find(d => d.key === 'displayName');
    expect(displayNameCheck.groups[0].rows).toHaveLength(2);
  });
});
