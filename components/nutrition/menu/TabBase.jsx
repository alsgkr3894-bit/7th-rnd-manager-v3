'use client';
import { useState, useEffect, useMemo } from 'react';
import { Icon } from '@/components/icons';
import { ModalFrame } from '@/components/ui/ModalFrame';
import { showToast } from '@/components/Toast';
import MenuCodePicker from '@/components/ui/MenuCodePicker';
import { ImportBaseModal } from '@/components/nutrition/menu/ImportBaseModal';
import { IngredientSearch } from '@/components/cost/shared/IngredientSearch';
import { getAllIngredients } from '@/lib/ingredient';
import { getMenuCodeBase } from '@/lib/menu-master/code-policy';
import { asDisplayText, asObjectArray } from '@/lib/ui/prop-guards';
import {
  upsertMenuRef,
  deleteMenuRef,
  upsertRawValue,
  CRUST_TYPES,
  NUTRITION_FIELDS,
  getAllIngredientValues,
  clearAllBaseData,
} from '@/lib/nutrition/values/store';
import { NutritionGrid } from '@/components/nutrition/NutritionGrid';
import {
  calcNutritionFromComponents,
  calcNutritionFromIngredientAmounts,
  buildIngredientNutritionMap,
  buildIngredientNutritionMapFromRows,
  findRecipeForMenu,
} from '@/lib/nutrition/auto-calc';
import {
  groupMenusOrdered,
  normalizeNutritionCategory,
  NUTRITION_CATEGORY_OPTIONS,
  resolveNutritionGroup,
} from '@/lib/nutrition/menu-group';

const GROUP_HEADER_STYLE = {
  padding: '5px 14px 4px',
  fontSize: 10,
  fontWeight: 800,
  color: 'var(--text-4)',
  textTransform: 'uppercase',
  letterSpacing: '0.05em',
  background: 'var(--surface-2)',
  borderBottom: '1px solid var(--divider)',
  userSelect: 'none',
};

const EMPTY_MAP = {};
const EMPTY_UNIT_PRICE_MAP = new Map();
const noop = () => {};

function asRecord(value) {
  return value && typeof value === 'object' && !Array.isArray(value) ? value : EMPTY_MAP;
}

function normalizeIngredientName(row) {
  return asDisplayText(
    row?.ingredientName || row?.displayName || row?.productName || row?.productCode
  );
}

function getCrustSize(crustType) {
  return asDisplayText(crustType).endsWith('R') ? 'R' : 'L';
}

function getCrustPair(crustType) {
  const current = asDisplayText(crustType, '석쇠L');
  const family = current.replace(/[LR]$/, '') || '석쇠';
  const pair = { L: `${family}L`, R: `${family}R` };
  return {
    L: CRUST_TYPES.includes(pair.L) ? pair.L : null,
    R: CRUST_TYPES.includes(pair.R) ? pair.R : null,
  };
}

function formatCrustPairLabel(pair) {
  return ['L', 'R'].map(size => pair?.[size]).filter(Boolean).join('/');
}

function formatCalcValue(value, suffix = '') {
  const n = Number(value);
  if (!Number.isFinite(n)) return '—';
  const rounded = Math.round(n * 10) / 10;
  return `${rounded.toLocaleString('ko-KR')}${suffix}`;
}

