'use client';
import { useEffect, useRef, useState, useMemo } from 'react';
import { Icon } from '@/components/icons';
import { ModalFrame } from '@/components/ui/ModalFrame';
import { showToast } from '@/components/Toast';
import { upsertSetComposition, deleteSetComposition } from '@/lib/nutrition/values/store';
import { resolveNutritionGroup } from '@/lib/nutrition/menu-group';
import { calcSetMinMax, calcHalfMinMax } from '@/lib/nutrition/values/set-calc';
import { asDisplayText, asObjectArray, asStringArray } from '@/lib/ui/prop-guards';

const EMPTY_MAP = {};
const noop = () => {};

function asRecord(value) {
  return value && typeof value === 'object' && !Array.isArray(value) ? value : EMPTY_MAP;
}

export function TabSetCalc({ menus, rawMap, edgeMap, setComps, menuMasters, onRefresh }) {
  const safeMenus = useMemo(() => asObjectArray(menus), [menus]);
  const safeSetComps = useMemo(() => asObjectArray(setComps), [setComps]);
  const safeMenuMasters = useMemo(() => asObjectArray(menuMasters), [menuMasters]);
  const safeRawMap = asRecord(rawMap);
  const safeEdgeMap = asRecord(edgeMap);
  const refresh = typeof onRefresh === 'function' ? onRefresh : noop;
  const [modal, setModal] = useState(null); // null | 'add' | comp object
  const [form, setForm] = useState({ setCode: '', setName: '', kind: 'set', slots: [] });
  const [saving, setSaving] = useState(false);

  const masterByCode = useMemo(
    () => Object.fromEntries(safeMenuMasters.map(m => [m.menuCode, m])),
    [safeMenuMasters]
  );

  const pizzaMenus = useMemo(
    () => safeMenus.filter(m => resolveNutritionGroup(m, masterByCode) === '피자'),
    [safeMenus, masterByCode]
  );

  const nonPizzaMenus = useMemo(
    () => safeMenus.filter(m => resolveNutritionGroup(m, masterByCode) !== '피자'),
    [safeMenus, masterByCode]
  );

  const halfResult = useMemo(
    () => calcHalfMinMax(pizzaMenus, safeRawMap, safeEdgeMap),
    [pizzaMenus, safeRawMap, safeEdgeMap]
  );

  const setsWithCalc = useMemo(() => {
    return safeSetComps.filter(c => c.kind === 'set').map(comp => ({
      ...comp,
      ...calcSetMinMax(Array.isArray(comp.slots) ? comp.slots : [], safeMenus, safeRawMap, masterByCode, pizzaMenus),
    }));
  }, [safeSetComps, safeMenus, safeRawMap, masterByCode, pizzaMenus]);

  const openAdd = () => {
    setForm({ setCode: '', setName: '', kind: 'set', slots: [] });
    setModal('add');
  };
  const openEdit = (comp) => {
    setForm({ ...comp, slots: Array.isArray(comp.slots) ? comp.slots : [] });
    setModal(comp);
  };

  const addSlot = () => setForm(f => ({ ...f, slots: [...(Array.isArray(f.slots) ? f.slots : []), { label: '', menuCodes: [] }] }));
  const removeSlot = (i) => setForm(f => ({ ...f, slots: (Array.isArray(f.slots) ? f.slots : []).filter((_, idx) => idx !== i) }));
  const updateSlot = (i, patch) => setForm(f => ({ ...f, slots: (Array.isArray(f.slots) ? f.slots : []).map((s, idx) => idx === i ? { ...s, ...patch } : s) }));

  const handleSave = async () => {
    if (!String(form.setName || '').trim()) { showToast('세트명 입력 필요', 'error'); return; }
    setSaving(true);
    try {
      const id = modal !== 'add' ? modal.id : undefined;
      const code = String(form.setCode || '').trim() || `SET-${Date.now()}`;
      await upsertSetComposition({ ...(id ? { id } : {}), ...form, setCode: code });
      showToast('저장 완료', 'ok');
      setModal(null);
      refresh();
    } catch { showToast('저장 실패', 'error'); }
    setSaving(false);
  };

  const handleDelete = async (comp) => {
    await deleteSetComposition(comp.id);
    showToast(`'${comp.setName}' 삭제`, 'ok');
    refresh();
  };

  const fmtKcal = (v) => v != null ? `${v} kcal` : '—';

  return (
    <div style={{ marginTop: 20, display: 'flex', flexDirection: 'column', gap: 20 }}>

      {/* 하프앤하프 (자동) */}
      <div className="card">
        <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'flex-start', marginBottom: 12 }}>
          <div>
            <div style={{ fontSize: 14, fontWeight: 700 }}>하프앤하프</div>
            <div style={{ fontSize: 12, color: 'var(--text-3)', marginTop: 2 }}>
              모든 피자 한판 총열량(kcal×총중량÷100) — 열량 최저 2종 반반 최소 / 최고 2종 반반 최대
            </div>
          </div>
          <span style={{ fontSize: 11, color: 'var(--text-4)', padding: '3px 8px', background: 'var(--surface-2)', borderRadius: 6 }}>
            자동 계산 · 한판 총열량 기준
          </span>
        </div>
        <div style={{ display: 'grid', gridTemplateColumns: 'repeat(3, 1fr)', gap: 12 }}>
          <KcalCard label="피자 메뉴 수" value={`${pizzaMenus.length}개`} sub="크러스트/엣지 변형 포함" />
          <KcalCard label="최소열량 (한판)" value={fmtKcal(halfResult.minKcal)} sub="가장 낮은 조합" accent />
          <KcalCard label="최대열량 (한판)" value={fmtKcal(halfResult.maxKcal)} sub="가장 높은 조합" accent />
        </div>
        {pizzaMenus.length > 0 && (
          <div style={{ marginTop: 12, borderTop: '1px solid var(--border-1)', paddingTop: 10 }}>
            <div style={{ fontSize: 11, color: 'var(--text-4)', marginBottom: 6 }}>피자 메뉴 목록 — 한판 총열량 (석쇠L / 씬바사삭L 기준)</div>
            <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fill, minmax(200px, 1fr))', gap: 4 }}>
              {pizzaMenus.map((m, index) => {
                const menuCode = asDisplayText(m.menuCode);
                const menuName = asDisplayText(m.menuName, menuCode || `피자 메뉴 ${index + 1}`);
                const raw100 = safeRawMap[`${menuCode}__석쇠L`] || safeRawMap[`${menuCode}__씬바사삭L`] || {};
                const k = parseFloat(raw100.kcal);
                const w = parseFloat(raw100.weight);
                const kcal = (!isNaN(k) && k > 0 && !isNaN(w) && w > 0) ? Math.round(k * w / 100) : null;
                return (
                  <div key={menuCode || index} style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', padding: '4px 8px', background: 'var(--surface-2)', borderRadius: 6, fontSize: 12 }}>
                    <span style={{ color: 'var(--text-2)', overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap' }}>{menuName}</span>
                    <span style={{ fontWeight: 600, color: 'var(--text-1)', marginLeft: 8, flexShrink: 0 }}>
                      {kcal != null ? `${kcal} kcal` : <span style={{ color: 'var(--text-4)' }}>중량 미입력</span>}
                    </span>
                  </div>
                );
              })}
            </div>
          </div>
        )}
        {pizzaMenus.length === 0 && (
          <div style={{ marginTop: 12, fontSize: 12, color: 'var(--text-4)', textAlign: 'center', padding: '12px 0' }}>
            베이스 영양성분(피자)을 먼저 입력해주세요
          </div>
        )}
      </div>

      {/* 세트박스 */}
      <div>
        <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: 10 }}>
          <div>
            <div style={{ fontSize: 14, fontWeight: 700 }}>세트박스</div>
            <div style={{ fontSize: 12, color: 'var(--text-3)', marginTop: 2 }}>피자(자동) + 추가 구성품으로 최소/최대 열량을 산출해요</div>
          </div>
          <button className="btn sm primary" onClick={openAdd}><Icon.plus style={{ width: 13, height: 13 }} />세트 추가</button>
        </div>

        {setsWithCalc.length === 0 ? (
          <div className="empty-state" style={{ padding: '24px 16px' }}>
            <div className="empty-icon-wrap"><Icon.box style={{ width: 28, height: 28 }} /></div>
            <div className="empty-title">세트 구성이 없어요</div>
            <div className="empty-sub">세트 추가 버튼으로 구성품을 정의하세요</div>
          </div>
        ) : (
          <div style={{ display: 'flex', flexDirection: 'column', gap: 10 }}>
            {setsWithCalc.map((comp, index) => {
              const setName = asDisplayText(comp.setName, `세트 ${index + 1}`);
              const slots = Array.isArray(comp.slots) ? comp.slots : [];
              const slotLabels = slots.map(s => asDisplayText(s?.label, '구성품')).join(' + ');
              return (
              <div key={comp.id || comp.setCode || setName} className="card" style={{ padding: 16 }}>
                <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'flex-start' }}>
                  <div>
                    <div style={{ fontWeight: 700, fontSize: 14 }}>{setName}</div>
                    <div style={{ fontSize: 11, color: 'var(--text-4)', marginTop: 2 }}>
                      피자(자동){slotLabels ? ` + ${slotLabels}` : ''}
                    </div>
                  </div>
                  <div style={{ display: 'flex', gap: 6, alignItems: 'center' }}>
                    <div style={{ textAlign: 'right' }}>
                      <div style={{ fontSize: 12, color: 'var(--text-3)' }}>최소 {fmtKcal(comp.minKcal)} ~ 최대 {fmtKcal(comp.maxKcal)}</div>
                      <div style={{ fontSize: 10, color: 'var(--text-4)' }}>총열량 기준 (피자 한판 + 구성품)</div>
                    </div>
                    <button className="btn sm ghost" onClick={() => openEdit(comp)}><Icon.edit style={{ width: 13, height: 13 }} /></button>
                    <button className="btn sm ghost" style={{ color: 'var(--danger)' }} onClick={() => handleDelete(comp)}><Icon.trash style={{ width: 13, height: 13 }} /></button>
                  </div>
                </div>
              </div>
              );
            })}
          </div>
        )}
      </div>

      {/* 세트 편집 모달 */}
      {modal && (
        <ModalFrame
          title={modal === 'add' ? '세트 추가' : `${asDisplayText(form.setName, '세트')} 편집`}
          onClose={() => setModal(null)}
          width="min(520px,95vw)"
          zIndex={300}
          padding="24px 28px"
        >
          <div style={{ display: 'flex', flexDirection: 'column', gap: 12 }}>
            <div>
              <label style={{ fontSize: 12, color: 'var(--text-3)', display: 'block', marginBottom: 4 }}>세트명 *</label>
              <input className="input" value={asDisplayText(form.setName)} onChange={e => setForm(f => ({ ...f, setName: e.target.value }))} placeholder="예: 피자세트A" />
            </div>

            {/* 피자 고정 슬롯 */}
            <div style={{ background: 'var(--surface-2)', borderRadius: 8, padding: '10px 12px', display: 'flex', alignItems: 'center', gap: 8 }}>
              <Icon.box style={{ width: 14, height: 14, color: 'var(--accent-text)', flexShrink: 0 }} />
              <div style={{ flex: 1 }}>
                <div style={{ fontSize: 12, fontWeight: 600 }}>피자</div>
                <div style={{ fontSize: 11, color: 'var(--text-4)' }}>최저/최고 피자 자동 산출 (고정)</div>
              </div>
              <span style={{ fontSize: 10, color: 'var(--text-4)', background: 'var(--surface)', padding: '2px 6px', borderRadius: 4 }}>자동</span>
            </div>

            {/* 추가 구성품 슬롯 */}
            <div>
              <label style={{ fontSize: 12, color: 'var(--text-3)', display: 'block', marginBottom: 6 }}>
                추가 구성품 <span style={{ color: 'var(--text-4)' }}>(메뉴명·코드로 검색해 추가)</span>
              </label>
              {(Array.isArray(form.slots) ? form.slots : []).map((slot, i) => (
                <SlotEditor
                  key={i}
                  slot={slot}
                  allMenus={nonPizzaMenus}
                  masterByCode={masterByCode}
                  onChange={patch => updateSlot(i, patch)}
                  onRemove={() => removeSlot(i)}
                />
              ))}
              <button className="btn sm ghost" onClick={addSlot} style={{ fontSize: 12, marginTop: 4 }}>
                <Icon.plus style={{ width: 12, height: 12 }} />구성품 추가
              </button>
            </div>

            {/* 미리보기 */}
            {(() => {
              const preview = calcSetMinMax(Array.isArray(form.slots) ? form.slots : [], safeMenus, safeRawMap, masterByCode, pizzaMenus);
              return preview.minKcal != null ? (
                <div style={{ background: 'var(--surface-2)', borderRadius: 8, padding: '10px 12px', display: 'flex', gap: 16, fontSize: 12 }}>
                  <span style={{ color: 'var(--text-3)' }}>미리보기</span>
                  <span>최소 <strong>{preview.minKcal} kcal</strong></span>
                  <span>최대 <strong>{preview.maxKcal} kcal</strong></span>
                </div>
              ) : null;
            })()}
          </div>
          <div style={{ display: 'flex', gap: 8, justifyContent: 'flex-end', marginTop: 20 }}>
            <button className="btn" onClick={() => setModal(null)}>취소</button>
            <button className="btn primary" onClick={handleSave} disabled={saving}>{saving ? '저장 중…' : '저장'}</button>
          </div>
        </ModalFrame>
      )}
    </div>
  );
}

