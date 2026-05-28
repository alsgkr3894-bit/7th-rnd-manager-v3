'use client';
import { useEffect, useState, useMemo, useCallback } from 'react';
import { createPortal } from 'react-dom';
import { Icon } from '@/components/icons';
import { PageHeader } from '@/components/ui/PageHeader';
import { showToast } from '@/components/Toast';
import { initDB } from '@/lib/db';
import {
  getAllMenuRefs, upsertMenuRef, deleteMenuRef, deleteRawValuesByMenuCode,
  getAllRawValues, upsertRawValue, getRawValueMap,
  getAllEdges, upsertEdge, EDGE_CODES, EDGE_NAMES,
  getAllToppings, upsertTopping, deleteTopping,
  getAllCompositions, upsertComposition, deleteComposition,
  CRUST_TYPES, NUTRITION_FIELDS, calcAllResults,
} from '@/lib/nutrition/values/store';

const TABS = ['베이스 영양성분', '엣지 설정', '파생 메뉴', '계산 결과'];
const MENU_CATS = ['피자', '1인피자', '사이드', '세트', '기타'];

/* ───── 공통 영양성분 입력 그리드 ───── */
function NutritionGrid({ values, onChange, disabled }) {
  return (
    <div style={{ display: 'grid', gridTemplateColumns: 'repeat(3, 1fr)', gap: '8px 12px' }}>
      {NUTRITION_FIELDS.map(f => (
        <div key={f.key}>
          <label style={{ fontSize: 11, color: 'var(--text-3)', display: 'block', marginBottom: 2 }}>
            {f.label} <span style={{ color: 'var(--text-4)' }}>({f.unit})</span>
          </label>
          <input
            className="input" type="number" min="0" step="0.1"
            value={values?.[f.key] ?? ''}
            onChange={e => onChange?.(f.key, e.target.value)}
            disabled={disabled}
            style={{ fontSize: 13 }}
          />
        </div>
      ))}
    </div>
  );
}

