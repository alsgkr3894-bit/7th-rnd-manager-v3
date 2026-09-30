import { describe, expect, test } from '@jest/globals';
import { readFileSync } from 'node:fs';
import {
  applyIngredientSuggestionToComponent,
  applyTypedIngredientName,
  buildRecipeComponentForSave,
  linkTypedIngredientByName,
} from '../../components/menu-master/recipeComponentRows.js';

// 2026-09-30 주임님: 메뉴마스터에서 이미 입력된 구성품의 식자재를 바꾸면 적용이 안 돼
// 삭제하고 새로 등록해야 했다. 원인 — 이름 칸을 고쳐 쓰고 제안을 클릭하지 않고 넘어가면
// 이름만 바뀌고 옛 제품코드·단가가 그대로 저장돼 원가·알레르기가 옛 식자재로 계산됐다.
const ingredients = [
  { id: 1, productCode: 'CC411436', ingredientName: '까망베르슈레드치즈' },
  { id: 2, productCode: 'CC410001', ingredientName: '모짜렐라 치즈' },
  { id: 101, productCode: '', ingredientName: '양파' },
  { id: 3, productCode: 'OLD', ingredientName: '단종재료', discontinued: true },
];
const priceMap = new Map([
  ['CC411436', { unitPrice: 10.9, baseUnitType: 'g' }],
  ['CC410001', { unitPrice: 8.2, baseUnitType: 'g' }],
  ['101', { unitPrice: 1, baseUnitType: 'g' }],
]);
const linkedRow = {
  _key: 1,
  ingredientName: '까망베르슈레드치즈',
  productCode: 'CC411436',
  quantity: 120,
  unit: 'g',
  unitPrice: 10.9,
};

describe('기존 구성품의 식자재명을 고쳐 쓸 때', () => {
  test('연결된 행을 고쳐 쓰면 옛 제품코드·단가를 끊는다', () => {
    const typed = applyTypedIngredientName(linkedRow, '모짜', ingredients);
    expect(typed).toMatchObject({ ingredientName: '모짜', productCode: '', unitPrice: null });
    expect(typed.quantity).toBe(120); // 수량은 그대로
  });

  test('수정 전 코드: 이름만 바꾸면 옛 코드·단가로 저장됐다(회귀 확인)', () => {
    const oldBehavior = { ...linkedRow, ingredientName: '모짜렐라 치즈' };
    expect(buildRecipeComponentForSave(oldBehavior, priceMap)).toMatchObject({
      productCode: 'CC411436',
      unitPrice: 10.9,
    });
  });

  test('칸을 벗어날 때 이름이 식자재 하나와 정확히 같으면 그 식자재로 연결한다(공백 무시)', () => {
    const typed = applyTypedIngredientName(linkedRow, '모짜렐라치즈', ingredients);
    const linked = linkTypedIngredientByName(typed, ingredients, priceMap);
    expect(linked).toMatchObject({
      ingredientName: '모짜렐라 치즈',
      productCode: 'CC410001',
      unitPrice: 8.2,
      quantity: 120,
    });
    expect(linked._typed).toBeUndefined();
    expect(buildRecipeComponentForSave(linked, priceMap)).toMatchObject({
      productCode: 'CC410001',
      unitPrice: 8.2,
    });
  });

  test('제품코드 없는 수동 식자재도 이름으로 연결되고 id 기준 단가를 받는다', () => {
    const typed = applyTypedIngredientName(linkedRow, '양파', ingredients);
    expect(linkTypedIngredientByName(typed, ingredients, priceMap)).toMatchObject({
      ingredientName: '양파',
      productCode: '',
      unitPrice: 1,
    });
  });

  test('수동 식자재 행을 다른 이름으로 고쳐 써도 옛 단가를 끊는다', () => {
    const onion = { ingredientName: '양파', productCode: '', unitPrice: 1, quantity: 30 };
    expect(applyTypedIngredientName(onion, '새재료', ingredients)).toMatchObject({
      productCode: '',
      unitPrice: null,
    });
  });

  test('일치하는 식자재가 없으면 연결 없이 이름만 남는다(단가 없음 → 저장 전 경고)', () => {
    const typed = applyTypedIngredientName(linkedRow, '없는재료', ingredients);
    const result = linkTypedIngredientByName(typed, ingredients, priceMap);
    expect(result).toMatchObject({ ingredientName: '없는재료', productCode: '', unitPrice: null });
    expect(result._typed).toBeUndefined();
  });

  test('단종 식자재 이름으로는 연결하지 않는다', () => {
    const typed = applyTypedIngredientName(linkedRow, '단종재료', ingredients);
    expect(linkTypedIngredientByName(typed, ingredients, priceMap).productCode).toBe('');
  });

  test('직접 입력한(식자재에 없는) 수동 구성품은 오타를 고쳐도 입력해 둔 단가를 유지한다', () => {
    const custom = { ingredientName: '직접입력박스', productCode: '', unitPrice: 150 };
    expect(applyTypedIngredientName(custom, '직접입력 박스', ingredients).unitPrice).toBe(150);
  });

  test('고쳐 쓰지 않은 행은 칸을 벗어나도 바뀌지 않는다', () => {
    expect(linkTypedIngredientByName(linkedRow, ingredients, priceMap)).toBe(linkedRow);
  });

  test('제안을 클릭해 고르면 입력 중 표시가 지워진다', () => {
    const typed = applyTypedIngredientName(linkedRow, '모짜', ingredients);
    const picked = applyIngredientSuggestionToComponent(typed, ingredients[1], priceMap);
    expect(picked._typed).toBeUndefined();
    expect(picked).toMatchObject({ productCode: 'CC410001', unitPrice: 8.2 });
  });
});

