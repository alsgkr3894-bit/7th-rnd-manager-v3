'use client';
import { useState, useMemo } from 'react';
import { Icon } from '@/components/icons';
import { ModalFrame } from '@/components/ui/ModalFrame';
import { showToast } from '@/components/Toast';
import { IngredientSearch } from '@/components/cost/shared/IngredientSearch';
import { asDisplayText, asObjectArray, asStringArray } from '@/lib/ui/prop-guards';
import { upsertComposition, deleteComposition } from '@/lib/nutrition/values/store';
import { resolveNutritionGroup, NUTRITION_GROUP_ORDER } from '@/lib/nutrition/menu-group';

const GROUP_HEADER_STYLE = {
  padding: '6px 16px 4px',
  fontSize: 10,
  fontWeight: 800,
  color: 'var(--text-4)',
  textTransform: 'uppercase',
  letterSpacing: '0.05em',
  marginTop: 8,
};

const noop = () => {};
const EMPTY_UNIT_PRICE_MAP = new Map();

function asAmountMap(value) {
  return value && typeof value === 'object' && !Array.isArray(value) ? value : {};
}

function amountText(amounts, code) {
  const row = asAmountMap(amounts)[code];
  if (!row || typeof row !== 'object') return '';
  const l = asDisplayText(row.L);
  const r = asDisplayText(row.R);
  if (!l && !r) return '';
  return `L ${l || '-'}g / R ${r || '-'}g`;
}

