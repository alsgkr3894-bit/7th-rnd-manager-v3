'use client';
import { useEffect, useState, useCallback, useMemo } from 'react';
import { Icon } from '@/components/icons';
import { PageHeader } from '@/components/ui/PageHeader';
import { showToast } from '@/components/Toast';
import { ConfirmDialog } from '@/components/ui/ConfirmDialog';
import { ModalFrame } from '@/components/ui/ModalFrame';
import { initDB } from '@/lib/db';
import {
  getAllSuppliers,
  addSupplier,
  updateSupplier,
  deleteSupplier,
} from '@/lib/cost/suppliers/store';

// ── 빈 폼 초기값 ──────────────────────────────────────────────
function emptyForm() {
  return { name: '', contact: '', phone: '', memo: '' };
}

// ── 공급업체 추가/수정 모달 ────────────────────────────────────
function SupplierModal({ initial, onSave, onClose }) {
  const isEdit = !!initial;
  const [form, setForm] = useState(
    initial
      ? { name: initial.name || '', contact: initial.contact || '', phone: initial.phone || '', memo: initial.memo || '' }
      : emptyForm()
  );
  const [saving, setSaving] = useState(false);

  function set(field) {
    return e => setForm(prev => ({ ...prev, [field]: e.target.value }));
  }

  async function handleSubmit(e) {
    e.preventDefault();
    if (!form.name.trim()) { showToast('업체명을 입력해주세요'); return; }
    setSaving(true);
    try {
      await onSave(form);
    } finally {
      setSaving(false);
    }
  }

  return (
    <ModalFrame
      title={isEdit ? '공급업체 수정' : '공급업체 등록'}
      onClose={onClose}
      width="min(420px,95vw)"
      zIndex={300}
      padding="24px 28px"
    >
      <form onSubmit={handleSubmit} style={{ display: 'flex', flexDirection: 'column', gap: 14 }}>

        <div>
          <div style={{ fontSize: 13, fontWeight: 600, color: 'var(--text-2)', marginBottom: 6 }}>
            업체명 <span style={{ color: 'var(--negative)', fontSize: 11 }}>*필수</span>
          </div>
          <input
            className="form-input"
            value={form.name}
            onChange={set('name')}
            placeholder="예) 대림수산, 이마트 트레이더스"
            autoFocus
          />
        </div>

        <div>
          <div style={{ fontSize: 13, fontWeight: 600, color: 'var(--text-2)', marginBottom: 6 }}>담당자</div>
          <input
            className="form-input"
            value={form.contact}
            onChange={set('contact')}
            placeholder="예) 홍길동 과장"
          />
        </div>

        <div>
          <div style={{ fontSize: 13, fontWeight: 600, color: 'var(--text-2)', marginBottom: 6 }}>연락처</div>
          <input
            className="form-input"
            value={form.phone}
            onChange={set('phone')}
            placeholder="예) 010-1234-5678"
          />
        </div>

        <div>
          <div style={{ fontSize: 13, fontWeight: 600, color: 'var(--text-2)', marginBottom: 6 }}>메모</div>
          <textarea
            className="form-input"
            value={form.memo}
            onChange={set('memo')}
            placeholder="추가 메모"
            rows={3}
            style={{ resize: 'vertical' }}
          />
        </div>

        <div style={{ display: 'flex', gap: 8, justifyContent: 'flex-end', marginTop: 4 }}>
          <button type="button" className="btn" onClick={onClose}>취소</button>
          <button type="submit" className="btn primary" disabled={saving}>
            {saving ? '저장 중…' : isEdit ? '수정' : '등록'}
          </button>
        </div>
      </form>
    </ModalFrame>
  );
}

