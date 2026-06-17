import { describe, expect, test } from '@jest/globals';
import { readFileSync } from 'fs';
import { resolve } from 'path';

const sectionSrc = readFileSync(resolve('components/menu-master/MenuRecipeSection.jsx'), 'utf8');
const tableSrc = readFileSync(resolve('components/menu-master/MenuRecipeComponentsTable.jsx'), 'utf8');

describe('MenuRecipeSection — 키보드 드롭다운 상태/핸들러', () => {
  test('activeSuggestionIdx 상태가 있다', () => {
    expect(sectionSrc).toContain('activeSuggestionIdx');
    expect(sectionSrc).toContain("useState(-1)");
  });

  test('handleIngredientKeyDown이 ArrowDown/ArrowUp/Enter/Escape를 처리한다', () => {
    expect(sectionSrc).toContain('handleIngredientKeyDown');
    expect(sectionSrc).toContain("'ArrowDown'");
    expect(sectionSrc).toContain("'ArrowUp'");
    expect(sectionSrc).toContain("'Enter'");
    expect(sectionSrc).toContain("'Escape'");
  });

  test('searchQ 변경 시 activeSuggestionIdx를 -1로 초기화한다', () => {
    expect(sectionSrc).toContain('setActiveSuggestionIdx(-1)');
    expect(sectionSrc).toContain('[searchQ]');
  });

  test('pickSuggestion 후 수량 input으로 focus한다', () => {
    expect(sectionSrc).toContain('quantityInputRefs.current');
    expect(sectionSrc).toContain('.focus()');
  });
});

describe('MenuRecipeSection — 수량 Enter 연속 입력', () => {
  test('handleQuantityKeyDown이 Enter를 처리한다', () => {
    expect(sectionSrc).toContain('handleQuantityKeyDown');
    expect(sectionSrc).toContain("e.key !== 'Enter'");
  });

  test('다음 행 식자재 input으로 focus한다', () => {
    expect(sectionSrc).toContain('ingredientInputRefs.current[nextKey]');
  });

  test('마지막 행에서 Enter 시 새 행 추가 후 focus한다', () => {
    expect(sectionSrc).toContain('pendingFocusNewRowRef.current = true');
    expect(sectionSrc).toContain('addRow()');
  });

  test('+ 구성품 추가 버튼도 pending focus를 설정한다', () => {
    expect(sectionSrc).toContain('pendingFocusNewRowRef.current = true');
    expect(sectionSrc).toContain('구성품 추가');
  });
});

describe('MenuRecipeComponentsTable — props 연결', () => {
  test('onIngredientKeyDown prop을 식자재 input에 연결한다', () => {
    expect(tableSrc).toContain('onIngredientKeyDown');
    expect(tableSrc).toContain('onIngredientKeyDown?.(idx, e)');
  });

  test('activeSuggestionIdx prop을 추천 항목 active 표시에 사용한다', () => {
    expect(tableSrc).toContain('activeSuggestionIdx');
    expect(tableSrc).toContain('isActive={activeSuggestionIdx === suggestionIndex}');
  });

  test('ingredientInputRefs, quantityInputRefs를 ref 등록에 사용한다', () => {
    expect(tableSrc).toContain('ingredientInputRefs');
    expect(tableSrc).toContain('quantityInputRefs');
    expect(tableSrc).toContain('ingredientInputRefs.current[component._key] = el');
    expect(tableSrc).toContain('quantityInputRefs.current[component._key] = el');
  });

  test('onQuantityKeyDown을 수량 input에 연결한다', () => {
    expect(tableSrc).toContain('onQuantityKeyDown?.(idx, e)');
  });

  test('추천 항목에 isActive 배경색이 있다', () => {
    expect(tableSrc).toContain("isActive ? 'var(--accent-soft)'");
  });
});

describe('MenuRecipeComponentsTable — 안내 문구', () => {
  test('식자재 input placeholder에 키보드 안내가 있다', () => {
    expect(tableSrc).toContain('↑↓ 이동, Enter 선택');
  });

  test('수량 input에 Enter 안내 title이 있다', () => {
    expect(tableSrc).toContain('수량 입력 후 Enter로 다음 구성품');
  });

  test('빈 상태 문구가 있다', () => {
    expect(tableSrc).toContain('구성품이 없습니다. 구성품 추가 후 식자재를 검색해 입력하세요.');
  });
});
