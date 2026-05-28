'use client';
import { useEffect, useState, useMemo, useCallback } from 'react';
import { createPortal } from 'react-dom';
import { Icon } from '@/components/icons';
import { PageHeader } from '@/components/ui/PageHeader';
import { showToast } from '@/components/Toast';
import { initDB } from '@/lib/db';
import {
  getAllAllergenMasters, seedAllergenMasters,
  getMenuAllergenMatrix, saveMenuAllergens,
  ALLERGEN_SEED,
} from '@/lib/nutrition/allergen/store';

/* 메뉴 추가/알레르기 편집 모달 */
function MenuAllergenModal({ menuCode, menuName: initName, checkedCodes, allergens, onSave, onClose }) {
  const [name, setName] = useState(initName || '');
  const [checked, setChecked] = useState(new Set(checkedCodes || []));
  const [saving, setSaving] = useState(false);

  const toggle = (code) => setChecked(s => {
    const n = new Set(s);
    n.has(code) ? n.delete(code) : n.add(code);
    return n;
  });

  const handleSave = async () => {
    const mn = (menuCode ? initName : name).trim();
    const mc = menuCode || `MENU-${Date.now()}`;
    if (!mn) { showToast('메뉴명을 입력해주세요', 'error'); return; }
    setSaving(true);
    try {
      await saveMenuAllergens(mc, mn, [...checked]);
      showToast('저장 완료', 'ok');
      onSave();
    } catch { showToast('저장 실패', 'error'); }
    setSaving(false);
  };

  return createPortal(
    <div className="modal" onClick={e => e.target === e.currentTarget && onClose()}>
      <div className="modal-box" style={{ maxWidth: 560 }}>
        <div className="modal-head">
          <h3>{menuCode ? `알레르기 편집 — ${initName}` : '메뉴 추가'}</h3>
          <button className="btn ghost" style={{ padding: '4px 8px' }} onClick={onClose}><Icon.close style={{ width: 16, height: 16 }} /></button>
        </div>

        {!menuCode && (
          <div className="form-row" style={{ marginTop: 20 }}>
            <label style={{ fontSize: 12, color: 'var(--text-3)', display: 'block', marginBottom: 4 }}>메뉴명 *</label>
            <input className="input" value={name} onChange={e => setName(e.target.value)} placeholder="예: 컨츄리치킨" />
          </div>
        )}

        <div style={{ marginTop: menuCode ? 20 : 14 }}>
          <div style={{ fontSize: 12, color: 'var(--text-3)', marginBottom: 10 }}>
            해당하는 알레르기 항목을 모두 선택하세요 ({checked.size}개 선택됨)
          </div>
          <div style={{ display: 'flex', flexWrap: 'wrap', gap: 8 }}>
            {allergens.map(al => {
              const on = checked.has(al.allergenCode);
              return (
                <button key={al.allergenCode}
                  onClick={() => toggle(al.allergenCode)}
                  style={{
                    padding: '6px 14px', borderRadius: 20, fontSize: 13, cursor: 'pointer', border: '1.5px solid',
                    borderColor: on ? 'var(--accent)' : 'var(--border)',
                    background: on ? 'var(--accent-soft)' : 'var(--surface)',
                    color: on ? 'var(--accent-text)' : 'var(--text-2)',
                    fontWeight: on ? 700 : 400,
                    transition: 'all 120ms',
                  }}>
                  {al.allergenName}
                </button>
              );
            })}
          </div>
        </div>

        <div className="modal actions" style={{ marginTop: 20 }}>
          <button className="btn" onClick={() => setChecked(new Set())}>전체 해제</button>
          <button className="btn ghost" onClick={onClose}>취소</button>
          <button className="btn primary" onClick={handleSave} disabled={saving}>{saving ? '저장 중…' : '저장'}</button>
        </div>
      </div>
    </div>,
    document.body
  );
}

