'use client';

import { useEffect, useMemo, useRef, useState } from 'react';
import { showToast } from '@/components/Toast';
import { initDB } from '@/lib/db';
import { getAllIngredients } from '@/lib/ingredient';
import { buildPriceRowMap, getPriceFiles, getPriceRowsByFileId } from '@/lib/price';
import { buildUnitPriceMap } from '@/lib/recipe';
import {
  calcTempCostSummary,
  createTempCostRow,
  filterTempCostIngredients,
  hasLinkedTempCostRows,
  parseTempCost,
  refreshLinkedTempCostRows,
} from './tempCostUtils';

// 원가 화면과 같이 최신 제때 단가·묶음 단가·수동 단가를 합쳐 단위 단가를 만든다.
async function loadTempCostSource() {
  const [ingredients, files] = await Promise.all([getAllIngredients(), getPriceFiles()]);
  const latest = files[0] || null;
  const priceRows = latest ? await getPriceRowsByFileId(latest.id) : [];
  return {
    ingredients,
    unitPriceMap: buildUnitPriceMap(ingredients, buildPriceRowMap(priceRows).map),
  };
}

export function useTempCostCalculator({ value, onChange }) {
  const parsedCostCalc = useMemo(() => parseTempCost(value), [value]);
  const [ingredients, setIngredients] = useState([]);
  const [unitPriceMap, setUnitPriceMap] = useState(() => new Map());
  const [ingredientSearch, setIngredientSearch] = useState('');
  const [showDropdown, setShowDropdown] = useState(false);
  const searchRef = useRef(null);
  const dropdownTimerRef = useRef(null);

  function updateCost(rows, sellingPrice) {
    onChange(JSON.stringify({ rows, sellingPrice }));
  }

  useEffect(() => {
    let ignore = false;
    initDB()
      .then(loadTempCostSource)
      .then(source => {
        if (ignore) return;
        setIngredients(source.ingredients.filter(row => !row.excluded && !row.discontinued));
        setUnitPriceMap(source.unitPriceMap);
      })
      .catch(err => {
        if (!ignore) console.warn('[TempCostCalculator]', err);
      });
    return () => {
      ignore = true;
    };
  }, []);

  useEffect(
    () => () => {
      if (dropdownTimerRef.current) clearTimeout(dropdownTimerRef.current);
    },
    []
  );

  function closeDropdownSoon() {
    if (dropdownTimerRef.current) clearTimeout(dropdownTimerRef.current);
    dropdownTimerRef.current = setTimeout(() => {
      setShowDropdown(false);
      dropdownTimerRef.current = null;
    }, 150);
  }

  const filteredIngredients = useMemo(
    () => filterTempCostIngredients(ingredients, ingredientSearch),
    [ingredientSearch, ingredients]
  );

  const hasLinkedCostRows = useMemo(
    () => hasLinkedTempCostRows(parsedCostCalc.rows),
    [parsedCostCalc.rows]
  );

  function addIngredientRow(ingredient) {
    updateCost(
      [...parsedCostCalc.rows, createTempCostRow(ingredient, unitPriceMap)],
      parsedCostCalc.sellingPrice
    );
    setIngredientSearch('');
    setShowDropdown(false);
  }

  function refreshLinkedCostRows() {
    updateCost(
      refreshLinkedTempCostRows(parsedCostCalc.rows, ingredients, unitPriceMap),
      parsedCostCalc.sellingPrice
    );
    showToast('식자재 연동값을 갱신했습니다', 'ok');
  }

  function removeIngredientRow(rowId) {
    updateCost(
      parsedCostCalc.rows.filter(row => row.id !== rowId),
      parsedCostCalc.sellingPrice
    );
  }

  function updateIngredientRow(rowId, field, fieldValue) {
    updateCost(
      parsedCostCalc.rows.map(row => (row.id === rowId ? { ...row, [field]: fieldValue } : row)),
      parsedCostCalc.sellingPrice
    );
  }

  function updateSellingPrice(sellingPrice) {
    updateCost(parsedCostCalc.rows, sellingPrice);
  }

  return {
    parsedCostCalc,
    searchRef,
    ingredientSearch,
    showDropdown,
    filteredIngredients,
    unitPriceMap,
    hasLinkedCostRows,
    summary: calcTempCostSummary(parsedCostCalc.rows, parsedCostCalc.sellingPrice),
    setIngredientSearch,
    setShowDropdown,
    closeDropdownSoon,
    addIngredientRow,
    refreshLinkedCostRows,
    removeIngredientRow,
    updateIngredientRow,
    updateSellingPrice,
  };
}
