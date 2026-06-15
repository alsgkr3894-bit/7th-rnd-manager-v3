'use client';
import { useCallback, useEffect, useState } from 'react';
import {
  ALLERGEN_MENU_ORDER_KEY,
  ALLERGEN_ORDER_KEY,
  loadOrder,
  saveOrder,
} from '@/lib/nutrition/order';
import { loadMenuNames, saveMenuNames } from '@/lib/nutrition/menu-name-override';

export function useAllergenOrderState() {
  const [menuOrder, setMenuOrder] = useState([]);
  const [allergenOrder, setAllergenOrder] = useState([]);
  const [menuNameOverrides, setMenuNameOverrides] = useState(() => loadMenuNames());

  useEffect(() => {
    setMenuOrder(loadOrder(ALLERGEN_MENU_ORDER_KEY));
    setAllergenOrder(loadOrder(ALLERGEN_ORDER_KEY));
  }, []);

  const applyMenuOrder = useCallback(keys => {
    saveOrder(ALLERGEN_MENU_ORDER_KEY, keys);
    setMenuOrder(keys);
  }, []);

  const applyAllergenOrder = useCallback(keys => {
    saveOrder(ALLERGEN_ORDER_KEY, keys);
    setAllergenOrder(keys);
  }, []);

  const resetOrder = useCallback(() => {
    saveOrder(ALLERGEN_MENU_ORDER_KEY, []);
    saveOrder(ALLERGEN_ORDER_KEY, []);
    setMenuOrder([]);
    setAllergenOrder([]);
  }, []);

  const applyMenuNameOverrides = useCallback(next => {
    saveMenuNames(next);
    setMenuNameOverrides(next);
  }, []);

  return {
    menuOrder,
    allergenOrder,
    menuNameOverrides,
    applyMenuOrder,
    applyAllergenOrder,
    resetOrder,
    applyMenuNameOverrides,
  };
}