/* ───── 탭1: 베이스 영양성분 ───── */
function TabBase({ menus, rawMap, onRefresh }) {
  const [selMenu, setSelMenu] = useState(null);
  const [selCrust, setSelCrust] = useState(CRUST_TYPES[0]);
  const [form, setForm] = useState({});
  const [saving, setSaving] = useState(false);
  const [addMenu, setAddMenu] = useState(false);
  const [newMenuForm, setNewMenuForm] = useState({ menuCode: '', menuName: '', category: '피자', displayOrder: '' });

  const key = selMenu ? `${selMenu.menuCode}__${selCrust}` : null;
  const existing = key ? rawMap[key] : null;

  useEffect(() => {
    if (existing) setForm({ ...existing });
    else setForm({});
  }, [existing, selMenu, selCrust]);

  const setField = (k, v) => setForm(f => ({ ...f, [k]: v }));

  const handleSave = async () => {
    if (!selMenu) return;
    setSaving(true);
    try {
      const payload = {
        ...(existing?.id ? { id: existing.id } : {}),
        menuCode: selMenu.menuCode,
        menuName: selMenu.menuName,
        crustType: selCrust,
        ...form,
      };
      await upsertRawValue(payload);
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
    await Promise.all([
      deleteMenuRef(menu.id),
      deleteRawValuesByMenuCode(menu.menuCode),
    ]);
    if (selMenu?.id === menu.id) setSelMenu(null);
    showToast(`'${menu.menuName}' 삭제`, 'ok');
    onRefresh();
  };

  return (
    <div style={{ display: 'flex', gap: 20, marginTop: 20, alignItems: 'flex-start' }}>
      {/* 메뉴 목록 */}
      <div className="card" style={{ width: 220, flexShrink: 0, padding: 0, overflow: 'hidden' }}>
        <div style={{ padding: '12px 14px 8px', display: 'flex', justifyContent: 'space-between', alignItems: 'center', borderBottom: '1px solid var(--border)' }}>
          <span style={{ fontSize: 13, fontWeight: 700 }}>메뉴 목록</span>
          <button className="btn sm ghost" onClick={() => setAddMenu(true)}><Icon.plus style={{ width: 13, height: 13 }} /></button>
        </div>
        {menus.length === 0 ? (
          <div style={{ padding: 20, textAlign: 'center', color: 'var(--text-4)', fontSize: 13 }}>메뉴를 추가하세요</div>
        ) : (
          <div>
            {menus.map(m => (
              <div key={m.id}
                onClick={() => setSelMenu(m)}
                style={{
                  padding: '9px 14px', cursor: 'pointer', display: 'flex', alignItems: 'center', justifyContent: 'space-between',
                  background: selMenu?.id === m.id ? 'var(--accent-soft)' : 'transparent',
                  borderLeft: selMenu?.id === m.id ? '3px solid var(--accent)' : '3px solid transparent',
                }}>
                <div>
                  <div style={{ fontSize: 13, fontWeight: selMenu?.id === m.id ? 700 : 400, color: selMenu?.id === m.id ? 'var(--accent-text)' : 'var(--text-1)' }}>{m.menuName}</div>
                  <div style={{ fontSize: 11, color: 'var(--text-4)' }}>{m.category}</div>
                </div>
                {/* 입력 현황 체크 */}
                <div style={{ display: 'flex', gap: 2 }}>
                  {CRUST_TYPES.map(ct => {
                    const done = !!rawMap[`${m.menuCode}__${ct}`]?.kcal;
                    return <span key={ct} style={{ width: 6, height: 6, borderRadius: '50%', background: done ? 'var(--accent)' : 'var(--border)' }} />;
                  })}
                </div>
              </div>
            ))}
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

            {/* 크러스트 탭 */}
            <div style={{ display: 'flex', gap: 6, marginBottom: 16 }}>
              {CRUST_TYPES.map(ct => {
                const done = !!rawMap[`${selMenu.menuCode}__${ct}`]?.kcal;
                return (
                  <button key={ct}
                    onClick={() => setSelCrust(ct)}
                    style={{
                      padding: '6px 14px', borderRadius: 8, fontSize: 13, cursor: 'pointer', border: '1.5px solid',
                      borderColor: selCrust === ct ? 'var(--accent)' : 'var(--border)',
                      background: selCrust === ct ? 'var(--accent-soft)' : 'var(--surface)',
                      color: selCrust === ct ? 'var(--accent-text)' : 'var(--text-2)',
                      fontWeight: selCrust === ct ? 700 : 400,
                      display: 'flex', alignItems: 'center', gap: 4,
                    }}>
                    {ct}
                    {done && <span style={{ width: 6, height: 6, borderRadius: '50%', background: selCrust === ct ? 'var(--accent)' : 'var(--accent)', display: 'inline-block' }} />}
                  </button>
                );
              })}
            </div>

            <NutritionGrid values={form} onChange={setField} />

            <div style={{ marginTop: 16, display: 'flex', justifyContent: 'flex-end' }}>
              <button className="btn primary" onClick={handleSave} disabled={saving}>
                {saving ? '저장 중…' : `${selMenu.menuName} ${selCrust} 저장`}
              </button>
            </div>
          </div>
        )}
      </div>

      {/* 메뉴 추가 모달 */}
      {addMenu && createPortal(
        <div style={{ position: 'fixed', inset: 0, background: 'rgba(0,0,0,.45)', display: 'grid', placeItems: 'center', zIndex: 300 }}
          onClick={e => e.target === e.currentTarget && setAddMenu(false)}>
          <div className="card" style={{ width: 'min(400px,95vw)', padding: '24px 28px' }}>
            <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: 4 }}>
              <div style={{ fontWeight: 700, fontSize: 15 }}>메뉴 추가</div>
              <button className="btn ghost" style={{ padding: '4px 8px' }} onClick={() => setAddMenu(false)}><Icon.close style={{ width: 16, height: 16 }} /></button>
            </div>
            <div style={{ marginTop: 20, display: 'flex', flexDirection: 'column', gap: 12 }}>
              <div>
                <label style={{ fontSize: 12, color: 'var(--text-3)', display: 'block', marginBottom: 4 }}>메뉴명 *</label>
                <input className="input" value={newMenuForm.menuName} onChange={e => setNewMenuForm(f => ({ ...f, menuName: e.target.value }))} placeholder="예: 컨츄리치킨" />
              </div>
              <div className="form-row two" style={{ marginTop: 0 }}>
                <div>
                  <label style={{ fontSize: 12, color: 'var(--text-3)', display: 'block', marginBottom: 4 }}>카테고리</label>
                  <select className="input" value={newMenuForm.category} onChange={e => setNewMenuForm(f => ({ ...f, category: e.target.value }))}>
                    {MENU_CATS.map(c => <option key={c} value={c}>{c}</option>)}
                  </select>
                </div>
                <div>
                  <label style={{ fontSize: 12, color: 'var(--text-3)', display: 'block', marginBottom: 4 }}>메뉴코드 (선택)</label>
                  <input className="input" value={newMenuForm.menuCode} onChange={e => setNewMenuForm(f => ({ ...f, menuCode: e.target.value }))} placeholder="자동 생성" />
                </div>
              </div>
            </div>
            <div style={{ display: 'flex', gap: 8, justifyContent: 'flex-end', marginTop: 20 }}>
              <button className="btn" onClick={() => setAddMenu(false)}>취소</button>
              <button className="btn primary" onClick={handleAddMenu}>추가</button>
            </div>
          </div>
        </div>,
        document.body
      )}
    </div>
  );
}

