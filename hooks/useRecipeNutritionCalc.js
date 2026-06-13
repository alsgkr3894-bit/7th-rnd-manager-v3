'use client';
import { useState, useEffect } from 'react';
import { showToast } from '@/components/Toast';
import { upsertRawValue } from '@/lib/nutrition/values/store';
import {
  calcNutritionFromComponents,
  buildIngredientNutritionMap,
  findRecipeForMenu,
} from '@/lib/nutrition/auto-calc';

/**
 * 레시피(cost_recipes) 구성 기반 영양성분 자동계산.
 * 베이스 에디터의 selMenu/selCrust/form/setForm/setSaving를 공유받는다.
 */
export function useRecipeNutritionCalc({
  selMenu,
  selCrust,
  form,
  safeRawMap,
  setForm,
  setSaving,
  refresh,
}) {
  const [autoCalcBusy, setAutoCalcBusy] = useState(false);
  const [autoCalcPreview, setAutoCalcPreview] = useState(null); // { values, totalGrams, matched, total } | null

  useEffect(() => {
    setAutoCalcPreview(null);
  }, [selMenu, selCrust]);

  const handleAutoCalc = async () => {
    if (!selMenu) return;
    setAutoCalcBusy(true);
    try {
      const recipe = await findRecipeForMenu(selMenu.menuCode, selMenu.menuName);
      if (!recipe || !recipe.ingredients?.length) {
        showToast('레시피 데이터가 없어요', 'warn');
        return;
      }

      const ingredientMap = await buildIngredientNutritionMap();
      if (ingredientMap.size === 0) {
        showToast('재료별 영양DB가 준비 중이에요. 직접 입력해주세요', 'warn');
        return;
      }

      // 크러스트 끝 글자(L/R)로 레시피 사이즈 선택
      const size = selCrust.endsWith('R') ? 'R' : 'L';
      const calculated = calcNutritionFromComponents(recipe.ingredients, ingredientMap, size);
      if (!calculated) {
        showToast('매핑된 재료가 없어요. 재료 영양DB를 확인해주세요', 'warn');
        return;
      }

      setAutoCalcPreview(calculated); // { values, totalGrams, matched, total }
    } catch {
      showToast('자동 계산 중 오류가 발생했어요', 'error');
    } finally {
      setAutoCalcBusy(false);
    }
  };

  const handleApplyAutoCalc = async () => {
    if (!autoCalcPreview || !selMenu) return;
    setSaving(true);
    try {
      const existing = safeRawMap[`${selMenu.menuCode}__${selCrust}`];
      // 100g 기준 영양값 + 레시피 총중량을 중량(weight)에 자동 채움
      const applied = { ...autoCalcPreview.values, weight: autoCalcPreview.totalGrams };
      await upsertRawValue({
        ...(existing?.id ? { id: existing.id } : {}),
        menuCode: selMenu.menuCode,
        menuName: selMenu.menuName,
        crustType: selCrust,
        ...form,
        ...applied,
      });
      setForm(f => ({ ...f, ...applied }));
      setAutoCalcPreview(null);
      showToast('자동 계산값이 적용됐어요 (100g 기준)', 'ok');
      refresh();
    } catch {
      showToast('저장 실패', 'error');
    }
    setSaving(false);
  };

  return { autoCalcBusy, autoCalcPreview, setAutoCalcPreview, handleAutoCalc, handleApplyAutoCalc };
}