function MenuGroupList({ menus, rawMap, menuMasters, selMenu, onSelect }) {
  const safeMenus = asObjectArray(menus);
  const safeRawMap = asRecord(rawMap);
  const masterByCode = Object.fromEntries(asObjectArray(menuMasters).map(m => [m.menuCode, m]));
  const groups = groupMenusOrdered(safeMenus, masterByCode);
  const multiGroup = groups.length > 1;
  const selectMenu = typeof onSelect === 'function' ? onSelect : noop;

  return (
    <>
      {groups.map(({ group, items }) => (
        <div key={group}>
          {multiGroup && <div style={GROUP_HEADER_STYLE}>{group}</div>}
          {items.map((m, index) => {
            const menuCode = asDisplayText(m.menuCode);
            const menuName = asDisplayText(m.menuName, menuCode || `메뉴 ${index + 1}`);
            const category = normalizeNutritionCategory(asDisplayText(m.category), '피자');
            const selected = selMenu?.id === m.id || (menuCode && selMenu?.menuCode === menuCode);
            return (
              <div
                key={m.id || menuCode || `${group}-${index}`}
                onClick={() => selectMenu(m)}
                style={{
                  padding: '9px 14px',
                  cursor: 'pointer',
                  display: 'flex',
                  alignItems: 'center',
                  justifyContent: 'space-between',
                  background: selected ? 'var(--accent-soft)' : 'transparent',
                  borderLeft: selected ? '3px solid var(--accent)' : '3px solid transparent',
                }}
              >
                <div>
                  <div
                    style={{
                      fontSize: 13,
                      fontWeight: selected ? 700 : 400,
                      color: selected ? 'var(--accent-text)' : 'var(--text-1)',
                    }}
                  >
                    {menuName}
                  </div>
                  <div style={{ fontSize: 11, color: 'var(--text-4)' }}>
                    {category}
                    {menuCode && (
                      <span
                        style={{
                          marginLeft: 4,
                          fontFamily: 'monospace',
                          color: 'var(--accent-text)',
                          opacity: 0.7,
                        }}
                      >
                        {menuCode}
                      </span>
                    )}
                  </div>
                </div>
                <div style={{ display: 'flex', gap: 2 }}>
                  {CRUST_TYPES.map(ct => {
                    const done = !!safeRawMap[`${menuCode}__${ct}`]?.kcal;
                    return (
                      <span
                        key={ct}
                        style={{
                          width: 6,
                          height: 6,
                          borderRadius: '50%',
                          background: done ? 'var(--accent)' : 'var(--border)',
                        }}
                      />
                    );
                  })}
                </div>
              </div>
            );
          })}
        </div>
      ))}
    </>
  );
}