/* ───── 탭2: 엣지 설정 ───── */
function TabEdge({ edges, edgeMap, onRefresh }) {
  const [selCode, setSelCode] = useState(EDGE_CODES[0]);
  const [form, setForm] = useState({});
  const [saving, setSaving] = useState(false);

  const existing = edgeMap[selCode];

  useEffect(() => {
    setForm(existing ? { ...existing } : {});
  }, [selCode, existing]);

  const setField = (k, v) => setForm(f => ({ ...f, [k]: v }));

  const handleSave = async () => {
    setSaving(true);
    try {
      await upsertEdge({
        ...(existing?.id ? { id: existing.id } : {}),
        edgeCode: selCode,
        edgeName: EDGE_NAMES[selCode],
        displayOrder: EDGE_CODES.indexOf(selCode) + 1,
        ...form,
      });
      showToast('저장 완료', 'ok');
      onRefresh();
    } catch { showToast('저장 실패', 'error'); }
    setSaving(false);
  };

  return (
    <div style={{ marginTop: 20 }}>
      <div className="card" style={{ padding: '14px 20px', marginBottom: 16 }}>
        <div style={{ fontSize: 13, color: 'var(--text-3)' }}>
          엣지 영양성분은 <strong>석쇠 베이스값에 추가되는 delta 값</strong>입니다.<br />
          치즈크러스트L = 석쇠L + 치즈크러스트L 추가값 / 골드스윗R = 석쇠R + 골드스윗R 추가값
        </div>
      </div>

      <div style={{ display: 'flex', gap: 8, marginBottom: 16 }}>
        {EDGE_CODES.map(code => {
          const done = !!edgeMap[code]?.kcal;
          return (
            <button key={code}
              onClick={() => setSelCode(code)}
              style={{
                padding: '7px 16px', borderRadius: 8, fontSize: 13, cursor: 'pointer', border: '1.5px solid',
                borderColor: selCode === code ? 'var(--accent)' : 'var(--border)',
                background: selCode === code ? 'var(--accent-soft)' : 'var(--surface)',
                color: selCode === code ? 'var(--accent-text)' : 'var(--text-2)',
                fontWeight: selCode === code ? 700 : 400,
                display: 'flex', alignItems: 'center', gap: 5,
              }}>
              {EDGE_NAMES[code]}
              {done && <span style={{ width: 6, height: 6, borderRadius: '50%', background: 'var(--accent)', display: 'inline-block' }} />}
            </button>
          );
        })}
      </div>

      <div className="card" style={{ padding: 20 }}>
        <div style={{ fontSize: 15, fontWeight: 700, marginBottom: 4 }}>{EDGE_NAMES[selCode]}</div>
        <div style={{ fontSize: 12, color: 'var(--text-3)', marginBottom: 16 }}>베이스 대비 추가 영양성분 값 (delta)</div>
        <NutritionGrid values={form} onChange={setField} />
        <div style={{ marginTop: 16, display: 'flex', justifyContent: 'flex-end' }}>
          <button className="btn primary" onClick={handleSave} disabled={saving}>
            {saving ? '저장 중…' : `${EDGE_NAMES[selCode]} 저장`}
          </button>
        </div>
      </div>
    </div>
  );
}

