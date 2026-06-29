import { describe, expect, test } from '@jest/globals';
import { readFileSync } from 'fs';
import { resolve } from 'path';
import {
  applyIngredientSuggestionToComponent,
  buildRecipeComponentForSave,
  buildSavableRecipeComponents,
  buildRecipeValidationDetails,
  createBlankRecipeComponentRow,
  hydrateRecipeComponent,
  isRecipeComponentMissingUnitPrice,
} from '../../components/menu-master/recipeComponentRows.js';
import { buildRecipeImpactPreview } from '../../lib/menu-master/recipe-impact-preview.js';

const sectionSrc = readFileSync(resolve('components/menu-master/MenuRecipeSection.jsx'), 'utf8');
const searchHookSrc = readFileSync(
  resolve('components/menu-master/useRecipeIngredientSearch.js'),
  'utf8'
);
const editorHookSrc = readFileSync(
  resolve('components/menu-master/useMenuRecipeEditor.js'),
  'utf8'
);
// 테이블은 행/셀 컴포넌트(recipe/*)로 분리됨 — 배선 문구는 모듈 그룹 전체에서 검사한다.
const tableSrc = [
  readFileSync(resolve('components/menu-master/MenuRecipeComponentsTable.jsx'), 'utf8'),
  readFileSync(resolve('components/menu-master/recipe/MenuRecipeTableRow.jsx'), 'utf8'),
  readFileSync(resolve('components/menu-master/recipe/SuggestionItem.jsx'), 'utf8'),
  readFileSync(resolve('components/menu-master/recipe/UnitPriceCell.jsx'), 'utf8'),
].join('\n');
const impactPreviewSrc = readFileSync(
  resolve('components/menu-master/MenuRecipeImpactPreview.jsx'),
  'utf8'
);

