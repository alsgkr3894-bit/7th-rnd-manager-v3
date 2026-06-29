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
      if (searchIdx !== idx || suggestions.length === 0) return;
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
    [activeSuggestionIdx, pickSuggestion, searchIdx, suggestions]
  );

  const handleIngredientInputChange = useCallback((idx, value, updateRow) => {
    setSearchIdx(idx);
    setSearchQ(value);
    updateRow(idx, 'ingredientName', value);
  }, []);

  const handleIngredientFocus = useCallback((idx, value) => {
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