export default function Page() {
  const [allergens, setAllergens] = useState([]);
  const [matrix, setMatrix] = useState({});   // { menuCode: { menuCode, menuName, codes[] } }
  const [loading, setLoading] = useState(true);
  const [search, setSearch] = useState('');
  const [modal, setModal] = useState(null);   // null | 'add' | { menuCode, menuName, codes }

  const load = useCallback(async () => {
    await initDB();
    await seedAllergenMasters();
    const [als, mat] = await Promise.all([getAllAllergenMasters(), getMenuAllergenMatrix()]);
    setAllergens(als);
    setMatrix(mat);
    setLoading(false);
  }, []);

  useEffect(() => { load(); }, [load]);

  const menuList = useMemo(() => {
    let list = Object.values(matrix);
    if (search.trim()) {
      const q = search.toLowerCase();
      list = list.filter(m => m.menuName.toLowerCase().includes(q));
    }
    return list;
  }, [matrix, search]);

  return (
    <main className="main">
      <PageHeader
        breadcrumb={['영양성분', '알레르기 정보']}
        title="알레르기 정보"
        sub="메뉴별 알레르기 항목을 관리하세요 (한국 법정 22종)"
        actions={
          <button className="btn primary" onClick={() => setModal('add')}>
            <Icon.plus style={{ width: 14, height: 14 }} />메뉴 추가
          </button>
        }
      />

      {/* 알레르기 항목 칩 안내 */}
      <div className="card" style={{ marginTop: 20, padding: '14px 20px' }}>
        <div style={{ fontSize: 12, fontWeight: 600, color: 'var(--text-3)', marginBottom: 10 }}>법정 알레르기 22종</div>
        <div style={{ display: 'flex', flexWrap: 'wrap', gap: 6 }}>
          {allergens.map(al => (
            <span key={al.allergenCode} style={{ fontSize: 12, padding: '3px 10px', borderRadius: 20, background: 'var(--surface-2)', color: 'var(--text-2)' }}>
              {al.allergenName}
            </span>
          ))}
        </div>
      </div>

      {/* 검색 */}
      <div style={{ display: 'flex', gap: 8, marginTop: 16 }}>
        <div style={{ position: 'relative', maxWidth: 300 }}>
          <Icon.search style={{ position: 'absolute', left: 10, top: '50%', transform: 'translateY(-50%)', width: 14, height: 14, color: 'var(--text-3)' }} />
          <input className="input" style={{ paddingLeft: 32 }} value={search} onChange={e => setSearch(e.target.value)} placeholder="메뉴명 검색" />
        </div>
      </div>

      {/* 매트릭스 테이블 */}
      <div className="card table-card" style={{ marginTop: 12 }}>
        {loading ? (
          <div style={{ padding: 40, textAlign: 'center', color: 'var(--text-4)' }}>불러오는 중…</div>
        ) : menuList.length === 0 ? (
          <div className="empty-state">
            <div className="empty-icon-wrap"><Icon.beaker style={{ width: 28, height: 28 }} /></div>
            <div className="empty-title">등록된 메뉴가 없어요</div>
            <div className="empty-sub">+ 메뉴 추가로 알레르기 정보를 입력하세요</div>
          </div>
        ) : (
          <div className="table-wrap">
            <table className="data-table" style={{ minWidth: 900 }}>
              <thead>
                <tr>
                  <th style={{ minWidth: 140, position: 'sticky', left: 0, background: 'var(--surface)', zIndex: 1 }}>메뉴명</th>
                  {allergens.map(al => (
                    <th key={al.allergenCode} style={{ width: 52, fontSize: 11, textAlign: 'center', padding: '8px 4px', wordBreak: 'keep-all' }}>
                      {al.allergenName}
                    </th>
                  ))}
                  <th style={{ width: 64 }}></th>
                </tr>
              </thead>
              <tbody>
                {menuList.map(m => (
                  <tr key={m.menuCode}>
                    <td style={{ fontWeight: 600, position: 'sticky', left: 0, background: 'var(--surface)', zIndex: 1 }}>{m.menuName}</td>
                    {allergens.map(al => {
                      const has = m.codes.includes(al.allergenCode);
                      return (
                        <td key={al.allergenCode} style={{ textAlign: 'center' }}>
                          {has ? (
                            <span style={{ display: 'inline-block', width: 18, height: 18, borderRadius: '50%', background: 'var(--accent)', verticalAlign: 'middle' }} />
                          ) : (
                            <span style={{ color: 'var(--text-4)', fontSize: 12 }}>—</span>
                          )}
                        </td>
                      );
                    })}
                    <td>
                      <button className="btn sm ghost" onClick={() => setModal({ menuCode: m.menuCode, menuName: m.menuName, codes: m.codes })}>
                        <Icon.pencil style={{ width: 13, height: 13 }} />
                      </button>
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        )}
      </div>

      <div style={{ marginTop: 8, fontSize: 12, color: 'var(--text-4)' }}>
        총 {menuList.length}개 메뉴
      </div>

      {modal && (
        <MenuAllergenModal
          menuCode={modal === 'add' ? null : modal.menuCode}
          menuName={modal === 'add' ? '' : modal.menuName}
          checkedCodes={modal === 'add' ? [] : modal.codes}
          allergens={allergens}
          onSave={() => { setModal(null); load(); }}
          onClose={() => setModal(null)}
        />
      )}
    </main>
  );
}
