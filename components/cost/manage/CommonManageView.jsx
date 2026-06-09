'use client';
import { useEffect, useState, useCallback, useMemo, useRef } from 'react';
import dynamic from 'next/dynamic';
import { Icon } from '@/components/icons';
import { SearchBox } from '@/components/ui/SearchBox';
import { Pagination } from '@/components/ui/Pagination';
import { SortButton } from '@/components/ui/SortButton';
import { showToast } from '@/components/Toast';
import { ConfirmDialog } from '@/components/ui/ConfirmDialog';
import { initDB } from '@/lib/db';
import { getPriceFiles, getPriceRowsByFileId } from '@/lib/price';
import { getAllIngredients } from '@/lib/ingredient';
import { buildUnitPriceMap } from '@/lib/recipe';
import { getAllRecipeGroups, saveRecipeGroup, deleteRecipeGroup } from '@/lib/cost/recipe-groups/store';
import {
  getAllEdges, upsertEdge, deleteEdge, seedEdges, resetAllEdges,
} from '@/lib/cost/edge-dough';
import { EdgeCard } from '@/components/cost/edge-dough/EdgeCard';
import { edgeTotalCost } from '@/lib/cost/edge-dough';
import { emptyGroup, groupToDraft } from '@/lib/cost/group-utils';
import {
  SelectionToolbar,
  sortButtonOptions,
  useCostManageTable,
} from '@/components/cost/manage/table-utils';
import { useIsMainBrand } from '@/hooks/useIsMainBrand';

const EdgeEditModal = dynamic(() => import('@/components/cost/edge-dough/EdgeEditModal').then(m => ({ default: m.EdgeEditModal })), { ssr: false });
const GroupEditor   = dynamic(() => import('@/components/cost/recipe-groups/GroupEditor').then(m => ({ default: m.GroupEditor })), { ssr: false });

/**
 * 공통 관리 본문 — 묶음 관리 / 엣지 관리.
 * 상위(원가레시피 페이지)가 탭을 제어하고 `tab` prop으로 표시 섹션을 지정.
 *
 * @param {{ tab: 'groups' | 'edges' }} props
 */
