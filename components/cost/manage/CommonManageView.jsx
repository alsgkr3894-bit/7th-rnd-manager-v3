'use client';
import { useEffect, useState, useCallback, useRef } from 'react';
import { showToast } from '@/components/Toast';
import { ConfirmDialog } from '@/components/ui/ConfirmDialog';
import { initDB } from '@/lib/db';
import { buildPriceRowMap, getPriceFiles, getPriceRowsByFileId } from '@/lib/price';
import { getAllIngredients } from '@/lib/ingredient';
import { buildUnitPriceMap } from '@/lib/recipe';
import {
  getAllRecipeGroups,
  saveRecipeGroup,
  deleteRecipeGroup,
} from '@/lib/cost/recipe-groups/store';
import {
  getAllEdges,
  upsertEdge,
  deleteEdge,
  seedEdges,
  resetAllEdges,
} from '@/lib/cost/edge-dough';
import { emptyGroup, groupToDraft } from '@/lib/cost/group-utils';
import { useIsMainBrand } from '@/hooks/useIsMainBrand';
import { CommonGroupsView } from '@/components/cost/manage/CommonGroupsView';
import { CommonEdgesView } from '@/components/cost/manage/CommonEdgesView';

/**
 * 공통 관리 본문 — 묶음 관리 / 엣지 관리.
 * 상위(원가레시피 페이지)가 탭을 제어하고 `tab` prop으로 표시 섹션을 지정.
 *
 * @param {{ tab: 'groups' | 'edges' }} props
 */