describe('배선', () => {
  const read = p => readFileSync(new URL(`../../${p}`, import.meta.url), 'utf8');
  test('입력은 applyTypedIngredientName, 칸 벗어남·Enter는 linkTypedRow로 처리한다', () => {
    const hook = read('components/menu-master/useRecipeIngredientSearch.js');
    expect(hook).toContain('applyTypedIngredientName(c, value, allIngredients)');
    expect(hook).toContain('if (Number.isInteger(idx)) linkTypedRow(idx)');
    expect(hook).toContain(
      'linkTypedRow(idx);\n          setSearchIdx(null);'.replace(
        /\n/g,
        read('components/menu-master/useRecipeIngredientSearch.js').includes('\r\n') ? '\r\n' : '\n'
      )
    );
    expect(read('components/menu-master/recipe/MenuRecipeTableRow.jsx')).toContain(
      'onBlur={() => onIngredientBlur(idx)}'
    );
  });

  test('linkTypedRow는 그것을 쓰는 핸들러보다 먼저 정의한다(초기화 전 참조 에러 방지)', () => {
    const hook = read('components/menu-master/useRecipeIngredientSearch.js');
    const defined = hook.indexOf('const linkTypedRow = useCallback(');
    expect(defined).toBeGreaterThan(-1);
    for (const user of ['const handleIngredientKeyDown', 'const handleIngredientBlur']) {
      expect(defined).toBeLessThan(hook.indexOf(user));
    }
  });

  test('저장 직전에도 고쳐 쓴 행의 연결을 마무리한다(Ctrl+S)', () => {
    const editor = read('components/menu-master/useMenuRecipeEditor.js');
    expect(editor).toContain('linkTypedIngredientByName(c, allIngredients, unitPriceMap)');
    expect(editor).toContain('buildSavableRecipeComponents(resolvedComponents, unitPriceMap)');
  });

  test('React 19: inert는 빈 문자열이 아니라 불리언으로 넘긴다', () => {
    const card = read('app/note/_CollapsibleCard.jsx');
    expect(card).toContain('inert={!open}');
    expect(card).not.toContain("inert={open ? undefined : ''}");
  });
});