/* ───── 탭3: 파생 메뉴 ───── */
function TabDerived({ menus, toppings, compositions, onRefresh }) {
  const [modal, setModal] = useState(null); // null | 'add' | composition
  const [toppingModal, setToppingModal] = useState(null); // null | 'add' | topping
  const [form, setForm] = useState({ menuCode: '', menuName: '', baseMenuCode: '', toppingCodes: [] });
  const [toppingForm, setToppingForm] = useState({ toppingCode: '', toppingName: '' });
  const [toppingValues, setToppingValues] = useState({});
  const [saving, setSaving] = useState(false);

  const toggleTopping = (code) => {
    setForm(f => ({
      ...f,
      toppingCodes: f.toppingCodes.includes(code)
        ? f.toppingCodes.filter(c => c !== code)
        : [...f.toppingCodes, code],
    }));
  };

  const openAdd = () => {
    setForm({ menuCode: '', menuName: '', baseMenuCode: menus[0]?.menuCode || '', toppingCodes: [] });
    setModal('add');
  };

  const openEdit = (comp) => {
    setForm({ ...comp });
    setModal(comp);
  };

  const handleSaveComp = async () => {
    if (!form.menuName.trim()) { showToast('파생 메뉴명 입력 필요', 'error'); return; }
    if (!form.baseMenuCode) { showToast('베이스 메뉴 선택 필요', 'error'); return; }
    setSaving(true);
    try {
      const id = modal !== 'add' ? modal.id : undefined;
      const code = form.menuCode.trim() || `DERIVED-${Date.now()}`;
      await upsertComposition({ ...(id ? { id } : {}), ...form, menuCode: code });
      showToast('저장 완료', 'ok');
      setModal(null);
      onRefresh();
    } catch { showToast('저장 실패', 'error'); }
    setSaving(false);
  };

  const handleDeleteComp = async (comp) => {
    await deleteComposition(comp.id);
    showToast(`'${comp.menuName}' 삭제`, 'ok');
    onRefresh();
  };

  const handleSaveTopping = async () => {
    if (!toppingForm.toppingName.trim()) { showToast('소스/토핑명 입력 필요', 'error'); return; }
    setSaving(true);
    try {
      const id = toppingModal !== 'add' ? toppingModal.id : undefined;
      const code = toppingForm.toppingCode.trim() || `TOP-${Date.now()}`;
      await upsertTopping({ ...(id ? { id } : {}), ...toppingForm, toppingCode: code, ...toppingValues });
      showToast('저장 완료', 'ok');
      setToppingModal(null);
      onRefresh();
    } catch { showToast('저장 실패', 'error'); }
    setSaving(false);
  };

  const openToppingAdd = () => {
    setToppingForm({ toppingCode: '', toppingName: '' });
    setToppingValues({});
    setToppingModal('add');
  };

  const openToppingEdit = (t) => {
    setToppingForm({ toppingCode: t.toppingCode, toppingName: t.toppingName });
    setToppingValues(NUTRITION_FIELDS.reduce((acc, { key }) => ({ ...acc, [key]: t[key] ?? '' }), {}));
    setToppingModal(t);
  };

  return (
    <div style={{ marginTop: 20 }}>
      {/* 소스/토핑 마스터 */}
      <div className="card" style={{ marginBottom: 16 }}>
        <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: 12 }}>
          <div>
            <div style={{ fontSize: 14, fontWeight: 700 }}>소스·토핑 마스터</div>
            <div style={{ fontSize: 12, color: 'var(--text-3)', marginTop: 2 }}>파생 메뉴에 추가되는 소스·토핑의 영양성분</div>
          </div>
          <button className="btn sm" onClick={openToppingAdd}><Icon.plus style={{ width: 13, height: 13 }} />추가</button>
        </div>
        {toppings.length === 0 ? (
          <div style={{ padding: '16px 0', textAlign: 'center', color: 'var(--text-4)', fontSize: 13 }}>등록된 소스/토핑이 없어요</div>
        ) : (
          <div style={{ display: 'flex', flexWrap: 'wrap', gap: 8 }}>
            {toppings.map(t => (
              <div key={t.id} style={{ display: 'flex', alignItems: 'center', gap: 6, padding: '6px 12px', background: 'var(--surface-2)', borderRadius: 8, cursor: 'pointer' }}
                onClick={() => openToppingEdit(t)}>
                <span style={{ fontSize: 13, fontWeight: 600 }}>{t.toppingName}</span>
                <span style={{ fontSize: 11, color: 'var(--text-4)' }}>{t.kcal ? `${t.kcal}kcal` : '값 미입력'}</span>
                <button onClick={e => { e.stopPropagation(); deleteTopping(t.id).then(onRefresh); }}
                  style={{ background: 'none', border: 'none', cursor: 'pointer', color: 'var(--text-4)', padding: 0 }}>
                  <Icon.close style={{ width: 12, height: 12 }} />
                </button>
              </div>
            ))}
          </div>
        )}
      </div>

      {/* 파생 메뉴 목록 */}
      <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: 10 }}>
        <div style={{ fontSize: 14, fontWeight: 700 }}>파생 메뉴</div>
        <button className="btn sm primary" onClick={openAdd}><Icon.plus style={{ width: 13, height: 13 }} />파생 메뉴 추가</button>
      </div>

      {compositions.length === 0 ? (
        <div className="card" style={{ display: 'grid', placeItems: 'center', minHeight: 120 }}>
          <div style={{ textAlign: 'center', color: 'var(--text-4)', fontSize: 13 }}>
            베이스 메뉴 + 소스/토핑 조합으로 파생 메뉴를 만드세요<br />
            <span style={{ fontSize: 12 }}>예: 컨츄리치킨 + 마요네즈 = 컨츄리마요치킨</span>
          </div>
        </div>
      ) : (
        <div style={{ display: 'flex', flexDirection: 'column', gap: 8 }}>
          {compositions.map(comp => {
            const base = menus.find(m => m.menuCode === comp.baseMenuCode);
            const tops = (comp.toppingCodes || []).map(c => toppings.find(t => t.toppingCode === c)?.toppingName).filter(Boolean);
            return (
              <div key={comp.id} className="card" style={{ padding: '12px 16px', display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
                <div>
                  <span style={{ fontWeight: 700, fontSize: 14 }}>{comp.menuName}</span>
                  <span style={{ fontSize: 12, color: 'var(--text-4)', marginLeft: 10 }}>
                    {base?.menuName || comp.baseMenuCode} + {tops.join(', ') || '(소스 미선택)'}
                  </span>
                </div>
                <div style={{ display: 'flex', gap: 6 }}>
                  <button className="btn sm ghost" onClick={() => openEdit(comp)}><Icon.pencil style={{ width: 13, height: 13 }} /></button>
                  <button className="btn sm ghost" style={{ color: 'var(--danger)' }} onClick={() => handleDeleteComp(comp)}><Icon.trash style={{ width: 13, height: 13 }} /></button>
                </div>
              </div>
            );
          })}
        </div>
      )}

      {/* 파생 메뉴 추가/편집 모달 */}
      {modal && createPortal(
        <div style={{ position: 'fixed', inset: 0, background: 'rgba(0,0,0,.45)', display: 'grid', placeItems: 'center', zIndex: 300 }}
          onClick={e => e.target === e.currentTarget && setModal(null)}>
          <div className="card" style={{ width: 'min(480px,95vw)', padding: '24px 28px' }}>
            <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: 4 }}>
              <div style={{ fontWeight: 700, fontSize: 15 }}>{modal === 'add' ? '파생 메뉴 추가' : '파생 메뉴 편집'}</div>
              <button className="btn ghost" style={{ padding: '4px 8px' }} onClick={() => setModal(null)}><Icon.close style={{ width: 16, height: 16 }} /></button>
            </div>
            <div style={{ marginTop: 20, display: 'flex', flexDirection: 'column', gap: 12 }}>
              <div>
                <label style={{ fontSize: 12, color: 'var(--text-3)', display: 'block', marginBottom: 4 }}>파생 메뉴명 *</label>
                <input className="input" value={form.menuName} onChange={e => setForm(f => ({ ...f, menuName: e.target.value }))} placeholder="예: 컨츄리마요치킨" />
              </div>
              <div>
                <label style={{ fontSize: 12, color: 'var(--text-3)', display: 'block', marginBottom: 4 }}>베이스 메뉴 *</label>
                <select className="input" value={form.baseMenuCode} onChange={e => setForm(f => ({ ...f, baseMenuCode: e.target.value }))}>
                  <option value="">선택하세요</option>
                  {menus.map(m => <option key={m.id} value={m.menuCode}>{m.menuName}</option>)}
                </select>
              </div>
              <div>
                <label style={{ fontSize: 12, color: 'var(--text-3)', display: 'block', marginBottom: 8 }}>추가 소스/토핑</label>
                {toppings.length === 0
                  ? <div style={{ fontSize: 12, color: 'var(--text-4)' }}>소스/토핑 마스터를 먼저 등록해주세요</div>
                  : (
                    <div style={{ display: 'flex', flexWrap: 'wrap', gap: 8 }}>
                      {toppings.map(t => {
                        const on = form.toppingCodes.includes(t.toppingCode);
                        return (
                          <button key={t.toppingCode} onClick={() => toggleTopping(t.toppingCode)}
                            style={{
                              padding: '5px 12px', borderRadius: 20, fontSize: 13, cursor: 'pointer', border: '1.5px solid',
                              borderColor: on ? 'var(--accent)' : 'var(--border)',
                              background: on ? 'var(--accent-soft)' : 'var(--surface)',
                              color: on ? 'var(--accent-text)' : 'var(--text-2)',
                              fontWeight: on ? 700 : 400,
                            }}>
                            {t.toppingName}
                          </button>
                        );
                      })}
                    </div>
                  )
                }
              </div>
            </div>
            <div style={{ display: 'flex', gap: 8, justifyContent: 'flex-end', marginTop: 20 }}>
              <button className="btn" onClick={() => setModal(null)}>취소</button>
              <button className="btn primary" onClick={handleSaveComp} disabled={saving}>{saving ? '저장 중…' : '저장'}</button>
            </div>
          </div>
        </div>,
        document.body
      )}

      {/* 소스/토핑 모달 */}
      {toppingModal && createPortal(
        <div style={{ position: 'fixed', inset: 0, background: 'rgba(0,0,0,.45)', display: 'grid', placeItems: 'center', zIndex: 300 }}
          onClick={e => e.target === e.currentTarget && setToppingModal(null)}>
          <div className="card" style={{ width: 'min(480px,95vw)', padding: '24px 28px' }}>
            <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: 4 }}>
              <div style={{ fontWeight: 700, fontSize: 15 }}>{toppingModal === 'add' ? '소스·토핑 추가' : `${toppingModal.toppingName} 편집`}</div>
              <button className="btn ghost" style={{ padding: '4px 8px' }} onClick={() => setToppingModal(null)}><Icon.close style={{ width: 16, height: 16 }} /></button>
            </div>
            <div style={{ marginTop: 20, display: 'flex', flexDirection: 'column', gap: 12 }}>
              <div className="form-row two" style={{ marginTop: 0 }}>
                <div>
                  <label style={{ fontSize: 12, color: 'var(--text-3)', display: 'block', marginBottom: 4 }}>소스/토핑명 *</label>
                  <input className="input" value={toppingForm.toppingName} onChange={e => setToppingForm(f => ({ ...f, toppingName: e.target.value }))} placeholder="예: 마요네즈" />
                </div>
                <div>
                  <label style={{ fontSize: 12, color: 'var(--text-3)', display: 'block', marginBottom: 4 }}>코드 (선택)</label>
                  <input className="input" value={toppingForm.toppingCode} onChange={e => setToppingForm(f => ({ ...f, toppingCode: e.target.value }))} placeholder="자동생성" />
                </div>
              </div>
              <div>
                <label style={{ fontSize: 12, color: 'var(--text-3)', display: 'block', marginBottom: 8 }}>영양성분 (1회 제공량 기준)</label>
                <NutritionGrid values={toppingValues} onChange={(k, v) => setToppingValues(f => ({ ...f, [k]: v }))} />
              </div>
            </div>
            <div style={{ display: 'flex', gap: 8, justifyContent: 'flex-end', marginTop: 20 }}>
              <button className="btn" onClick={() => setToppingModal(null)}>취소</button>
              <button className="btn primary" onClick={handleSaveTopping} disabled={saving}>{saving ? '저장 중…' : '저장'}</button>
            </div>
          </div>
        </div>,
        document.body
      )}
    </div>
  );
}

