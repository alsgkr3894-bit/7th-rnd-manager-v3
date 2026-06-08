'use client';
import { useState, useMemo } from 'react';
import { Icon } from '@/components/icons';
import { ModalFrame } from '@/components/ui/ModalFrame';
import { showToast } from '@/components/Toast';
import { upsertSetComposition, deleteSetComposition } from '@/lib/nutrition/values/store';
import { resolveNutritionGroup } from '@/lib/nutrition/menu-group';
import { calcSetMinMax, calcHalfMinMax } from '@/lib/nutrition/values/set-calc';

export function TabSetCalc({ menus, rawMap, edgeMap, setComps, menuMasters, onRefresh }) {
  const [modal, setModal] = useState(null); // null | 'add' | comp object
  const [form, setForm] = useState({ setCode: '', setName: '', kind: 'set', slots: [] });
  const [saving, setSaving] = useState(false);

  const masterByCode = useMemo(
    () => Object.fromEntries((menuMasters || []).map(m => [m.menuCode, m])),
    [menuMasters]
  );

  const pizzaMenus = useMemo(
    () => menus.filter(m => resolveNutritionGroup(m, masterByCode) === '피자'),
    [menus, masterByCode]
  );

  const nonPizzaMenus = useMemo(
    () => menus.filter(m => resolveNutritionGroup(m, masterByCode) !== '피자'),
    [menus, masterByCode]
  );

  const halfResult = useMemo(
    () => calcHalfMinMax(pizzaMenus, rawMap, edgeMap),
    [pizzaMenus, rawMap, edgeMap]
  );

  const setsWithCalc = useMemo(() => {
    return (setComps || []).filter(c => c.kind === 'set').map(comp => ({
      ...comp,
      ...calcSetMinMax(comp.slots || [], menus, rawMap, masterByCode, pizzaMenus),
    }));
  }, [setComps, menus, rawMap, masterByCode, pizzaMenus]);

  const openAdd = () => {
    setForm({ setCode: '', setName: '', kind: 'set', slots: [] });
    setModal('add');
  };
  const openEdit = (comp) => { setForm({ ...comp }); setModal(comp); };

  const addSlot = () => setForm(f => ({ ...f, slots: [...(f.slots || []), { label: '', menuCodes: [] }] }));
  const removeSlot = (i) => setForm(f => ({ ...f, slots: f.slots.filter((_, idx) => idx !== i) }));
  const updateSlot = (i, patch) => setForm(f => ({ ...f, slots: f.slots.map((s, idx) => idx === i ? { ...s, ...patch } : s) }));

  const handleSave = async () => {
    if (!form.setName.trim()) { showToast('세트명 입력 필요', 'error'); return; }
    setSaving(true);
    try {
      const id = modal !== 'add' ? modal.id : undefined;
      const code = form.setCode.trim() || `SET-${Date.now()}`;
      await upsertSetComposition({ ...(id ? { id } : {}), ...form, setCode: code });
      showToast('저장 완료', 'ok');
      setModal(null);
      onRefresh();
    } catch { showToast('저장 실패', 'error'); }
    setSaving(false);
  };

  const handleDelete = async (comp) => {
    await deleteSetComposition(comp.id);
    showToast(`'${comp.setName}' 삭제`, 'ok');
    onRefresh();
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
              {pizzaMenus.map(m => {
                const raw100 = rawMap[`${m.menuCode}__석쇠L`] || rawMap[`${m.menuCode}__씬바사삭L`] || {};
                const k = parseFloat(raw100.kcal);
                const w = parseFloat(raw100.weight);
                const kcal = (!isNaN(k) && k > 0 && !isNaN(w) && w > 0) ? Math.round(k * w / 100) : null;
                return (
                  <div key={m.menuCode} style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', padding: '4px 8px', background: 'var(--surface-2)', borderRadius: 6, fontSize: 12 }}>
                    <span style={{ color: 'var(--text-2)', overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap' }}>{m.menuName}</span>
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
            {setsWithCalc.map(comp => (
              <div key={comp.id} className="card" style={{ padding: 16 }}>
                <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'flex-start' }}>
                  <div>
                    <div style={{ fontWeight: 700, fontSize: 14 }}>{comp.setName}</div>
                    <div style={{ fontSize: 11, color: 'var(--text-4)', marginTop: 2 }}>
                      피자(자동){(comp.slots || []).length > 0 ? ' + ' + comp.slots.map(s => s.label || '구성품').join(' + ') : ''}
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
            ))}
          </div>
        )}
      </div>

      {/* 세트 편집 모달 */}
      {modal && (
        <ModalFrame
          title={modal === 'add' ? '세트 추가' : `${form.setName} 편집`}
          onClose={() => setModal(null)}
          width="min(520px,95vw)"
          zIndex={300}
          padding="24px 28px"
        >
          <div style={{ display: 'flex', flexDirection: 'column', gap: 12 }}>
            <div>
              <label style={{ fontSize: 12, color: 'var(--text-3)', display: 'block', marginBottom: 4 }}>세트명 *</label>
              <input className="input" value={form.setName} onChange={e => setForm(f => ({ ...f, setName: e.target.value }))} placeholder="예: 피자세트A" />
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
              {(form.slots || []).map((slot, i) => (
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
              const preview = calcSetMinMax(form.slots || [], menus, rawMap, masterByCode, pizzaMenus);
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
function SlotEditor({ slot, allMenus, masterByCode, onChange, onRemove }) {
  const [q, setQ] = useState('');
  const [open, setOpen] = useState(false);

  const selected = slot.menuCodes || [];

  const matches = useMemo(() => {
    const lq = q.trim().toLowerCase();
    if (!lq) return [];
    return allMenus
      .filter(m => !selected.includes(m.menuCode) &&
        (m.menuName.toLowerCase().includes(lq) || m.menuCode.toLowerCase().includes(lq)))
      .slice(0, 8);
  }, [q, allMenus, selected]);

  const selectedMenuObjs = allMenus.filter(m => selected.includes(m.menuCode));

  function addMenu(menuCode) {
    onChange({ menuCodes: [...selected, menuCode] });
    setQ('');
    setOpen(false);
  }
  function removeMenu(menuCode) {
    onChange({ menuCodes: selected.filter(c => c !== menuCode) });
  }

  return (
    <div style={{ border: '1px solid var(--border)', borderRadius: 8, padding: '10px 12px', marginBottom: 8 }}>
      <div style={{ display: 'flex', gap: 8, alignItems: 'center', marginBottom: 8 }}>
        <input
          className="input"
          style={{ flex: 1 }}
          value={slot.label}
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
          {selectedMenuObjs.map(m => (
            <span key={m.menuCode} style={{ display: 'inline-flex', alignItems: 'center', gap: 4, padding: '2px 8px', background: 'var(--accent)', color: '#fff', borderRadius: 999, fontSize: 11, fontWeight: 600 }}>
              {m.menuName}
              <button onClick={() => removeMenu(m.menuCode)} style={{ background: 'none', border: 'none', cursor: 'pointer', color: '#fff', padding: 0, display: 'flex', alignItems: 'center' }}>
                <Icon.close style={{ width: 10, height: 10 }} />
              </button>
            </span>
          ))}
        </div>
      )}

      {/* 메뉴 검색 */}
      <div style={{ position: 'relative' }}>
        <input
          className="input"
          style={{ fontSize: 12 }}
          value={q}
          onChange={e => { setQ(e.target.value); setOpen(true); }}
          onFocus={() => q.trim() && setOpen(true)}
          onBlur={() => setTimeout(() => setOpen(false), 150)}
          placeholder="메뉴명 또는 코드로 검색…"
        />
        {open && matches.length > 0 && (
          <div style={{ position: 'absolute', top: 'calc(100% + 4px)', left: 0, right: 0, zIndex: 100, background: 'var(--surface)', border: '1px solid var(--border)', borderRadius: 8, boxShadow: 'var(--shadow-md)', overflow: 'hidden' }}>
            {matches.map(m => (
              <button
                key={m.menuCode}
                onMouseDown={() => addMenu(m.menuCode)}
                style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', width: '100%', padding: '8px 12px', background: 'none', border: 'none', cursor: 'pointer', fontSize: 12, textAlign: 'left', borderBottom: '1px solid var(--surface-2)' }}
              >
                <span style={{ color: 'var(--text-1)', fontWeight: 500 }}>{m.menuName}</span>
                <span style={{ color: 'var(--text-4)', fontSize: 11 }}>{m.menuCode}</span>
              </button>
            ))}
          </div>
        )}
        {open && q.trim() && matches.length === 0 && (
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
