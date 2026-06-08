'use client';
import { useState, useEffect } from 'react';
import { Icon } from '@/components/icons';
import { ModalFrame } from '@/components/ui/ModalFrame';
import { showToast } from '@/components/Toast';
import MenuCodePicker from '@/components/ui/MenuCodePicker';
import { ImportBaseModal } from '@/components/nutrition/menu/ImportBaseModal';
import {
  upsertMenuRef, deleteMenuRef,
  upsertRawValue, CRUST_TYPES, NUTRITION_FIELDS,
  clearAllBaseData,
} from '@/lib/nutrition/values/store';
import { NutritionGrid } from '@/components/nutrition/NutritionGrid';
import {
  calcNutritionFromComponents,
  buildIngredientNutritionMap,
  findRecipeForMenu,
} from '@/lib/nutrition/auto-calc';
import { groupMenusOrdered, resolveNutritionGroup } from '@/lib/nutrition/menu-group';

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

function MenuGroupList({ menus, rawMap, menuMasters, selMenu, onSelect }) {
  const masterByCode = Object.fromEntries((menuMasters || []).map(m => [m.menuCode, m]));
  const groups = groupMenusOrdered(menus, masterByCode);
  const multiGroup = groups.length > 1;

  return (
    <>
      {groups.map(({ group, items }) => (
        <div key={group}>
          {multiGroup && <div style={GROUP_HEADER_STYLE}>{group}</div>}
          {items.map(m => (
            <div key={m.id} onClick={() => onSelect(m)}
              style={{
                padding: '9px 14px', cursor: 'pointer', display: 'flex', alignItems: 'center', justifyContent: 'space-between',
                background: selMenu?.id === m.id ? 'var(--accent-soft)' : 'transparent',
                borderLeft: selMenu?.id === m.id ? '3px solid var(--accent)' : '3px solid transparent',
              }}>
              <div>
                <div style={{ fontSize: 13, fontWeight: selMenu?.id === m.id ? 700 : 400, color: selMenu?.id === m.id ? 'var(--accent-text)' : 'var(--text-1)' }}>{m.menuName}</div>
                <div style={{ fontSize: 11, color: 'var(--text-4)' }}>
                  {m.category}
                  {m.menuCode && <span style={{ marginLeft: 4, fontFamily: 'monospace', color: 'var(--accent-text)', opacity: 0.7 }}>{m.menuCode}</span>}
                </div>
              </div>
              <div style={{ display: 'flex', gap: 2 }}>
                {CRUST_TYPES.map(ct => {
                  const done = !!rawMap[`${m.menuCode}__${ct}`]?.kcal;
                  return <span key={ct} style={{ width: 6, height: 6, borderRadius: '50%', background: done ? 'var(--accent)' : 'var(--border)' }} />;
                })}
              </div>
            </div>
          ))}
        </div>
      ))}
    </>
  );
}

const MENU_CATS = [
  '피자', '피자/프리미엄 스페셜', '피자/프리미엄', '피자/오리지널', '피자/하프앤하프',
  '1인피자', '세트박스', '사이드', '소스', '음료', '엣지', '기타',
];