/* ───── 탭4: 계산 결과 ───── */
function TabResults({ menus, rawMap, edgeMap, compositions, toppings }) {
  const [filterMenu, setFilterMenu] = useState('전체');
  const [filterDerived, setFilterDerived] = useState('전체');

  const toppingMap = useMemo(() => {
    const m = {};
    toppings.forEach(t => { m[t.toppingCode] = t; });
    return m;
  }, [toppings]);

  const results = useMemo(() => calcAllResults({ menus, rawMap, edgeMap, compositions, toppingMap }), [menus, rawMap, edgeMap, compositions, toppingMap]);

  const menuNames = useMemo(() => ['전체', ...menus.map(m => m.menuName), ...compositions.map(c => c.menuName)], [menus, compositions]);

  const filtered = useMemo(() => {
    let r = results;
    if (filterMenu !== '전체') r = r.filter(x => x.menuName === filterMenu);
    if (filterDerived === '기본') r = r.filter(x => !x.isDerived);
    if (filterDerived === '파생') r = r.filter(x => x.isDerived);
    return r;
  }, [results, filterMenu, filterDerived]);

  const hasData = filtered.some(r => r.kcal);

  return (
    <div style={{ marginTop: 20 }}>
      <div style={{ display: 'flex', gap: 8, marginBottom: 16, flexWrap: 'wrap' }}>
        <select className="input" style={{ width: 160 }} value={filterMenu} onChange={e => setFilterMenu(e.target.value)}>
          {menuNames.map(n => <option key={n} value={n}>{n}</option>)}
        </select>
        {['전체', '기본', '파생'].map(v => (
          <button key={v} className={'chip ' + (filterDerived === v ? 'active' : '')} onClick={() => setFilterDerived(v)}>{v}</button>
        ))}
      </div>

      {!hasData ? (
        <div className="card" style={{ display: 'grid', placeItems: 'center', minHeight: 180 }}>
          <div style={{ textAlign: 'center', color: 'var(--text-4)' }}>
            <Icon.beaker style={{ width: 28, height: 28 }} />
            <div style={{ marginTop: 8, fontSize: 13 }}>베이스 영양성분과 엣지 설정을 완료하면 계산 결과가 표시돼요</div>
          </div>
        </div>
      ) : (
        <div className="card table-card">
          <div className="table-wrap">
            <table className="data-table" style={{ minWidth: 1000 }}>
              <thead>
                <tr>
                  <th style={{ minWidth: 140 }}>메뉴명</th>
                  <th style={{ width: 110 }}>크러스트 타입</th>
                  {NUTRITION_FIELDS.map(f => <th key={f.key} style={{ textAlign: 'right', width: 80 }}>{f.label}<br /><span style={{ fontWeight: 400, color: 'var(--text-4)', fontSize: 10 }}>({f.unit})</span></th>)}
                </tr>
              </thead>
              <tbody>
                {filtered.map((r, i) => {
                  const isEmpty = !r.kcal && !r.protein;
                  return (
                    <tr key={i} style={{ opacity: isEmpty ? 0.35 : 1 }}>
                      <td>
                        <div style={{ fontWeight: 600 }}>{r.menuName}</div>
                        {r.isDerived && <div style={{ fontSize: 11, color: 'var(--text-4)' }}>↳ {r.baseMenuName}</div>}
                      </td>
                      <td>
                        <span style={{
                          fontSize: 12, padding: '2px 8px', borderRadius: 20,
                          background: r.crustType.includes('치즈') ? '#fff4e0' : r.crustType.includes('골드') ? '#fff9e0' : 'var(--surface-2)',
                          color: r.crustType.includes('치즈') ? '#b06800' : r.crustType.includes('골드') ? '#8a7000' : 'var(--text-2)',
                        }}>
                          {r.crustType}
                        </span>
                      </td>
                      {NUTRITION_FIELDS.map(f => (
                        <td key={f.key} className="right">{isEmpty ? '—' : (r[f.key] ?? '—')}</td>
                      ))}
                    </tr>
                  );
                })}
              </tbody>
            </table>
          </div>
        </div>
      )}

      <div style={{ marginTop: 8, fontSize: 12, color: 'var(--text-4)' }}>
        총 {filtered.length}행 (전체 {results.length}행)
      </div>
    </div>
  );
}