export function TabDerived({
  menus,
  ingredients,
  ingredientValues,
  compositions,
  onRefresh,
  menuMasters,
  menuSearch = '',
  onOpenBase,
  onOpenIngredientValues,
}) {
  const safeMenus = useMemo(() => asObjectArray(menus), [menus]);
  const safeIngredients = useMemo(() => asObjectArray(ingredients), [ingredients]);
  const safeIngredientValues = useMemo(() => asObjectArray(ingredientValues), [ingredientValues]);
  const safeCompositions = useMemo(() => asObjectArray(compositions), [compositions]);
  const safeMenuMasters = useMemo(() => asObjectArray(menuMasters), [menuMasters]);
  const refresh = typeof onRefresh === 'function' ? onRefresh : noop;
  const openBaseTab = typeof onOpenBase === 'function' ? onOpenBase : noop;
  const openIngredientValuesTab =
    typeof onOpenIngredientValues === 'function' ? onOpenIngredientValues : noop;
  const [modal, setModal] = useState(null);
  const [form, setForm] = useState({
    menuCode: '',
    menuName: '',
    baseMenuCode: '',
    ingredientCodes: [],
    ingredientAmounts: {},
  });
  const [saving, setSaving] = useState(false);

  const masterByCode = useMemo(
    () => Object.fromEntries(safeMenuMasters.map(m => [m.menuCode, m])),
    [safeMenuMasters]
  );
  const menuByCode = useMemo(
    () =>
      Object.fromEntries(
        safeMenus.map(m => [asDisplayText(m.menuCode), m]).filter(([menuCode]) => menuCode)
      ),
    [safeMenus]
  );
  const ingredientMetaByCode = useMemo(
    () =>
      Object.fromEntries(
        safeIngredients.map(row => [asDisplayText(row.productCode), row]).filter(([code]) => code)
      ),
    [safeIngredients]
  );
  const ingredientValueByCode = useMemo(
    () =>
      Object.fromEntries(
        safeIngredientValues
          .map(row => [asDisplayText(row.productCode), row])
          .filter(([code]) => code)
      ),
    [safeIngredientValues]
  );
  const ingredientOptions = useMemo(() => {
    const byCode = new Map();
    safeIngredientValues.forEach(row => {
      const productCode = asDisplayText(row.productCode);
      if (!productCode) return;
      const meta = ingredientMetaByCode[productCode] || {};
      byCode.set(productCode, {
        ...meta,
        ...row,
        productCode,
        ingredientName: asDisplayText(
          meta.ingredientName || row.ingredientName || meta.productName || productCode
        ),
      });
    });
    return [...byCode.values()];
  }, [safeIngredientValues, ingredientMetaByCode]);
  const searchText = asDisplayText(menuSearch).trim().toLowerCase();

  const visibleCompositions = useMemo(() => {
    if (!searchText) return safeCompositions;
    return safeCompositions.filter(comp => {
      const baseMenu = menuByCode[asDisplayText(comp.baseMenuCode)];
      const ingredientNames = asStringArray(comp.ingredientCodes)
        .map(code => ingredientValueByCode[code] || ingredientMetaByCode[code])
        .map(row => asDisplayText(row?.ingredientName || row?.productCode))
        .filter(Boolean);
      return [
        comp.menuName,
        comp.menuCode,
        comp.baseMenuCode,
        baseMenu?.menuName,
        baseMenu?.menuCode,
        ...ingredientNames,
      ]
        .map(value => asDisplayText(value).toLowerCase())
        .some(value => value.includes(searchText));
    });
  }, [safeCompositions, searchText, menuByCode, ingredientValueByCode, ingredientMetaByCode]);

  // 파생 메뉴를 베이스 메뉴 카테고리 기준으로 그룹화
  const groupedCompositions = useMemo(() => {
    const buckets = {};
    NUTRITION_GROUP_ORDER.forEach(g => {
      buckets[g] = [];
    });
    visibleCompositions.forEach(comp => {
      const baseMenu = menuByCode[asDisplayText(comp.baseMenuCode)] || {
        menuCode: comp.baseMenuCode,
        category: '',
      };
      const g = resolveNutritionGroup(baseMenu, masterByCode);
      buckets[g].push(comp);
    });
    return NUTRITION_GROUP_ORDER.filter(g => buckets[g].length > 0).map(g => ({
      group: g,
      items: buckets[g],
    }));
  }, [visibleCompositions, menuByCode, masterByCode]);

  const addIngredient = ingredient => {
    const code = asDisplayText(ingredient?.productCode);
    if (!code) return;
    setForm(f => ({
      ...f,
      ingredientCodes: asStringArray(f.ingredientCodes).includes(code)
        ? asStringArray(f.ingredientCodes)
        : [...asStringArray(f.ingredientCodes), code],
      ingredientAmounts: {
        ...asAmountMap(f.ingredientAmounts),
        [code]: {
          L: asAmountMap(f.ingredientAmounts)[code]?.L ?? '',
          R: asAmountMap(f.ingredientAmounts)[code]?.R ?? '',
        },
      },
    }));
  };

  const removeIngredient = code => {
    setForm(f => ({
      ...f,
      ingredientCodes: asStringArray(f.ingredientCodes).filter(item => item !== code),
      ingredientAmounts: Object.fromEntries(
        Object.entries(asAmountMap(f.ingredientAmounts)).filter(([amountCode]) => amountCode !== code)
      ),
    }));
  };

  const updateIngredientAmount = (code, side, value) => {
    setForm(f => ({
      ...f,
      ingredientAmounts: {
        ...asAmountMap(f.ingredientAmounts),
        [code]: {
          ...asAmountMap(f.ingredientAmounts)[code],
          [side]: value,
        },
      },
    }));
  };

  const openAdd = () => {
    setForm({
      menuCode: '',
      menuName: '',
      baseMenuCode: safeMenus[0]?.menuCode || '',
      ingredientCodes: [],
      ingredientAmounts: {},
    });
    setModal('add');
  };
  const openEdit = comp => {
    setForm({
      ...comp,
      ingredientCodes: asStringArray(comp.ingredientCodes),
      ingredientAmounts: asAmountMap(comp.ingredientAmounts),
    });
    setModal(comp);
  };

  const handleSaveComp = async () => {
    if (!String(form.menuName || '').trim()) {
      showToast('파생 메뉴명 입력 필요', 'error');
      return;
    }
    if (!form.baseMenuCode) {
      showToast('베이스 메뉴 선택 필요', 'error');
      return;
    }
    setSaving(true);
    try {
      const id = modal !== 'add' ? modal.id : undefined;
      const code = String(form.menuCode || '').trim() || `DERIVED-${Date.now()}`;
      const ingredientCodes = asStringArray(form.ingredientCodes);
      const ingredientAmounts = Object.fromEntries(
        ingredientCodes.map(ingredientCode => [
          ingredientCode,
          asAmountMap(form.ingredientAmounts)[ingredientCode] || { L: '', R: '' },
        ])
      );
      await upsertComposition({
        ...(id ? { id } : {}),
        ...form,
        menuCode: code,
        ingredientCodes,
        ingredientAmounts,
        toppingCodes: [],
        toppingAmounts: {},
      });
      showToast('저장 완료', 'ok');
      setModal(null);
      await refresh();
    } catch (err) {
      showToast(`저장 실패: ${err?.message || err}`, 'error');
    } finally {
      setSaving(false);
    }
  };

  const handleDeleteComp = async comp => {
    try {
      await deleteComposition(comp.id);
      showToast(`'${asDisplayText(comp.menuName, '파생 메뉴')}' 삭제`, 'ok');
      await refresh();
    } catch (err) {
      showToast(`삭제 실패: ${err?.message || err}`, 'error');
    }
  };

  return (
    <div style={{ marginTop: 20 }}>
      {/* 파생 메뉴 목록 */}
      <div
        style={{
          display: 'flex',
          justifyContent: 'space-between',
          alignItems: 'center',
          marginBottom: 10,
        }}
      >
        <div style={{ fontSize: 14, fontWeight: 700 }}>파생 메뉴</div>
        <button className="btn sm primary" onClick={openAdd}>
          <Icon.plus style={{ width: 13, height: 13 }} />
          파생 메뉴 추가
        </button>
      </div>

      {safeCompositions.length === 0 ? (
        <div className="empty-state">
          <div className="empty-icon-wrap">
            <Icon.plus style={{ width: 28, height: 28 }} />
          </div>
          <div className="empty-title">파생 메뉴가 없어요</div>
          <div className="empty-sub">
            베이스 메뉴 + 소스/토핑 조합으로 파생 메뉴를 만드세요
            <br />
            <span style={{ fontSize: 11 }}>예: 컨츄리치킨 + 마요네즈 = 컨츄리마요치킨</span>
          </div>
        </div>
      ) : groupedCompositions.length === 0 ? (
        <div className="empty-state">
          <div className="empty-icon-wrap">
            <Icon.search style={{ width: 28, height: 28 }} />
          </div>
          <div className="empty-title">검색 결과가 없어요</div>
          <div className="empty-sub">파생 메뉴명, 베이스 메뉴명, 토핑명으로 다시 검색해보세요</div>
        </div>
      ) : (
        <div style={{ display: 'flex', flexDirection: 'column', gap: 4 }}>
          {groupedCompositions.map(({ group, items }) => (
            <div key={group}>
              {groupedCompositions.length > 1 && <div style={GROUP_HEADER_STYLE}>{group}</div>}
              <div style={{ display: 'flex', flexDirection: 'column', gap: 8 }}>
                {items.map(comp => {
                  const base = menuByCode[asDisplayText(comp.baseMenuCode)];
                  const menuName = asDisplayText(comp.menuName, '이름 없음');
                  const baseName = asDisplayText(
                    base?.menuName || comp.baseMenuCode,
                    '베이스 미지정'
                  );
                  const ingredientsText = asStringArray(comp.ingredientCodes)
                    .map(c => {
                      const row = ingredientValueByCode[c] || ingredientMetaByCode[c];
                      const name = asDisplayText(row?.ingredientName || c);
                      const sizeText = amountText(comp.ingredientAmounts, c);
                      return [name, sizeText ? `(${sizeText})` : ''].filter(Boolean).join(' ');
                    })
                    .filter(Boolean);
                  return (
                    <div
                      key={comp.id || comp.menuCode || menuName}
                      className="card"
                      style={{
                        padding: '12px 16px',
                        display: 'flex',
                        justifyContent: 'space-between',
                        alignItems: 'center',
                      }}
                    >
                      <div>
                        <span style={{ fontWeight: 700, fontSize: 14 }}>{menuName}</span>
                        <span style={{ fontSize: 12, color: 'var(--text-4)', marginLeft: 10 }}>
                          {baseName} + {ingredientsText.join(', ') || '(식자재 미선택)'}
                        </span>
                      </div>
                      <div style={{ display: 'flex', gap: 6 }}>
                        <button className="btn sm ghost" onClick={() => openEdit(comp)}>
                          <Icon.edit style={{ width: 13, height: 13 }} />
                        </button>
                        <button
                          className="btn sm ghost"
                          style={{ color: 'var(--danger)' }}
                          onClick={() => handleDeleteComp(comp)}
                        >
                          <Icon.trash style={{ width: 13, height: 13 }} />
                        </button>
                      </div>
                    </div>
                  );
                })}
              </div>
            </div>
          ))}
        </div>
      )}

      {/* 파생 메뉴 모달 */}
      {modal && (
        <ModalFrame
          title={modal === 'add' ? '파생 메뉴 추가' : '파생 메뉴 편집'}
          onClose={() => setModal(null)}
          width="min(620px,95vw)"
          zIndex={300}
          padding="24px 28px"
        >
          <div style={{ display: 'flex', flexDirection: 'column', gap: 12 }}>
            <div>
              <label
                style={{ fontSize: 12, color: 'var(--text-3)', display: 'block', marginBottom: 4 }}
              >
                파생 메뉴명 *
              </label>
              <input
                className="input"
                value={form.menuName}
                onChange={e => setForm(f => ({ ...f, menuName: e.target.value }))}
                placeholder="예: 컨츄리마요치킨"
              />
            </div>
            <div>
              <label
                style={{ fontSize: 12, color: 'var(--text-3)', display: 'block', marginBottom: 4 }}
              >
                베이스 메뉴 *
              </label>
              <select
                className="input"
                value={form.baseMenuCode}
                onChange={e => setForm(f => ({ ...f, baseMenuCode: e.target.value }))}
              >
                <option value="">선택하세요</option>
                {safeMenus.map((m, index) => {
                  const menuCode = asDisplayText(m.menuCode);
                  const menuName = asDisplayText(m.menuName, menuCode || `메뉴 ${index + 1}`);
                  return (
                    <option key={m.id || menuCode || index} value={menuCode}>
                      {menuName}
                    </option>
                  );
                })}
              </select>
              {safeMenus.length === 0 && (
                <div
                  style={{
                    marginTop: 8,
                    padding: '10px 12px',
                    borderRadius: 8,
                    background: 'var(--surface-2)',
                    color: 'var(--text-3)',
                    display: 'flex',
                    alignItems: 'center',
                    justifyContent: 'space-between',
                    gap: 10,
                  }}
                >
                  <span style={{ fontSize: 12 }}>
                    베이스 영양성분 탭에서 메뉴를 먼저 등록해주세요
                  </span>
                  <button
                    type="button"
                    className="btn sm"
                    onClick={() => {
                      setModal(null);
                      openBaseTab();
                    }}
                  >
                    이동
                  </button>
                </div>
              )}
            </div>
            <div>
              <label
                style={{ fontSize: 12, color: 'var(--text-3)', display: 'block', marginBottom: 8 }}
              >
                추가 식자재
              </label>
              {ingredientOptions.length === 0 ? (
                <div
                  style={{
                    padding: '10px 12px',
                    borderRadius: 8,
                    background: 'var(--surface-2)',
                    color: 'var(--text-3)',
                    display: 'flex',
                    alignItems: 'center',
                    justifyContent: 'space-between',
                    gap: 10,
                  }}
                >
                  <span style={{ fontSize: 12 }}>
                    식자재 영양값 탭에서 식자재별 100g 기준값을 먼저 등록해주세요
                  </span>
                  <button
                    type="button"
                    className="btn sm"
                    onClick={() => {
                      setModal(null);
                      openIngredientValuesTab();
                    }}
                  >
                    이동
                  </button>
                </div>
              ) : (
                <>
                  <IngredientSearch
                    allMeta={ingredientOptions}
                    unitPriceMap={EMPTY_UNIT_PRICE_MAP}
                    alreadyAdded={asStringArray(form.ingredientCodes)}
                    onSelect={addIngredient}
                    style={{ marginTop: 0 }}
                  />
                  {asStringArray(form.ingredientCodes).length > 0 && (
                    <div style={{ marginTop: 12 }}>
                      <div style={{ fontSize: 12, fontWeight: 800, marginBottom: 6 }}>
                        L/R 식자재 사용량
                      </div>
                      <div style={{ display: 'flex', flexDirection: 'column', gap: 8 }}>
                        {asStringArray(form.ingredientCodes).map(code => {
                          const row = ingredientValueByCode[code] || ingredientMetaByCode[code];
                          const ingredientName = asDisplayText(
                            row?.ingredientName || row?.productName,
                            code || '식자재'
                          );
                          const amounts = asAmountMap(form.ingredientAmounts)[code] || {};
                          return (
                            <div
                              key={code}
                              style={{
                                display: 'grid',
                                gridTemplateColumns: '1fr 100px 100px 42px',
                                gap: 8,
                                alignItems: 'center',
                                padding: '8px 10px',
                                border: '1px solid var(--border)',
                                borderRadius: 8,
                                background: 'var(--surface-2)',
                              }}
                            >
                              <div>
                                <div style={{ fontSize: 13, fontWeight: 800 }}>
                                  {ingredientName}
                                </div>
                                <div style={{ fontSize: 11, color: 'var(--text-4)' }}>
                                  {code} · 식자재 영양값 100g 기준, 입력한 사용량만 반영
                                </div>
                              </div>
                              <input
                                className="input"
                                type="number"
                                min="0"
                                step="0.1"
                                value={amounts.L ?? ''}
                                onChange={e => updateIngredientAmount(code, 'L', e.target.value)}
                                placeholder="L g"
                              />
                              <input
                                className="input"
                                type="number"
                                min="0"
                                step="0.1"
                                value={amounts.R ?? ''}
                                onChange={e => updateIngredientAmount(code, 'R', e.target.value)}
                                placeholder="R g"
                              />
                              <button
                                type="button"
                                className="btn sm ghost"
                                onClick={() => removeIngredient(code)}
                                style={{ color: 'var(--danger)' }}
                              >
                                <Icon.trash style={{ width: 13, height: 13 }} />
                              </button>
                            </div>
                          );
                        })}
                      </div>
                    </div>
                  )}
                </>
              )}
            </div>
          </div>
          <div style={{ display: 'flex', gap: 8, justifyContent: 'flex-end', marginTop: 20 }}>
            <button className="btn" onClick={() => setModal(null)}>
              취소
            </button>
            <button
              className="btn primary"
              onClick={handleSaveComp}
              disabled={saving || safeMenus.length === 0}
            >
              {saving ? '저장 중…' : '저장'}
            </button>
          </div>
        </ModalFrame>
      )}
    </div>
  );
}
