'use client';
import { useEffect, useState, useMemo, useCallback } from 'react';
import { createPortal } from 'react-dom';
import { Icon } from '@/components/icons';
import { PageHeader } from '@/components/ui/PageHeader';
import { showToast } from '@/components/Toast';
import { initDB } from '@/lib/db';
import { getAllOrigins, upsertOrigin, deleteOrigin, ORIGIN_CATEGORIES } from '@/lib/nutrition/origin/store';

const EMPTY_FORM = { ingredientCode: '', ingredientName: '', originCountry: '', originRegion: '', category: '주재료', note: '', displayOrder: '' };

function OriginModal({ item, onSave, onClose }) {
  const [form, setForm] = useState(item ? { ...item } : { ...EMPTY_FORM });
  const [saving, setSaving] = useState(false);

  const set = (k, v) => setForm(f => ({ ...f, [k]: v }));

  const handleSave = async () => {
    if (!form.ingredientName.trim()) { showToast('식재료명을 입력해주세요', 'error'); return; }
    if (!form.originCountry.trim()) { showToast('원산지(국가)를 입력해주세요', 'error'); return; }
    setSaving(true);
    try {
      await upsertOrigin({ ...form, displayOrder: form.displayOrder !== '' ? Number(form.displayOrder) : undefined });
      showToast(item ? '수정 완료' : '등록 완료', 'ok');
      onSave();
    } catch { showToast('저장 실패', 'error'); }
    setSaving(false);
  };

  return createPortal(
    <div className="modal" onClick={e => e.target === e.currentTarget && onClose()}>
      <div className="modal-box" style={{ maxWidth: 480 }}>
        <div className="modal-head">
          <h3>{item ? '원산지 수정' : '원산지 등록'}</h3>
          <button className="btn ghost" style={{ padding: '4px 8px' }} onClick={onClose}><Icon.close style={{ width: 16, height: 16 }} /></button>
        </div>

        <div className="form-row two" style={{ marginTop: 20 }}>
          <div>
            <label style={{ fontSize: 12, color: 'var(--text-3)', display: 'block', marginBottom: 4 }}>식재료코드 (선택)</label>
            <input className="input" value={form.ingredientCode} onChange={e => set('ingredientCode', e.target.value)} placeholder="ING-001" />
          </div>
          <div>
            <label style={{ fontSize: 12, color: 'var(--text-3)', display: 'block', marginBottom: 4 }}>카테고리</label>
            <select className="input" value={form.category} onChange={e => set('category', e.target.value)}>
              {ORIGIN_CATEGORIES.map(c => <option key={c} value={c}>{c}</option>)}
            </select>
          </div>
        </div>

        <div className="form-row" style={{ marginTop: 12 }}>
          <label style={{ fontSize: 12, color: 'var(--text-3)', display: 'block', marginBottom: 4 }}>식재료명 *</label>
          <input className="input" value={form.ingredientName} onChange={e => set('ingredientName', e.target.value)} placeholder="예: 밀가루, 치즈, 토마토소스" />
        </div>

        <div className="form-row two" style={{ marginTop: 12 }}>
          <div>
            <label style={{ fontSize: 12, color: 'var(--text-3)', display: 'block', marginBottom: 4 }}>원산지 국가 *</label>
            <input className="input" value={form.originCountry} onChange={e => set('originCountry', e.target.value)} placeholder="예: 미국, 국내산, 뉴질랜드" />
          </div>
          <div>
            <label style={{ fontSize: 12, color: 'var(--text-3)', display: 'block', marginBottom: 4 }}>원산지 세부 (선택)</label>
            <input className="input" value={form.originRegion} onChange={e => set('originRegion', e.target.value)} placeholder="예: 캘리포니아" />
          </div>
        </div>

        <div className="form-row two" style={{ marginTop: 12 }}>
          <div>
            <label style={{ fontSize: 12, color: 'var(--text-3)', display: 'block', marginBottom: 4 }}>표시순서</label>
            <input className="input" type="number" value={form.displayOrder} onChange={e => set('displayOrder', e.target.value)} placeholder="숫자 (비울 시 자동)" />
          </div>
          <div>
            <label style={{ fontSize: 12, color: 'var(--text-3)', display: 'block', marginBottom: 4 }}>비고</label>
            <input className="input" value={form.note} onChange={e => set('note', e.target.value)} placeholder="참고사항" />
          </div>
        </div>

        <div className="modal actions" style={{ marginTop: 20 }}>
          <button className="btn" onClick={onClose}>취소</button>
          <button className="btn primary" onClick={handleSave} disabled={saving}>{saving ? '저장 중…' : '저장'}</button>
        </div>
      </div>
    </div>,
    document.body
  );
}

