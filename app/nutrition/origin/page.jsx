'use client';
import { useEffect, useState, useMemo, useCallback } from 'react';
import { createPortal } from 'react-dom';
import { Icon } from '@/components/icons';
import { PageHeader } from '@/components/ui/PageHeader';
import { showToast } from '@/components/Toast';
import { initDB } from '@/lib/db';
import { getAllIngredients } from '@/lib/ingredient';
import { getAllOrigins, upsertOrigin, deleteOrigin } from '@/lib/nutrition/origin/store';

/* ── 식재료 선택 + 원산지 입력 모달 ── */
function OriginModal({ origin, ingredients, linkedIds, onSave, onClose }) {
  const isEdit = !!origin;

  // 편집 모드: 기존 데이터 / 추가 모드: 빈 폼
  const [selId, setSelId]           = useState(origin?.ingredientId ?? null);
  const [displayName, setDisplayName] = useState(origin?.displayName ?? '');
  const [originCountry, setOriginCountry] = useState(origin?.originCountry ?? '');
  const [originRegion, setOriginRegion]   = useState(origin?.originRegion ?? '');
  const [note, setNote]             = useState(origin?.note ?? '');
  const [search, setSearch]         = useState('');
  const [saving, setSaving]         = useState(false);

  // 선택 시 displayName 자동 채우기
  const handleSelect = (ing) => {
    setSelId(ing.id);
    if (!displayName) setDisplayName(ing.ingredientName);
  };

  const selIng = ingredients.find(i => i.id === selId);

  const filtered = useMemo(() => {
    if (isEdit) return [];
    const q = search.toLowerCase();
    return ingredients
      .filter(i => !linkedIds.has(i.id))
      .filter(i => !q || (i.ingredientName || '').toLowerCase().includes(q) || (i.productCode || '').toLowerCase().includes(q) || (i.category || '').toLowerCase().includes(q))
      .slice(0, 60);
  }, [ingredients, linkedIds, search, isEdit]);

  const handleSave = async () => {
    if (!selId) { showToast('식재료를 선택해주세요', 'error'); return; }
    if (!originCountry.trim()) { showToast('원산지 국가를 입력해주세요', 'error'); return; }
    setSaving(true);
    try {
      await upsertOrigin({
        ...(origin?.id ? { id: origin.id } : {}),
        ingredientId: selId,
        productCode: selIng?.productCode || null,
        ingredientName: selIng?.ingredientName || '',
        displayName: displayName.trim() || selIng?.ingredientName || '',
        originCountry: originCountry.trim(),
        originRegion: originRegion.trim(),
        note: note.trim(),
      });
      showToast(isEdit ? '수정 완료' : '등록 완료', 'ok');
      onSave();
    } catch { showToast('저장 실패', 'error'); }
    setSaving(false);
  };

  return createPortal(
    <div style={{ position: 'fixed', inset: 0, background: 'rgba(0,0,0,.45)', display: 'grid', placeItems: 'center', zIndex: 300 }}
      onClick={e => e.target === e.currentTarget && onClose()}>
      <div className="card" style={{ width: 'min(540px,95vw)', padding: '24px 28px', maxHeight: '90vh', overflowY: 'auto' }}>
        <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: 16 }}>
          <div style={{ fontWeight: 700, fontSize: 15 }}>{isEdit ? '원산지 수정' : '식재료 원산지 등록'}</div>
          <button className="btn ghost" style={{ padding: '4px 8px' }} onClick={onClose}><Icon.close style={{ width: 16, height: 16 }} /></button>
        </div>

        {/* 식재료 선택 — 추가 모드만 */}
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
                <div style={{ maxHeight: 180, overflowY: 'auto', border: '1px solid var(--border)', borderRadius: 8 }}>
                  {filtered.length === 0
                    ? <div style={{ padding: '16px', textAlign: 'center', color: 'var(--text-4)', fontSize: 13 }}>
                        {search ? '검색 결과 없음' : '미연결 식재료가 없습니다'}
                      </div>
                    : filtered.map(ing => (
                      <div key={ing.id} onClick={() => handleSelect(ing)}
                        style={{ padding: '8px 12px', cursor: 'pointer', borderBottom: '1px solid var(--border)', display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}
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

        {/* 편집 모드 — 식재료 정보 표시 */}
        {isEdit && (
          <div style={{ padding: '8px 12px', background: 'var(--surface-2)', borderRadius: 8, marginBottom: 16 }}>
            <div style={{ fontSize: 13, fontWeight: 600 }}>{origin.ingredientName}</div>
            <div style={{ fontSize: 11, color: 'var(--text-4)', marginTop: 2 }}>{origin.productCode || '수동 등록'}</div>
          </div>
        )}

        {/* 출력용 표기명 */}
        <div style={{ marginBottom: 12 }}>
          <label style={{ fontSize: 12, color: 'var(--text-3)', display: 'block', marginBottom: 4 }}>
            출력용 표기명 <span style={{ color: 'var(--text-4)' }}>(비우면 재료명 그대로 출력)</span>
          </label>
          <input className="input" value={displayName} onChange={e => setDisplayName(e.target.value)}
            placeholder={selIng?.ingredientName || '예: 밀'} />
        </div>

        <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: 12, marginBottom: 12 }}>
          <div>
            <label style={{ fontSize: 12, color: 'var(--text-3)', display: 'block', marginBottom: 4 }}>원산지 국가 *</label>
            <input className="input" value={originCountry} onChange={e => setOriginCountry(e.target.value)} placeholder="예: 미국, 국내산" />
          </div>
          <div>
            <label style={{ fontSize: 12, color: 'var(--text-3)', display: 'block', marginBottom: 4 }}>원산지 세부 (선택)</label>
            <input className="input" value={originRegion} onChange={e => setOriginRegion(e.target.value)} placeholder="예: 캘리포니아" />
          </div>
        </div>

        <div style={{ marginBottom: 12 }}>
          <label style={{ fontSize: 12, color: 'var(--text-3)', display: 'block', marginBottom: 4 }}>비고</label>
          <input className="input" value={note} onChange={e => setNote(e.target.value)} placeholder="참고사항" />
        </div>

        <div style={{ display: 'flex', gap: 8, justifyContent: 'flex-end', marginTop: 20 }}>
          <button className="btn" onClick={onClose}>취소</button>
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
  const [rows, setRows]           = useState([]);
  const [ingredients, setIngredients] = useState([]);
  const [loading, setLoading]     = useState(true);
  const [search, setSearch]       = useState('');
  const [modal, setModal]         = useState(null); // null | 'add' | row

  const load = useCallback(async () => {
    await initDB();
    const [origins, ings] = await Promise.all([getAllOrigins(), getAllIngredients()]);
    setRows(origins);
    setIngredients(ings.filter(i => !i.discontinued && !i.excluded));
    setLoading(false);
  }, []);

  useEffect(() => { load(); }, [load]);

  const linkedIds = useMemo(() => new Set(rows.map(r => r.ingredientId)), [rows]);

  const filtered = useMemo(() => {
    if (!search.trim()) return rows;
    const q = search.toLowerCase();
    return rows.filter(r =>
      (r.ingredientName || '').toLowerCase().includes(q) ||
      (r.displayName || '').toLowerCase().includes(q) ||
      (r.originCountry || '').toLowerCase().includes(q) ||
      (r.productCode || '').toLowerCase().includes(q)
    );
  }, [rows, search]);

  const handleDelete = async (row) => {
    await deleteOrigin(row.id);
    showToast(`'${row.ingredientName}' 원산지 삭제`, 'ok');
    load();
  };

  return (
    <main className="main">
      <PageHeader
        breadcrumb={['영양성분', '원산지 정보']}
        title="원산지 정보"
        sub="식재료 마스터에서 가져와 원산지를 등록하고, 출력용 표기명을 별도 설정하세요"
        actions={
          <button className="btn primary" onClick={() => setModal('add')}>
            <Icon.plus style={{ width: 14, height: 14 }} />식재료 연결
          </button>
        }
      />

      {/* 통계 */}
      <div style={{ display: 'flex', gap: 12, marginTop: 20 }}>
        <div className="card" style={{ padding: '12px 20px', flex: 1 }}>
          <div style={{ fontSize: 12, color: 'var(--text-3)' }}>연결된 식재료</div>
          <div style={{ fontSize: 22, fontWeight: 700, marginTop: 2 }}>{rows.length}<span style={{ fontSize: 13, color: 'var(--text-3)', marginLeft: 4 }}>개</span></div>
        </div>
        <div className="card" style={{ padding: '12px 20px', flex: 1 }}>
          <div style={{ fontSize: 12, color: 'var(--text-3)' }}>전체 식재료 (마스터)</div>
          <div style={{ fontSize: 22, fontWeight: 700, marginTop: 2 }}>{ingredients.length}<span style={{ fontSize: 13, color: 'var(--text-3)', marginLeft: 4 }}>개</span></div>
        </div>
        <div className="card" style={{ padding: '12px 20px', flex: 1 }}>
          <div style={{ fontSize: 12, color: 'var(--text-3)' }}>미연결</div>
          <div style={{ fontSize: 22, fontWeight: 700, marginTop: 2, color: ingredients.length - rows.length > 0 ? 'var(--warning)' : 'inherit' }}>
            {ingredients.length - rows.length}<span style={{ fontSize: 13, color: 'var(--text-3)', marginLeft: 4 }}>개</span>
          </div>
        </div>
      </div>

      {/* 검색 */}
      <div style={{ marginTop: 16 }}>
        <div style={{ position: 'relative', maxWidth: 320 }}>
          <Icon.search style={{ position: 'absolute', left: 10, top: '50%', transform: 'translateY(-50%)', width: 14, height: 14, color: 'var(--text-3)' }} />
          <input className="input" style={{ paddingLeft: 32 }} value={search} onChange={e => setSearch(e.target.value)} placeholder="재료명·표기명·원산지·코드 검색" />
        </div>
      </div>

      {/* 테이블 */}
      <div className="card table-card" style={{ marginTop: 12 }}>
        {loading ? (
          <div style={{ padding: 40, textAlign: 'center', color: 'var(--text-4)' }}>불러오는 중…</div>
        ) : filtered.length === 0 ? (
          <div className="empty-state">
            <div className="empty-icon-wrap"><Icon.tag style={{ width: 28, height: 28 }} /></div>
            <div className="empty-title">{rows.length === 0 ? '원산지 정보가 없어요' : '검색 결과 없음'}</div>
            <div className="empty-sub">+ 식재료 연결 버튼으로 식재료 마스터에서 가져와 등록하세요</div>
          </div>
        ) : (
          <div className="table-wrap">
            <table className="data-table">
              <thead>
                <tr>
                  <th style={{ width: 100 }}>제때 코드</th>
                  <th>재료명 (마스터)</th>
                  <th>출력 표기명</th>
                  <th>원산지 국가</th>
                  <th>원산지 세부</th>
                  <th>비고</th>
                  <th style={{ width: 72 }}></th>
                </tr>
              </thead>
              <tbody>
                {filtered.map(row => {
                  const sameAsIngredient = !row.displayName || row.displayName === row.ingredientName;
                  return (
                    <tr key={row.id} onClick={() => setModal(row)} style={{ cursor: 'pointer' }}>
                      <td className="mono muted">{row.productCode || '—'}</td>
                      <td style={{ color: 'var(--text-3)', fontSize: 13 }}>{row.ingredientName}</td>
                      <td style={{ fontWeight: 600 }}>
                        {sameAsIngredient
                          ? <span style={{ color: 'var(--text-3)' }}>{row.ingredientName}</span>
                          : <span style={{ color: 'var(--accent-text)' }}>{row.displayName}</span>
                        }
                      </td>
                      <td style={{ fontWeight: 600 }}>{row.originCountry}</td>
                      <td className="muted">{row.originRegion || '—'}</td>
                      <td className="muted">{row.note || '—'}</td>
                      <td>
                        <button className="btn sm ghost" style={{ color: 'var(--danger)' }}
                          onClick={e => { e.stopPropagation(); handleDelete(row); }}>
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
        {filtered.length}개 표시 {rows.length !== filtered.length && `(전체 ${rows.length}개)`}
      </div>

      {modal && (
        <OriginModal
          origin={modal === 'add' ? null : modal}
          ingredients={ingredients}
          linkedIds={linkedIds}
          onSave={() => { setModal(null); load(); }}
          onClose={() => setModal(null)}
        />
      )}
    </main>
  );
}