export function CommonManageView({ tab = 'groups' }) {
  const isMain = useIsMainBrand(); // 마스터 시드는 7번가 전용
  const [allMeta, setAllMeta] = useState([]);
  const [unitPriceMap, setUnitPriceMap] = useState(new Map());
  const [loading, setLoading] = useState(true);
  const [dbError, setDbError] = useState(null);

  // Groups state
  const [groups, setGroups] = useState([]);
  const [selectedId, setSelectedId] = useState(null);
  const [isNew, setIsNew] = useState(false);
  const [draft, setDraft] = useState(null);
  const [saving, setSaving] = useState(false);

  // Search state
  const [groupSearch, setGroupSearch] = useState('');
  const [edgeSearch, setEdgeSearch] = useState('');

  // Edges state
  const [edges, setEdges] = useState([]);
  const [edgeTarget, setEdgeTarget] = useState(null);
  const [deletePending, setDeletePending] = useState(null);
  const [pendingDeleteId, setPendingDeleteId] = useState(null);
  const [seeding, setSeeding] = useState(false);
  const [resetConfirm, setResetConfirm] = useState(false);
  const [resetting, setResetting] = useState(false);
  const mountedRef = useRef(true);

  const load = useCallback(async () => {
    await initDB();
    const [files, meta, gs, edgeList] = await Promise.all([
      getPriceFiles(),
      getAllIngredients(),
      getAllRecipeGroups(),
      getAllEdges(),
    ]);
    const latest = files[0] || null;
    let priceRowMap = new Map();
    if (latest) {
      const rows = await getPriceRowsByFileId(latest.id);
      priceRowMap = buildPriceRowMap(rows).map;
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
        console.error('[CommonManageView] load failed', err);
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
    if (!draft?.name?.trim()) {
      showToast('묶음 이름을 입력해주세요', 'error');
      return;
    }
    if (!draft?.defaultCategories?.length) {
      showToast('선택 가능 카테고리를 1개 이상 지정해주세요', 'error');
      return;
    }
    setSaving(true);
    try {
      const savedId = await saveRecipeGroup({ ...draft, id: isNew ? undefined : selectedId });
      showToast(isNew ? '묶음 등록 완료' : '묶음 수정 완료');
      await load();
      setIsNew(false);
      setSelectedId(isNew ? savedId : selectedId);
    } catch (e) {
      showToast('저장 실패: ' + e.message, 'error');
    } finally {
      setSaving(false);
    }
  }
  async function handleDeleteGroup(id) {
    if (!id) return;
    try {
      await deleteRecipeGroup(id);
    } catch (e) {
      showToast('삭제 실패: ' + e.message, 'error');
      return;
    }
    showToast('삭제 완료');
    setSelectedId(null);
    setIsNew(false);
    setDraft(null);
    await load();
  }

  // ── Edges handlers ──────────────────────────────────────────
  async function handleSaveEdge(data) {
    try {
      await upsertEdge(data);
      showToast('저장 완료', 'ok');
      setEdgeTarget(null);
      setEdges(await getAllEdges());
    } catch (err) {
      showToast('저장 실패: ' + err.message, 'error');
      throw err;
    }
  }
  async function handleDeleteEdge(id) {
    try {
      await deleteEdge(id);
      setEdges(prev => prev.filter(e => e.id !== id));
      setDeletePending(null);
      showToast('삭제 완료', 'ok');
    } catch (err) {
      showToast('삭제 실패: ' + err.message, 'error');
    }
  }
  async function handleBatchDeleteEdges(ids) {
    try {
      await Promise.all(ids.map(id => deleteEdge(id)));
      setEdges(prev => prev.filter(e => !ids.includes(e.id)));
      showToast(`${ids.length}개 삭제 완료`, 'ok');
      return true;
    } catch (err) {
      showToast('삭제 실패: ' + err.message, 'error');
      return false;
    }
  }
  async function handleSeedEdges() {
    if (seeding) return;
    setSeeding(true);
    try {
      const result = await seedEdges();
      showToast(`시드 완료 — 신규 ${result.inserted}개`, 'ok');
      setEdges(await getAllEdges());
    } catch (err) {
      showToast('시드 실패: ' + err.message, 'error');
    } finally {
      setSeeding(false);
    }
  }
  async function handleResetEdges() {
    if (resetting) return;
    setResetting(true);
    try {
      const result = await resetAllEdges();
      showToast(`초기화 완료 — ${result.deleted}개 삭제`, 'ok');
      setResetConfirm(false);
      setEdges([]);
    } catch (err) {
      showToast('초기화 실패: ' + err.message, 'error');
    } finally {
      setResetting(false);
    }
  }

  if (dbError)
    return (
      <div className="card" style={{ padding: 32, textAlign: 'center', color: 'var(--negative)' }}>
        데이터베이스 오류: {dbError}
      </div>
    );

  return (
    <>
      {tab === 'groups' && (
        <CommonGroupsView
          groups={groups}
          loading={loading}
          search={groupSearch}
          onSearch={setGroupSearch}
          selectedId={selectedId}
          isNew={isNew}
          draft={draft}
          setDraft={setDraft}
          allMeta={allMeta}
          unitPriceMap={unitPriceMap}
          saving={saving}
          onNew={handleNewGroup}
          onSelect={handleSelectGroup}
          onSave={handleSaveGroup}
          onAskDelete={setPendingDeleteId}
          onCancel={() => {
            setIsNew(false);
            setSelectedId(null);
            setDraft(null);
          }}
        />
      )}

      {tab === 'edges' && (
        <CommonEdgesView
          edges={edges}
          loading={loading}
          search={edgeSearch}
          onSearch={setEdgeSearch}
          isMain={isMain}
          resetConfirm={resetConfirm}
          resetting={resetting}
          onResetAsk={() => setResetConfirm(true)}
          onResetCancel={() => setResetConfirm(false)}
          onReset={handleResetEdges}
          seeding={seeding}
          onSeed={handleSeedEdges}
          onAdd={() => setEdgeTarget('new')}
          onEdit={setEdgeTarget}
          onSave={handleSaveEdge}
          edgeTarget={edgeTarget}
          onCloseEdit={() => setEdgeTarget(null)}
          deletePending={deletePending}
          onDeleteStart={setDeletePending}
          onDeleteConfirm={handleDeleteEdge}
          onDeleteCancel={() => setDeletePending(null)}
          onBatchDelete={handleBatchDeleteEdges}
        />
      )}

      {pendingDeleteId && (
        <ConfirmDialog
          open
          message="이 묶음 및 연결된 레시피 참조가 삭제됩니다. 되돌릴 수 없습니다. 계속할까요?"
          danger
          onConfirm={() => {
            handleDeleteGroup(pendingDeleteId);
            setPendingDeleteId(null);
          }}
          onCancel={() => setPendingDeleteId(null)}
        />
      )}
    </>
  );
}
