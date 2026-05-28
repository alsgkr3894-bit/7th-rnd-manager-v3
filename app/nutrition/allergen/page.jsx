'use client';
import { useEffect, useState, useMemo, useCallback } from 'react';
import { createPortal } from 'react-dom';
import { Icon } from '@/components/icons';
import { PageHeader } from '@/components/ui/PageHeader';
import { showToast } from '@/components/Toast';
import { initDB } from '@/lib/db';
import { getAllIngredients } from '@/lib/ingredient';
import {
  getAllAllergenMasters, seedAllergenMasters,
  getAllAllergenLinks, saveIngredientAllergens, deleteAllergenLink,
  ALLERGEN_SEED,
} from '@/lib/nutrition/allergen/store';

/* ── 식재료 선택 + 알레르기 편집 모달 ── */
function AllergenModal({ link, ingredients, linkedIds, allergens, onSave, onClose }) {
  const isEdit = !!link;

  const [selId, setSelId]             = useState(link?.ingredientId ?? null);
  const [displayName, setDisplayName] = useState(link?.displayName ?? '');
  const [checked, setChecked]         = useState(new Set(link?.allergenCodes ?? []));
  const [search, setSearch]           = useState('');
  const [saving, setSaving]           = useState(false);

  const handleSelect = (ing) => {
    setSelId(ing.id);
    if (!displayName) setDisplayName(ing.ingredientName);
  };

  const selIng = ingredients.find(i => i.id === selId);

  const filteredIngs = useMemo(() => {
    if (isEdit) return [];
    const q = search.toLowerCase();
    return ingredients
      .filter(i => !linkedIds.has(i.id))
      .filter(i => !q || (i.ingredientName || '').toLowerCase().includes(q) || (i.productCode || '').toLowerCase().includes(q) || (i.category || '').toLowerCase().includes(q))
      .slice(0, 60);
  }, [ingredients, linkedIds, search, isEdit]);

  const toggle = (code) => setChecked(s => {
    const n = new Set(s);
    n.has(code) ? n.delete(code) : n.add(code);
    return n;
  });

  const handleSave = async () => {
    if (!selId) { showToast('식재료를 선택해주세요', 'error'); return; }
    setSaving(true);
    try {
      await saveIngredientAllergens({
        ...(link?.id ? { id: link.id } : {}),
        ingredientId: selId,
        productCode: selIng?.productCode || null,
        ingredientName: selIng?.ingredientName || link?.ingredientName || '',
        displayName: displayName.trim() || selIng?.ingredientName || '',
        allergenCodes: [...checked],
      });
      showToast(isEdit ? '수정 완료' : '등록 완료', 'ok');
      onSave();
    } catch { showToast('저장 실패', 'error'); }
    setSaving(false);
  };

  return createPortal(
    <div style={{ position: 'fixed', inset: 0, background: 'rgba(0,0,0,.45)', display: 'grid', placeItems: 'center', zIndex: 300 }}
      onClick={e => e.target === e.currentTarget && onClose()}>
      <div className="card" style={{ width: 'min(580px,95vw)', padding: '24px 28px', maxHeight: '90vh', overflowY: 'auto' }}>
        <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: 16 }}>
          <div style={{ fontWeight: 700, fontSize: 15 }}>{isEdit ? '알레르기 편집' : '식재료 알레르기 등록'}</div>
          <button className="btn ghost" style={{ padding: '4px 8px' }} onClick={onClose}><Icon.close style={{ width: 16, height: 16 }} /></button>
        </div>

        {/* 식재료 선택 — 추가 모드 */}
        {!isEdit && (
          <div style={{ marginBottom: 16 }}>
            <label style={{ fontSize: 12, color: 'var(--text-3)', display: 'block', marginBottom: 6 }}>식재료 선택 *</label>
            {selIng ? (
              <div style={{ display: 'flex', alignItems: 'center', gap: 10, padding: '8px 12px', background: 'var(--accent-soft)', borderRadius: 8, border: '1.5px solid var(--accent)' }}>
                <div style={{ flex: 1 }}>
                  <div style={{ fontWeight: 700, fontSize: 13, color: 'var(--accent-text)' }}>{selIng.ingredientName}</div>
                  <div style={{ fontSize: 11, color: 'var(--text-4)' }}>{selIng.productCode || '수동 등록'} · {selIng.category || '미분류'}</div>
                </div>
                <button className="btn sm ghost" onClick={() => { setSelId(null); setDisplayName(''); }}>변경</button>
              </div>
            ) : (
              <div>
                <div style={{ position: 'relative', marginBottom: 8 }}>
                  <Icon.search style={{ position: 'absolute', left: 10, top: '50%', transform: 'translateY(-50%)', width: 14, height: 14, color: 'var(--text-3)' }} />
                  <input className="input" style={{ paddingLeft: 32 }} value={search} onChange={e => setSearch(e.target.value)} placeholder="재료명·코드·분류로 검색" autoFocus />
                </div>
                <div style={{ maxHeight: 160, overflowY: 'auto', border: '1px solid var(--border)', borderRadius: 8 }}>
                  {filteredIngs.length === 0
                    ? <div style={{ padding: '14px', textAlign: 'center', color: 'var(--text-4)', fontSize: 13 }}>
                        {search ? '검색 결과 없음' : '미연결 식재료가 없습니다'}
                      </div>
                    : filteredIngs.map(ing => (
                      <div key={ing.id} onClick={() => handleSelect(ing)}
                        style={{ padding: '8px 12px', cursor: 'pointer', borderBottom: '1px solid var(--border)', display: 'flex', justifyContent: 'space-between' }}
                        onMouseEnter={e => e.currentTarget.style.background = 'var(--surface-2)'}
                        onMouseLeave={e => e.currentTarget.style.background = ''}>
                        <div>
                          <div style={{ fontSize: 13, fontWeight: 500 }}>{ing.ingredientName}</div>
                          <div style={{ fontSize: 11, color: 'var(--text-4)' }}>{ing.productCode || '수동 등록'} · {ing.category || '미분류'}</div>
                        </div>
                      </div>
                    ))
                  }
                </div>
              </div>
            )}
          </div>
        )}

        {/* 편집 모드 — 식재료 표시 */}
        {isEdit && (
          <div style={{ padding: '8px 12px', background: 'var(--surface-2)', borderRadius: 8, marginBottom: 16 }}>
            <div style={{ fontSize: 13, fontWeight: 600 }}>{link.ingredientName}</div>
            <div style={{ fontSize: 11, color: 'var(--text-4)', marginTop: 2 }}>{link.productCode || '수동 등록'}</div>
          </div>
        )}

        {/* 출력 표기명 */}
        <div style={{ marginBottom: 16 }}>
          <label style={{ fontSize: 12, color: 'var(--text-3)', display: 'block', marginBottom: 4 }}>
            출력용 표기명 <span style={{ color: 'var(--text-4)' }}>(비우면 재료명 그대로 출력)</span>
          </label>
          <input className="input" value={displayName} onChange={e => setDisplayName(e.target.value)}
            placeholder={selIng?.ingredientName || link?.ingredientName || '예: 밀'} />
        </div>

        {/* 알레르기 체크 */}
        <div>
          <div style={{ fontSize: 12, color: 'var(--text-3)', marginBottom: 10 }}>
            포함된 알레르기 항목 선택 <span style={{ color: 'var(--accent-text)', fontWeight: 600 }}>({checked.size}개 선택)</span>
          </div>
          <div style={{ display: 'flex', flexWrap: 'wrap', gap: 8 }}>
            {allergens.map(al => {
              const on = checked.has(al.allergenCode);
              return (
                <button key={al.allergenCode} onClick={() => toggle(al.allergenCode)}
                  style={{
                    padding: '5px 13px', borderRadius: 20, fontSize: 13, cursor: 'pointer', border: '1.5px solid',
                    borderColor: on ? 'var(--accent)' : 'var(--border)',
                    background: on ? 'var(--accent-soft)' : 'var(--surface)',
                    color: on ? 'var(--accent-text)' : 'var(--text-2)',
                    fontWeight: on ? 700 : 400, transition: 'all 100ms',
                  }}>
                  {al.allergenName}
                </button>
              );
            })}
          </div>
        </div>

        <div style={{ display: 'flex', gap: 8, justifyContent: 'flex-end', marginTop: 20 }}>
          <button className="btn" onClick={() => setChecked(new Set())}>전체 해제</button>
          <button className="btn ghost" onClick={onClose}>취소</button>
          <button className="btn primary" onClick={handleSave} disabled={saving || (!isEdit && !selId)}>
            {saving ? '저장 중…' : '저장'}
          </button>
        </div>
      </div>
    </div>,
    document.body
  );
}

