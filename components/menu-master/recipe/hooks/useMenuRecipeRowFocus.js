import { useCallback, useEffect, useImperativeHandle, useMemo, useRef } from 'react';
import {
  buildRecipeValidationDetails,
  isRecipeComponentMissingUnitPrice,
  isRecipeComponentMissingQuantity,
} from '@/components/menu-master/recipeComponentRows';

// MenuRecipeSection의 "구성품 행 포커스/재정렬/저장" 관련 상태·이펙트·ref API.
// 아래 "pendingFocus 수량/새 행" 이펙트는 pendingFocusQuantityKeyRef /
// pendingFocusNewRowRef를 초기화(쓰기)한다 — useMenuRecipeQuickAdd의
// "빠른 추가 검색칸 재포커스" 이펙트가 같은 ref들을 읽기만 하므로, 반드시
// 그 훅이 먼저 호출된 뒤에(MenuRecipeSection에서 순서 유지) 이 훅을 호출해야
// 한다. 순서가 바뀌면 빠른 추가 후 검색칸 재포커스가 깨진다(회귀 위험).
export function useMenuRecipeRowFocus({
  ref,
  loaded,
  initialFocus,
  components,
  setComponents,
  unitPriceMap,
  addRow,
  onlyMissingPrice,
  setOnlyMissingPrice,
  handleSave,
  recipeSummary,
  ingredientInputRefs,
  quantityInputRefs,
  pendingFocusNewRowRef,
  pendingFocusQuantityKeyRef,
}) {
  const initialFocusConsumedRef = useRef(false);

  const missingPriceComponents = useMemo(
    () =>
      components.filter(component => isRecipeComponentMissingUnitPrice(component, unitPriceMap)),
    [components, unitPriceMap]
  );

  const displayedComponents = useMemo(() => {
    const rows = components.map((component, sourceIdx) => ({
      ...component,
      _sourceIdx: sourceIdx,
    }));
    return onlyMissingPrice
      ? rows.filter(component => isRecipeComponentMissingUnitPrice(component, unitPriceMap))
      : rows;
  }, [components, onlyMissingPrice, unitPriceMap]);

  const recipeValidation = useMemo(
    () => buildRecipeValidationDetails(components, unitPriceMap),
    [components, unitPriceMap]
  );

  // 레시피출력(lib/report/recipe-print-rows.js)이 components 배열 순서 그대로
  // lineNo를 매기므로, 여기서 배열 순서만 바꾸면 출력 순서도 함께 바뀐다.
  // _key로 찾는다 — displayedComponents는 단가없음 필터로 밀린 인덱스를 쓸 수 있어
  // 화면 인덱스가 아니라 항상 원본 components 배열에서 위치를 다시 찾는다.
  const handleReorderRows = useCallback(
    (activeKey, overKey) => {
      if (!activeKey || !overKey || activeKey === overKey) return;
      setComponents(prev => {
        const oldIdx = prev.findIndex(c => c._key === activeKey);
        const newIdx = prev.findIndex(c => c._key === overKey);
        if (oldIdx < 0 || newIdx < 0 || oldIdx === newIdx) return prev;
        const next = prev.slice();
        const [moved] = next.splice(oldIdx, 1);
        next.splice(newIdx, 0, moved);
        return next;
      });
    },
    [setComponents]
  );

  const focusRecipeIssue = useCallback(
    target => {
      if (target === 'missing-price') {
        setOnlyMissingPrice(true);
      }

      setTimeout(() => {
        if (target === 'missing-quantity') {
          const row = components.find(component => isRecipeComponentMissingQuantity(component));
          if (row?._key) {
            quantityInputRefs.current[row._key]?.focus();
          }
          return;
        }

        if (target === 'missing-price') {
          const row = components.find(component =>
            isRecipeComponentMissingUnitPrice(component, unitPriceMap)
          );
          if (row?._key) {
            ingredientInputRefs.current[row._key]?.focus();
          }
          return;
        }

        const firstKey = components[0]?._key;
        if (firstKey) {
          ingredientInputRefs.current[firstKey]?.focus();
        }
      }, 80);
    },
    [components, ingredientInputRefs, quantityInputRefs, setOnlyMissingPrice, unitPriceMap]
  );

  useImperativeHandle(
    ref,
    () => ({
      saveRecipe: handleSave,
      getRecipeSummary: () => recipeSummary,
      getRecipeValidation: () => recipeValidation,
      focusRecipeIssue,
    }),
    [focusRecipeIssue, handleSave, recipeSummary, recipeValidation]
  );

  useEffect(() => {
    if (!loaded || !initialFocus || initialFocusConsumedRef.current) return;
    if (!['recipe', 'missing-price', 'missing-quantity'].includes(initialFocus)) return;
    initialFocusConsumedRef.current = true;
    focusRecipeIssue(initialFocus);
  }, [focusRecipeIssue, initialFocus, loaded]);

  useEffect(() => {
    if (onlyMissingPrice && missingPriceComponents.length === 0) {
      setOnlyMissingPrice(false);
    }
  }, [missingPriceComponents.length, onlyMissingPrice, setOnlyMissingPrice]);

  // 빠른 추가는 수량, 빈 행 추가는 식자재 input으로 focus.
  useEffect(() => {
    if (pendingFocusQuantityKeyRef.current) {
      const targetKey = pendingFocusQuantityKeyRef.current;
      pendingFocusQuantityKeyRef.current = null;
      quantityInputRefs.current[targetKey]?.focus();
      quantityInputRefs.current[targetKey]?.select?.();
      return;
    }

    if (!pendingFocusNewRowRef.current) return;
    pendingFocusNewRowRef.current = false;
    if (components.length > 0) {
      const lastKey = components[components.length - 1]._key;
      ingredientInputRefs.current[lastKey]?.focus();
    }
  }, [
    components,
    ingredientInputRefs,
    pendingFocusNewRowRef,
    pendingFocusQuantityKeyRef,
    quantityInputRefs,
  ]);

  const handleQuantityKeyDown = useCallback(
    (idx, e) => {
      if (e.key !== 'Enter') return;
      e.preventDefault();
      const visibleRows = onlyMissingPrice
        ? displayedComponents
        : components.map((component, sourceIdx) => ({ ...component, _sourceIdx: sourceIdx }));
      const position = visibleRows.findIndex(component => component._sourceIdx === idx);
      const nextSourceIdx = visibleRows[position + 1]?._sourceIdx;
      if (nextSourceIdx != null && components[nextSourceIdx]) {
        const nextKey = components[nextSourceIdx]._key;
        ingredientInputRefs.current[nextKey]?.focus();
      } else {
        if (onlyMissingPrice) setOnlyMissingPrice(false);
        addRow();
        pendingFocusNewRowRef.current = true;
      }
    },
    [
      addRow,
      components,
      displayedComponents,
      ingredientInputRefs,
      onlyMissingPrice,
      pendingFocusNewRowRef,
      setOnlyMissingPrice,
    ]
  );

  return {
    missingPriceComponents,
    displayedComponents,
    recipeValidation,
    handleReorderRows,
    handleQuantityKeyDown,
  };
}