export function TabBase({ menus, rawMap, onRefresh, menuMasters }) {
  const [selMenu,     setSelMenu]     = useState(null);
  const [selCrust,    setSelCrust]    = useState(CRUST_TYPES[0]);
  const [form,        setForm]        = useState({});
  const [saving,      setSaving]      = useState(false);
  const [addMenu,     setAddMenu]     = useState(false);
  const [newMenuForm, setNewMenuForm] = useState({ menuCode: '', menuName: '', category: '피자', displayOrder: '' });
  const [autoCalcBusy,   setAutoCalcBusy]   = useState(false);
  const [autoCalcPreview, setAutoCalcPreview] = useState(null); // { values: Object } | null
  const [importOpen,     setImportOpen]     = useState(false);

  const key      = selMenu ? `${selMenu.menuCode}__${selCrust}` : null;
  const existing = key ? rawMap[key] : null;

  useEffect(() => {
    if (existing) setForm({ ...existing });
    else setForm({});
  }, [existing, selMenu, selCrust]);

  const setField = (k, v) => setForm(f => ({ ...f, [k]: v }));

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
      const existing = rawMap[`${selMenu.menuCode}__${selCrust}`];
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
      onRefresh();
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
      onRefresh();
    } catch { showToast('저장 실패', 'error'); }
    setSaving(false);
  };

  const handleAddMenu = async () => {
    if (!newMenuForm.menuName.trim()) { showToast('메뉴명 입력 필요', 'error'); return; }
    const code = newMenuForm.menuCode.trim() || `MENU-${Date.now()}`;
    await upsertMenuRef({ ...newMenuForm, menuCode: code, displayOrder: newMenuForm.displayOrder ? Number(newMenuForm.displayOrder) : undefined });
    showToast('메뉴 추가 완료', 'ok');
    setAddMenu(false);
    setNewMenuForm({ menuCode: '', menuName: '', category: '피자', displayOrder: '' });
    onRefresh();
  };

  const handleDeleteMenu = async (menu) => {
    await deleteMenuRef(menu.id, menu.menuCode);
    if (selMenu?.id === menu.id) setSelMenu(null);
    showToast(`'${menu.menuName}' 삭제`, 'ok');
    onRefresh();
  };

  return (
    <div style={{ display: 'flex', gap: 20, marginTop: 20, alignItems: 'flex-start' }}>
      {/* 메뉴 목록 */}
      <div className="card" style={{ width: 220, flexShrink: 0, padding: 0, overflow: 'hidden', display: 'flex', flexDirection: 'column', maxHeight: 'calc(100vh - 220px)' }}>
        <div style={{ padding: '12px 14px 8px', display: 'flex', justifyContent: 'space-between', alignItems: 'center', borderBottom: '1px solid var(--border)', flexShrink: 0 }}>
          <span style={{ fontSize: 13, fontWeight: 700 }}>메뉴 목록</span>
          <div style={{ display: 'flex', gap: 4 }}>
            <button className="btn sm ghost" title="엑셀 가져오기" onClick={() => setImportOpen(true)}
              style={{ fontSize: 11, padding: '3px 7px' }}>엑셀</button>
            <button className="btn sm ghost" onClick={() => setAddMenu(true)}><Icon.plus style={{ width: 13, height: 13 }} /></button>
            <button className="btn sm ghost" title="전체 삭제"
              style={{ fontSize: 11, padding: '3px 7px', color: 'var(--danger)' }}
              onClick={async () => {
                if (!confirm('베이스 영양성분 전체(메뉴 목록 + 값)를 삭제합니다. 계속할까요?')) return;
                await clearAllBaseData();
                setSelMenu(null);
                showToast('전체 삭제 완료', 'ok');
                onRefresh();
              }}>전체삭제</button>
          </div>
        </div>
        {menus.length === 0 ? (
          <div className="empty-state" style={{ padding: '24px 12px' }}>
            <div className="empty-icon-wrap"><Icon.doc style={{ width: 28, height: 28 }}/></div>
            <div style={{ fontWeight: 700, fontSize: 13 }}>메뉴가 없어요</div>
            <div style={{ fontSize: 12, color: 'var(--text-3)' }}>+ 버튼으로 메뉴를 추가하세요</div>
          </div>
        ) : (
          <div style={{ overflowY: 'auto', flex: 1 }}>
            <MenuGroupList menus={menus} rawMap={rawMap} menuMasters={menuMasters} selMenu={selMenu} onSelect={setSelMenu} />
          </div>
        )}
      </div>

      {/* 영양성분 입력 패널 */}
      <div style={{ flex: 1 }}>
        {!selMenu ? (
          <div className="card" style={{ display: 'grid', placeItems: 'center', minHeight: 200 }}>
            <div style={{ textAlign: 'center', color: 'var(--text-4)' }}>
              <Icon.beaker style={{ width: 28, height: 28 }} />
              <div style={{ marginTop: 8, fontSize: 13 }}>메뉴를 선택하면 영양성분을 입력할 수 있어요</div>
            </div>
          </div>
        ) : (
          <div className="card" style={{ padding: 20 }}>
            <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'flex-start', marginBottom: 16 }}>
              <div>
                <div style={{ fontSize: 16, fontWeight: 700 }}>{selMenu.menuName}</div>
                <div style={{ fontSize: 12, color: 'var(--text-3)', marginTop: 2 }}>영양성분 수치 입력 (업체 분석값)</div>
              </div>
              <button className="btn sm ghost" style={{ color: 'var(--danger)' }} onClick={() => handleDeleteMenu(selMenu)}>
                <Icon.trash style={{ width: 13, height: 13 }} />메뉴 삭제
              </button>
            </div>

            <div style={{ display: 'flex', gap: 6, marginBottom: 16 }}>
              {CRUST_TYPES.map(ct => {
                const done = !!rawMap[`${selMenu.menuCode}__${ct}`]?.kcal;
                return (
                  <button key={ct} onClick={() => setSelCrust(ct)}
                    style={{
                      padding: '6px 14px', borderRadius: 8, fontSize: 13, cursor: 'pointer', border: '1.5px solid',
                      borderColor: selCrust === ct ? 'var(--accent)' : 'var(--border)',
                      background: selCrust === ct ? 'var(--accent-soft)' : 'var(--surface)',
                      color: selCrust === ct ? 'var(--accent-text)' : 'var(--text-2)',
                      fontWeight: selCrust === ct ? 700 : 400,
                      display: 'flex', alignItems: 'center', gap: 4,
                    }}>
                    {ct}
                    {done && <span style={{ width: 6, height: 6, borderRadius: '50%', background: 'var(--accent)', display: 'inline-block' }} />}
                  </button>
                );
              })}
            </div>

            <div style={{ fontSize: 11, color: 'var(--text-3)', marginBottom: 8, padding: '6px 10px', background: 'var(--surface-2)', borderRadius: 6, lineHeight: 1.5 }}>
              ※ 영양성분 수치는 <strong>100g 기준</strong>으로 입력하세요.
              {selMenu && resolveNutritionGroup(selMenu, Object.fromEntries((menuMasters || []).map(m => [m.menuCode, m]))) === '피자'
                && <> · <strong>중량</strong>은 이 크러스트의 <strong>한판 총중량(g)</strong>을 입력하면 하프앤하프·세트·조각 계산에 사용됩니다.</>}
            </div>

            <NutritionGrid values={form} onChange={setField} />

            <div style={{ marginTop: 16, display: 'flex', justifyContent: 'space-between', alignItems: 'center', gap: 8 }}>
              <button
                className="btn sm ghost"
                onClick={handleAutoCalc}
                disabled={autoCalcBusy || saving}
                title="cost_recipes 레시피 구성에서 영양성분을 자동 계산합니다"
                style={{ display: 'flex', alignItems: 'center', gap: 4, fontSize: 12, color: 'var(--accent-text)' }}
              >
                <Icon.beaker style={{ width: 13, height: 13 }} />
                {autoCalcBusy ? '계산 중…' : '레시피 기반 자동계산'}
              </button>
              <button className="btn primary" onClick={handleSave} disabled={saving}>
                {saving ? '저장 중…' : `${selMenu.menuName} ${selCrust} 저장`}
              </button>
            </div>
          </div>
        )}
      </div>

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
            <strong style={{ color: 'var(--text-1)' }}>{selMenu?.menuName}</strong> 레시피 재료 기반 <strong>100g 기준</strong> 영양성분이에요.<br />
            <span style={{ fontSize: 12 }}>적용하면 <strong>{selCrust}</strong> 크러스트에 아래 값 + 중량 <strong>{autoCalcPreview.totalGrams}g</strong>이 입력됩니다.</span>
          </div>
          {autoCalcPreview.matched < autoCalcPreview.total && (
            <div style={{ marginBottom: 12, fontSize: 12, padding: '8px 10px', borderRadius: 8, background: 'var(--warn-soft, #fff4e5)', color: 'var(--warn-text, #92600a)' }}>
              ⚠ 재료 {autoCalcPreview.matched}/{autoCalcPreview.total}개만 영양DB에 매칭됐어요. 나머지는 계산에서 제외되어 값이 작을 수 있어요.
            </div>
          )}
          {autoCalcPreview.matched === autoCalcPreview.total && (
            <div style={{ marginBottom: 12, fontSize: 12, color: 'var(--text-4)' }}>
              재료 {autoCalcPreview.matched}/{autoCalcPreview.total}개 전부 매칭됨
            </div>
          )}
          <div style={{ display: 'grid', gridTemplateColumns: 'repeat(3, 1fr)', gap: '8px 12px', marginBottom: 16 }}>
            {NUTRITION_FIELDS.filter(f => f.key !== 'weight').map(f => (
              <div key={f.key} style={{ background: 'var(--surface-2)', borderRadius: 8, padding: '8px 10px' }}>
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
            * 재료 100g 기준값 × 사용량을 합산 후 총중량으로 나눠 100g 기준으로 정규화한 값입니다. 중량 칸도 함께 채워집니다.
          </div>
          <div style={{ display: 'flex', gap: 8, justifyContent: 'flex-end' }}>
            <button className="btn" onClick={() => setAutoCalcPreview(null)}>취소</button>
            <button className="btn primary" onClick={handleApplyAutoCalc} disabled={saving}>
              {saving ? '적용 중…' : '이 값으로 적용'}
            </button>
          </div>
        </ModalFrame>
      )}

      {importOpen && (
        <ImportBaseModal
          menuMasters={menuMasters}
          menus={menus}
          rawMap={rawMap}
          onClose={() => setImportOpen(false)}
          onRefresh={onRefresh}
        />
      )}

      {addMenu && (
        <ModalFrame title="메뉴 추가" onClose={() => setAddMenu(false)} width="min(400px,95vw)" zIndex={300} padding="24px 28px">
            <div style={{ display: 'flex', flexDirection: 'column', gap: 12 }}>
              <div>
                <label style={{ fontSize: 12, color: 'var(--text-3)', display: 'block', marginBottom: 4 }}>메뉴코드 <span style={{ color: 'var(--text-4)' }}>(선택 시 메뉴명 자동 입력)</span></label>
                <MenuCodePicker
                  menuMasters={menuMasters}
                  value={newMenuForm.menuCode}
                  onChange={(code, meta) => setNewMenuForm(f => ({
                    ...f,
                    menuCode: code,
                    menuName: code ? (menuMasters.find(m => m.menuCode === code)?.menuName ?? f.menuName) : f.menuName,
                    category: meta?.category || f.category,
                  }))}
                />
              </div>
              <div>
                <label style={{ fontSize: 12, color: 'var(--text-3)', display: 'block', marginBottom: 4 }}>메뉴명 *</label>
                <input className="input" value={newMenuForm.menuName} onChange={e => setNewMenuForm(f => ({ ...f, menuName: e.target.value }))} placeholder="예: 컨츄리치킨" />
              </div>
              <div>
                <label style={{ fontSize: 12, color: 'var(--text-3)', display: 'block', marginBottom: 4 }}>카테고리</label>
                <select className="input" value={newMenuForm.category} onChange={e => setNewMenuForm(f => ({ ...f, category: e.target.value }))}>
                  {MENU_CATS.map(c => <option key={c} value={c}>{c}</option>)}
                </select>
              </div>
            </div>
            <div style={{ display: 'flex', gap: 8, justifyContent: 'flex-end', marginTop: 20 }}>
              <button className="btn" onClick={() => setAddMenu(false)}>취소</button>
              <button className="btn primary" onClick={handleAddMenu}>추가</button>
            </div>
        </ModalFrame>
      )}
    </div>
  );
}
