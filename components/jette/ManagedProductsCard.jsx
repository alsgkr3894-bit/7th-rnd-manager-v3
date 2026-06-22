'use client';
import { useEffect, useMemo, useRef, useState } from 'react';
import { showToast } from '@/components/Toast';
import { usePagination } from '@/hooks/usePagination';
import { useCurrentRole } from '@/hooks/useCurrentRole';
import { downloadCsv, makeFileNameWithBrand } from '@/lib/download';
import {
  getAllManagedProducts,
  addManagedProduct,
  deleteManagedProduct,
  updateManagedProduct,
  migrateExclusiveFromPriceList,
  onManagedProductsChange,
} from '@/lib/shipment';
import { getPriceFiles, getPriceRowsByFileId } from '@/lib/price';
import { ManagedProductsForm } from './ManagedProductsForm';
import { useTableSearchSort } from '@/hooks/useTableSearchSort';
import { ManagedProductsCardHeader } from './managed-products/ManagedProductsCardHeader';
import { ManagedProductsFilters } from './managed-products/ManagedProductsFilters';
import { ManagedProductsTable } from './managed-products/ManagedProductsTable';
import {
  buildManagedProductsCsvData,
  buildPriceProductsFromRows,
  countManagedProducts,
  EMPTY_MANAGED_PRODUCT_FORM,
  filterManagedProducts,
  MANAGED_PRODUCTS_PAGE_SIZE,
  managedProductsSortDir,
} from './managed-products/managedProductsCardUtils';

