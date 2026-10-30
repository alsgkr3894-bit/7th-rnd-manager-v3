'use client';
import { useCallback } from 'react';
import { showToast } from '@/components/Toast';
import { logIngredientSave } from '@/lib/change-log';
import {
  addIngredient,
  updateIngredient,
  upsertIngredientMeta,
  replaceIngredientProductCode,
} from '@/lib/ingredient';
import { getAllIngredients } from '@/lib/ingredient';
import { computeManualPriceRises } from '@/lib/cost/price-rise-service';
import { changesCostInputs } from '@/lib/cost/changes-cost-inputs';
import { syncManagedScope } from './ingredientManageUtils';

/**
 * 저장 로직 본체 — 순수 async 함수로 분리해 React 훅 컨텍스트 없이도 테스트할 수 있게 한다.
 * saveOptions.replacement가 있으면(수정 폼에서 단종 체크 + 대체 식자재 선택) 저장 후
 * replaceIngredientProductCode로 레시피·세트/그룹·엣지/도우를 재연결한다.
 * 대체 연결이 실패해도 식자재 저장 자체는 이미 끝난 상태 — 모달을 닫지 않고 재시도할
 * 수 있게 한다(MenuMasterEditModal의 "메뉴는 저장됐지만 레시피 저장 실패" 패턴과 동일).
 */
export async function saveIngredientAndReplace({
  formData,
  saveOptions = {},
  canEdit,
  formTarget,
  setFormTarget,
  load,
}) {
  if (!canEdit) return;
  const name = formData.ingredientName || formData.displayName || formData.productCode || '식자재';
  try {
    if (formTarget === 'new' || formTarget?.__copyFrom) {
      await addIngredient(formData);
      logIngredientSave(name, true);
      showToast('식자재 추가 완료', 'ok');
    } else if (formTarget.isManual && formTarget.id) {
      await updateIngredient(formTarget.id, formData);
      logIngredientSave(name, false);
      showToast('저장 완료', 'ok');
    } else {
      if (!formTarget.productCode)
        throw new Error('제때 연동 항목에 productCode가 없습니다. 데이터를 확인해 주세요.');
      await upsertIngredientMeta({ productCode: formTarget.productCode, ...formData });
      await syncManagedScope(formTarget, formData.scope);
      logIngredientSave(name, false);
      showToast('저장 완료', 'ok');
    }
  } catch (err) {
    showToast('저장 실패: ' + err.message, 'error');
    throw err;
  }

  const replacement = saveOptions?.replacement || null;
  const oldCode = (formTarget?.productCode || formData.productCode || '').trim();
  if (replacement?.productCode && oldCode) {
    try {
      const result = await replaceIngredientProductCode(oldCode, replacement);
      showToast(
        `저장 후 대체 연결 완료 · 레시피 ${result.menuRecipeUpdated}건 · 식자재 묶음 ${result.recipeGroupUpdated}건 · 엣지 도우 ${result.edgeUpdated}건`,
        'ok'
      );
    } catch (replaceErr) {
      await load();
      showToast(
        `식자재는 저장됐지만 대체 연결 실패: ${replaceErr?.message || replaceErr} — 대체 식자재를 다시 확인하고 저장을 눌러 주세요`,
        'error'
      );
      return; // 모달을 닫지 않는다 — 사용자가 대체 식자재를 다시 고르거나 지우고 재시도
    }
  }

  setFormTarget(null);
  await load();
}

/**
 * useIngredientManageActions에서 쓰는 훅 형태 — 위 saveIngredientAndReplace를 useCallback으로 감싼다.
 * onPriceRise(result)를 주면, 수동 단가 등을 바꿔 메뉴 원가가 오른 경우 저장 직후 그 결과를 넘긴다.
 */
export function useIngredientSaveAction({ canEdit, formTarget, setFormTarget, load, onPriceRise }) {
  return useCallback(
    async (formData, saveOptions = {}) => {
      const watch = typeof onPriceRise === 'function' && changesCostInputs(formTarget, formData);
      const before = watch ? await getAllIngredients().catch(() => null) : null;
      await saveIngredientAndReplace({
        formData,
        saveOptions,
        canEdit,
        formTarget,
        setFormTarget,
        load,
      });
      if (!watch || !before) return;
      // 저장은 이미 끝났다 — 알림 계산이 실패해도 저장 흐름에는 영향이 없게 한다
      try {
        const after = await getAllIngredients();
        const label = formData.ingredientName || formTarget.ingredientName || '';
        onPriceRise(await computeManualPriceRises(before, after, label));
      } catch (err) {
        console.warn('[ingredient] 원가 상승 계산 실패:', err);
      }
    },
    [canEdit, formTarget, load, onPriceRise, setFormTarget]
  );
}