describe('MenuRecipeSection — 키보드 드롭다운 상태/핸들러', () => {
  test('activeSuggestionIdx 상태가 있다', () => {
    expect(searchHookSrc).toContain('activeSuggestionIdx');
    expect(searchHookSrc).toContain('useState(-1)');
  });

  test('handleIngredientKeyDown이 ArrowDown/ArrowUp/Enter/Escape를 처리한다', () => {
    expect(searchHookSrc).toContain('handleIngredientKeyDown');
    expect(searchHookSrc).toContain("'ArrowDown'");
    expect(searchHookSrc).toContain("'ArrowUp'");
    expect(searchHookSrc).toContain("'Enter'");
    expect(searchHookSrc).toContain("'Escape'");
  });

  test('searchQ 변경 시 activeSuggestionIdx를 -1로 초기화한다', () => {
    expect(searchHookSrc).toContain('setActiveSuggestionIdx(-1)');
    expect(searchHookSrc).toContain('[searchQ]');
  });

  test('pickSuggestion 후 수량 input으로 focus한다', () => {
    expect(searchHookSrc).toContain('quantityInputRefs.current');
    expect(searchHookSrc).toContain('.focus()');
  });

  test('blur/focus 지연 타이머를 unmount 시 정리한다', () => {
    expect(searchHookSrc).toContain('blurTimerRef');
    expect(searchHookSrc).toContain('focusTimerRef');
    expect(searchHookSrc).toContain('clearTimeout(blurTimerRef.current)');
    expect(searchHookSrc).toContain('clearTimeout(focusTimerRef.current)');
    expect(searchHookSrc).toContain('() => () => {');
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

describe('MenuRecipeSection — 단가 없음 필터와 영향 미리보기', () => {
  test('단가 없음만 보기 상태와 토글 버튼을 연결한다', () => {
    expect(sectionSrc).toContain('onlyMissingPrice');
    expect(sectionSrc).toContain('missingPriceFilterCount');
    expect(sectionSrc).toContain('isRecipeComponentMissingUnitPrice');
  });

  test('원산지/알레르기 영향 미리보기와 저장 전 상세 검증을 노출한다', () => {
    expect(sectionSrc).toContain('MenuRecipeImpactPreview');
    expect(sectionSrc).toContain('getRecipeValidation');
    expect(impactPreviewSrc).toContain('원산지/알레르기 영향 미리보기');
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

  test('필터링된 행도 원본 인덱스로 수정/삭제/복사한다', () => {
    expect(tableSrc).toContain('sourceIdx');
    expect(tableSrc).toContain('idx={sourceIdx}');
  });
});

describe('MenuRecipeComponentsTable — 안내 문구', () => {
  test('식자재 input placeholder에 키보드 안내가 있다', () => {
    expect(tableSrc).toContain('↑↓ 이동, Enter 선택');
  });

  test('수량 input에 Enter 안내 title이 있다', () => {
    expect(tableSrc).toContain('수량 입력 후 Enter로 다음 구성품');
  });

  test('수량 input은 0보다 큰 숫자만 정상 수량으로 안내한다', () => {
    expect(tableSrc).toContain('min="0.000001"');
    expect(tableSrc).toContain('step="any"');
    expect(tableSrc).toContain('수량은 0보다 큰 숫자로 입력하세요');
  });

  test('빈 상태 문구가 있다', () => {
    expect(tableSrc).toContain('구성품이 없습니다. 구성품 추가 후 식자재를 검색해 입력하세요.');
  });

  test('최근 사용 식자재 추천 문구는 노출하지 않는다', () => {
    expect(searchHookSrc).not.toContain('recent-ingredients');
    expect(searchHookSrc).not.toContain('getRecentIngredientCodes');
    expect(tableSrc).not.toContain('최근 사용');
  });
});

describe('recipeComponentRows — 저장/추천 행 변환', () => {
  test('빈 구성품 row는 고유 key와 기본 단위를 가진다', () => {
    expect(createBlankRecipeComponentRow()).toEqual(
      expect.objectContaining({
        ingredientName: '',
        productCode: '',
        quantity: '',
        unit: 'g',
        unitPrice: null,
      })
    );
  });

  test('기존 구성품 hydrate 시 최신 단가와 단위를 반영한다', () => {
    const map = new Map([['ING-1', { baseUnitType: 'ea', unitPrice: 12.3 }]]);
    expect(hydrateRecipeComponent({ productCode: 'ING-1', unit: 'g' }, map)).toEqual(
      expect.objectContaining({
        productCode: 'ING-1',
        unit: '개',
        unitPrice: 12.3,
      })
    );
  });

  test('저장 row는 최신 단가 우선으로 정규화한다', () => {
    const map = new Map([['ING-1', { baseUnitType: 'g', unitPrice: 4.5 }]]);
    expect(
      buildRecipeComponentForSave(
        { productCode: ' ING-1 ', ingredientName: '치즈', quantity: '10', unitPrice: 2 },
        map
      )
    ).toEqual({
      productCode: 'ING-1',
      ingredientName: '치즈',
      quantity: 10,
      unit: 'g',
      unitPrice: 4.5,
    });
  });

  test('저장 row는 잘못된 수량/단가를 NaN 대신 null로 정규화한다', () => {
    const map = new Map([['ING-1', { baseUnitType: 'g', unitPrice: 'Infinity' }]]);
    expect(
      buildRecipeComponentForSave(
        { productCode: 'ING-1', ingredientName: '치즈', quantity: '0', unitPrice: '-1' },
        map
      )
    ).toEqual({
      productCode: 'ING-1',
      ingredientName: '치즈',
      quantity: null,
      unit: 'g',
      unitPrice: null,
    });
  });

  test('저장 전 빈 구성품 row는 제외한다', () => {
    const map = new Map([['ING-1', { baseUnitType: 'g', unitPrice: 4.5 }]]);
    expect(
      buildSavableRecipeComponents(
        [
          { productCode: '', ingredientName: '', quantity: '' },
          { productCode: 'ING-1', ingredientName: '치즈', quantity: '10' },
        ],
        map
      )
    ).toEqual([
      {
        productCode: 'ING-1',
        ingredientName: '치즈',
        quantity: 10,
        unit: 'g',
        unitPrice: 4.5,
      },
    ]);
  });

  test('productCode 없는 수동 식자재는 id 기준 단가를 적용한다', () => {
    const map = new Map([['7', { baseUnitType: 'ea', unitPrice: 300 }]]);
    expect(
      applyIngredientSuggestionToComponent(
        { ingredientName: '', productCode: '', unit: 'g', unitPrice: null },
        { id: 7, ingredientName: '수동재료', baseUnitType: 'g' },
        map
      )
    ).toEqual({
      ingredientName: '수동재료',
      productCode: '',
      unit: '개',
      unitPrice: 300,
    });
  });

  test('단가 없음 판정은 빈 행을 제외하고 최신 단가와 직접 단가를 모두 본다', () => {
    const map = new Map([['ING-1', { unitPrice: 3.2 }]]);
    expect(isRecipeComponentMissingUnitPrice({ ingredientName: '', productCode: '' }, map)).toBe(
      false
    );
    expect(
      isRecipeComponentMissingUnitPrice({ ingredientName: '치즈', productCode: '' }, map)
    ).toBe(true);
    expect(
      isRecipeComponentMissingUnitPrice({ ingredientName: '치즈', productCode: 'ING-1' }, map)
    ).toBe(false);
    expect(
      isRecipeComponentMissingUnitPrice(
        { ingredientName: '치즈', productCode: '', unitPrice: 1 },
        map
      )
    ).toBe(false);
  });

  test('저장 전 검증 상세는 누락된 구성품명을 분리한다', () => {
    const map = new Map([['ING-1', { unitPrice: 3.2 }]]);
    expect(
      buildRecipeValidationDetails(
        [
          { ingredientName: '치즈', productCode: 'ING-1', quantity: '0' },
          { ingredientName: '소스', productCode: '', quantity: '10' },
          { ingredientName: '', productCode: '', quantity: '' },
        ],
        map
      )
    ).toEqual({
      missingQuantityNames: ['치즈'],
      missingPriceNames: ['소스'],
    });
  });

  test('단가 없음 행은 식자재 관리 단가 보정 이동을 제공한다', () => {
    expect(tableSrc).toContain('식자재 관리에서 원본 단가 보정');
    expect(tableSrc).toContain('/ingredient/manage?');
    expect(tableSrc).toContain('단가 보정');
  });

  test('원산지/알레르기 영향 미리보기는 연결·누락·출력값을 계산한다', () => {
    const preview = buildRecipeImpactPreview(
      [
        { ingredientName: '치즈', productCode: 'ING-1' },
        { ingredientName: '소스', productCode: 'ING-2' },
        { ingredientName: '미연결', productCode: 'ING-X' },
      ],
      [
        {
          ingredientName: '치즈',
          productCode: 'ING-1',
          origin: [{ displayName: '치즈', country: '미국산' }],
          allergens: ['TEST_AL'],
        },
        { ingredientName: '소스', productCode: 'ING-2', origin: [], allergens: [] },
      ]
    );

    expect(preview.componentCount).toBe(3);
    expect(preview.linkedIngredientCount).toBe(2);
    expect(preview.originRegisteredCount).toBe(1);
    expect(preview.allergenRegisteredCount).toBe(1);
    expect(preview.originOutputLabels).toEqual(['치즈 미국산']);
    expect(preview.allergenOutputLabels).toEqual(['TEST_AL']);
    expect(preview.missingOriginNames).toEqual(['소스', '미연결']);
    expect(preview.missingAllergenNames).toEqual(['소스', '미연결']);
    expect(preview.unmatchedNames).toEqual(['미연결']);
  });

  test('저장/로드 로직은 useMenuRecipeEditor에 위치한다', () => {
    expect(editorHookSrc).toContain('getMenuRecipeForMenu');
    expect(editorHookSrc).toContain('upsertMenuRecipeForMenu');
    expect(editorHookSrc).toContain('summarizeMenuRecipe');
  });
});