export function ManagedProductsCard() {
  const { isAdmin, ready: roleReady } = useCurrentRole();
  const canEdit = roleReady && isAdmin;
  const [list, setList] = useState([]);
  const [filter, setFilter] = useState('all'); // all | exclusive | generic | disabled
  const [managedOnly, setManagedOnly] = useState(false);
  const [adding, setAdding] = useState(false);
  const [form, setForm] = useState(EMPTY_MANAGED_PRODUCT_FORM);
  const [busy, setBusy] = useState(false);
  const [migrating, setMigrating] = useState(false);
  const [pendingDeleteId, setPendingDeleteId] = useState(null);
  const { search, setSearch, sortKey, sortDir, toggleSort } = useTableSearchSort(
    'productName',
    'asc',
    managedProductsSortDir
  );
  const mountedRef = useRef(false);

  useEffect(() => {
    mountedRef.current = true;
    refresh();

    return () => {
      mountedRef.current = false;
    };
  }, []);

  // 가격비교 등 다른 화면에서 분류를 바꿔도 이 목록이 같은 마스터를 반영하도록 동기화
  useEffect(() => onManagedProductsChange(refresh), []);

  async function refresh() {
    try {
      const rows = await getAllManagedProducts();
      if (mountedRef.current) setList(rows);
    } catch (err) {
      if (mountedRef.current) console.warn('[ManagedProductsCard] refresh failed', err);
    }
  }

  async function handleAdd() {
    if (!canEdit) return;
    if (!form.productCode.trim() || !form.productName.trim()) return;
    setBusy(true);
    try {
      await addManagedProduct(form);
      showToast('대상 제품이 추가됐어요', 'ok');
      setForm(EMPTY_MANAGED_PRODUCT_FORM);
      setAdding(false);
      refresh();
    } catch (err) {
      if (err.message === 'CODE_DUPLICATE') showToast('이미 등록된 제품코드입니다', 'error');
      else showToast(err.message || '추가 실패', 'error');
    } finally {
      setBusy(false);
    }
  }

  async function handleDelete(id) {
    if (!canEdit) return;
    try {
      await deleteManagedProduct(id);
      showToast('삭제됐어요', 'ok');
      setPendingDeleteId(null);
      refresh();
    } catch {
      showToast('삭제 실패', 'error');
    }
  }

  async function handleToggleEnable(p) {
    if (!canEdit) return;
    try {
      await updateManagedProduct({ id: p.id, enable: p.enable === false });
      refresh();
    } catch {
      showToast('토글 실패', 'error');
    }
  }

  async function handleChangeType(p, productType) {
    if (!canEdit) return;
    try {
      await updateManagedProduct({ id: p.id, productType });
      refresh();
    } catch {
      showToast('변경 실패', 'error');
    }
  }

  async function handleToggleManaged(p) {
    if (!canEdit) return;
    try {
      await updateManagedProduct({ id: p.id, isManaged: !p.isManaged });
      refresh();
    } catch {
      showToast('변경 실패', 'error');
    }
  }

  /** 가격비교 최신 파일의 productCode 중 ref에 없는 것을 'exclusive'로 일괄 추가 */
  async function handleMigrate() {
    if (!canEdit) return;
    setMigrating(true);
    try {
      const files = await getPriceFiles();
      if (files.length === 0) {
        showToast('가격비교 데이터가 없습니다', 'error');
        return;
      }
      const rows = await getPriceRowsByFileId(files[0].id);
      if (rows.length === 0) {
        showToast('가격비교 행이 없습니다', 'error');
        return;
      }
      const priceProducts = buildPriceProductsFromRows(rows);
      const { added, skipped } = await migrateExclusiveFromPriceList(priceProducts);
      showToast(`전용상품 ${added}개 추가 (기존 ${skipped}개 유지)`, added > 0 ? 'ok' : 'info');
      refresh();
    } catch (err) {
      console.error('[ManagedProductsCard] migrate exclusive products failed', err);
      showToast(err.message || '마이그레이션 실패', 'error');
    } finally {
      setMigrating(false);
    }
  }

  const counts = useMemo(() => countManagedProducts(list), [list]);

  const filtered = useMemo(
    () => filterManagedProducts(list, { filter, managedOnly, search, sortKey, sortDir }),
    [list, filter, managedOnly, search, sortKey, sortDir]
  );

  const { page, goTo, totalPages, paged, total } = usePagination(
    filtered,
    MANAGED_PRODUCTS_PAGE_SIZE
  );

  function exportCsv() {
    downloadCsv(
      buildManagedProductsCsvData(filtered),
      makeFileNameWithBrand('제때_대상제품목록', 'csv')
    );
  }

  return (
    <div className="card" style={{ marginTop: 16 }}>
      <ManagedProductsCardHeader
        totalCount={list.length}
        counts={counts}
        filteredCount={filtered.length}
        onExport={exportCsv}
        migrating={migrating}
        onMigrate={handleMigrate}
        adding={canEdit && adding}
        canEdit={canEdit}
        onToggleAdding={() => {
          if (canEdit) setAdding(value => !value);
        }}
      />

      {canEdit && adding && (
        <ManagedProductsForm
          form={form}
          setForm={setForm}
          busy={busy}
          canEdit={canEdit}
          onSubmit={handleAdd}
          onCancel={() => setAdding(false)}
        />
      )}

      <ManagedProductsFilters
        counts={counts}
        filter={filter}
        onFilter={setFilter}
        managedOnly={managedOnly}
        onToggleManagedOnly={() => setManagedOnly(value => !value)}
        search={search}
        onSearch={setSearch}
      />

      <ManagedProductsTable
        rows={paged}
        total={total}
        page={page}
        totalPages={totalPages}
        onPage={goTo}
        search={search}
        sortKey={sortKey}
        sortDir={sortDir}
        onSort={toggleSort}
        canEdit={canEdit}
        pendingDeleteId={pendingDeleteId}
        onToggleEnable={handleToggleEnable}
        onChangeType={handleChangeType}
        onToggleManaged={handleToggleManaged}
        onAskDelete={setPendingDeleteId}
        onCancelDelete={() => setPendingDeleteId(null)}
        onConfirmDelete={handleDelete}
      />
    </div>
  );
}
