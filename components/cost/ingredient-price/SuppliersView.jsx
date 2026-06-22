'use client';
import { useState, useMemo } from 'react';
import { showToast } from '@/components/Toast';
import { ConfirmDialog } from '@/components/ui/ConfirmDialog';
import {
  getAllSuppliers,
  addSupplier,
  updateSupplier,
  deleteSupplier,
} from '@/lib/cost/suppliers/store';
import { useDBLoad } from '@/hooks/useDBLoad';
import { useCurrentRole } from '@/hooks/useCurrentRole';
import { SupplierModal } from './suppliers/SupplierModal';
import { SuppliersListPanel } from './suppliers/SuppliersListPanel';
import { SuppliersToolbar } from './suppliers/SuppliersToolbar';
import { filterSuppliers } from './suppliers/supplierViewUtils';

// ── 공급업체 뷰 (식자재 단가 마스터 탭) ────────────────────────
export function SuppliersView() {
  const { isAdmin, ready: roleReady } = useCurrentRole();
  const canEdit = roleReady && isAdmin;
  const [search, setSearch] = useState('');
  const [modalTarget, setModalTarget] = useState(null); // null | 'new' | supplierRecord
  const [pendingDeleteId, setPendingDeleteId] = useState(null);

  const {
    data: suppliers,
    loading,
    errorMessage: dbError,
    reload,
  } = useDBLoad(getAllSuppliers, {
    initialData: [],
    onError: err => console.error('[SuppliersView] load failed', err),
  });

  async function handleSave(form) {
    if (!canEdit) return;
    try {
      if (modalTarget === 'new') {
        await addSupplier(form);
        showToast('공급업체 등록 완료', 'ok');
      } else {
        await updateSupplier(modalTarget.id, form);
        showToast('공급업체 수정 완료', 'ok');
      }
      setModalTarget(null);
      reload();
    } catch (e) {
      showToast('저장 실패: ' + e.message, 'error');
      throw e;
    }
  }

  async function handleDelete(id) {
    if (!canEdit) return;
    try {
      await deleteSupplier(id);
      showToast('삭제 완료', 'ok');
      reload();
    } catch (e) {
      showToast('삭제 실패: ' + e.message, 'error');
    }
  }

  const filtered = useMemo(() => filterSuppliers(suppliers, search), [suppliers, search]);

  if (dbError)
    return (
      <div className="card" style={{ padding: 32, textAlign: 'center', color: 'var(--negative)' }}>
        <div>데이터베이스 오류: {dbError}</div>
        <button className="btn primary" style={{ marginTop: 12 }} onClick={reload}>
          다시 시도
        </button>
      </div>
    );

  return (
    <>
      <div style={{ fontSize: 12, color: 'var(--text-3)', marginBottom: 12 }}>
        식자재를 공급하는 업체를 등록하고 관리합니다.
      </div>

      <SuppliersToolbar
        search={search}
        canEdit={canEdit}
        onSearch={setSearch}
        onAdd={() => {
          if (canEdit) setModalTarget('new');
        }}
      />
      <SuppliersListPanel
        loading={loading}
        suppliers={suppliers}
        filteredSuppliers={filtered}
        search={search}
        canEdit={canEdit}
        onEdit={supplier => {
          if (canEdit) setModalTarget(supplier);
        }}
        onDelete={id => {
          if (canEdit) setPendingDeleteId(id);
        }}
      />

      {canEdit && modalTarget !== null && (
        <SupplierModal
          initial={modalTarget === 'new' ? null : modalTarget}
          onSave={handleSave}
          onClose={() => setModalTarget(null)}
        />
      )}

      {canEdit && pendingDeleteId && (
        <ConfirmDialog
          open
          message="이 공급업체를 삭제할까요?"
          danger
          onConfirm={() => {
            handleDelete(pendingDeleteId);
            setPendingDeleteId(null);
          }}
          onCancel={() => setPendingDeleteId(null)}
        />
      )}
    </>
  );
}