export default function Page() {
  const [rows, setRows] = useState([]);
  const [loading, setLoading] = useState(true);
  const [search, setSearch] = useState('');
  const [catFilter, setCatFilter] = useState('전체');
  const [modal, setModal] = useState(null); // null | 'add' | row
  const [deleting, setDeleting] = useState(null);

  const load = useCallback(async () => {
    await initDB();
    const data = await getAllOrigins();
    setRows(data);
    setLoading(false);
  }, []);

  useEffect(() => { load(); }, [load]);

  const cats = useMemo(() => ['전체', ...ORIGIN_CATEGORIES], []);

  const filtered = useMemo(() => {
    let r = rows;
    if (catFilter !== '전체') r = r.filter(x => x.category === catFilter);
    if (search.trim()) {
      const q = search.trim().toLowerCase();
      r = r.filter(x => (x.ingredientName || '').toLowerCase().includes(q) || (x.originCountry || '').toLowerCase().includes(q));
    }
    return r;
  }, [rows, catFilter, search]);

  const handleDelete = async (row) => {
    setDeleting(row.id);
    await deleteOrigin(row.id);
    showToast(`'${row.ingredientName}' 삭제됨`, 'ok');
    await load();
    setDeleting(null);
  };

  return (
    <main className="main">
      <PageHeader
        breadcrumb={['영양성분', '원산지 정보']}
        title="원산지 정보"
        sub="식재료별 원산지 마스터를 관리하세요"
        actions={
          <button className="btn primary" onClick={() => setModal('add')}>
            <Icon.plus style={{ width: 14, height: 14 }} />원산지 추가
          </button>
        }
      />

      {/* 필터 */}
      <div style={{ display: 'flex', gap: 8, marginTop: 20, flexWrap: 'wrap', alignItems: 'center' }}>
        <div style={{ position: 'relative', flex: 1, minWidth: 180, maxWidth: 300 }}>
          <Icon.search style={{ position: 'absolute', left: 10, top: '50%', transform: 'translateY(-50%)', width: 14, height: 14, color: 'var(--text-3)' }} />
          <input className="input" style={{ paddingLeft: 32 }} value={search} onChange={e => setSearch(e.target.value)} placeholder="식재료명, 원산지 검색" />
        </div>
        <div style={{ display: 'flex', gap: 6, flexWrap: 'wrap' }}>
          {cats.map(c => (
            <button key={c} className={'chip ' + (catFilter === c ? 'active' : '')} onClick={() => setCatFilter(c)}>{c}</button>
          ))}
        </div>
      </div>

      {/* 테이블 */}
      <div className="card table-card" style={{ marginTop: 16 }}>
        {loading ? (
          <div style={{ padding: 40, textAlign: 'center', color: 'var(--text-4)' }}>불러오는 중…</div>
        ) : filtered.length === 0 ? (
          <div className="empty-state">
            <div className="empty-icon-wrap"><Icon.tag style={{ width: 28, height: 28 }} /></div>
            <div className="empty-title">원산지 정보가 없어요</div>
            <div className="empty-sub">+ 원산지 추가 버튼으로 등록하세요</div>
          </div>
        ) : (
          <div className="table-wrap">
            <table className="data-table">
              <thead>
                <tr>
                  <th style={{ width: 80 }}>코드</th>
                  <th>식재료명</th>
                  <th style={{ width: 100 }}>카테고리</th>
                  <th>원산지 국가</th>
                  <th>원산지 세부</th>
                  <th>비고</th>
                  <th style={{ width: 80 }}></th>
                </tr>
              </thead>
              <tbody>
                {filtered.map(row => (
                  <tr key={row.id} onClick={() => setModal(row)} style={{ cursor: 'pointer' }}>
                    <td className="mono muted">{row.ingredientCode || '—'}</td>
                    <td style={{ fontWeight: 600 }}>{row.ingredientName}</td>
                    <td>
                      <span style={{ fontSize: 12, padding: '2px 8px', borderRadius: 20, background: 'var(--surface-2)', color: 'var(--text-2)' }}>
                        {row.category || '—'}
                      </span>
                    </td>
                    <td>{row.originCountry}</td>
                    <td className="muted">{row.originRegion || '—'}</td>
                    <td className="muted">{row.note || '—'}</td>
                    <td>
                      <button className="btn sm ghost" style={{ color: 'var(--danger)' }}
                        onClick={e => { e.stopPropagation(); handleDelete(row); }}
                        disabled={deleting === row.id}>
                        <Icon.trash style={{ width: 13, height: 13 }} />
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
        총 {filtered.length}개 {rows.length !== filtered.length && `(전체 ${rows.length}개)`}
      </div>

      {modal && (
        <OriginModal
          item={modal === 'add' ? null : modal}
          onSave={() => { setModal(null); load(); }}
          onClose={() => setModal(null)}
        />
      )}
    </main>
  );
}