/* ── 메인 페이지 ── */
export default function Page() {
  const [links, setLinks]         = useState([]);
  const [ingredients, setIngredients] = useState([]);
  const [allergens, setAllergens] = useState([]);
  const [loading, setLoading]     = useState(true);
  const [search, setSearch]       = useState('');
  const [modal, setModal]         = useState(null); // null | 'add' | link

  const load = useCallback(async () => {
    await initDB();
    await seedAllergenMasters();
    const [lks, ings, als] = await Promise.all([
      getAllAllergenLinks(),
      getAllIngredients(),
      getAllAllergenMasters(),
    ]);
    setLinks(lks);
    setIngredients(ings.filter(i => !i.discontinued && !i.excluded));
    setAllergens(als);
    setLoading(false);
  }, []);

  useEffect(() => { load(); }, [load]);

  const linkedIds = useMemo(() => new Set(links.map(l => l.ingredientId)), [links]);

  const filtered = useMemo(() => {
    if (!search.trim()) return links;
    const q = search.toLowerCase();
    return links.filter(l =>
      (l.ingredientName || '').toLowerCase().includes(q) ||
      (l.displayName || '').toLowerCase().includes(q) ||
      (l.productCode || '').toLowerCase().includes(q)
    );
  }, [links, search]);

  const handleDelete = async (link) => {
    await deleteAllergenLink(link.id);
    showToast(`'${link.ingredientName}' 알레르기 정보 삭제`, 'ok');
    load();
  };

  return (
    <main className="main">
      <PageHeader
        breadcrumb={['영양성분', '알레르기 정보']}
        title="알레르기 정보"
        sub="식재료 마스터에서 가져와 알레르기 항목을 체크하고, 출력용 표기명을 별도 설정하세요"
        actions={
          <button className="btn primary" onClick={() => setModal('add')}>
            <Icon.plus style={{ width: 14, height: 14 }} />식재료 연결
          </button>
        }
      />

      {/* 법정 22종 안내 칩 */}
      <div className="card" style={{ marginTop: 20, padding: '12px 20px' }}>
        <div style={{ fontSize: 12, fontWeight: 600, color: 'var(--text-3)', marginBottom: 8 }}>한국 법정 알레르기 22종</div>
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
        <div style={{ position: 'relative', maxWidth: 320 }}>
          <Icon.search style={{ position: 'absolute', left: 10, top: '50%', transform: 'translateY(-50%)', width: 14, height: 14, color: 'var(--text-3)' }} />
          <input className="input" style={{ paddingLeft: 32 }} value={search} onChange={e => setSearch(e.target.value)} placeholder="재료명·표기명·코드 검색" />
        </div>
        <div style={{ fontSize: 13, color: 'var(--text-3)', alignSelf: 'center', marginLeft: 4 }}>
          {links.length}개 연결 / {ingredients.length - linkedIds.size}개 미연결
        </div>
      </div>

      {/* 테이블 */}
      <div className="card table-card" style={{ marginTop: 12 }}>
        {loading ? (
          <div style={{ padding: 40, textAlign: 'center', color: 'var(--text-4)' }}>불러오는 중…</div>
        ) : filtered.length === 0 ? (
          <div className="empty-state">
            <div className="empty-icon-wrap"><Icon.beaker style={{ width: 28, height: 28 }} /></div>
            <div className="empty-title">{links.length === 0 ? '등록된 알레르기 정보가 없어요' : '검색 결과 없음'}</div>
            <div className="empty-sub">+ 식재료 연결 버튼으로 식재료 마스터에서 가져와 등록하세요</div>
          </div>
        ) : (
          <div className="table-wrap">
            <table className="data-table" style={{ minWidth: 900 }}>
              <thead>
                <tr>
                  <th style={{ width: 100 }}>제때 코드</th>
                  <th style={{ minWidth: 130 }}>재료명 (마스터)</th>
                  <th style={{ minWidth: 110 }}>출력 표기명</th>
                  {allergens.map(al => (
                    <th key={al.allergenCode} style={{ width: 46, fontSize: 11, textAlign: 'center', padding: '8px 2px', wordBreak: 'keep-all', lineHeight: 1.3 }}>
                      {al.allergenName}
                    </th>
                  ))}
                  <th style={{ width: 60 }}></th>
                </tr>
              </thead>
              <tbody>
                {filtered.map(link => {
                  const sameAsIng = !link.displayName || link.displayName === link.ingredientName;
                  return (
                    <tr key={link.id} onClick={() => setModal(link)} style={{ cursor: 'pointer' }}>
                      <td className="mono muted">{link.productCode || '—'}</td>
                      <td style={{ color: 'var(--text-3)', fontSize: 13 }}>{link.ingredientName}</td>
                      <td style={{ fontWeight: 600 }}>
                        {sameAsIng
                          ? <span style={{ color: 'var(--text-3)' }}>{link.ingredientName}</span>
                          : <span style={{ color: 'var(--accent-text)' }}>{link.displayName}</span>
                        }
                      </td>
                      {allergens.map(al => {
                        const has = (link.allergenCodes || []).includes(al.allergenCode);
                        return (
                          <td key={al.allergenCode} style={{ textAlign: 'center' }}>
                            {has
                              ? <span style={{ display: 'inline-block', width: 16, height: 16, borderRadius: '50%', background: 'var(--accent)' }} />
                              : <span style={{ color: 'var(--text-4)', fontSize: 11 }}>—</span>
                            }
                          </td>
                        );
                      })}
                      <td>
                        <button className="btn sm ghost" style={{ color: 'var(--danger)' }}
                          onClick={e => { e.stopPropagation(); handleDelete(link); }}>
                          <Icon.trash style={{ width: 13, height: 13 }} />
                        </button>
                      </td>
                    </tr>
                  );
                })}
              </tbody>
            </table>
          </div>
        )}
      </div>

      <div style={{ marginTop: 8, fontSize: 12, color: 'var(--text-4)' }}>
        {filtered.length}개 표시 {links.length !== filtered.length && `(전체 ${links.length}개)`}
      </div>

      {modal && (
        <AllergenModal
          link={modal === 'add' ? null : modal}
          ingredients={ingredients}
          linkedIds={linkedIds}
          allergens={allergens}
          onSave={() => { setModal(null); load(); }}
          onClose={() => setModal(null)}
        />
      )}
    </main>
  );
}