export function CommonManageView({ tab = 'groups' }) {
  const isMain = useIsMainBrand(); // 마스터 시드는 7번가 전용
  const [allMeta,      setAllMeta]      = useState([]);
  const [unitPriceMap, setUnitPriceMap] = useState(new Map());
  const [loading,      setLoading]      = useState(true);
  const [dbError,      setDbError]      = useState(null);

  // Groups state
  const [groups,     setGroups]     = useState([]);
  const [selectedId, setSelectedId] = useState(null);
  const [isNew,      setIsNew]      = useState(false);
  const [draft,      setDraft]      = useState(null);
  const [saving,     setSaving]     = useState(false);

  // Search state
  const [groupSearch, setGroupSearch] = useState('');
  const [edgeSearch,  setEdgeSearch]  = useState('');

  // Edges state
  const [edges,        setEdges]        = useState([]);
  const [edgeTarget,   setEdgeTarget]   = useState(null);
  const [deletePending,setDeletePending]= useState(null);
  const [pendingDeleteId, setPendingDeleteId] = useState(null);
  const [seeding,      setSeeding]      = useState(false);
  const [resetConfirm, setResetConfirm] = useState(false);
  const [resetting,    setResetting]    = useState(false);
  const mountedRef = useRef(true);

  const load = useCallback(async () => {
    await initDB();
    const [files, meta, gs, edgeList] = await Promise.all([
      getPriceFiles(), getAllIngredients(), getAllRecipeGroups(), getAllEdges(),
    ]);
    const latest = files[0] || null;
    let priceRowMap = new Map();
    if (latest) {
      const rows = await getPriceRowsByFileId(latest.id);
      rows.forEach(r => { if (r.productCode) priceRowMap.set(r.productCode, r); });
    }
    if (!mountedRef.current) return;
    setAllMeta(meta);
    setUnitPriceMap(buildUnitPriceMap(meta, priceRowMap));
    setGroups(gs);
    setEdges(edgeList);
  }, []);

  useEffect(() => {
    mountedRef.current = true;
    load()
      .catch(err => {
        if (!mountedRef.current) return;
        console.error(err);
        setDbError(err.message || '데이터 로드 실패');
      })
      .finally(() => {
        if (mountedRef.current) setLoading(false);
      });

    return () => {
      mountedRef.current = false;
    };
  }, [load]);

  // ── Groups handlers ─────────────────────────────────────────
  function handleSelectGroup(id) {
    setSelectedId(id);
    setIsNew(false);
    const g = groups.find(r => r.id === id);
    if (g) setDraft(groupToDraft(g));
  }
  function handleNewGroup() {
    setSelectedId(null);
    setIsNew(true);
    setDraft(emptyGroup());
  }
  async function handleSaveGroup() {
    if (!draft?.name?.trim()) { showToast('묶음 이름을 입력해주세요'); return; }
    setSaving(true);
    try {
      const savedId = await saveRecipeGroup({ ...draft, id: isNew ? undefined : selectedId });
      showToast(isNew ? '묶음 등록 완료' : '묶음 수정 완료');
      await load();
      setIsNew(false);
      setSelectedId(isNew ? savedId : selectedId);
    } catch (e) { showToast('저장 실패: ' + e.message); }
    finally { setSaving(false); }
  }
  async function handleDeleteGroup(id) {
    if (!id) return;
    try {
      await deleteRecipeGroup(id);
    } catch (e) { showToast('삭제 실패: ' + e.message); return; }
    showToast('삭제 완료');
    setSelectedId(null); setIsNew(false); setDraft(null);
    await load();
  }

  // ── Edges handlers ──────────────────────────────────────────
  async function handleSaveEdge(data) {
    try {
      await upsertEdge(data);
      showToast('저장 완료', 'ok');
      setEdgeTarget(null);
      setEdges(await getAllEdges());
    } catch (err) { showToast('저장 실패: ' + err.message, 'err'); throw err; }
  }
  async function handleDeleteEdge(id) {
    try {
      await deleteEdge(id);
      setEdges(prev => prev.filter(e => e.id !== id));
      setDeletePending(null);
      showToast('삭제 완료', 'ok');
    } catch (err) { showToast('삭제 실패: ' + err.message, 'err'); }
  }
  async function handleBatchDeleteEdges(ids) {
    try {
      await Promise.all(ids.map(id => deleteEdge(id)));
      setEdges(prev => prev.filter(e => !ids.includes(e.id)));
      edgeTable.clearSelection();
      showToast(`${ids.length}개 삭제 완료`, 'ok');
    } catch (err) { showToast('삭제 실패: ' + err.message, 'err'); }
  }
  async function handleSeedEdges() {
    if (seeding) return;
    setSeeding(true);
    try {
      const result = await seedEdges();
      showToast(`시드 완료 — 신규 ${result.inserted}개`, 'ok');
      setEdges(await getAllEdges());
    } catch (err) { showToast('시드 실패: ' + err.message, 'err'); }
    finally { setSeeding(false); }
  }
  async function handleResetEdges() {
    if (resetting) return;
    setResetting(true);
    try {
      const result = await resetAllEdges();
      showToast(`초기화 완료 — ${result.deleted}개 삭제`, 'ok');
      setResetConfirm(false); setEdges([]);
    } catch (err) { showToast('초기화 실패: ' + err.message, 'err'); }
    finally { setResetting(false); }
  }

  const showGroupEditor = isNew || selectedId != null;
  const edgeFilled = edges.filter(e => e.components?.length > 0).length;

  const filteredGroups = useMemo(() => {
    const q = groupSearch.trim().toLowerCase();
    if (!q) return groups;
    return groups.filter(g => g.name?.toLowerCase().includes(q));
  }, [groups, groupSearch]);

  const filteredEdges = useMemo(() => {
    const q = edgeSearch.trim().toLowerCase();
    if (!q) return edges;
    return edges.filter(e => e.edgeType?.toLowerCase().includes(q) || e.edgeCode?.toLowerCase().includes(q) || (e.size || '').toLowerCase().includes(q));
  }, [edges, edgeSearch]);

  const edgeSortOptions = useMemo(() => [
    { id: 'name', label: '이름', key: e => e.edgeType },
    { id: 'code', label: '코드', key: e => e.edgeCode },
    { id: 'size', label: '규격', key: e => e.size },
    { id: 'cost', label: '원가', key: e => edgeTotalCost(e) },
  ], []);

  const edgeTable = useCostManageTable(filteredEdges, {
    sortOptions: edgeSortOptions,
    initialSort: { id: 'name', dir: 'asc' },
    getRowId: row => row.id,
  });

  if (dbError) return (
    <div className="card" style={{ padding: 32, textAlign: 'center', color: 'var(--negative)' }}>
      데이터베이스 오류: {dbError}
    </div>
  );

  return (
    <>
      {/* ── 묶음 관리 탭 ── */}
      {tab === 'groups' && (
        <div style={{ display: 'grid', gridTemplateColumns: '280px 1fr', gap: 16, alignItems: 'start' }}>
          <div className="card" style={{ padding: 0, overflow: 'hidden' }}>
            <div style={{ padding: '12px 14px 8px', borderBottom: '1px solid var(--divider)' }}>
              <button className="btn primary" style={{ width: '100%', justifyContent: 'center', marginBottom: 8 }} onClick={handleNewGroup}>
                <Icon.plus style={{ width: 13, height: 13 }}/> 새 묶음 추가
              </button>
              <SearchBox value={groupSearch} onChange={setGroupSearch} placeholder="묶음 이름 검색" />
            </div>
            {loading ? (
              <div style={{ padding: 8 }}>
                {Array.from({ length: 5 }).map((_, i) => (
                  <div key={i} style={{ height: 52, marginBottom: 6, borderRadius: 6, background: 'var(--surface-2)', opacity: 1 - i * 0.12 }} />
                ))}
              </div>
            ) : filteredGroups.length === 0 ? (
              <div style={{ padding: 24, textAlign: 'center', color: 'var(--text-3)', fontSize: 13 }}>
                {groupSearch ? '검색 결과가 없습니다' : '등록된 묶음이 없습니다'}
              </div>
            ) : (
              <div style={{ maxHeight: 'calc(100vh - 320px)', overflowY: 'auto' }}>
                {filteredGroups.map(g => {
                  const active = g.id === selectedId;
                  return (
                    <button key={g.id} onClick={() => handleSelectGroup(g.id)}
                      style={{ display: 'block', width: '100%', textAlign: 'left',
                        padding: '10px 14px', border: 0, cursor: 'pointer',
                        background: active ? 'var(--surface-2)' : 'transparent',
                        borderLeft: active ? '3px solid var(--accent)' : '3px solid transparent' }}>
                      <div style={{ fontWeight: 600, fontSize: 13 }}>{g.name}</div>
                      <div style={{ fontSize: 11, color: 'var(--text-3)', marginTop: 2 }}>
                        사이즈: {(g.sizes || []).join(', ')} · 재료 {(g.ingredients || []).length}개
                      </div>
                    </button>
                  );
                })}
              </div>
            )}
          </div>

          {showGroupEditor && draft ? (
            <GroupEditor
              key={isNew ? 'new' : selectedId}
              draft={draft} setDraft={setDraft}
              allMeta={allMeta} unitPriceMap={unitPriceMap}
              isNew={isNew} saving={saving}
              onSave={handleSaveGroup}
              onDelete={!isNew ? () => setPendingDeleteId(selectedId) : null}
              onCancel={() => { setIsNew(false); setSelectedId(null); setDraft(null); }}
            />
          ) : (
            <div className="card" style={{ minHeight: 200, display: 'grid', placeItems: 'center' }}>
              <div style={{ textAlign: 'center', color: 'var(--text-3)' }}>
                <Icon.box style={{ width: 28, height: 28, opacity: .4, marginBottom: 8 }}/>
                <div style={{ fontSize: 13 }}>묶음을 선택하거나 새로 추가하세요</div>
              </div>
            </div>
          )}
        </div>
      )}

      {/* ── 엣지 관리 탭 ── */}
      {tab === 'edges' && (
        <div>
          <div style={{ display: 'flex', gap: 8, marginBottom: 16, flexWrap: 'wrap', alignItems: 'center' }}>
            <SearchBox value={edgeSearch} onChange={setEdgeSearch} placeholder="엣지·도우 이름 검색" />
            <span style={{ fontSize: 13, color: 'var(--text-3)', whiteSpace: 'nowrap' }}>
              {edgeFilled}/{edges.length}개 구성 완료
            </span>
            <div style={{ marginLeft: 'auto', display: 'flex', gap: 6 }}>
              {resetConfirm ? (
                <span style={{ display: 'flex', gap: 6, alignItems: 'center' }}>
                  <span style={{ fontSize: 12, color: 'var(--negative)', fontWeight: 600 }}>
                    전체({edges.length}개) 삭제할까요?
                  </span>
                  <button className="btn" style={{ background: 'var(--negative)', color: '#fff', border: 'none' }}
                    onClick={handleResetEdges} disabled={resetting}>
                    {resetting ? '삭제 중…' : '삭제'}
                  </button>
                  <button className="btn" onClick={() => setResetConfirm(false)}>취소</button>
                </span>
              ) : (
                <button className="btn" onClick={() => setResetConfirm(true)}
                  style={{ color: 'var(--text-3)' }} disabled={edges.length === 0}>
                  <Icon.trash style={{ width: 14, height: 14 }}/> 초기화
                </button>
              )}
              {isMain && (
                <button className="btn" onClick={handleSeedEdges} disabled={seeding}>
                  <Icon.download style={{ width: 14, height: 14 }}/>
                  {seeding ? '시드 중…' : '마스터 시드 (5종)'}
                </button>
              )}
              <button className="btn primary" onClick={() => setEdgeTarget('new')}>
                <Icon.plus style={{ width: 14, height: 14 }}/> 추가
              </button>
            </div>
          </div>

          {loading ? (
            <div style={{ padding: 12 }}>
              {Array.from({ length: 4 }).map((_, i) => (
                <div key={i} style={{ height: 44, marginBottom: 8, borderRadius: 8, background: 'var(--surface-2)', opacity: 1 - i * 0.15 }} />
              ))}
            </div>
          ) : edges.length === 0 ? (
            <div className="card" style={{ minHeight: 200, display: 'grid', placeItems: 'center' }}>
              <div style={{ textAlign: 'center', color: 'var(--text-3)' }}>
                <Icon.calc style={{ width: 32, height: 32, marginBottom: 12, opacity: .4 }}/>
                <div style={{ fontWeight: 600, marginBottom: 4 }}>등록된 엣지·도우가 없습니다</div>
                <div style={{ fontSize: 13 }}>
                  {isMain
                    ? <><b>마스터 시드</b>로 5종 (치즈크러스트 L/R · 골드스윗크러스트 L/R · 씬도우 L) 일괄 등록</>
                    : <><b>추가</b> 버튼으로 엣지·도우를 직접 등록하세요</>}
                </div>
              </div>
            </div>
          ) : filteredEdges.length === 0 ? (
            <div className="card" style={{ minHeight: 100, display: 'grid', placeItems: 'center' }}>
              <div style={{ textAlign: 'center', color: 'var(--text-3)', fontSize: 13 }}>검색 결과가 없습니다</div>
            </div>
          ) : (
            <div style={{ display: 'flex', flexDirection: 'column', gap: 8 }}>
              <div style={{ display: 'flex', justifyContent: 'space-between', gap: 8, flexWrap: 'wrap', alignItems: 'center' }}>
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
                  onConfirmDelete={() => handleBatchDeleteEdges(Array.from(edgeTable.selected))}
                  onCancel={edgeTable.clearSelection}
                />
              </div>
              <label style={{ display: 'inline-flex', alignItems: 'center', gap: 8, width: 'fit-content', fontSize: 12, color: 'var(--text-3)' }}>
                <input
                  type="checkbox"
                  checked={edgeTable.allPageSelected}
                  onChange={edgeTable.togglePage}
                  style={{ width: 15, height: 15, accentColor: 'var(--accent)' }}
                />
                현재 페이지 선택
              </label>
              {edgeTable.paged.map(e => (
                <div key={e.id} style={{ display: 'grid', gridTemplateColumns: '24px 1fr', gap: 8, alignItems: 'center' }}>
                  <input
                    type="checkbox"
                    checked={edgeTable.selected.has(e.id)}
                    onChange={() => edgeTable.toggle(e.id)}
                    style={{ width: 16, height: 16, accentColor: 'var(--accent)' }}
                  />
                  <EdgeCard edge={e}
                    onEdit={() => setEdgeTarget(e)}
                    onDelete={deletePending === e.id ? null : () => setDeletePending(e.id)}
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

          {deletePending && (
            <div style={{
              position: 'fixed', bottom: 24, left: '50%', transform: 'translateX(-50%)',
              background: 'var(--surface-1)', border: '1px solid var(--border)', borderRadius: 12,
              padding: '12px 18px', boxShadow: '0 4px 16px rgba(0,0,0,.15)',
              display: 'flex', gap: 10, alignItems: 'center', zIndex: 50,
            }}>
              <span style={{ fontSize: 13, fontWeight: 600 }}>이 엣지를 삭제할까요?</span>
              <button className="btn" style={{ background: 'var(--negative)', color: '#fff', border: 'none' }}
                onClick={() => handleDeleteEdge(deletePending)}>삭제</button>
              <button className="btn" onClick={() => setDeletePending(null)}>취소</button>
            </div>
          )}

          {edgeTarget !== null && (
            <EdgeEditModal
              initial={edgeTarget === 'new' ? null : edgeTarget}
              onSave={handleSaveEdge}
              onClose={() => setEdgeTarget(null)}
            />
          )}
        </div>
      )}

      {pendingDeleteId && (
        <ConfirmDialog
          open
          message="묶음을 삭제할까요?"
          danger
          onConfirm={() => { handleDeleteGroup(pendingDeleteId); setPendingDeleteId(null); }}
          onCancel={() => setPendingDeleteId(null)}
        />
      )}
    </>
  );
}