// ── 메인 페이지 ───────────────────────────────────────────────
export default function Page() {
  const [suppliers,      setSuppliers]      = useState([]);
  const [loading,        setLoading]        = useState(true);
  const [dbError,        setDbError]        = useState(null);
  const [search,         setSearch]         = useState('');
  const [modalTarget,    setModalTarget]    = useState(null); // null | 'new' | supplierRecord
  const [pendingDeleteId, setPendingDeleteId] = useState(null);

  const load = useCallback(async () => {
    await initDB();
    const rows = await getAllSuppliers();
    setSuppliers(rows);
  }, []);

  useEffect(() => {
    load()
      .catch(err => { console.error(err); setDbError(err.message || '데이터 로드 실패'); })
      .finally(() => setLoading(false));
  }, [load]);

  async function handleSave(form) {
    try {
      if (modalTarget === 'new') {
        await addSupplier(form);
        showToast('공급업체 등록 완료', 'ok');
      } else {
        await updateSupplier(modalTarget.id, form);
        showToast('공급업체 수정 완료', 'ok');
      }
      setModalTarget(null);
      await load();
    } catch (e) {
      showToast('저장 실패: ' + e.message, 'err');
      throw e;
    }
  }

  async function handleDelete(id) {
    try {
      await deleteSupplier(id);
      showToast('삭제 완료', 'ok');
      await load();
    } catch (e) {
      showToast('삭제 실패: ' + e.message, 'err');
    }
  }

  const filtered = useMemo(() => {
    const q = search.trim().toLowerCase();
    if (!q) return suppliers;
    return suppliers.filter(s =>
      (s.name    || '').toLowerCase().includes(q) ||
      (s.contact || '').toLowerCase().includes(q) ||
      (s.phone   || '').toLowerCase().includes(q)
    );
  }, [suppliers, search]);

  if (dbError) return (
    <main className="main">
      <PageHeader breadcrumb={['원가계산', '공급업체']} title="식자재 공급업체" sub="로드 실패" />
      <div className="card" style={{ padding: 32, textAlign: 'center', color: 'var(--negative)' }}>
        데이터베이스 오류: {dbError}
      </div>
    </main>
  );

  return (
    <main className="main">
      <PageHeader
        breadcrumb={['원가계산', '공급업체']}
        title="식자재 공급업체"
        sub="식자재를 공급하는 업체를 등록하고 관리합니다. 재료 단가표에서 공급업체를 선택하면 자동으로 연결됩니다."
      />

      {/* ── 툴바 ── */}
      <div style={{ display: 'flex', gap: 10, marginBottom: 16, alignItems: 'center', flexWrap: 'wrap' }}>
        <div className="filter-search" style={{ flex: '1 1 200px', maxWidth: 320 }}>
          <Icon.search style={{ width: 13, height: 13, color: 'var(--text-3)', flexShrink: 0 }} />
          <input
            value={search}
            onChange={e => setSearch(e.target.value)}
            placeholder="업체명·담당자·연락처 검색"
          />
        </div>
        <button className="btn primary" style={{ marginLeft: 'auto' }} onClick={() => setModalTarget('new')}>
          <Icon.plus style={{ width: 13, height: 13 }} /> 공급업체 추가
        </button>
      </div>

      {/* ── 목록 ── */}
      {loading ? (
        <div className="card" style={{ padding: 40, textAlign: 'center', color: 'var(--text-3)' }}>
          로딩 중…
        </div>
      ) : suppliers.length === 0 ? (
        <div className="card empty-state" style={{ minHeight: 200, display: 'grid', placeItems: 'center' }}>
          <div style={{ textAlign: 'center', color: 'var(--text-3)' }}>
            <Icon.box style={{ width: 32, height: 32, opacity: 0.35, marginBottom: 10 }} />
            <div style={{ fontWeight: 600, marginBottom: 4 }}>등록된 공급업체가 없습니다</div>
            <div style={{ fontSize: 13 }}>위 <b>공급업체 추가</b> 버튼으로 첫 업체를 등록해보세요.</div>
          </div>
        </div>
      ) : filtered.length === 0 ? (
        <div className="card" style={{ padding: 32, textAlign: 'center', color: 'var(--text-3)', fontSize: 13 }}>
          "{search}" 검색 결과가 없습니다
        </div>
      ) : (
        <div className="card" style={{ padding: 0, overflow: 'hidden' }}>
          <table style={{ width: '100%', borderCollapse: 'collapse' }}>
            <thead>
              <tr style={{ borderBottom: '1px solid var(--divider)', background: 'var(--surface-2)' }}>
                <th style={{ padding: '9px 14px', textAlign: 'left', fontSize: 12, fontWeight: 600, color: 'var(--text-3)' }}>업체명</th>
                <th style={{ padding: '9px 14px', textAlign: 'left', fontSize: 12, fontWeight: 600, color: 'var(--text-3)' }}>담당자</th>
                <th style={{ padding: '9px 14px', textAlign: 'left', fontSize: 12, fontWeight: 600, color: 'var(--text-3)' }}>연락처</th>
                <th style={{ padding: '9px 14px', textAlign: 'left', fontSize: 12, fontWeight: 600, color: 'var(--text-3)' }}>메모</th>
                <th style={{ padding: '9px 14px', textAlign: 'right', fontSize: 12, fontWeight: 600, color: 'var(--text-3)', width: 100 }}></th>
              </tr>
            </thead>
            <tbody>
              {filtered.map((s, i) => (
                <tr key={s.id} style={{ borderBottom: i < filtered.length - 1 ? '1px solid var(--divider)' : undefined }}>
                  <td style={{ padding: '10px 14px', fontWeight: 600, fontSize: 13 }}>{s.name}</td>
                  <td style={{ padding: '10px 14px', fontSize: 12, color: s.contact ? 'var(--text-2)' : 'var(--text-4)' }}>
                    {s.contact || '—'}
                  </td>
                  <td style={{ padding: '10px 14px', fontSize: 12, color: s.phone ? 'var(--text-2)' : 'var(--text-4)', fontFamily: s.phone ? 'monospace' : undefined }}>
                    {s.phone || '—'}
                  </td>
                  <td style={{ padding: '10px 14px', fontSize: 12, color: 'var(--text-3)', maxWidth: 200, overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap' }}>
                    {s.memo || ''}
                  </td>
                  <td style={{ padding: '10px 14px', textAlign: 'right' }}>
                    <div style={{ display: 'flex', gap: 6, justifyContent: 'flex-end' }}>
                      <button className="btn xs" onClick={() => setModalTarget(s)}>수정</button>
                      <button className="btn xs" style={{ color: 'var(--negative)' }} onClick={() => setPendingDeleteId(s.id)}>삭제</button>
                    </div>
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      )}

      {/* ── 등록/수정 모달 ── */}
      {modalTarget !== null && (
        <SupplierModal
          initial={modalTarget === 'new' ? null : modalTarget}
          onSave={handleSave}
          onClose={() => setModalTarget(null)}
        />
      )}

      {/* ── 삭제 확인 ── */}
      {pendingDeleteId && (
        <ConfirmDialog
          open
          message="이 공급업체를 삭제할까요?"
          danger
          onConfirm={() => { handleDelete(pendingDeleteId); setPendingDeleteId(null); }}
          onCancel={() => setPendingDeleteId(null)}
        />
      )}
    </main>
  );
}
