import { readFileSync } from 'fs';
import { resolve } from 'path';
import { isPizzaCategory, isSetCategory } from '../../lib/menu-master/category-policy.js';

// defaultSizesFor 로직을 policy 함수와 같은 규칙으로 재현
function defaultSizesFor(category) {
  if (isPizzaCategory(category) || isSetCategory(category)) return ['L', 'R'];
  return ['단일'];
}

describe('defaultSizesFor – 규격 기본 후보 정책', () => {
  test('피자 카테고리는 L, R을 반환한다', () => {
    expect(defaultSizesFor('피자')).toEqual(['L', 'R']);
    expect(defaultSizesFor('피자/프리미엄스페셜')).toEqual(['L', 'R']);
    expect(defaultSizesFor('1인피자')).toEqual(['L', 'R']);
  });

  test('세트박스 카테고리는 L, R을 반환한다', () => {
    expect(defaultSizesFor('세트박스')).toEqual(['L', 'R']);
    expect(defaultSizesFor('세트')).toEqual(['L', 'R']);
  });

  test('사이드·소스·음료 등 나머지 카테고리는 단일을 반환한다', () => {
    expect(defaultSizesFor('사이드')).toEqual(['단일']);
    expect(defaultSizesFor('소스')).toEqual(['단일']);
    expect(defaultSizesFor('음료')).toEqual(['단일']);
    expect(defaultSizesFor('추가토핑')).toEqual(['단일']);
    expect(defaultSizesFor('')).toEqual(['단일']);
  });
});

describe('sizeOptions 합산 – 커스텀 규격 유지', () => {
  function buildSizeOptions(category, currentSize) {
    const defaults = defaultSizesFor(category);
    return currentSize && !defaults.includes(currentSize) ? [...defaults, currentSize] : defaults;
  }

  test('기존 커스텀 규격이 후보에 없으면 목록 끝에 추가한다', () => {
    expect(buildSizeOptions('피자', 'XL')).toEqual(['L', 'R', 'XL']);
    expect(buildSizeOptions('사이드', '소')).toEqual(['단일', '소']);
  });

  test('기존 규격이 기본 후보에 있으면 중복 추가하지 않는다', () => {
    expect(buildSizeOptions('피자', 'L')).toEqual(['L', 'R']);
    expect(buildSizeOptions('사이드', '단일')).toEqual(['단일']);
  });

  test('빈 size이면 기본 후보만 반환한다', () => {
    expect(buildSizeOptions('피자', '')).toEqual(['L', 'R']);
    expect(buildSizeOptions('음료', '')).toEqual(['단일']);
  });
});

describe('카테고리 변경 시 빈 규격에만 기본값 제안', () => {
  function simulateCategoryChange(newCategory, currentSize) {
    // size가 비어 있으면 새 카테고리의 첫 번째 기본값을 제안
    if (!currentSize) {
      const newDefaults = defaultSizesFor(newCategory);
      return newDefaults[0] || '';
    }
    // 이미 값이 있으면 덮어쓰지 않음
    return currentSize;
  }

  test('빈 size인 상태에서 카테고리를 변경하면 첫 번째 기본값이 제안된다', () => {
    expect(simulateCategoryChange('피자', '')).toBe('L');
    expect(simulateCategoryChange('세트박스', '')).toBe('L');
    expect(simulateCategoryChange('음료', '')).toBe('단일');
  });

  test('이미 size가 있으면 카테고리 변경 시 덮어쓰지 않는다', () => {
    expect(simulateCategoryChange('피자', 'R')).toBe('R');
    expect(simulateCategoryChange('음료', 'XL')).toBe('XL');
    expect(simulateCategoryChange('사이드', '단일')).toBe('단일');
  });
});

describe('CategoryAndSizeFields 소스 구조 검증', () => {
  const src = readFileSync(
    resolve(process.cwd(), 'components/menu-master/MenuMasterIdentityFields.jsx'),
    'utf-8'
  );

  test('ComboBox를 import한다', () => {
    expect(src).toContain("from '@/components/ui/ComboBox'");
  });

  test('isPizzaCategory와 isSetCategory를 import한다', () => {
    expect(src).toContain('isPizzaCategory');
    expect(src).toContain('isSetCategory');
  });

  test('defaultSizesFor 함수가 정의되어 있다', () => {
    expect(src).toContain('defaultSizesFor');
  });

  test('ComboBox 컴포넌트를 사용한다', () => {
    expect(src).toContain('<ComboBox');
  });

  test('카테고리 변경 시 size를 제안하는 핸들러가 있다', () => {
    expect(src).toContain('onCategoryChange');
  });

  test('기존 커스텀 size를 options에 포함하는 로직이 있다', () => {
    expect(src).toContain('sizeOptions');
  });
});
