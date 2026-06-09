'use client';
import { useEffect, useMemo, useRef, useState } from 'react';
import { Icon } from '@/components/icons';
import { showToast } from '@/components/Toast';
import { Chip } from '@/components/ui/Chip';
import { SearchBox } from '@/components/ui/SearchBox';
import { EmptyState } from '@/components/ui/EmptyState';
import { Pagination } from '@/components/ui/Pagination';
import { SortableTh } from '@/components/ui/SortableTh';
import { usePagination } from '@/hooks/usePagination';
import { downloadCsv } from '@/lib/download';
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
import { ManagedProductsRow } from './ManagedProductsRow';
import { sortByKey } from '@/lib/jette/utils';

/**
 * ManagedProductsCard — 제때 출고량 대상 제품 관리
 *
 * 구성:
 *   - 추가 폼 (ManagedProductsForm)
 *   - 분류 chip 필터 (전체 / 전용 / 범용) + 관리품목만 토글
 *   - 테이블 (ManagedProductsRow)
 *   - 가격비교 productCode 자동 마이그레이션 ('exclusive' 일괄 추가)
 */
const EMPTY_FORM = { productCode: '', productName: '', productType: 'generic', isManaged: false };
const PRODUCT_TYPE_ORDER = { exclusive: 0, generic: 1, 'generic-managed': 2 };
const SORT_TRANSFORM = {
  productType: v => PRODUCT_TYPE_ORDER[v] ?? 9,
  enable: v => (v === false ? 0 : 1),
  isManaged: v => (v ? 1 : 0),
};

