'use client';
import { useState, useEffect } from 'react';
import { showToast } from '@/components/Toast';
import { getAllIngredients } from '@/lib/ingredient';
import { asDisplayText, asObjectArray } from '@/lib/ui/prop-guards';
import { upsertRawValue, getAllIngredientValues } from '@/lib/nutrition/values/store';
import {
  calcNutritionFromIngredientAmounts,
  buildIngredientNutritionMapFromRows,
} from '@/lib/nutrition/auto-calc';
import {
  normalizeIngredientName,
  getCrustSize,
  getCrustPair,
  formatCrustPairLabel,
} from '@/lib/nutrition/values/base-helpers';

/**
 * 식자재 영양값 + L/R 사용량 기반 영양성분 계산.
 * 베이스 에디터의 selMenu/selCrust/form/setForm/setSaving를 공유받는다.
 */
export function useIngredientNutritionCalc({
  selMenu,
  selCrust,
  form,
  safeRawMap,
  setForm,
  setSaving,
  refresh,
}) {
  const [ingredientCalcOpen, setIngredientCalcOpen] = useState(false);
  const [ingredientCalcLoading, setIngredientCalcLoading] = useState(false);
  const [ingredientCalcIngredients, setIngredientCalcIngredients] = useState([]);
  const [ingredientNutritionMap, setIngredientNutritionMap] = useState(new Map());
  const [ingredientCalcRows, setIngredientCalcRows] = useState([]);
  const [ingredientCalcPreview, setIngredientCalcPreview] = useState(null);

  useEffect(() => {
    setIngredientCalcPreview(null);
  }, [selMenu, selCrust]);

  const loadIngredientCalcSource = async () => {
    if (ingredientCalcIngredients.length > 0 || ingredientNutritionMap.size > 0) return;
    setIngredientCalcLoading(true);
    try {
      const [ingredientRows, nutritionRows] = await Promise.all([
        getAllIngredients(),
        getAllIngredientValues(),
      ]);
      const nutritionMap = buildIngredientNutritionMapFromRows(nutritionRows);
      const nutritionCodeSet = new Set(
        asObjectArray(nutritionRows)
          .map(row => asDisplayText(row.productCode))
          .filter(Boolean)
      );
      const metaByCode = new Map();
      asObjectArray(ingredientRows).forEach(row => {
        const productCode = asDisplayText(row.productCode);
        if (!productCode || !nutritionCodeSet.has(productCode)) return;
        metaByCode.set(productCode, {
          ...row,
          productCode,
          ingredientName: normalizeIngredientName(row),
        });
      });
      asObjectArray(nutritionRows).forEach(row => {
        const productCode = asDisplayText(row.productCode);
        if (!productCode || metaByCode.has(productCode)) return;
        metaByCode.set(productCode, {
          productCode,
          ingredientName: normalizeIngredientName(row),
        });
      });
      setIngredientCalcIngredients([...metaByCode.values()]);
      setIngredientNutritionMap(nutritionMap);
    } catch (err) {
      showToast(`식자재 영양값 불러오기 실패: ${err?.message || err}`, 'error');
    } finally {
      setIngredientCalcLoading(false);
    }
  };

  const openIngredientCalc = async () => {
    if (!selMenu) return;
    setIngredientCalcOpen(true);
    await loadIngredientCalcSource();
  };

  const addIngredientCalcRow = ingredient => {
    const productCode = asDisplayText(ingredient.productCode);
    if (!productCode) return;
    setIngredientCalcRows(rows => {
      if (rows.some(row => asDisplayText(row.productCode) === productCode)) return rows;
      return [
        ...rows,
        {
          productCode,
          ingredientName: normalizeIngredientName(ingredient),
          lAmount: '',
          rAmount: '',
        },
      ];
    });
    setIngredientCalcPreview(null);
  };

  const updateIngredientCalcAmount = (productCode, key, value) => {
    setIngredientCalcRows(rows =>
      rows.map(row => (row.productCode === productCode ? { ...row, [key]: value } : row))
    );
    setIngredientCalcPreview(null);
  };

  const removeIngredientCalcRow = productCode => {
    setIngredientCalcRows(rows => rows.filter(row => row.productCode !== productCode));
    setIngredientCalcPreview(null);
  };

  const buildIngredientCalcPreview = () => {
    if (!ingredientCalcRows.length) {
      showToast('계산할 식자재를 먼저 추가해주세요', 'warn');
      return null;
    }
    if (!ingredientNutritionMap.size) {
      showToast('식자재 영양값이 없어요. 식자재 영양값 탭에서 먼저 입력해주세요', 'warn');
      return null;
    }
    const next = {
      L: calcNutritionFromIngredientAmounts(ingredientCalcRows, ingredientNutritionMap, 'L'),
      R: calcNutritionFromIngredientAmounts(ingredientCalcRows, ingredientNutritionMap, 'R'),
    };
    if (!next.L && !next.R) {
      showToast('L/R 용량을 1개 이상 입력해주세요', 'warn');
      return null;
    }
    setIngredientCalcPreview(next);
    return next;
  };

  const applyIngredientCalc = async ({ mode = 'current' } = {}) => {
    if (!selMenu) return;
    const preview = ingredientCalcPreview || buildIngredientCalcPreview();
    if (!preview) return;

    const pair = getCrustPair(selCrust);
    const currentSize = getCrustSize(selCrust);
    const targets =
      mode === 'both'
        ? ['L', 'R']
            .map(size => ({ size, crustType: pair[size] }))
            .filter(target => target.crustType)
        : [{ size: currentSize, crustType: selCrust }];
    const validTargets = targets.filter(target => preview[target.size]);
    if (!validTargets.length) {
      showToast(`${mode === 'both' ? 'L/R' : currentSize} 용량 입력값이 없어요`, 'warn');
      return;
    }

    setSaving(true);
    try {
      for (const target of validTargets) {
        const result = preview[target.size];
        const existingRaw = safeRawMap[`${selMenu.menuCode}__${target.crustType}`];
        const baseValues =
          target.crustType === selCrust
            ? form
            : existingRaw && typeof existingRaw === 'object'
              ? existingRaw
              : {};
        const applied = { ...result.values, weight: result.totalGrams };
        await upsertRawValue({
          ...(existingRaw?.id ? { id: existingRaw.id } : {}),
          menuCode: selMenu.menuCode,
          menuName: selMenu.menuName,
          crustType: target.crustType,
          ...baseValues,
          ...applied,
        });
        if (target.crustType === selCrust) {
          setForm(prev => ({ ...prev, ...applied }));
        }
      }
      showToast(
        mode === 'both'
          ? `${formatCrustPairLabel(pair)} 계산값 적용 완료`
          : `${selCrust} 계산값 적용 완료`,
        'ok'
      );
      setIngredientCalcOpen(false);
      setIngredientCalcPreview(null);
      await refresh();
    } catch (err) {
      showToast(`적용 실패: ${err?.message || err}`, 'error');
    } finally {
      setSaving(false);
    }
  };

  return {
    ingredientCalcOpen,
    setIngredientCalcOpen,
    ingredientCalcLoading,
    ingredientCalcIngredients,
    ingredientNutritionMap,
    ingredientCalcRows,
    ingredientCalcPreview,
    openIngredientCalc,
    addIngredientCalcRow,
    updateIngredientCalcAmount,
    removeIngredientCalcRow,
    buildIngredientCalcPreview,
    applyIngredientCalc,
  };
}
