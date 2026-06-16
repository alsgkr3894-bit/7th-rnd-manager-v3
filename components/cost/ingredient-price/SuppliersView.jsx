'use client';
import { useEffect, useState, useCallback, useMemo, useRef } from 'react';
import { showToast } from '@/components/Toast';
import { ConfirmDialog } from '@/components/ui/ConfirmDialog';
import { initDB } from '@/lib/db';
import {
  getAllSuppliers,
  addSupplier,
  updateSupplier,
  deleteSupplier,
} from '@/lib/cost/suppliers/store';
import { SupplierModal } from './suppliers/SupplierModal';
import { SuppliersListPanel } from './suppliers/SuppliersListPanel';
import { SuppliersToolbar } from './suppliers/SuppliersToolbar';
import { filterSuppliers } from './suppliers/supplierViewUtils';

// ── 공급업체 뷰 (식자재 단가 마스터 탭) ────────────────────────
export function SuppliersView() {
  const [suppliers, setSuppliers] = useState([]);
  const [loading, setLoading] = useState(true);
  const [dbError, setDbError] = useState(null);
  const [search, setSearch] = useState('');
  const [modalTarget, setModalTarget] = useState(null); // null | 'new' | supplierRecord
  const [pendingDeleteId, setPendingDeleteId] = useState(null);
  const mountedRef = useRef(true);

  const load = useCallback(async () => {
    await initDB();
    const rows = await getAllSuppliers();
    if (mountedRef.current) setSuppliers(rows);
  }, []);

  useEffect(() => {
    mountedRef.current = true;
    load()
      .catch(err => {
        if (!mountedRef.current) return;
        console.error('[SuppliersView] load failed', err);
        setDbError(err.message || '데이터 로드 실패');
      })
      .finally(() => {
        if (mountedRef.current) setLoading(false);
      });

    return () => {
      mountedRef.current = false;
    };
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
      showToast('저장 실패: ' + e.message, 'error');
      throw e;
    }
  }

  async function handleDelete(id) {
    try {
      await deleteSupplier(id);
      showToast('삭제 완료', 'ok');
      await load();
    } catch (e) {
      showToast('삭제 실패: ' + e.message, 'error');
    }
  }

  const filtered = useMemo(() => filterSuppliers(suppliers, search), [suppliers, search]);

  if (dbError)
    return (
      <div className="card" style={{ padding: 32, textAlign: 'center', color: 'var(--negative)' }}>
        데이터베이스 오류: {dbError}
      </div>
    );

  return (
    <>
      <div style={{ fontSize: 12, color: 'var(--text-3)', marginBottom: 12 }}>
        식자재를 공급하는 업체를 등록하고 관리합니다.
      </div>

      <SuppliersToolbar
        search={search}
        onSearch={setSearch}
        onAdd={() => setModalTarget('new')}
      />
      <SuppliersListPanel
        loading={loading}
        suppliers={suppliers}
        filteredSuppliers={filtered}
        search={search}
        onEdit={setModalTarget}
        onDelete={setPendingDeleteId}
      />

      {modalTarget !== null && (
        <SupplierModal
          initial={modalTarget === 'new' ? null : modalTarget}
          onSave={handleSave}
          onClose={() => setModalTarget(null)}
        />
      )}

      {pendingDeleteId && (
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
