'use client';

import { useEffect, useMemo } from 'react';
import dynamic from 'next/dynamic';
import { Icon } from '@/components/icons';
import { SearchBox } from '@/components/ui/SearchBox';
import { Pagination } from '@/components/ui/Pagination';
import { SortButton } from '@/components/ui/SortButton';
import { EdgeCard } from '@/components/cost/edge-dough/EdgeCard';
import { edgeTotalCost } from '@/lib/cost/edge-dough';
import {
  SelectionToolbar,
  sortButtonOptions,
  useCostManageTable,
} from '@/components/cost/manage/table-utils';

const EdgeEditModal = dynamic(
  () =>
    import('@/components/cost/edge-dough/EdgeEditModal').then(m => ({ default: m.EdgeEditModal })),
  { ssr: false }
);

export function CommonEdgesView({
  edges = [],
  loading = false,
  search = '',
  onSearch,
  isMain = false,
  canEdit = false,
  resetConfirm = false,
  resetting = false,
  onResetAsk,
  onResetCancel,
  onReset,
  seeding = false,
  onSeed,
  onAdd,
  onEdit,
  onSave,
  edgeTarget = null,
  onCloseEdit,
  deletePending = null,
  onDeleteStart,
  onDeleteConfirm,
  onDeleteCancel,
  onBatchDelete,
}) {
  const edgeFilled = edges.filter(edge => edge.components?.length > 0).length;
  const filteredEdges = useMemo(() => {
    const q = search.trim().toLowerCase();
    if (!q) return edges;
    return edges.filter(
      edge =>
        edge.edgeType?.toLowerCase().includes(q) ||
        edge.edgeCode?.toLowerCase().includes(q) ||
        (edge.size || '').toLowerCase().includes(q)
    );
  }, [edges, search]);

  const edgeSortOptions = useMemo(
    () => [
      { id: 'name', label: '이름', key: edge => edge.edgeType },
      { id: 'code', label: '코드', key: edge => edge.edgeCode },
      { id: 'size', label: '규격', key: edge => edge.size },
      { id: 'cost', label: '원가', key: edge => edgeTotalCost(edge) },
    ],
    []
  );

  const edgeTable = useCostManageTable(filteredEdges, {
    sortOptions: edgeSortOptions,
    initialSort: { id: 'name', dir: 'asc' },
    getRowId: row => row.id,
  });

  useEffect(() => {
    edgeTable.clearSelection();
  }, [search]); // eslint-disable-line react-hooks/exhaustive-deps

  async function handleBatchDelete() {
    if (!canEdit) return;
    const ok = await onBatchDelete(Array.from(edgeTable.selected));
    if (ok) edgeTable.clearSelection();
  }

  return (
    <div>
      <div
        style={{
          display: 'flex',
          gap: 8,
          marginBottom: 16,
          flexWrap: 'wrap',
          alignItems: 'center',
        }}
      >
        <SearchBox value={search} onChange={onSearch} placeholder="엣지·도우 이름 검색" />
        <span style={{ fontSize: 13, color: 'var(--text-3)', whiteSpace: 'nowrap' }}>
          {edgeFilled}/{edges.length}개 구성 완료
        </span>
        <div style={{ marginLeft: 'auto', display: 'flex', gap: 6 }}>
          {resetConfirm ? (
            <span style={{ display: 'flex', gap: 6, alignItems: 'center' }}>
              <span style={{ fontSize: 12, color: 'var(--negative)', fontWeight: 600 }}>
                전체({edges.length}개) 삭제할까요?
              </span>
              <button
                className="btn"
                style={{ background: 'var(--negative)', color: '#fff', border: 'none' }}
                onClick={onReset}
                disabled={resetting || !canEdit}
              >
                {resetting ? '삭제 중…' : '삭제'}
              </button>
              <button className="btn" onClick={onResetCancel}>
                취소
              </button>
            </span>
          ) : (
            <button
              className="btn"
              onClick={onResetAsk}
              style={{ color: 'var(--text-3)' }}
              disabled={edges.length === 0 || !canEdit}
            >
              <Icon.trash style={{ width: 14, height: 14 }} /> 초기화
            </button>
          )}
          {isMain && (
            <button className="btn" onClick={onSeed} disabled={seeding || !canEdit}>
              <Icon.download style={{ width: 14, height: 14 }} />
              {seeding ? '시드 중…' : '마스터 시드 (5종)'}
            </button>
          )}
          <button className="btn primary" onClick={onAdd} disabled={!canEdit}>
            <Icon.plus style={{ width: 14, height: 14 }} /> 추가
          </button>
        </div>
      </div>

      {loading ? (
        <div style={{ padding: 12 }}>
          {Array.from({ length: 4 }).map((_, i) => (
            <div
              key={i}
              style={{
                height: 44,
                marginBottom: 8,
                borderRadius: 8,
                background: 'var(--surface-2)',
                opacity: 1 - i * 0.15,
              }}
            />
          ))}
        </div>
      ) : edges.length === 0 ? (
        <div className="card" style={{ minHeight: 200, display: 'grid', placeItems: 'center' }}>
          <div style={{ textAlign: 'center', color: 'var(--text-3)' }}>
            <Icon.calc style={{ width: 32, height: 32, marginBottom: 12, opacity: 0.4 }} />
            <div style={{ fontWeight: 600, marginBottom: 4 }}>등록된 엣지·도우가 없습니다</div>
            <div style={{ fontSize: 13 }}>
              {isMain ? (
                <>
                  <b>마스터 시드</b>로 5종 (치즈크러스트 L/R · 골드스윗크러스트 L/R · 씬도우 L) 일괄
                  등록
                </>
              ) : (
                <>
                  <b>추가</b> 버튼으로 엣지·도우를 직접 등록하세요
                </>
              )}
            </div>
          </div>
        </div>
      ) : filteredEdges.length === 0 ? (
        <div className="card" style={{ minHeight: 100, display: 'grid', placeItems: 'center' }}>
          <div style={{ textAlign: 'center', color: 'var(--text-3)', fontSize: 13 }}>
            검색 결과가 없습니다
          </div>
        </div>
      ) : (
        <div style={{ display: 'flex', flexDirection: 'column', gap: 8 }}>
          <div
            style={{
              display: 'flex',
              justifyContent: 'space-between',
              gap: 8,
              flexWrap: 'wrap',
              alignItems: 'center',
            }}
          >
            <SortButton
              value={edgeTable.sort?.id}
              options={sortButtonOptions(edgeSortOptions, edgeTable.sort)}
              onChange={edgeTable.changeSort}
            />
            <SelectionToolbar
              selectedCount={edgeTable.selected.size}
              confirming={edgeTable.confirmingDelete}
              noun="엣지·도우"
              onAskDelete={() => edgeTable.setConfirmingDelete(true)}
              onConfirmDelete={handleBatchDelete}
              onCancel={edgeTable.clearSelection}
              canEdit={canEdit}
            />
          </div>
          <label
            style={{
              display: 'inline-flex',
              alignItems: 'center',
              gap: 8,
              width: 'fit-content',
              fontSize: 12,
              color: 'var(--text-3)',
            }}
          >
            <input
              type="checkbox"
              checked={edgeTable.allPageSelected}
              onChange={edgeTable.togglePage}
              disabled={!canEdit}
              style={{ width: 15, height: 15, accentColor: 'var(--accent)' }}
            />
            현재 페이지 선택
          </label>
          {edgeTable.paged.map(edge => (
            <div
              key={edge.id}
              style={{
                display: 'grid',
                gridTemplateColumns: '24px 1fr',
                gap: 8,
                alignItems: 'center',
              }}
            >
              <input
                type="checkbox"
                checked={edgeTable.selected.has(edge.id)}
                onChange={() => edgeTable.toggle(edge.id)}
                disabled={!canEdit}
                style={{ width: 16, height: 16, accentColor: 'var(--accent)' }}
              />
              <EdgeCard
                edge={edge}
                canEdit={canEdit}
                onEdit={() => onEdit(edge)}
                onDelete={deletePending === edge.id ? null : () => onDeleteStart(edge.id)}
              />
            </div>
          ))}
          <Pagination
            page={edgeTable.page}
            totalPages={edgeTable.totalPages}
            onPage={edgeTable.goTo}
            total={edgeTable.total}
            pageSize={edgeTable.pageSize}
          />
        </div>
      )}

      {canEdit && deletePending && (
        <div
          style={{
            position: 'fixed',
            bottom: 24,
            left: '50%',
            transform: 'translateX(-50%)',
            background: 'var(--surface-1)',
            border: '1px solid var(--border)',
            borderRadius: 12,
            padding: '12px 18px',
            boxShadow: '0 4px 16px rgba(0,0,0,.15)',
            display: 'flex',
            gap: 10,
            alignItems: 'center',
            zIndex: 50,
          }}
        >
          <span style={{ fontSize: 13, fontWeight: 600 }}>이 엣지를 삭제할까요?</span>
          <button
            className="btn"
            style={{ background: 'var(--negative)', color: '#fff', border: 'none' }}
            onClick={() => onDeleteConfirm(deletePending)}
          >
            삭제
          </button>
          <button className="btn" onClick={onDeleteCancel}>
            취소
          </button>
        </div>
      )}

      {canEdit && edgeTarget !== null && (
        <EdgeEditModal
          initial={edgeTarget === 'new' ? null : edgeTarget}
          onSave={onSave}
          onClose={onCloseEdit}
        />
      )}
    </div>
  );
}
