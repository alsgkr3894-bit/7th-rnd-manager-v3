'use client';
import { useEffect, useState, useMemo, useCallback } from 'react';
import { useMounted } from '@/hooks/useMounted';
import dynamic from 'next/dynamic';
import { Icon } from '@/components/icons';
import { PageHeader } from '@/components/ui/PageHeader';
import { Pagination } from '@/components/ui/Pagination';
import { showToast } from '@/components/Toast';
import { useVisibilityRefresh } from '@/hooks/useVisibilityRefresh';
import { initDB } from '@/lib/db';
import { formatNumber } from '@/lib/format';
import { buildPriceRowMap, getPriceFiles, getPriceRowsByFileId } from '@/lib/price';
import {
  getAllIngredients,
  getIngredientMetaMap,
  upsertIngredientMeta,
  bulkDeleteIngredients,
  resetAllIngredients,
  buildProductTypeMap,
} from '@/lib/ingredient';
import { getManagedProducts, seedManagedProductsIfEmpty } from '@/lib/shipment';
import { MasterRow } from '@/components/cost/ingredient-price/MasterRow';
import { buildIngredientPriceRows } from '@/lib/cost/ingredient-price/buildRows';
import { useIngredientPriceFilters } from '@/hooks/useIngredientPriceFilters';
import { IngredientPriceSkeleton } from '@/components/ui/Skeleton';
import {
  SelectionToolbar,
  SortableHeader,
  useCostManageTable,
} from '@/components/cost/manage/table-utils';

const RegisterModal = dynamic(
  () => import('@/components/cost/ingredient-price/RegisterModal').then(m => m.RegisterModal),
  { ssr: false, loading: () => null }
);
const SyncBaseQtyModal = dynamic(
  () => import('@/components/cost/ingredient-price/SyncBaseQtyModal').then(m => m.SyncBaseQtyModal),
  { ssr: false, loading: () => null }
);
const VIEW_TABS = [
  { key: 'price', label: '단가 목록' },
  { key: 'issues', label: '이슈' },
];

