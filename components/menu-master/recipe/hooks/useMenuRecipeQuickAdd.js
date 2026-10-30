import { useCallback, useEffect, useMemo, useRef, useState } from 'react';
import {
  applyIngredientSuggestionToComponent,
  createBlankRecipeComponentRow,
} from '@/components/menu-master/recipeComponentRows';
import {
  quickQuantityValue,
  rankIngredientSuggestions,
} from '@/components/menu-master/recipe/quickAddHelpers';
import { isImeComposing } from '@/lib/ui/ime';

// MenuRecipeSection의 "식자재 빠른 추가" 패널 상태/핸들러.
// 아래 "빠른 추가 검색칸 재포커스" 이펙트는 pendingFocusQuantityKeyRef /
// pendingFocusNewRowRef를 읽기만 한다 — 이 값들을 초기화(쓰기)하는 이펙트는
// useMenuRecipeRowFocus에 있고, 반드시 이 훅보다 나중에 호출돼야 한다
// (MenuRecipeSection에서 useMenuRecipeQuickAdd → useMenuRecipeRowFocus 순서 유지).
export function useMenuRecipeQuickAdd({
  components,
  setComponents,
  allIngredients,
  unitPriceMap,
  onlyMissingPrice,
  setOnlyMissingPrice,
  pendingFocusNewRowRef,
  pendingFocusQuantityKeyRef,
  pendingFocusQuickSearchRef,
}) {
  const [quickAddQ, setQuickAddQ] = useState('');
  const [quickAddQty, setQuickAddQty] = useState('');
  const [quickAddOpen, setQuickAddOpen] = useState(false);
  const [quickAddActiveIdx, setQuickAddActiveIdx] = useState(-1);
  const quickAddBlurTimerRef = useRef(null);

  const quickAddSuggestions = useMemo(
    () =>
      rankIngredientSuggestions(
        allIngredients.filter(ingredient => !ingredient.discontinued && !ingredient.excluded),
        quickAddQ,
        10
      ),
    [allIngredients, quickAddQ]
  );
  // 한글 조합 중에 Enter를 친 경우 — 조합이 끝난 뒤 한 번 처리한다(handleQuickAddKeyDown 참고)
  const pendingEnterRef = useRef(false);
  const composeTimerRef = useRef(null);
  const latestKeyDownRef = useRef(null);

  useEffect(() => {
    setQuickAddActiveIdx(-1);
  }, [quickAddQ]);

  useEffect(
    () => () => {
      clearTimeout(quickAddBlurTimerRef.current);
      clearTimeout(composeTimerRef.current);
    },
    []
  );

  const addQuickRow = useCallback(
    row => {
      const quantity = quickQuantityValue(quickAddQty);
      const nextRow = quantity ? { ...row, quantity } : row;
      pendingFocusQuantityKeyRef.current = quantity ? null : nextRow._key;
      pendingFocusQuickSearchRef.current = Boolean(quantity);
      if (onlyMissingPrice) setOnlyMissingPrice(false);
      setComponents(prev => [...prev, nextRow]);
      setQuickAddQ('');
      setQuickAddQty('');
      setQuickAddOpen(false);
      setQuickAddActiveIdx(-1);
    },
    [
      onlyMissingPrice,
      pendingFocusQuantityKeyRef,
      pendingFocusQuickSearchRef,
      quickAddQty,
      setComponents,
      setOnlyMissingPrice,
    ]
  );

  const pickQuickIngredient = useCallback(
    ingredient => {
      addQuickRow(
        applyIngredientSuggestionToComponent(
          createBlankRecipeComponentRow(),
          ingredient,
          unitPriceMap
        )
      );
    },
    [addQuickRow, unitPriceMap]
  );

  const addManualQuickIngredient = useCallback(() => {
    const name = quickAddQ.trim();
    if (!name) return;
    addQuickRow({ ...createBlankRecipeComponentRow(), ingredientName: name });
  }, [addQuickRow, quickAddQ]);

  const focusQuickSearchInput = useCallback(() => {
    setTimeout(() => {
      const input = document.querySelector('[data-menu-recipe-quick-add="search"]');
      input?.focus?.();
    }, 0);
  }, []);

  useEffect(() => {
    if (!components.length) return;
    if (!pendingFocusQuickSearchRef.current) return;
    if (pendingFocusQuantityKeyRef.current !== null) return;
    if (pendingFocusNewRowRef.current) return;
    pendingFocusQuickSearchRef.current = false;
    if (!quickAddQ && !quickAddQty) focusQuickSearchInput();
  }, [
    components.length,
    focusQuickSearchInput,
    pendingFocusNewRowRef,
    pendingFocusQuantityKeyRef,
    pendingFocusQuickSearchRef,
    quickAddQ,
    quickAddQty,
  ]);

  const processQuickAddKeyDown = useCallback(
    e => {
      if (e.key === 'ArrowDown') {
        e.preventDefault();
        setQuickAddOpen(true);
        setQuickAddActiveIdx(idx => Math.min(idx + 1, quickAddSuggestions.length - 1));
        return;
      }

      if (e.key === 'ArrowUp') {
        e.preventDefault();
        setQuickAddActiveIdx(idx => Math.max(idx - 1, 0));
        return;
      }

      if (e.key === 'Enter') {
        e.preventDefault();
        if (!quickAddSuggestions.length) {
          addManualQuickIngredient();
          return;
        }
        const target =
          quickAddSuggestions[quickAddActiveIdx >= 0 ? quickAddActiveIdx : 0] ||
          quickAddSuggestions[0];
        if (target) pickQuickIngredient(target);
        return;
      }

      if (e.key === 'Escape') {
        e.preventDefault();
        // 목록이 열려 있을 때는 목록만 닫는다 — 수정 창까지 닫혀 입력 중인 내용을 잃지 않게
        if (quickAddOpen) e.stopPropagation?.();
        setQuickAddOpen(false);
        setQuickAddActiveIdx(-1);
      }
    },
    [
      addManualQuickIngredient,
      pickQuickIngredient,
      quickAddActiveIdx,
      quickAddOpen,
      quickAddSuggestions,
    ]
  );

  useEffect(() => {
    latestKeyDownRef.current = processQuickAddKeyDown;
  }, [processQuickAddKeyDown]);

  // 조합 중 키는 무시하고, Enter였다면 조합이 끝난 직후 최신 입력값으로 한 번 처리한다.
  const handleQuickAddKeyDown = useCallback(
    e => {
      if (isImeComposing(e)) {
        if (e.key === 'Enter') pendingEnterRef.current = true;
        return;
      }
      pendingEnterRef.current = false;
      processQuickAddKeyDown(e);
    },
    [processQuickAddKeyDown]
  );

  const handleQuickAddCompositionEnd = useCallback(() => {
    if (!pendingEnterRef.current) return;
    pendingEnterRef.current = false;
    clearTimeout(composeTimerRef.current);
    composeTimerRef.current = setTimeout(() => {
      composeTimerRef.current = null;
      latestKeyDownRef.current?.({ key: 'Enter', preventDefault() {} });
    }, 0);
  }, []);

  return {
    quickAddQ,
    setQuickAddQ,
    quickAddQty,
    setQuickAddQty,
    quickAddOpen,
    setQuickAddOpen,
    quickAddActiveIdx,
    setQuickAddActiveIdx,
    quickAddBlurTimerRef,
    quickAddSuggestions,
    pickQuickIngredient,
    addManualQuickIngredient,
    handleQuickAddKeyDown,
    handleQuickAddCompositionEnd,
  };
}
