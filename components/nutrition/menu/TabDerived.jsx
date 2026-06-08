'use client';
import { useState, useMemo } from 'react';
import { Icon } from '@/components/icons';
import { ModalFrame } from '@/components/ui/ModalFrame';
import { showToast } from '@/components/Toast';
import {
  upsertComposition, deleteComposition,
  upsertTopping, deleteTopping,
  NUTRITION_FIELDS,
} from '@/lib/nutrition/values/store';
import { NutritionGrid } from '@/components/nutrition/NutritionGrid';
import { resolveNutritionGroup, NUTRITION_GROUP_ORDER } from '@/lib/nutrition/menu-group';

const GROUP_HEADER_STYLE = {
  padding: '6px 16px 4px',
  fontSize: 10, fontWeight: 800,
  color: 'var(--text-4)', textTransform: 'uppercase',
  letterSpacing: '0.05em', marginTop: 8,
};

export function TabDerived({ menus, toppings, compositions, onRefresh, menuMasters }) {
  const [modal,        setModal]        = useState(null);
  const [toppingModal, setToppingModal] = useState(null);
  const [form,         setForm]         = useState({ menuCode: '', menuName: '', baseMenuCode: '', toppingCodes: [] });
  const [toppingForm,  setToppingForm]  = useState({ toppingCode: '', toppingName: '' });
  const [toppingValues,setToppingValues]= useState({});
  const [saving,       setSaving]       = useState(false);

  const masterByCode = useMemo(
    () => Object.fromEntries((menuMasters || []).map(m => [m.menuCode, m])),
    [menuMasters]
  );

  // 파생 메뉴를 베이스 메뉴 카테고리 기준으로 그룹화
  const groupedCompositions = useMemo(() => {
    const buckets = {};
    NUTRITION_GROUP_ORDER.forEach(g => { buckets[g] = []; });
    compositions.forEach(comp => {
      const baseMenu = menus.find(m => m.menuCode === comp.baseMenuCode) || { menuCode: comp.baseMenuCode, category: '' };
      const g = resolveNutritionGroup(baseMenu, masterByCode);
      buckets[g].push(comp);
    });
    return NUTRITION_GROUP_ORDER
      .filter(g => buckets[g].length > 0)
      .map(g => ({ group: g, items: buckets[g] }));
  }, [compositions, menus, masterByCode]);

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
  const openEdit = (comp) => { setForm({ ...comp }); setModal(comp); };

  const handleSaveComp = async () => {
    if (!form.menuName.trim()) { showToast('파생 메뉴명 입력 필요', 'error'); return; }
    if (!form.baseMenuCode)    { showToast('베이스 메뉴 선택 필요', 'error'); return; }
    setSaving(true);
    try {
      const id   = modal !== 'add' ? modal.id : undefined;
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
      const id   = toppingModal !== 'add' ? toppingModal.id : undefined;
      const code = toppingForm.toppingCode.trim() || `TOP-${Date.now()}`;
      await upsertTopping({ ...(id ? { id } : {}), ...toppingForm, toppingCode: code, ...toppingValues });
      showToast('저장 완료', 'ok');
      setToppingModal(null);
      onRefresh();
    } catch { showToast('저장 실패', 'error'); }
    setSaving(false);
  };

  const openToppingAdd = () => { setToppingForm({ toppingCode: '', toppingName: '' }); setToppingValues({}); setToppingModal('add'); };
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
          <div className="empty-state" style={{ padding: '20px 12px' }}>
            <div className="empty-icon-wrap"><Icon.box style={{ width: 24, height: 24 }}/></div>
            <div style={{ fontWeight: 700, fontSize: 13 }}>등록된 소스/토핑이 없어요</div>
            <div style={{ fontSize: 12, color: 'var(--text-3)' }}>추가 버튼으로 소스·토핑을 등록하세요</div>
          </div>
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
        <div className="empty-state">
          <div className="empty-icon-wrap"><Icon.plus style={{ width: 28, height: 28 }}/></div>
          <div className="empty-title">파생 메뉴가 없어요</div>
          <div className="empty-sub">베이스 메뉴 + 소스/토핑 조합으로 파생 메뉴를 만드세요<br/><span style={{ fontSize: 11 }}>예: 컨츄리치킨 + 마요네즈 = 컨츄리마요치킨</span></div>
        </div>
      ) : (
        <div style={{ display: 'flex', flexDirection: 'column', gap: 4 }}>
          {groupedCompositions.map(({ group, items }) => (
            <div key={group}>
              {groupedCompositions.length > 1 && (
                <div style={GROUP_HEADER_STYLE}>{group}</div>
              )}
              <div style={{ display: 'flex', flexDirection: 'column', gap: 8 }}>
                {items.map(comp => {
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
                        <button className="btn sm ghost" onClick={() => openEdit(comp)}><Icon.edit style={{ width: 13, height: 13 }} /></button>
                        <button className="btn sm ghost" style={{ color: 'var(--danger)' }} onClick={() => handleDeleteComp(comp)}><Icon.trash style={{ width: 13, height: 13 }} /></button>
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
        <ModalFrame title={modal === 'add' ? '파생 메뉴 추가' : '파생 메뉴 편집'} onClose={() => setModal(null)} width="min(480px,95vw)" zIndex={300} padding="24px 28px">
            <div style={{ display: 'flex', flexDirection: 'column', gap: 12 }}>
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
        </ModalFrame>
      )}

      {/* 소스/토핑 모달 */}
      {toppingModal && (
        <ModalFrame title={toppingModal === 'add' ? '소스·토핑 추가' : `${toppingModal.toppingName} 편집`} onClose={() => setToppingModal(null)} width="min(480px,95vw)" zIndex={300} padding="24px 28px">
            <div style={{ display: 'flex', flexDirection: 'column', gap: 12 }}>
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
        </ModalFrame>
      )}
    </div>
  );
}