/* ───── 메인 페이지 ───── */
export default function Page() {
  const [tab, setTab] = useState(0);
  const [menus, setMenus] = useState([]);
  const [rawMap, setRawMap] = useState({});
  const [edges, setEdges] = useState([]);
  const [edgeMap, setEdgeMap] = useState({});
  const [toppings, setToppings] = useState([]);
  const [compositions, setCompositions] = useState([]);
  const [loading, setLoading] = useState(true);

  const load = useCallback(async () => {
    await initDB();
    const [m, rawValues, e, t, c] = await Promise.all([
      getAllMenuRefs(),
      getRawValueMap(),
      getAllEdges(),
      getAllToppings(),
      getAllCompositions(),
    ]);
    const em = {};
    e.forEach(edge => { em[edge.edgeCode] = edge; });
    setMenus(m);
    setRawMap(rawValues);
    setEdges(e);
    setEdgeMap(em);
    setToppings(t);
    setCompositions(c);
    setLoading(false);
  }, []);

  useEffect(() => { load(); }, [load]);

  if (loading) {
    return (
      <main className="main">
        <div style={{ display: 'grid', placeItems: 'center', minHeight: 300 }}>
          <div style={{ color: 'var(--text-4)' }}>불러오는 중…</div>
        </div>
      </main>
    );
  }

  return (
    <main className="main">
      <PageHeader
        breadcrumb={['영양성분', '영양성분 정보 및 계산']}
        title="영양성분 정보 및 계산"
        sub="베이스 영양성분 입력 → 엣지 설정 → 파생 메뉴 → 계산 결과 확인"
      />

      {/* 탭 */}
      <div style={{ display: 'flex', gap: 0, marginTop: 20, borderBottom: '1px solid var(--border)' }}>
        {TABS.map((t, i) => (
          <button key={i} onClick={() => setTab(i)}
            style={{
              padding: '10px 20px', fontSize: 14, fontWeight: tab === i ? 700 : 400,
              color: tab === i ? 'var(--accent-text)' : 'var(--text-3)',
              background: 'none', border: 'none', cursor: 'pointer',
              borderBottom: tab === i ? '2px solid var(--accent)' : '2px solid transparent',
              marginBottom: -1,
            }}>
            {t}
          </button>
        ))}
      </div>

      {tab === 0 && (
        <TabBase menus={menus} rawMap={rawMap} onRefresh={load} />
      )}
      {tab === 1 && (
        <TabEdge edges={edges} edgeMap={edgeMap} onRefresh={load} />
      )}
      {tab === 2 && (
        <TabDerived menus={menus} toppings={toppings} compositions={compositions} onRefresh={load} />
      )}
      {tab === 3 && (
        <TabResults menus={menus} rawMap={rawMap} edgeMap={edgeMap} compositions={compositions} toppings={toppings} />
      )}
    </main>
  );
}