export default function Page() {
  const [rows, setRows] = useState([]);
  const [fileInfo, setFileInfo] = useState(null);
  const [loading, setLoading] = useState(true);
  const [dbError, setDbError] = useState(null);
  const [regTarget, setRegTarget] = useState(null); // 마스터 등록 모달 대상 행
  const [syncQtyOpen, setSyncQtyOpen] = useState(false); // 제때 수량 동기화 모달
  const [resetConfirm, setResetConfirm] = useState(false);
  const [resetting, setResetting] = useState(false);
  const [viewTab, setViewTab] = useState('price');
  const mountedRef = useMounted();
  const { search, setSearch, taxFilter, setTaxFilter, deltaFilter, setDeltaFilter, mainCats, filtered } =
    useIngredientPriceFilters(rows);

  const load = useCallback(async () => {
    await initDB();
    const files = await getPriceFiles();
    const latest = files[0] || null;
    const prev = files[1] || null;

    const [allMeta, metaMap, managed] = await Promise.all([
      getAllIngredients(),
      getIngredientMetaMap(),
      seedManagedProductsIfEmpty().then(() => getManagedProducts()),
    ]);
    if (!mountedRef.current) return;
    const typeMap = buildProductTypeMap(managed);

    // 마스터가 비어있으면 빈 목록 (usageMap 빌드는 계속 진행)
    if (!allMeta.length) {
      setRows([]);
    }

    let prevPriceMap = new Map();
    let priceRows = [];
    let priceCodeSet = new Set();

    if (latest) {
      setFileInfo({
        name: latest.fileName || latest.name || '',
        date: latest.updateDate || latest.date || '',
      });
      const [latestRows, prevRows] = await Promise.all([
        getPriceRowsByFileId(latest.id),
        prev ? getPriceRowsByFileId(prev.id) : Promise.resolve([]),
      ]);
      if (!mountedRef.current) return;
      const latestPrice = buildPriceRowMap(latestRows);
      const prevPrice = buildPriceRowMap(prevRows);
      priceRows = latestPrice.rows;
      priceCodeSet = new Set(priceRows.map(r => r.productCode).filter(Boolean));
      if (prev) {
        prevPrice.rows.forEach(r => {
          if (r.productCode) prevPriceMap.set(r.productCode, r.priceWithTax);
        });
      }
    }

    // 제때 파일 Row → Map
    const priceRowMap = buildPriceRowMap(priceRows).map;

    if (!mountedRef.current) return;
    setRows(buildIngredientPriceRows(allMeta, priceRowMap, prevPriceMap, prev, priceCodeSet, typeMap));

  }, [mountedRef]);

  useEffect(() => {
    load()
      .catch(err => {
        if (!mountedRef.current) return;
        console.error(err);
        setDbError(err.message || '데이터 로드 실패');
      })
      .finally(() => {
        if (mountedRef.current) setLoading(false);
      });
  }, [load, mountedRef]);
  useVisibilityRefresh(load);

  const handleReset = useCallback(async () => {
    setResetting(true);
    try {
      const { deleted } = await resetAllIngredients();
      showToast(`마스터 초기화 완료 — ${deleted}개 삭제`);
      await load();
    } catch (e) {
      showToast('초기화 실패: ' + e.message);
    } finally {
      setResetting(false);
    }
  }, [load]);

  // ── 통계 ─────────────────────────────────────────────────────
  const stats = useMemo(() => {
    const upCount = rows.filter(r => r.priceDelta > 0).length;
    const downCount = rows.filter(r => r.priceDelta < 0).length;
    const newCount = rows.filter(r => r.isNew).length;
    return { total: rows.length, upCount, downCount, newCount };
  }, [rows]);

  const issueRows = useMemo(
    () => rows.filter(r => !r.category || !r.baseQuantity || r.priceWithTax == null),
    [rows]
  );

  const priceSortOptions = useMemo(
    () => [
      { id: 'name', label: '제품명', key: r => r.masterName || r.productName },
      { id: 'code', label: '제품코드', key: r => r.productCode },
      { id: 'category', label: '분류', key: r => r.category },
      { id: 'price', label: '단가', key: r => r.priceWithTax ?? -1 },
      { id: 'unit', label: '개당 단가', key: r => r.unitPrice ?? -1 },
      { id: 'delta', label: '변동', key: r => r.priceDelta ?? 0 },
    ],
    []
  );

  const priceTable = useCostManageTable(filtered, {
    sortOptions: priceSortOptions,
    initialSort: { id: 'name', dir: 'asc' },
    getRowId: row => row.meta?.id,
  });

  async function handleInlineSave(row, patch) {
    try {
      if (!row.meta) throw new Error('마스터 항목을 찾을 수 없습니다');
      await upsertIngredientMeta({
        ...row.meta,
        productCode: row.productCode || row.meta.productCode,
        ...patch,
      });
      showToast('저장 완료', 'ok');
      await load();
    } catch (err) {
      showToast('저장 실패: ' + err.message, 'err');
      throw err;
    }
  }

  async function handleSelectedDelete() {
    const ids = Array.from(priceTable.selected);
    if (ids.length === 0) return;
    try {
      await bulkDeleteIngredients(ids);
      showToast(`${ids.length}개 삭제 완료`, 'ok');
      priceTable.clearSelection();
      await load();
    } catch (err) {
      showToast('삭제 실패: ' + err.message, 'err');
    }
  }

  if (dbError)
    return (
      <main className="main">
        <PageHeader
          breadcrumb={['원가계산', '식자재 단가 마스터']}
          title="식자재 단가 마스터"
          sub="로드 실패"
        />
        <div
          className="card"
          style={{ padding: 32, textAlign: 'center', color: 'var(--negative)' }}
        >
          데이터베이스 오류: {dbError}
        </div>
      </main>
    );

  return (
    <main className="main">
      <PageHeader
        breadcrumb={['원가계산', '식자재 단가 마스터']}
        title="식자재 단가 마스터"
        sub="제때 최신 단가 기준 — 마스터에 등록된 항목은 포장단위·개당 단가가 자동 계산돼요."
        actions={
          <div
            style={{
              display: 'flex',
              gap: 8,
              flexWrap: 'wrap',
              minWidth: 0,
              width: '100%',
              maxWidth: '100%',
              flex: '1 1 100%',
            }}
          >
            {resetConfirm ? (
              <>
                <button className="btn" onClick={() => setResetConfirm(false)} disabled={resetting}>
                  취소
                </button>
                <button
                  className="btn"
                  onClick={() => {
                    setResetConfirm(false);
                    handleReset();
                  }}
                  disabled={resetting}
                  style={{ color: 'var(--negative)', fontWeight: 700 }}
                >
                  {resetting ? '초기화 중…' : '진행하기'}
                </button>
              </>
            ) : (
              <button
                className="btn sm"
                onClick={() => setResetConfirm(true)}
                disabled={resetting}
                style={{ color: 'var(--negative)' }}
              >
                초기화
              </button>
            )}
            <button
              className="btn"
              onClick={() => setSyncQtyOpen(true)}
              disabled={resetting}
            >
              <Icon.arrowDown style={{ width: 14, height: 14 }} />
              제때 수량 동기화
            </button>
          </div>
        }
      />

      {/* 탭 전환 — 로드 완료 후 항상 노출 (공급업체는 식자재 유무와 무관) */}
      {!loading && (
        <div
          style={{
            display: 'flex',
            gap: 0,
            border: '1px solid var(--border)',
            borderRadius: 8,
            overflow: 'hidden',
            width: 'fit-content',
            marginBottom: 12,
          }}
        >
          {VIEW_TABS.map(({ key, label }) => (
            <button
              key={key}
              onClick={() => setViewTab(key)}
              style={{
                padding: '7px 20px',
                fontSize: 13,
                fontWeight: 700,
                border: 'none',
                cursor: 'pointer',
                background: viewTab === key ? 'var(--accent)' : 'var(--surface-2)',
                color: viewTab === key ? '#fff' : 'var(--text-2)',
                position: 'relative',
              }}
            >
              {label}
              {key === 'issues' && issueRows.length > 0 && (
                <span
                  style={{
                    position: 'absolute',
                    top: 4,
                    right: 4,
                    minWidth: 16,
                    height: 16,
                    borderRadius: 999,
                    background: 'var(--warn, #f59e0b)',
                    color: '#fff',
                    fontSize: 9,
                    fontWeight: 900,
                    display: 'flex',
                    alignItems: 'center',
                    justifyContent: 'center',
                    padding: '0 3px',
                  }}
                >
                  {issueRows.length}
                </span>
              )}
            </button>
          ))}
        </div>
      )}

      {loading && <IngredientPriceSkeleton />}

      {/* ── 이슈 탭 ── */}
      {!loading && viewTab === 'issues' && (
        <div className="card" style={{ padding: 16 }}>
          {issueRows.length === 0 ? (
            <div style={{ textAlign: 'center', color: 'var(--text-3)', padding: '32px 0' }}>
              이슈 항목이 없습니다
            </div>
          ) : (
            <>
              <div style={{ fontSize: 12, color: 'var(--text-3)', marginBottom: 12 }}>
                분류·포장단위·가격 중 하나 이상이 없는 항목 {issueRows.length}개
              </div>
              <div style={{ overflowX: 'auto' }}>
                <table className="data-table">
                  <thead>
                    <tr>
                      <th>제품코드</th>
                      <th>제품명</th>
                      <th style={{ width: 80 }}>분류</th>
                      <th style={{ width: 90 }}>포장단위</th>
                      <th style={{ width: 110, textAlign: 'right' }}>부가세포함가</th>
                      <th style={{ width: 60 }}></th>
                    </tr>
                  </thead>
                  <tbody>
                    {issueRows.map((r, i) => (
                      <tr key={r.meta?.id ?? r.productCode ?? `issue-${i}`}>
                        <td style={{ fontSize: 11, color: 'var(--text-3)' }}>{r.productCode || '—'}</td>
                        <td style={{ fontWeight: 600 }}>{r.masterName || r.productName || '—'}</td>
                        <td style={{ color: !r.category ? 'var(--warn)' : undefined }}>
                          {r.category || '미설정'}
                        </td>
                        <td style={{ color: !r.baseQuantity ? 'var(--warn)' : undefined }}>
                          {r.baseQuantity != null ? `${r.baseQuantity}${r.baseUnitType || ''}` : '미설정'}
                        </td>
                        <td style={{ textAlign: 'right', color: r.priceWithTax == null ? 'var(--warn)' : undefined }}>
                          {r.priceWithTax != null ? `${r.priceWithTax.toLocaleString()}원` : '미연동'}
                        </td>
                        <td>
                          <button
                            className="btn sm"
                            onClick={() => setRegTarget(r)}
                            style={{ fontSize: 11 }}
                          >
                            수정
                          </button>
                        </td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              </div>
            </>
          )}
        </div>
      )}

      {/* ── 단가 탭 (식자재 마스터 컨텍스트) ── */}
      {!loading && viewTab !== 'issues' && (
        <>
          {/* 파일 기준 */}
          {fileInfo && (
            <div
              style={{
                display: 'flex',
                alignItems: 'center',
                gap: 8,
                marginBottom: 4,
                fontSize: 12,
                color: 'var(--text-3)',
              }}
            >
              <Icon.doc style={{ width: 13, height: 13 }} />
              <span>
                기준 파일: <b style={{ color: 'var(--text-2)' }}>{fileInfo.name}</b>
                {fileInfo.date && <span style={{ marginLeft: 6 }}>({fileInfo.date})</span>}
              </span>
            </div>
          )}

          {/* 통계 카드 */}
          <div className="stat-row">
            <div className="stat-card">
              <div className="stat-label">전체 제품</div>
              <div className="stat-value">
                {stats.total}
                <span className="unit">개</span>
              </div>
            </div>
            <div
              className="stat-card"
              style={{ cursor: 'pointer' }}
              onClick={() => setDeltaFilter(v => (v === 'up' ? 'all' : 'up'))}
            >
              <div className="stat-label">단가 인상</div>
              <div
                className="stat-value"
                style={{ color: stats.upCount > 0 ? 'var(--negative, #ef4444)' : undefined }}
              >
                {stats.upCount}
                <span className="unit">개</span>
              </div>
              <div style={{ fontSize: 11, color: 'var(--text-3)', marginTop: 6 }}>
                클릭하여 필터
              </div>
            </div>
            <div
              className="stat-card"
              style={{ cursor: 'pointer' }}
              onClick={() => setDeltaFilter(v => (v === 'down' ? 'all' : 'down'))}
            >
              <div className="stat-label">단가 인하</div>
              <div
                className="stat-value"
                style={{ color: stats.downCount > 0 ? 'var(--positive)' : undefined }}
              >
                {stats.downCount}
                <span className="unit">개</span>
              </div>
              <div style={{ fontSize: 11, color: 'var(--text-3)', marginTop: 6 }}>
                클릭하여 필터
              </div>
            </div>
            <div
              className="stat-card"
              style={{ cursor: 'pointer' }}
              onClick={() => setDeltaFilter(v => (v === 'new' ? 'all' : 'new'))}
            >
              <div className="stat-label">신규 항목</div>
              <div
                className="stat-value"
                style={{ color: stats.newCount > 0 ? 'var(--accent)' : undefined }}
              >
                {stats.newCount}
                <span className="unit">개</span>
              </div>
              <div style={{ fontSize: 11, color: 'var(--text-3)', marginTop: 6 }}>
                클릭하여 필터
              </div>
            </div>
          </div>

          {rows.length === 0 && (
            <div className="card" style={{ minHeight: 200, display: 'grid', placeItems: 'center' }}>
              <div style={{ textAlign: 'center', color: 'var(--text-3)' }}>
                <Icon.box style={{ width: 32, height: 32, marginBottom: 12, opacity: 0.4 }} />
                <div style={{ fontWeight: 600, marginBottom: 6 }}>
                  마스터에 등록된 식자재가 없습니다
                </div>
                <div style={{ fontSize: 13 }}>
                  식자재 관리에서 식자재를 등록하면 자동으로 표시됩니다.
                </div>
              </div>
            </div>
          )}
        </>
      )}

      {!loading && viewTab === 'price' && rows.length > 0 && (
        <>
          {/* 필터 바 */}
          <div
            style={{
              display: 'flex',
              gap: 8,
              flexWrap: 'wrap',
              alignItems: 'center',
              marginBottom: 4,
            }}
          >
            <div style={{ display: 'flex', gap: 4, alignItems: 'center' }}>
              <span style={{ fontSize: 11, color: 'var(--text-3)', fontWeight: 600 }}>과세</span>
              {['all', '과세', '면세'].map(t => (
                <button
                  key={t}
                  className={'chip' + (taxFilter === t ? ' active' : '')}
                  onClick={() => setTaxFilter(t)}
                >
                  {t === 'all' ? '전체' : t}
                </button>
              ))}
            </div>
          </div>

          {/* 검색 */}
          <div
            style={{
              display: 'flex',
              alignItems: 'center',
              gap: 8,
              marginBottom: 8,
              flexWrap: 'wrap',
            }}
          >
            <div className="filter-search" style={{ width: 260 }}>
              <Icon.search
                style={{ width: 15, height: 15, color: 'var(--text-3)', flexShrink: 0 }}
              />
              <input
                value={search}
                onChange={e => setSearch(e.target.value)}
                placeholder="제품코드·제품명·마스터명 검색"
              />
            </div>
            <SelectionToolbar
              selectedCount={priceTable.selected.size}
              confirming={priceTable.confirmingDelete}
              noun="식자재"
              onAskDelete={() => priceTable.setConfirmingDelete(true)}
              onConfirmDelete={handleSelectedDelete}
              onCancel={priceTable.clearSelection}
            />
          </div>

          {/* 테이블 */}
          <div className="card table-card content-enter">
            {filtered.length === 0 ? (
              <div
                style={{
                  padding: '40px 0',
                  textAlign: 'center',
                  color: 'var(--text-3)',
                  fontSize: 13,
                }}
              >
                조건에 맞는 항목이 없습니다
              </div>
            ) : (
              <div style={{ overflowX: 'auto' }}>
                <table className="data-table">
                  <thead>
                    <tr>
                      <th style={{ width: 34 }}>
                        <input
                          type="checkbox"
                          checked={priceTable.allPageSelected}
                          onChange={priceTable.togglePage}
                          style={{ width: 15, height: 15, accentColor: 'var(--accent)' }}
                        />
                      </th>
                      <SortableHeader
                        label="제품코드"
                        id="code"
                        sort={priceTable.sort}
                        onSort={priceTable.changeSort}
                        style={{ width: 90 }}
                      />
                      <SortableHeader
                        label="제품명"
                        id="name"
                        sort={priceTable.sort}
                        onSort={priceTable.changeSort}
                      />
                      <SortableHeader
                        label="분류"
                        id="category"
                        sort={priceTable.sort}
                        onSort={priceTable.changeSort}
                        style={{ width: 96 }}
                      />
                      <SortableHeader
                        label="부가세포함가"
                        id="price"
                        sort={priceTable.sort}
                        onSort={priceTable.changeSort}
                        style={{ width: 120, textAlign: 'right' }}
                      />
                      <th style={{ width: 92 }}>출처</th>
                      <th style={{ width: 100 }}>포장단위</th>
                      <SortableHeader
                        label="개당 단가"
                        id="unit"
                        sort={priceTable.sort}
                        onSort={priceTable.changeSort}
                        style={{ width: 120, textAlign: 'right' }}
                      />
                      <SortableHeader
                        label="단가변동"
                        id="delta"
                        sort={priceTable.sort}
                        onSort={priceTable.changeSort}
                        style={{ width: 110, textAlign: 'right' }}
                      />
                      <th style={{ width: 30 }}></th>
                      <th style={{ width: 60 }}></th>
                    </tr>
                  </thead>
                  <tbody>
                    {priceTable.paged.map((r, i) => (
                      <MasterRow
                        key={r.meta?.id ?? r.productCode ?? `row-${i}`}
                        r={r}
                        onRegClick={() => setRegTarget(r)}
                        selected={r.meta?.id != null && priceTable.selected.has(r.meta.id)}
                        onToggleSelect={() => r.meta?.id != null && priceTable.toggle(r.meta.id)}
                        onInlineSave={handleInlineSave}
                      />
                    ))}
                  </tbody>
                </table>
              </div>
            )}
            <div
              style={{
                padding: '8px 16px',
                fontSize: 11,
                color: 'var(--text-3)',
                borderTop: '1px solid var(--divider)',
              }}
            >
              <Pagination
                page={priceTable.page}
                totalPages={priceTable.totalPages}
                onPage={priceTable.goTo}
                total={priceTable.total}
                pageSize={priceTable.pageSize}
              />
              {priceTable.totalPages <= 1 && (
                <div style={{ padding: '8px 16px', fontSize: 11, color: 'var(--text-3)' }}>
                  {filtered.length}개 표시 / 전체 {rows.length}개
                </div>
              )}
            </div>
          </div>
        </>
      )}

      {/* 마스터 등록 모달 */}
      {regTarget && (
        <RegisterModal
          row={regTarget}
          extraCategories={[...new Set(rows.map(r => r.category).filter(Boolean))]}
          onSave={async data => {
            await upsertIngredientMeta({ productCode: regTarget.productCode, ...data });
            showToast('마스터 등록 완료');
            setRegTarget(null);
            await load();
          }}
          onClose={() => setRegTarget(null)}
        />
      )}

      {/* 제때 수량 동기화 모달 */}
      {syncQtyOpen && (
        <SyncBaseQtyModal
          onDone={async count => {
            showToast(`${count}개 기준수량 동기화 완료`);
            setSyncQtyOpen(false);
            await load();
          }}
          onClose={() => setSyncQtyOpen(false)}
        />
      )}
    </main>
  );
}