export function TabBase({ menus, rawMap, onRefresh, menuMasters }) {
  const safeMenus = useMemo(() => asObjectArray(menus), [menus]);
  const safeMenuMasters = useMemo(() => asObjectArray(menuMasters), [menuMasters]);
  const safeRawMap = asRecord(rawMap);
  const refresh = typeof onRefresh === 'function' ? onRefresh : noop;
  const masterByCode = useMemo(
    () => Object.fromEntries(safeMenuMasters.map(m => [m.menuCode, m])),
    [safeMenuMasters]
  );
  const [selMenu, setSelMenu] = useState(null);
  const [selCrust, setSelCrust] = useState(CRUST_TYPES[0]);
  const [form, setForm] = useState({});
  const [saving, setSaving] = useState(false);
  const [addMenu, setAddMenu] = useState(false);
  const [newMenuForm, setNewMenuForm] = useState({
    menuCode: '',
    menuName: '',
    category: '피자',
    displayOrder: '',
  });
  const [autoCalcBusy, setAutoCalcBusy] = useState(false);
  const [autoCalcPreview, setAutoCalcPreview] = useState(null); // { values: Object } | null
  const [ingredientCalcOpen, setIngredientCalcOpen] = useState(false);
  const [ingredientCalcLoading, setIngredientCalcLoading] = useState(false);
  const [ingredientCalcIngredients, setIngredientCalcIngredients] = useState([]);
  const [ingredientNutritionMap, setIngredientNutritionMap] = useState(new Map());
  const [ingredientCalcRows, setIngredientCalcRows] = useState([]);
  const [ingredientCalcPreview, setIngredientCalcPreview] = useState(null);
  const [importOpen, setImportOpen] = useState(false);

  const key = selMenu ? `${selMenu.menuCode}__${selCrust}` : null;
  const existing = key ? safeRawMap[key] : null;
  const selectedMenuName = asDisplayText(selMenu?.menuName, '선택한 메뉴');

  useEffect(() => {
    if (existing) setForm({ ...existing });
    else setForm({});
  }, [existing, selMenu, selCrust]);

  useEffect(() => {
    setAutoCalcPreview(null);
    setIngredientCalcPreview(null);
  }, [selMenu, selCrust]);

  const setField = (k, v) => setForm(f => ({ ...f, [k]: v }));

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
        asObjectArray(nutritionRows).map(row => asDisplayText(row.productCode)).filter(Boolean)
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
        ? ['L', 'R'].map(size => ({ size, crustType: pair[size] })).filter(target => target.crustType)
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
          target.crustType === selCrust ? form : existingRaw && typeof existingRaw === 'object' ? existingRaw : {};
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

  const handleSave = async () => {
    if (!selMenu) return;
    setSaving(true);
    try {
      await upsertRawValue({
        ...(existing?.id ? { id: existing.id } : {}),
        menuCode: selMenu.menuCode,
        menuName: selMenu.menuName,
        crustType: selCrust,
        ...form,
      });
      showToast('저장 완료', 'ok');
      refresh();
    } catch {
      showToast('저장 실패', 'error');
    }
    setSaving(false);
  };

  const handleAddMenu = async () => {
    if (!newMenuForm.menuName.trim()) {
      showToast('메뉴명 입력 필요', 'error');
      return;
    }
    const code = newMenuForm.menuCode.trim() || `MENU-${Date.now()}`;
    await upsertMenuRef({
      ...newMenuForm,
      menuCode: code,
      category: normalizeNutritionCategory(newMenuForm.category, '피자'),
      displayOrder: newMenuForm.displayOrder ? Number(newMenuForm.displayOrder) : undefined,
    });
    showToast('메뉴 추가 완료', 'ok');
    setAddMenu(false);
    setNewMenuForm({ menuCode: '', menuName: '', category: '피자', displayOrder: '' });
    refresh();
  };

  const handleDeleteMenu = async menu => {
    await deleteMenuRef(menu.id, menu.menuCode);
    if (selMenu?.id === menu.id) setSelMenu(null);
    showToast(`'${asDisplayText(menu.menuName, '메뉴')}' 삭제`, 'ok');
    refresh();
  };

  const ingredientCalcCrustPair = getCrustPair(selCrust);
  const ingredientCalcCurrentSize = getCrustSize(selCrust);
  const ingredientCalcAddedCodes = ingredientCalcRows.map(row => asDisplayText(row.productCode));
  const ingredientCalcPairLabel = formatCrustPairLabel(ingredientCalcCrustPair);
  const ingredientCalcPairCount = ['L', 'R'].filter(size => ingredientCalcCrustPair[size]).length;

  return (
    <div style={{ display: 'flex', gap: 20, marginTop: 20, alignItems: 'flex-start' }}>
      {/* 메뉴 목록 */}
      <div
        className="card"
        style={{
          width: 220,
          flexShrink: 0,
          padding: 0,
          overflow: 'hidden',
          display: 'flex',
          flexDirection: 'column',
          maxHeight: 'calc(100vh - 220px)',
        }}
      >
        <div
          style={{
            padding: '12px 14px 8px',
            display: 'flex',
            justifyContent: 'space-between',
            alignItems: 'center',
            borderBottom: '1px solid var(--border)',
            flexShrink: 0,
          }}
        >
          <span style={{ fontSize: 13, fontWeight: 700 }}>메뉴 목록</span>
          <div style={{ display: 'flex', gap: 4 }}>
            <button
              className="btn sm ghost"
              title="엑셀 가져오기"
              onClick={() => setImportOpen(true)}
              style={{ fontSize: 11, padding: '3px 7px' }}
            >
              엑셀
            </button>
            <button className="btn sm ghost" onClick={() => setAddMenu(true)}>
              <Icon.plus style={{ width: 13, height: 13 }} />
            </button>
            <button
              className="btn sm ghost"
              title="전체 삭제"
              style={{ fontSize: 11, padding: '3px 7px', color: 'var(--danger)' }}
              onClick={async () => {
                if (!confirm('베이스 영양성분 전체(메뉴 목록 + 값)를 삭제합니다. 계속할까요?'))
                  return;
                await clearAllBaseData();
                setSelMenu(null);
                showToast('전체 삭제 완료', 'ok');
                refresh();
              }}
            >
              전체삭제
            </button>
          </div>
        </div>
        {safeMenus.length === 0 ? (
          <div className="empty-state" style={{ padding: '24px 12px' }}>
            <div className="empty-icon-wrap">
              <Icon.doc style={{ width: 28, height: 28 }} />
            </div>
            <div style={{ fontWeight: 700, fontSize: 13 }}>메뉴가 없어요</div>
            <div style={{ fontSize: 12, color: 'var(--text-3)' }}>+ 버튼으로 메뉴를 추가하세요</div>
          </div>
        ) : (
          <div style={{ overflowY: 'auto', flex: 1 }}>
            <MenuGroupList
              menus={safeMenus}
              rawMap={safeRawMap}
              menuMasters={safeMenuMasters}
              selMenu={selMenu}
              onSelect={setSelMenu}
            />
          </div>
        )}
      </div>

      {/* 영양성분 입력 패널 */}
      <div style={{ flex: 1 }}>
        {!selMenu ? (
          <div className="card" style={{ display: 'grid', placeItems: 'center', minHeight: 200 }}>
            <div style={{ textAlign: 'center', color: 'var(--text-4)' }}>
              <Icon.beaker style={{ width: 28, height: 28 }} />
              <div style={{ marginTop: 8, fontSize: 13 }}>
                메뉴를 선택하면 영양성분을 입력할 수 있어요
              </div>
            </div>
          </div>
        ) : (
          <div className="card" style={{ padding: 20 }}>
            <div
              style={{
                display: 'flex',
                justifyContent: 'space-between',
                alignItems: 'flex-start',
                marginBottom: 16,
              }}
            >
              <div>
                <div style={{ fontSize: 16, fontWeight: 700 }}>{selectedMenuName}</div>
                <div style={{ fontSize: 12, color: 'var(--text-3)', marginTop: 2 }}>
                  영양성분 수치 입력 (업체 분석값)
                </div>
              </div>
              <button
                className="btn sm ghost"
                style={{ color: 'var(--danger)' }}
                onClick={() => handleDeleteMenu(selMenu)}
              >
                <Icon.trash style={{ width: 13, height: 13 }} />
                메뉴 삭제
              </button>
            </div>

            <div style={{ display: 'flex', gap: 6, marginBottom: 16 }}>
              {CRUST_TYPES.map(ct => {
                const done = !!safeRawMap[`${selMenu.menuCode}__${ct}`]?.kcal;
                return (
                  <button
                    key={ct}
                    onClick={() => setSelCrust(ct)}
                    style={{
                      padding: '6px 14px',
                      borderRadius: 8,
                      fontSize: 13,
                      cursor: 'pointer',
                      border: '1.5px solid',
                      borderColor: selCrust === ct ? 'var(--accent)' : 'var(--border)',
                      background: selCrust === ct ? 'var(--accent-soft)' : 'var(--surface)',
                      color: selCrust === ct ? 'var(--accent-text)' : 'var(--text-2)',
                      fontWeight: selCrust === ct ? 700 : 400,
                      display: 'flex',
                      alignItems: 'center',
                      gap: 4,
                    }}
                  >
                    {ct}
                    {done && (
                      <span
                        style={{
                          width: 6,
                          height: 6,
                          borderRadius: '50%',
                          background: 'var(--accent)',
                          display: 'inline-block',
                        }}
                      />
                    )}
                  </button>
                );
              })}
            </div>

            <div
              style={{
                fontSize: 11,
                color: 'var(--text-3)',
                marginBottom: 8,
                padding: '6px 10px',
                background: 'var(--surface-2)',
                borderRadius: 6,
                lineHeight: 1.5,
              }}
            >
              ※ 영양성분 수치는 <strong>100g 기준</strong>으로 입력하세요.
              {selMenu && resolveNutritionGroup(selMenu, masterByCode) === '피자' && (
                <>
                  {' '}
                  · <strong>중량</strong>은 이 크러스트의 <strong>한판 총중량(g)</strong>을 입력하면
                  하프앤하프·세트·조각 계산에 사용됩니다.
                </>
              )}
            </div>

            <NutritionGrid values={form} onChange={setField} />

            <div
              style={{
                marginTop: 16,
                display: 'flex',
                justifyContent: 'space-between',
                alignItems: 'center',
                gap: 8,
                flexWrap: 'wrap',
              }}
            >
              <div style={{ display: 'flex', gap: 6, flexWrap: 'wrap' }}>
                <button
                  className="btn sm ghost"
                  onClick={handleAutoCalc}
                  disabled={autoCalcBusy || saving}
                  title="cost_recipes 레시피 구성에서 영양성분을 자동 계산합니다"
                  style={{
                    display: 'flex',
                    alignItems: 'center',
                    gap: 4,
                    fontSize: 12,
                    color: 'var(--accent-text)',
                  }}
                >
                  <Icon.beaker style={{ width: 13, height: 13 }} />
                  {autoCalcBusy ? '계산 중…' : '레시피 기반 자동계산'}
                </button>
                <button
                  className="btn sm ghost"
                  onClick={openIngredientCalc}
                  disabled={ingredientCalcLoading || saving}
                  title="식자재 영양값과 L/R 사용량으로 영양성분을 계산합니다"
                  style={{
                    display: 'flex',
                    alignItems: 'center',
                    gap: 4,
                    fontSize: 12,
                    color: 'var(--accent-text)',
                  }}
                >
                  <Icon.box style={{ width: 13, height: 13 }} />
                  {ingredientCalcLoading ? '불러오는 중…' : '식자재 영양값 계산'}
                </button>
              </div>
              <button className="btn primary" onClick={handleSave} disabled={saving}>
                {saving ? '저장 중…' : `${selectedMenuName} ${selCrust} 저장`}
              </button>
            </div>
          </div>
        )}
      </div>

      {ingredientCalcOpen && (
        <ModalFrame
          title="식자재 영양값 계산"
          onClose={() => setIngredientCalcOpen(false)}
          width="min(860px, 96vw)"
          zIndex={310}
          padding="24px 28px"
        >
          <div style={{ display: 'flex', flexDirection: 'column', gap: 14 }}>
            <div
              style={{
                fontSize: 13,
                color: 'var(--text-3)',
                lineHeight: 1.5,
                padding: '10px 12px',
                background: 'var(--surface-2)',
                borderRadius: 8,
              }}
            >
              식자재 영양값 탭에 입력된 100g 기준값을 가져와 L/R 사용량으로 계산합니다. 적용하면
              선택한 메뉴의 100g 기준 영양값과 한판 총중량이 저장됩니다.
              <br />
              계산 미리보기만으로는 저장되지 않고, 아래 적용 버튼을 눌러야 저장됩니다.
            </div>

            {ingredientCalcLoading ? (
              <div className="card" style={{ padding: 20, textAlign: 'center' }}>
                식자재 영양값을 불러오는 중…
              </div>
            ) : ingredientCalcIngredients.length === 0 ? (
              <div className="empty-state" style={{ padding: '24px 12px' }}>
                <div className="empty-icon-wrap">
                  <Icon.beaker style={{ width: 28, height: 28 }} />
                </div>
                <div className="empty-title">가져올 식자재 영양값이 없어요</div>
                <div className="empty-sub">식자재 영양값 탭에서 재료별 100g 기준값을 먼저 입력하세요.</div>
              </div>
            ) : (
              <>
                <div>
                  <label
                    style={{
                      fontSize: 12,
                      color: 'var(--text-3)',
                      display: 'block',
                      marginBottom: 6,
                    }}
                  >
                    식자재 추가
                  </label>
                  <IngredientSearch
                    allMeta={ingredientCalcIngredients}
                    unitPriceMap={EMPTY_UNIT_PRICE_MAP}
                    alreadyAdded={ingredientCalcAddedCodes}
                    onSelect={addIngredientCalcRow}
                    style={{ marginTop: 0 }}
                  />
                </div>

                {ingredientCalcRows.length === 0 ? (
                  <div className="empty-state" style={{ padding: '22px 12px' }}>
                    <div className="empty-title">계산할 식자재를 추가하세요</div>
                    <div className="empty-sub">검색으로 식자재를 추가한 뒤 L/R 사용량(g)을 입력하세요.</div>
                  </div>
                ) : (
                  <div className="card table-card">
                    <div style={{ overflowX: 'auto' }}>
                      <table className="data-table" style={{ minWidth: 720 }}>
                        <thead>
                          <tr>
                            <th>식자재</th>
                            <th style={{ width: 120 }}>코드</th>
                            <th style={{ width: 110 }}>100g 열량</th>
                            <th style={{ width: 120 }}>L 사용량(g)</th>
                            <th style={{ width: 120 }}>R 사용량(g)</th>
                            <th style={{ width: 56 }}></th>
                          </tr>
                        </thead>
                        <tbody>
                          {ingredientCalcRows.map(row => {
                            const productCode = asDisplayText(row.productCode);
                            const nutr = ingredientNutritionMap.get(`code:${productCode}`);
                            return (
                              <tr key={productCode}>
                                <td style={{ fontWeight: 800 }}>
                                  {asDisplayText(row.ingredientName, '식자재')}
                                </td>
                                <td className="mono muted">{productCode}</td>
                                <td style={{ textAlign: 'right' }}>
                                  {formatCalcValue(nutr?.kcal, 'kcal')}
                                </td>
                                <td>
                                  <input
                                    className="input"
                                    type="number"
                                    min="0"
                                    step="0.1"
                                    value={row.lAmount}
                                    onChange={e =>
                                      updateIngredientCalcAmount(
                                        productCode,
                                        'lAmount',
                                        e.target.value
                                      )
                                    }
                                    placeholder="0"
                                  />
                                </td>
                                <td>
                                  <input
                                    className="input"
                                    type="number"
                                    min="0"
                                    step="0.1"
                                    value={row.rAmount}
                                    onChange={e =>
                                      updateIngredientCalcAmount(
                                        productCode,
                                        'rAmount',
                                        e.target.value
                                      )
                                    }
                                    placeholder="0"
                                  />
                                </td>
                                <td>
                                  <button
                                    className="btn sm ghost"
                                    type="button"
                                    onClick={() => removeIngredientCalcRow(productCode)}
                                    style={{ color: 'var(--danger)' }}
                                  >
                                    <Icon.trash style={{ width: 13, height: 13 }} />
                                  </button>
                                </td>
                              </tr>
                            );
                          })}
                        </tbody>
                      </table>
                    </div>
                  </div>
                )}

                {ingredientCalcPreview && (
                  <div
                    style={{
                      display: 'grid',
                      gridTemplateColumns: 'repeat(auto-fit, minmax(240px, 1fr))',
                      gap: 10,
                    }}
                  >
                    {['L', 'R'].map(size => {
                      const result = ingredientCalcPreview[size];
                      return (
                        <div key={size} className="card" style={{ padding: 14 }}>
                          <div style={{ fontSize: 13, fontWeight: 900, marginBottom: 8 }}>
                            {size} 계산 결과
                            <span
                              style={{
                                marginLeft: 6,
                                fontSize: 11,
                                color: 'var(--text-4)',
                                fontWeight: 700,
                              }}
                            >
                              {ingredientCalcCrustPair[size]}
                            </span>
                          </div>
                          {result ? (
                            <>
                              <div style={{ fontSize: 12, color: 'var(--text-3)' }}>
                                총중량 {formatCalcValue(result.totalGrams, 'g')} · 매칭{' '}
                                {result.matched}/{result.total}
                              </div>
                              <div
                                style={{
                                  marginTop: 10,
                                  display: 'grid',
                                  gridTemplateColumns: 'repeat(3, 1fr)',
                                  gap: 6,
                                }}
                              >
                                {['kcal', 'carbs', 'protein', 'fat', 'sodium', 'sugar'].map(
                                  key => {
                                    const field = NUTRITION_FIELDS.find(f => f.key === key);
                                    return (
                                      <div
                                        key={key}
                                        style={{
                                          padding: '7px 8px',
                                          borderRadius: 8,
                                          background: 'var(--surface-2)',
                                        }}
                                      >
                                        <div style={{ fontSize: 10, color: 'var(--text-4)' }}>
                                          {field?.label || key}
                                        </div>
                                        <div style={{ fontSize: 13, fontWeight: 800 }}>
                                          {formatCalcValue(result.values[key])}
                                        </div>
                                      </div>
                                    );
                                  }
                                )}
                              </div>
                            </>
                          ) : (
                            <div style={{ fontSize: 12, color: 'var(--text-4)' }}>
                              {size} 사용량이 없어 계산되지 않았습니다.
                            </div>
                          )}
                        </div>
                      );
                    })}
                  </div>
                )}
              </>
            )}
          </div>

          <div
            style={{
              display: 'flex',
              gap: 8,
              justifyContent: 'flex-end',
              marginTop: 20,
              flexWrap: 'wrap',
            }}
          >
            <button className="btn" onClick={() => setIngredientCalcOpen(false)} disabled={saving}>
              취소
            </button>
            <button
              className="btn"
              type="button"
              onClick={buildIngredientCalcPreview}
              disabled={ingredientCalcLoading || saving || ingredientCalcRows.length === 0}
            >
              계산 미리보기
            </button>
            <button
              className="btn primary"
              type="button"
              onClick={() => applyIngredientCalc({ mode: 'current' })}
              disabled={ingredientCalcLoading || saving || ingredientCalcRows.length === 0}
            >
              {saving ? '적용 중…' : `${selCrust} 적용`}
            </button>
            <button
              className="btn primary"
              type="button"
              onClick={() => applyIngredientCalc({ mode: 'both' })}
              disabled={
                ingredientCalcLoading ||
                saving ||
                ingredientCalcRows.length === 0 ||
                ingredientCalcPairCount < 2
              }
            >
              {saving
                ? '적용 중…'
                : ingredientCalcPairCount < 2
                  ? 'L/R 둘 다 적용 불가'
                  : `${ingredientCalcPairLabel} 둘 다 적용`}
            </button>
          </div>
        </ModalFrame>
      )}

      {/* 자동 계산 미리보기 모달 */}
      {autoCalcPreview && (
        <ModalFrame
          title="레시피 기반 자동 계산 결과"
          onClose={() => setAutoCalcPreview(null)}
          width="min(480px,95vw)"
          zIndex={310}
          padding="24px 28px"
        >
          <div style={{ marginBottom: 12, fontSize: 13, color: 'var(--text-3)', lineHeight: 1.5 }}>
            <strong style={{ color: 'var(--text-1)' }}>{selectedMenuName}</strong> 레시피 재료 기반{' '}
            <strong>100g 기준</strong> 영양성분이에요.
            <br />
            <span style={{ fontSize: 12 }}>
              적용하면 <strong>{selCrust}</strong> 크러스트에 아래 값 + 중량{' '}
              <strong>{asDisplayText(autoCalcPreview.totalGrams, '0')}g</strong>이 입력됩니다.
            </span>
            <br />
            <span style={{ fontSize: 12, color: 'var(--text-4)' }}>
              이 화면은 미리보기이며, 적용 버튼을 누르기 전에는 저장되지 않습니다.
            </span>
          </div>
          {autoCalcPreview.matched < autoCalcPreview.total && (
            <div
              style={{
                marginBottom: 12,
                fontSize: 12,
                padding: '8px 10px',
                borderRadius: 8,
                background: 'var(--warn-soft, #fff4e5)',
                color: 'var(--warn-text, #92600a)',
              }}
            >
              ⚠ 재료 {autoCalcPreview.matched}/{autoCalcPreview.total}개만 영양DB에 매칭됐어요.
              나머지는 계산에서 제외되어 값이 작을 수 있어요.
            </div>
          )}
          {autoCalcPreview.matched === autoCalcPreview.total && (
            <div style={{ marginBottom: 12, fontSize: 12, color: 'var(--text-4)' }}>
              재료 {autoCalcPreview.matched}/{autoCalcPreview.total}개 전부 매칭됨
            </div>
          )}
          <div
            style={{
              display: 'grid',
              gridTemplateColumns: 'repeat(3, 1fr)',
              gap: '8px 12px',
              marginBottom: 16,
            }}
          >
            {NUTRITION_FIELDS.filter(f => f.key !== 'weight').map(f => (
              <div
                key={f.key}
                style={{ background: 'var(--surface-2)', borderRadius: 8, padding: '8px 10px' }}
              >
                <div style={{ fontSize: 11, color: 'var(--text-3)', marginBottom: 2 }}>
                  {f.label} <span style={{ color: 'var(--text-4)' }}>({f.unit})</span>
                </div>
                <div style={{ fontSize: 15, fontWeight: 700, color: 'var(--accent-text)' }}>
                  {autoCalcPreview.values[f.key] ?? '–'}
                </div>
              </div>
            ))}
          </div>
          <div style={{ fontSize: 11, color: 'var(--text-4)', marginBottom: 16 }}>
            * 재료 100g 기준값 × 사용량을 합산 후 총중량으로 나눠 100g 기준으로 정규화한 값입니다.
            중량 칸도 함께 채워집니다.
          </div>
          <div style={{ display: 'flex', gap: 8, justifyContent: 'flex-end' }}>
            <button className="btn" onClick={() => setAutoCalcPreview(null)}>
              취소
            </button>
            <button className="btn primary" onClick={handleApplyAutoCalc} disabled={saving}>
              {saving ? '적용 중…' : '이 값으로 적용'}
            </button>
          </div>
        </ModalFrame>
      )}

      {importOpen && (
        <ImportBaseModal
          menuMasters={menuMasters}
          menus={safeMenus}
          rawMap={safeRawMap}
          onClose={() => setImportOpen(false)}
          onRefresh={refresh}
        />
      )}

      {addMenu && (
        <ModalFrame
          title="메뉴 추가"
          onClose={() => setAddMenu(false)}
          width="min(400px,95vw)"
          zIndex={300}
          padding="24px 28px"
        >
          <div style={{ display: 'flex', flexDirection: 'column', gap: 12 }}>
            <div>
              <label
                style={{ fontSize: 12, color: 'var(--text-3)', display: 'block', marginBottom: 4 }}
              >
                메뉴코드 <span style={{ color: 'var(--text-4)' }}>(선택 시 메뉴명 자동 입력)</span>
              </label>
              <MenuCodePicker
                menuMasters={safeMenuMasters}
                value={newMenuForm.menuCode}
                mode="base"
                onChange={(code, meta) => {
                  const matchedMenu = code
                    ? safeMenuMasters.find(m => getMenuCodeBase(m) === code)
                    : null;
                  setNewMenuForm(f => ({
                    ...f,
                    menuCode: code,
                    menuName: code ? (matchedMenu?.menuName ?? f.menuName) : f.menuName,
                    category: normalizeNutritionCategory(meta?.category || f.category, '피자'),
                  }));
                }}
              />
            </div>
            <div>
              <label
                style={{ fontSize: 12, color: 'var(--text-3)', display: 'block', marginBottom: 4 }}
              >
                메뉴명 *
              </label>
              <input
                className="input"
                value={newMenuForm.menuName}
                onChange={e => setNewMenuForm(f => ({ ...f, menuName: e.target.value }))}
                placeholder="예: 컨츄리치킨"
              />
            </div>
            <div>
              <label
                style={{ fontSize: 12, color: 'var(--text-3)', display: 'block', marginBottom: 4 }}
              >
                카테고리
              </label>
              <select
                className="input"
                value={normalizeNutritionCategory(newMenuForm.category, '피자')}
                onChange={e => setNewMenuForm(f => ({ ...f, category: e.target.value }))}
              >
                {NUTRITION_CATEGORY_OPTIONS.map(c => (
                  <option key={c} value={c}>
                    {c}
                  </option>
                ))}
              </select>
            </div>
          </div>
          <div style={{ display: 'flex', gap: 8, justifyContent: 'flex-end', marginTop: 20 }}>
            <button className="btn" onClick={() => setAddMenu(false)}>
              취소
            </button>
            <button className="btn primary" onClick={handleAddMenu}>
              추가
            </button>
          </div>
        </ModalFrame>
      )}
    </div>
  );
}
