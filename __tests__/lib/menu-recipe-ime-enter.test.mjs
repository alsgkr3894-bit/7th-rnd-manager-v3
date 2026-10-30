import { describe, expect, test } from '@jest/globals';
import { readFileSync } from 'node:fs';
import { isImeComposing } from '../../lib/ui/ime.js';
import { rankIngredientSuggestions } from '../../components/menu-master/recipe/quickAddHelpers.js';
import { applyTypedIngredientName } from '../../components/menu-master/recipeComponentRows.js';

// 2026-10-30: 메뉴마스터 레시피에서 식자재명을 한글로 입력하고 Enter를 치면 목록이 다시 뜨고 선택이
// 안 먹어 행을 지우고 새로 입력해야 했다 — 한글 조합 중 Enter를 선택으로 처리하던 것이 원인.
const read = p => readFileSync(new URL(`../../${p}`, import.meta.url), 'utf8');

describe('IME 조합 중 키 판별', () => {
  test('isComposing·keyCode 229는 조합 중으로 본다', () => {
    expect(isImeComposing({ key: 'Enter', isComposing: true })).toBe(true);
    expect(isImeComposing({ key: 'Enter', nativeEvent: { isComposing: true } })).toBe(true);
    expect(isImeComposing({ key: 'Enter', keyCode: 229 })).toBe(true);
    expect(isImeComposing({ key: 'Enter', nativeEvent: { keyCode: 229 } })).toBe(true);
  });

  test('일반 키·잘못된 값은 조합 중이 아니다', () => {
    expect(isImeComposing({ key: 'Enter', isComposing: false, keyCode: 13 })).toBe(false);
    expect(isImeComposing({ key: 'a' })).toBe(false);
    expect(isImeComposing(null)).toBe(false);
    expect(isImeComposing(undefined)).toBe(false);
  });
});

describe('식자재 검색 순위', () => {
  const ing = (ingredientName, productCode = '') => ({ ingredientName, productCode });
  const list = [
    ing('적양파', 'A1'),
    ing('다진 양파', 'A2'),
    ing('양파링', 'A3'),
    ing('양파', 'A4'),
    ing('치즈', 'CC-양파'),
  ];

  test('정확히 같은 이름 → 이름이 검색어로 시작 → 이름에 포함 → 제품코드 순', () => {
    expect(rankIngredientSuggestions(list, '양파').map(i => i.ingredientName)).toEqual([
      '양파',
      '양파링',
      '적양파',
      '다진 양파',
      '치즈',
    ]);
  });

  test('같은 순위에서는 검색어가 앞쪽에 있고 이름이 짧은 식자재가 먼저 나온다', () => {
    const cheese = [ing('흑미크림찰치즈볼'), ing('허니리코타치즈'), ing('체다치즈')];
    expect(rankIngredientSuggestions(cheese, '치즈').map(i => i.ingredientName)).toEqual([
      '체다치즈',
      '허니리코타치즈',
      '흑미크림찰치즈볼',
    ]);
  });

  test('공백·대소문자를 무시하고, 같은 순위는 원래 순서를 지킨다', () => {
    expect(rankIngredientSuggestions(list, ' 다 진양파 ').map(i => i.ingredientName)).toEqual([
      '다진 양파',
    ]);
    expect(rankIngredientSuggestions([ing('A 소스'), ing('a소스')], 'A소스')).toHaveLength(2);
  });

  test('빈 검색어는 결과가 없고, 개수 제한을 지킨다', () => {
    expect(rankIngredientSuggestions(list, '  ')).toEqual([]);
    expect(rankIngredientSuggestions(list, '양파', 2)).toHaveLength(2);
    expect(rankIngredientSuggestions(null, '양파')).toEqual([]);
  });
});

describe('같은 값의 늦은 입력 이벤트', () => {
  test('방금 연결한 식자재와 같은 이름이 다시 들어와도 제품코드·단가를 끊지 않는다', () => {
    const linked = { ingredientName: '양파', productCode: '107', unitPrice: 1, quantity: 30 };
    expect(applyTypedIngredientName(linked, '양파', [])).toBe(linked);
  });

  test('이름이 실제로 바뀌면 연결을 끊고 직접 입력으로 표시한다', () => {
    const linked = { ingredientName: '양파', productCode: '107', unitPrice: 1, quantity: 30 };
    expect(applyTypedIngredientName(linked, '양', [])).toMatchObject({
      ingredientName: '양',
      productCode: '',
      unitPrice: null,
      _typed: true,
    });
  });
});

describe('레시피 식자재 입력칸은 조합 중 키를 선택으로 처리하지 않는다', () => {
  test('행 검색·빠른 추가 키 핸들러가 isImeComposing으로 걸러낸다', () => {
    for (const file of [
      'components/menu-master/useRecipeIngredientSearch.js',
      'components/menu-master/recipe/hooks/useMenuRecipeQuickAdd.js',
    ]) {
      const src = read(file);
      expect(src).toContain("from '@/lib/ui/ime'");
      expect(src).toContain('isImeComposing(e)');
      // 조합이 끝난 뒤 한 번 처리하는 경로
      expect(src).toMatch(/pendingEnter/);
      expect(src).toMatch(/CompositionEnd/);
    }
  });

  test('입력칸에 onCompositionEnd가 연결돼 있다', () => {
    expect(read('components/menu-master/recipe/MenuRecipeTableRow.jsx')).toContain(
      'onCompositionEnd'
    );
    expect(read('components/menu-master/recipe/MenuRecipeQuickAddPanel.jsx')).toContain(
      'onCompositionEnd={onQuickAddCompositionEnd}'
    );
    expect(read('components/menu-master/MenuRecipeSection.jsx')).toContain(
      'onIngredientCompositionEnd={handleIngredientCompositionEnd}'
    );
  });

  test('검색 결과는 정렬 함수를 거친다(등록 순서대로 자르지 않는다)', () => {
    expect(read('components/menu-master/useRecipeIngredientSearch.js')).toContain(
      'rankIngredientSuggestions('
    );
    expect(read('components/menu-master/recipe/hooks/useMenuRecipeQuickAdd.js')).toContain(
      'rankIngredientSuggestions('
    );
  });
});
