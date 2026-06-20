'use client';
import { useState, useMemo, useCallback } from 'react';
import dynamic from 'next/dynamic';
import { PageHeader } from '@/components/ui/PageHeader';
import { showToast } from '@/components/Toast';
import { upsertIngredientMeta, bulkDeleteIngredients, resetAllIngredients } from '@/lib/ingredient';
import { useIngredientPriceFilters } from '@/hooks/useIngredientPriceFilters';
import { useIngredientPriceData } from '@/hooks/useIngredientPriceData';
import { IngredientPriceSkeleton } from '@/components/ui/Skeleton';
import { useCostManageTable } from '@/components/cost/manage/table-utils';
import { useCurrentRole } from '@/hooks/useCurrentRole';
import {
  IngredientPriceEmbeddedActions,
  IngredientPriceHeaderActions,
} from '@/components/cost/ingredient-price/IngredientPriceActions';
import { IngredientPriceIssuesPanel } from '@/components/cost/ingredient-price/IngredientPriceIssuesPanel';
import { IngredientPriceListPanel } from '@/components/cost/ingredient-price/IngredientPriceListPanel';
import { IngredientPriceTabs } from '@/components/cost/ingredient-price/IngredientPriceTabs';

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

export function IngredientPriceView({ embedded = false }) {
  const { isViewer } = useCurrentRole();
  const [regTarget, setRegTarget] = useState(null);
  const [syncQtyOpen, setSyncQtyOpen] = useState(false);
  const [resetConfirm, setResetConfirm] = useState(false);
  const [resetting, setResetting] = useState(false);
  const [viewTab, setViewTab] = useState('price');
  const { rows, fileInfo, loading, dbError, reload: load } = useIngredientPriceData();
  const { search, setSearch, taxFilter, setTaxFilter, setDeltaFilter, filtered } =
    useIngredientPriceFilters(rows);
  const Shell = embedded ? 'section' : 'main';
  const shellClassName = embedded ? 'content-enter' : 'main';

  const handleReset = useCallback(async () => {
    setResetting(true);
    try {
      const { deleted } = await resetAllIngredients();
      showToast(`마스터 초기화 완료 — ${deleted}개 삭제`, 'ok');
      await load();
    } catch (e) {
      showToast('초기화 실패: ' + e.message, 'error');
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
      showToast('저장 실패: ' + err.message, 'error');
      throw err;
    }
  }

  async function handleSelectedDelete() {
    const ids = Array.from(priceTable.selected);
    if (ids.length === 0) return;
    try {
      const { removed, failures } = await bulkDeleteIngredients(ids);
      if (removed.length > 0) priceTable.clearSelection();
      if (failures.length > 0) {
        const prefix = removed.length > 0 ? `${removed.length}개 삭제, ` : '';
        showToast(`${prefix}${failures.length}개 삭제 실패`, 'error');
      } else {
        showToast(`${removed.length}개 삭제 완료`, 'ok');
      }
      await load();
    } catch (err) {
      showToast('삭제 실패: ' + err.message, 'error');
    }
  }

  if (dbError)
    return (
      <Shell className={shellClassName}>
        {!embedded && (
          <PageHeader
            breadcrumb={['원가계산', '식자재 단가 마스터']}
            title="식자재 단가 마스터"
            sub="로드 실패"
          />
        )}
        <div
          className="card"
          style={{ padding: 32, textAlign: 'center', color: 'var(--negative)' }}
        >
          <div>데이터베이스 오류: {dbError}</div>
          <button className="btn primary" style={{ marginTop: 12 }} onClick={load}>
            다시 시도
          </button>
        </div>
      </Shell>
    );

  return (
    <Shell className={shellClassName}>
      {!embedded && (
        <PageHeader
          breadcrumb={['원가계산', '식자재 단가 마스터']}
          title="식자재 단가 마스터"
          sub="제때 최신 단가 기준 — 마스터에 등록된 항목은 포장단위·개당 단가가 자동 계산돼요."
          actions={
            <IngredientPriceHeaderActions
              resetConfirm={resetConfirm}
              resetting={resetting}
              loading={loading}
              readOnly={isViewer}
              onAskReset={() => setResetConfirm(true)}
              onCancelReset={() => setResetConfirm(false)}
              onConfirmReset={() => {
                setResetConfirm(false);
                handleReset();
              }}
              onOpenSync={() => setSyncQtyOpen(true)}
            />
          }
        />
      )}
      {embedded && (
        <IngredientPriceEmbeddedActions
          loading={loading}
          resetting={resetting}
          readOnly={isViewer}
          onOpenSync={() => setSyncQtyOpen(true)}
        />
      )}

      {/* 탭 전환 — 로드 완료 후 항상 노출 (공급업체는 식자재 유무와 무관) */}
      {!loading && (
        <IngredientPriceTabs
          tabs={VIEW_TABS}
          activeTab={viewTab}
          issueCount={issueRows.length}
          onChange={setViewTab}
        />
      )}

      {loading && <IngredientPriceSkeleton />}

      {/* ── 이슈 탭 ── */}
      {!loading && viewTab === 'issues' && (
        <IngredientPriceIssuesPanel rows={issueRows} onEdit={setRegTarget} readOnly={isViewer} />
      )}

      {/* ── 단가 탭 (식자재 마스터 컨텍스트) ── */}
      {!loading && viewTab !== 'issues' && (
        <IngredientPriceListPanel
          fileInfo={fileInfo}
          stats={stats}
          rows={rows}
          filtered={filtered}
          taxFilter={taxFilter}
          search={search}
          priceTable={priceTable}
          readOnly={isViewer}
          onTaxFilter={setTaxFilter}
          onSearch={setSearch}
          onDeltaFilter={setDeltaFilter}
          onSelectedDelete={handleSelectedDelete}
          onRegClick={setRegTarget}
          onInlineSave={handleInlineSave}
        />
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
    </Shell>
  );
}
