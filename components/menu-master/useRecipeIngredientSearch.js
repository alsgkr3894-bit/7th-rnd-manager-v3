'use client';

import { useCallback, useEffect, useMemo, useRef, useState } from 'react';
import { applyIngredientSuggestionToComponent } from '@/components/menu-master/recipeComponentRows';

export function useRecipeIngredientSearch({
  allIngredients,
  unitPriceMap,
  setComponents,
  quantityInputRefs,
}) {
  const [searchIdx, setSearchIdx] = useState(null);
  const [searchQ, setSearchQ] = useState('');
  const [activeSuggestionIdx, setActiveSuggestionIdx] = useState(-1);
  const blurTimerRef = useRef(null);
  const focusTimerRef = useRef(null);

  useEffect(
    () => () => {
      clearTimeout(blurTimerRef.current);
      clearTimeout(focusTimerRef.current);
    },
    []
  );

  const suggestions = useMemo(() => {
    const active = allIngredients.filter(i => !i.discontinued && !i.excluded);
    if (!searchQ.trim()) {
      return [];
    }
    const q = searchQ.toLowerCase().replace(/\s/g, '');
    return active
      .filter(
        i =>
          (i.ingredientName || '').toLowerCase().replace(/\s/g, '').includes(q) ||
          (i.productCode || '').toLowerCase().replace(/\s/g, '').includes(q)
      )
      .slice(0, 8);
  }, [searchQ, allIngredients]);

  useEffect(() => {
    setActiveSuggestionIdx(-1);
  }, [searchQ]);

  const pickSuggestion = useCallback(
    (idx, ing) => {
      setComponents(prev =>
        prev.map((c, i) =>
          i === idx ? applyIngredientSuggestionToComponent(c, ing, unitPriceMap) : c
        )
      );
      setSearchIdx(null);
      setSearchQ('');
      setActiveSuggestionIdx(-1);
      setComponents(prev => {
        const component = prev[idx];
        if (component) {
          clearTimeout(focusTimerRef.current);
          focusTimerRef.current = setTimeout(() => {
            quantityInputRefs.current[component._key]?.focus();
            focusTimerRef.current = null;
          }, 0);
        }
        return prev;
      });
    },
    [quantityInputRefs, setComponents, unitPriceMap]
  );

  const handleIngredientKeyDown = useCallback(
    (idx, e) => {
      if (searchIdx !== idx) return;
      if (suggestions.length === 0) {
        // 일치하는 식자재가 없을 때 Enter — 입력한 이름은 onChange에서 이미
        // ingredientName에 그대로 저장돼 있으므로(수동 구성품), 검색창만 닫고
        // 수량 입력으로 넘어간다. 여기서 return하면 Enter가 아무 반응도 없어
        // 행이 멈춘 것처럼 보인다.
        if (e.key === 'Enter' && searchQ.trim()) {
          e.preventDefault();
          setSearchIdx(null);
          setActiveSuggestionIdx(-1);
          setComponents(prev => {
            const component = prev[idx];
            if (component) {
              clearTimeout(focusTimerRef.current);
              focusTimerRef.current = setTimeout(() => {
                quantityInputRefs.current[component._key]?.focus();
                focusTimerRef.current = null;
              }, 0);
            }
            return prev;
          });
        } else if (e.key === 'Escape') {
          e.preventDefault();
          setSearchIdx(null);
          setSearchQ('');
          setActiveSuggestionIdx(-1);
        }
        return;
      }
      if (e.key === 'ArrowDown') {
        e.preventDefault();
        setActiveSuggestionIdx(i => Math.min(i + 1, suggestions.length - 1));
      } else if (e.key === 'ArrowUp') {
        e.preventDefault();
        setActiveSuggestionIdx(i => Math.max(i - 1, 0));
      } else if (e.key === 'Enter') {
        e.preventDefault();
        const target = activeSuggestionIdx >= 0 ? suggestions[activeSuggestionIdx] : suggestions[0];
        if (target) pickSuggestion(idx, target);
      } else if (e.key === 'Escape') {
        e.preventDefault();
        setSearchIdx(null);
        setSearchQ('');
        setActiveSuggestionIdx(-1);
      }
    },
    [
      activeSuggestionIdx,
      pickSuggestion,
      quantityInputRefs,
      searchIdx,
      searchQ,
      setComponents,
      suggestions,
    ]
  );

  const handleIngredientInputChange = useCallback((idx, value, updateRow) => {
    // 이전 blur에서 예약된 닫기 타이머가 이번 입력 뒤에 뒤늦게 발동해 searchIdx를
    // 지우지 않도록 취소한다.
    clearTimeout(blurTimerRef.current);
    setSearchIdx(idx);
    setSearchQ(value);
    updateRow(idx, 'ingredientName', value);
  }, []);

  const handleIngredientFocus = useCallback((idx, value) => {
    // Enter로 다음 행에 포커스가 옮겨갈 때, 직전 행에서 pickSuggestion이 예약한
    // blur 타이머가 150ms 뒤 새 행의 searchIdx까지 지워버리는 경쟁조건을 막는다.
    clearTimeout(blurTimerRef.current);
    setSearchIdx(idx);
    setSearchQ(value);
  }, []);

  const handleIngredientBlur = useCallback(() => {
    clearTimeout(blurTimerRef.current);
    blurTimerRef.current = setTimeout(() => {
      setSearchIdx(null);
      blurTimerRef.current = null;
    }, 150);
  }, []);

  return {
    searchIdx,
    searchQ,
    suggestions,
    activeSuggestionIdx,
    handleIngredientInputChange,
    handleIngredientFocus,
    handleIngredientBlur,
    handleIngredientKeyDown,
    pickSuggestion,
  };
}