/** 슬롯 편집 — 메뉴 검색 + 선택된 메뉴 칩 */
function SlotEditor({ slot = {}, allMenus, masterByCode, onChange = noop, onRemove = noop }) {
  const safeSlot = asRecord(slot);
  const safeAllMenus = useMemo(() => asObjectArray(allMenus), [allMenus]);
  const [q, setQ] = useState('');
  const [open, setOpen] = useState(false);
  const blurTimerRef = useRef(null);

  useEffect(() => () => {
    if (blurTimerRef.current) clearTimeout(blurTimerRef.current);
  }, []);

  function closeSoon() {
    if (blurTimerRef.current) clearTimeout(blurTimerRef.current);
    blurTimerRef.current = setTimeout(() => {
      setOpen(false);
      blurTimerRef.current = null;
    }, 150);
  }

  const selected = useMemo(() => asStringArray(safeSlot.menuCodes), [safeSlot.menuCodes]);

  const matches = useMemo(() => {
    const lq = asDisplayText(q).trim().toLowerCase();
    if (!lq) return [];
    return safeAllMenus
      .filter(m => {
        const menuCode = asDisplayText(m.menuCode);
        const menuName = asDisplayText(m.menuName);
        return !selected.includes(menuCode)
          && (menuName.toLowerCase().includes(lq) || menuCode.toLowerCase().includes(lq));
      })
      .slice(0, 8);
  }, [q, safeAllMenus, selected]);

  const selectedMenuObjs = safeAllMenus.filter(m => selected.includes(asDisplayText(m.menuCode)));

  function addMenu(menuCode) {
    const code = asDisplayText(menuCode);
    if (!code) return;
    onChange({ menuCodes: [...selected, code] });
    setQ('');
    setOpen(false);
  }
  function removeMenu(menuCode) {
    const code = asDisplayText(menuCode);
    onChange({ menuCodes: selected.filter(c => c !== code) });
  }

  return (
    <div style={{ border: '1px solid var(--border)', borderRadius: 8, padding: '10px 12px', marginBottom: 8 }}>
      <div style={{ display: 'flex', gap: 8, alignItems: 'center', marginBottom: 8 }}>
        <input
          className="input"
          style={{ flex: 1 }}
          value={asDisplayText(safeSlot.label)}
          onChange={e => onChange({ label: e.target.value })}
          placeholder="구성품 이름 (예: 사이드, 음료)"
        />
        <button className="btn sm ghost" style={{ color: 'var(--danger)', flexShrink: 0 }} onClick={onRemove}>
          <Icon.close style={{ width: 12, height: 12 }} />
        </button>
      </div>

      {/* 선택된 메뉴 칩 */}
      {selectedMenuObjs.length > 0 && (
        <div style={{ display: 'flex', flexWrap: 'wrap', gap: 4, marginBottom: 6 }}>
          {selectedMenuObjs.map((m, index) => {
            const menuCode = asDisplayText(m.menuCode);
            const menuName = asDisplayText(m.menuName, menuCode || `메뉴 ${index + 1}`);
            return (
            <span key={menuCode || index} style={{ display: 'inline-flex', alignItems: 'center', gap: 4, padding: '2px 8px', background: 'var(--accent)', color: '#fff', borderRadius: 999, fontSize: 11, fontWeight: 600 }}>
              {menuName}
              <button type="button" onClick={() => removeMenu(menuCode)} style={{ background: 'none', border: 'none', cursor: 'pointer', color: '#fff', padding: 0, display: 'flex', alignItems: 'center' }}>
                <Icon.close style={{ width: 10, height: 10 }} />
              </button>
            </span>
            );
          })}
        </div>
      )}

      {/* 메뉴 검색 */}
      <div style={{ position: 'relative' }}>
        <input
          className="input"
          style={{ fontSize: 12 }}
          value={q}
          onChange={e => { setQ(e.target.value); setOpen(true); }}
          onFocus={() => asDisplayText(q).trim() && setOpen(true)}
          onBlur={closeSoon}
          placeholder="메뉴명 또는 코드로 검색…"
        />
        {open && matches.length > 0 && (
          <div style={{ position: 'absolute', top: 'calc(100% + 4px)', left: 0, right: 0, zIndex: 100, background: 'var(--surface)', border: '1px solid var(--border)', borderRadius: 8, boxShadow: 'var(--shadow-md)', overflow: 'hidden' }}>
            {matches.map((m, index) => {
              const menuCode = asDisplayText(m.menuCode);
              const menuName = asDisplayText(m.menuName, menuCode || `메뉴 ${index + 1}`);
              return (
                <button
                  key={menuCode || index}
                  onMouseDown={() => addMenu(menuCode)}
                  style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', width: '100%', padding: '8px 12px', background: 'none', border: 'none', cursor: 'pointer', fontSize: 12, textAlign: 'left', borderBottom: '1px solid var(--surface-2)' }}
                >
                  <span style={{ color: 'var(--text-1)', fontWeight: 500 }}>{menuName}</span>
                  <span style={{ color: 'var(--text-4)', fontSize: 11 }}>{menuCode}</span>
                </button>
              );
            })}
          </div>
        )}
        {open && asDisplayText(q).trim() && matches.length === 0 && (
          <div style={{ position: 'absolute', top: 'calc(100% + 4px)', left: 0, right: 0, zIndex: 100, background: 'var(--surface)', border: '1px solid var(--border)', borderRadius: 8, padding: '10px 12px', fontSize: 12, color: 'var(--text-3)' }}>
            "{q}" 검색 결과 없음
          </div>
        )}
      </div>
    </div>
  );
}

function KcalCard({ label, value, sub, accent }) {
  return (
    <div style={{ background: 'var(--surface-2)', borderRadius: 8, padding: '12px 14px' }}>
      <div style={{ fontSize: 11, color: 'var(--text-3)', marginBottom: 4 }}>{label}</div>
      <div style={{ fontSize: 18, fontWeight: 700, color: accent ? 'var(--accent-text)' : 'var(--text-1)' }}>{value}</div>
      {sub && <div style={{ fontSize: 10, color: 'var(--text-4)', marginTop: 2 }}>{sub}</div>}
    </div>
  );
}