export function ManagedProductsCard() {
  const [list, setList] = useState([]);
  const [search, setSearch] = useState('');
  const [filter, setFilter] = useState('all'); // all | exclusive | generic | disabled
  const [managedOnly, setManagedOnly] = useState(false);
  const [adding, setAdding] = useState(false);
  const [form, setForm] = useState(EMPTY_FORM);
  const [busy, setBusy] = useState(false);
  const [migrating, setMigrating] = useState(false);
  const [sortKey, setSortKey] = useState('productName');
  const [sortDir, setSortDir] = useState('asc');
  const [pendingDeleteId, setPendingDeleteId] = useState(null);
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
      if (mountedRef.current) console.warn(err);
    }
  }

  async function handleAdd() {
    if (!form.productCode.trim() || !form.productName.trim()) return;
    setBusy(true);
    try {
      await addManagedProduct(form);
      showToast('대상 제품이 추가됐어요', 'ok');
      setForm(EMPTY_FORM);
      setAdding(false);
      refresh();
    } catch (err) {
      if (err.message === 'CODE_DUPLICATE') showToast('이미 등록된 제품코드입니다', 'err');
      else showToast(err.message || '추가 실패', 'err');
    } finally {
      setBusy(false);
    }
  }

  async function handleDelete(id) {
    try {
      await deleteManagedProduct(id);
      showToast('삭제됐어요', 'ok');
      setPendingDeleteId(null);
      refresh();
    } catch {
      showToast('삭제 실패', 'err');
    }
  }

  async function handleToggleEnable(p) {
    try {
      await updateManagedProduct({ id: p.id, enable: p.enable === false });
      refresh();
    } catch {
      showToast('토글 실패', 'err');
    }
  }

  async function handleChangeType(p, productType) {
    try {
      await updateManagedProduct({ id: p.id, productType });
      refresh();
    } catch {
      showToast('변경 실패', 'err');
    }
  }

  async function handleToggleManaged(p) {
    try {
      await updateManagedProduct({ id: p.id, isManaged: !p.isManaged });
      refresh();
    } catch {
      showToast('변경 실패', 'err');
    }
  }

  /** 가격비교 최신 파일의 productCode 중 ref에 없는 것을 'exclusive'로 일괄 추가 */
  async function handleMigrate() {
    setMigrating(true);
    try {
      const files = await getPriceFiles();
      if (files.length === 0) {
        showToast('가격비교 데이터가 없습니다', 'err');
        return;
      }
      const rows = await getPriceRowsByFileId(files[0].id);
      if (rows.length === 0) {
        showToast('가격비교 행이 없습니다', 'err');
        return;
      }
      const priceProducts = rows
        .filter(r => r.productCode && r.productName)
        .map(r => ({ productCode: r.productCode, productName: r.productName }));
      const { added, skipped } = await migrateExclusiveFromPriceList(priceProducts);
      showToast(`전용상품 ${added}개 추가 (기존 ${skipped}개 유지)`, added > 0 ? 'ok' : 'info');
      refresh();
    } catch (err) {
      console.error(err);
      showToast(err.message || '마이그레이션 실패', 'err');
    } finally {
      setMigrating(false);
    }
  }

  const counts = useMemo(
    () => ({
      all: list.length,
      exclusive: list.filter(p => p.productType === 'exclusive').length,
      generic: list.filter(p => p.productType === 'generic' || !p.productType).length,
      'generic-managed': list.filter(p => p.productType === 'generic-managed').length,
      managed: list.filter(p => p.isManaged).length,
      disabled: list.filter(p => p.enable === false).length,
    }),
    [list]
  );

  const filtered = useMemo(() => {
    let r = list;
    if (filter === 'disabled') r = r.filter(p => p.enable === false);
    else if (filter !== 'all') r = r.filter(p => (p.productType || 'generic') === filter);
    if (managedOnly) r = r.filter(p => p.isManaged);
    const q = search.trim().toLowerCase();
    if (q)
      r = r.filter(
        p =>
          (p.productName || '').toLowerCase().includes(q) ||
          (p.productCode || '').toLowerCase().includes(q)
      );
    return sortByKey(r, sortKey, sortDir, SORT_TRANSFORM[sortKey] ?? null);
  }, [list, search, filter, managedOnly, sortKey, sortDir]);

  const { page, goTo, totalPages, paged, total } = usePagination(filtered, 50);

  function toggleSort(key) {
    if (sortKey === key) setSortDir(d => (d === 'asc' ? 'desc' : 'asc'));
    else {
      setSortKey(key);
      setSortDir(key === 'productName' || key === 'productCode' ? 'asc' : 'desc');
    }
  }

  function exportCsv() {
    const headers = ['제품코드', '제품명', '활성', '분류', '관리품목'];
    const rows = filtered.map(p => [
      p.productCode || '',
      p.productName || '',
      p.enable === false ? '비활성' : '활성',
      p.productType || 'generic',
      p.isManaged ? 'Y' : '',
    ]);
    downloadCsv([headers, ...rows], '제때_대상제품목록.csv');
  }

  return (
    <div className="card" style={{ marginTop: 16 }}>
      <div className="card-header">
        <div>
          <div className="card-title">대상 제품 목록</div>
          <div className="card-sub">
            총 {list.length}개 (전용 {counts.exclusive} · 범용 {counts.generic} · 범용관리{' '}
            {counts['generic-managed']} · 관리품목 {counts.managed})
          </div>
        </div>
        <div style={{ display: 'flex', gap: 6 }}>
          <button className="btn sm" onClick={exportCsv} disabled={filtered.length === 0}>
            CSV 내보내기
          </button>
          <button className="btn sm" onClick={handleMigrate} disabled={migrating}>
            <Icon.download style={{ width: 12, height: 12 }} />
            {migrating ? '가져오는 중...' : '가격비교에서 전용상품 가져오기'}
          </button>
          <button className="btn sm" onClick={() => setAdding(v => !v)}>
            {adding ? (
              '닫기'
            ) : (
              <>
                <Icon.plus style={{ width: 12, height: 12 }} /> 추가
              </>
            )}
          </button>
        </div>
      </div>

      {adding && (
        <ManagedProductsForm
          form={form}
          setForm={setForm}
          busy={busy}
          onSubmit={handleAdd}
          onCancel={() => setAdding(false)}
        />
      )}

      <div
        style={{
          display: 'flex',
          gap: 6,
          flexWrap: 'wrap',
          marginBottom: 12,
          alignItems: 'center',
        }}
      >
        <Chip
          label="전체"
          count={counts.all}
          active={filter === 'all'}
          onClick={() => setFilter('all')}
        />
        <Chip
          label="전용상품"
          count={counts.exclusive}
          active={filter === 'exclusive'}
          onClick={() => setFilter('exclusive')}
        />
        <Chip
          label="범용상품"
          count={counts.generic}
          active={filter === 'generic'}
          onClick={() => setFilter('generic')}
        />
        <Chip
          label="범용관리"
          count={counts['generic-managed']}
          active={filter === 'generic-managed'}
          onClick={() => setFilter('generic-managed')}
        />
        <span style={{ width: 1, height: 18, background: 'var(--border)', margin: '0 4px' }} />
        <Chip
          label="관리품목만"
          count={counts.managed}
          active={managedOnly}
          onClick={() => setManagedOnly(v => !v)}
        />
        {counts.disabled > 0 && (
          <Chip
            label="비활성"
            count={counts.disabled}
            active={filter === 'disabled'}
            onClick={() => setFilter('disabled')}
          />
        )}
      </div>

      <SearchBox value={search} onChange={setSearch} />

      {filtered.length === 0 ? (
        <EmptyState
          compact
          icon={<Icon.box style={{ width: 28, height: 28 }} />}
          title={search ? '조건에 맞는 제품이 없습니다' : '관리 대상 제품이 없습니다'}
          desc={search ? '검색어를 바꿔보세요' : '상단에서 제품을 추가해 관리하세요'}
        />
      ) : (
        <div style={{ maxHeight: 480, overflowY: 'auto', borderTop: '1px solid var(--border)' }}>
          <table className="data-table">
            <thead style={{ position: 'sticky', top: 0, background: 'var(--surface)', zIndex: 1 }}>
              <tr>
                <SortableTh
                  sortKey="productCode"
                  active={sortKey}
                  dir={sortDir}
                  onClick={toggleSort}
                  width={120}
                >
                  제품코드
                </SortableTh>
                <SortableTh
                  sortKey="productName"
                  active={sortKey}
                  dir={sortDir}
                  onClick={toggleSort}
                >
                  제품명
                </SortableTh>
                <SortableTh
                  sortKey="enable"
                  active={sortKey}
                  dir={sortDir}
                  onClick={toggleSort}
                  width={70}
                  style={{ textAlign: 'center' }}
                >
                  활성
                </SortableTh>
                <SortableTh
                  sortKey="productType"
                  active={sortKey}
                  dir={sortDir}
                  onClick={toggleSort}
                  width={130}
                >
                  분류
                </SortableTh>
                <SortableTh
                  sortKey="isManaged"
                  active={sortKey}
                  dir={sortDir}
                  onClick={toggleSort}
                  width={80}
                  style={{ textAlign: 'center' }}
                >
                  관리품목
                </SortableTh>
                <th style={{ width: 150 }}></th>
              </tr>
            </thead>
            <tbody>
              {paged.map(p => (
                <ManagedProductsRow
                  key={p.id}
                  product={p}
                  onToggleEnable={handleToggleEnable}
                  onChangeType={handleChangeType}
                  onToggleManaged={handleToggleManaged}
                  pendingDelete={pendingDeleteId === p.id}
                  onAskDelete={() => setPendingDeleteId(p.id)}
                  onCancelDelete={() => setPendingDeleteId(null)}
                  onConfirmDelete={() => handleDelete(p.id)}
                />
              ))}
            </tbody>
          </table>
          <Pagination
            page={page}
            totalPages={totalPages}
            onPage={goTo}
            total={total}
            pageSize={50}
          />
        </div>
      )}
    </div>
  );
}
