'use client';
import { useCallback, useEffect, useMemo, useState } from 'react';
import { showToast } from '@/components/Toast';
import { useMounted } from '@/hooks/useMounted';
import { useVisibilityRefresh } from '@/hooks/useVisibilityRefresh';
import { asDisplayText } from '@/lib/ui/prop-guards';
import { normalizeCostBaseUnit } from '@/lib/cost/unit-policy';
import { loadRecipeMasterData, saveRecipeMasterDraft } from '@/lib/recipe-master/data';
import { recipeStoreKindForCategory, recipeSyncTargetLabel } from '@/lib/recipe-master/sync';
import {
  buildIngredientIndex,
  buildRecipeMasterRows,
  calcComponentsCost,
  deriveComponentInfo,
  filterRecipeMasterRows,
  findIngredientByInput,
} from '@/lib/recipe-master/rows';

let rowSeq = 0;

function newComponentRow(values = {}) {
  return {
    _key: ++rowSeq,
    productCode: '',
    ingredientName: '',
    quantity: '',
    unit: 'g',
    unitPrice: '',
    note: '',
    ...values,
  };
}

function latestComponentValues(component, unitPriceMap = new Map()) {
  const productCode = asDisplayText(component?.productCode);
  const priceInfo = productCode ? unitPriceMap.get(productCode) : null;
  return {
    ...component,
    unit: normalizeCostBaseUnit(priceInfo?.baseUnitType || component?.unit),
    unitPrice: priceInfo?.unitPrice ?? component?.unitPrice ?? '',
  };
}

function withRowKeys(components, unitPriceMap = new Map()) {
  const safeComponents = Array.isArray(components) ? components : [];
  return safeComponents.length
    ? safeComponents.map(component =>
        newComponentRow(latestComponentValues(component, unitPriceMap))
      )
    : [newComponentRow()];
}

function emptyDraft() {
  return {
    menuId: null,
    recipeId: null,
    menuCode: '',
    menuName: '',
    category: '피자',
    size: 'L',
    price: '',
    status: 'active',
    note: '',
    components: [newComponentRow()],
  };
}

function draftFromRow(row, unitPriceMap = new Map()) {
  const menu = row.menu;
  return {
    menuId: menu.id ?? null,
    recipeId: row.recipe?.id ?? null,
    menuCode: asDisplayText(menu.menuCode),
    menuName: asDisplayText(menu.menuName),
    category: asDisplayText(menu.category, '피자'),
    size: asDisplayText(menu.size, '단일') || '단일',
    price: menu.price != null ? String(menu.price) : '',
    status: asDisplayText(menu.status, 'active'),
    note: asDisplayText(menu.note),
    components: withRowKeys(row.components, unitPriceMap),
  };
}

const INITIAL_DATA = {
  menuRows: [],
  ingredients: [],
  unitPriceMap: new Map(),
  recipeMaps: {
    pizza: new Map(),
    personal: new Map(),
    side: new Map(),
    set: new Map(),
  },
};

export function useRecipeMasterPage() {
  const mountedRef = useMounted();
  const [data, setData] = useState(INITIAL_DATA);
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);
  const [draft, setDraft] = useState(() => emptyDraft());
  const [search, setSearch] = useState('');

  const load = useCallback(async () => {
    const nextData = await loadRecipeMasterData();
    if (mountedRef.current) setData(nextData);
  }, [mountedRef]);

  useEffect(() => {
    load()
      .catch(err => {
        if (mountedRef.current) {
          console.error(err);
          showToast('레시피마스터 로드 실패: ' + err.message, 'error');
        }
      })
      .finally(() => {
        if (mountedRef.current) setLoading(false);
      });
  }, [load, mountedRef]);
  useVisibilityRefresh(load);

  const ingredientIndex = useMemo(() => buildIngredientIndex(data.ingredients), [data.ingredients]);

  const rows = useMemo(
    () =>
      buildRecipeMasterRows({
        menuRows: data.menuRows,
        recipeMaps: data.recipeMaps,
        ingredientIndex,
        unitPriceMap: data.unitPriceMap,
      }),
    [data.menuRows, data.recipeMaps, data.unitPriceMap, ingredientIndex]
  );

  const filteredRows = useMemo(() => filterRecipeMasterRows(rows, search), [rows, search]);
  const draftKind = recipeStoreKindForCategory(draft.category);
  const draftDerived = useMemo(
    () => deriveComponentInfo(draft.components, ingredientIndex),
    [draft.components, ingredientIndex]
  );
  const draftTotalCost = useMemo(
    () => calcComponentsCost(draft.components, data.unitPriceMap),
    [data.unitPriceMap, draft.components]
  );
  const recipeItemCount = rows.filter(row => row.recipe).length;
  const completedRecipeCount = rows.filter(row => row.components.length > 0).length;
  const pendingRecipeCount = Math.max(0, recipeItemCount - completedRecipeCount);

  function patchDraft(patch) {
    setDraft(prev => ({ ...prev, ...patch }));
  }

  function patchComponent(index, patch) {
    setDraft(prev => ({
      ...prev,
      components: prev.components.map((component, i) =>
        i === index ? { ...component, ...patch } : component
      ),
    }));
  }

  function handleIngredientChange(index, value) {
    const direct = findIngredientByInput(value, ingredientIndex);
    if (!direct) {
      patchComponent(index, { ingredientName: value });
      return;
    }
    const productCode = asDisplayText(direct.productCode);
    const priceInfo = productCode ? data.unitPriceMap.get(productCode) : null;
    patchComponent(index, {
      ingredientName: asDisplayText(direct.ingredientName || direct.productName),
      productCode,
      unit: normalizeCostBaseUnit(priceInfo?.baseUnitType || direct.baseUnitType),
      unitPrice: priceInfo?.unitPrice ?? direct.unitPrice ?? '',
    });
  }

  function addComponent() {
    setDraft(prev => ({ ...prev, components: [...prev.components, newComponentRow()] }));
  }

  function removeComponent(index) {
    setDraft(prev => {
      const components = prev.components.filter((_, i) => i !== index);
      return { ...prev, components: components.length ? components : [newComponentRow()] };
    });
  }

  function moveComponent(index, direction) {
    setDraft(prev => {
      const targetIndex = index + direction;
      if (targetIndex < 0 || targetIndex >= prev.components.length) return prev;
      const components = [...prev.components];
      const current = components[index];
      components[index] = components[targetIndex];
      components[targetIndex] = current;
      return { ...prev, components };
    });
  }

  function startNew() {
    setDraft(emptyDraft());
  }

  function editRow(row) {
    setDraft(draftFromRow(row, data.unitPriceMap));
    window.scrollTo({ top: 0, behavior: 'smooth' });
  }

  async function saveDraft() {
    if (!draftKind) {
      showToast('지원하지 않는 카테고리입니다', 'error');
      return;
    }
    if (!draft.menuCode.trim() || !draft.menuName.trim()) {
      showToast('메뉴코드와 메뉴명을 입력해주세요', 'error');
      return;
    }

    setSaving(true);
    try {
      const result = await saveRecipeMasterDraft(draft);
      showToast(
        `${recipeSyncTargetLabel(result.kind)} 저장 완료 · 알레르기/원산지 자동 반영`,
        'ok'
      );
      await load();
      setDraft(prev => ({
        ...prev,
        menuId: result.menuResult.id ?? prev.menuId,
        recipeId: result.recipeResult.id ?? prev.recipeId,
        components: withRowKeys(result.components, data.unitPriceMap),
      }));
    } catch (err) {
      showToast('저장 실패: ' + err.message, 'error');
    } finally {
      setSaving(false);
    }
  }

  return {
    loading,
    saving,
    draft,
    draftKind,
    draftDerived,
    draftTotalCost,
    rows,
    filteredRows,
    recipeItemCount,
    completedRecipeCount,
    pendingRecipeCount,
    search,
    setSearch,
    ingredients: data.ingredients,
    load,
    startNew,
    editRow,
    patchDraft,
    patchComponent,
    handleIngredientChange,
    addComponent,
    removeComponent,
    moveComponent,
    saveDraft,
  };
}
