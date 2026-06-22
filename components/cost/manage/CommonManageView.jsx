'use client';
import { useState } from 'react';
import { showToast } from '@/components/Toast';
import { ConfirmDialog } from '@/components/ui/ConfirmDialog';
import { useDBLoad } from '@/hooks/useDBLoad';
import { useCurrentRole } from '@/hooks/useCurrentRole';
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
  const { isAdmin, ready: roleReady } = useCurrentRole();
  const canEdit = roleReady && isAdmin;

  const {
    data,
    loading,
    errorMessage: dbError,
    reload: load,
  } = useDBLoad(
    async () => {
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
      return {
        allMeta: meta,
        unitPriceMap: buildUnitPriceMap(meta, priceRowMap),
        groups: gs,
        edges: edgeList,
      };
    },
    { initialData: null, onError: err => console.error('[CommonManageView] load failed', err) }
  );

  const allMeta = data?.allMeta ?? [];
  const unitPriceMap = data?.unitPriceMap ?? new Map();
  const groups = data?.groups ?? [];
  const edges = data?.edges ?? [];

  // Groups state
  const [selectedId, setSelectedId] = useState(null);
  const [isNew, setIsNew] = useState(false);
  const [draft, setDraft] = useState(null);
  const [saving, setSaving] = useState(false);

  // Search state
  const [groupSearch, setGroupSearch] = useState('');
  const [edgeSearch, setEdgeSearch] = useState('');

  // Edges state
  const [edgeTarget, setEdgeTarget] = useState(null);
  const [deletePending, setDeletePending] = useState(null);
  const [pendingDeleteId, setPendingDeleteId] = useState(null);
  const [seeding, setSeeding] = useState(false);
  const [resetConfirm, setResetConfirm] = useState(false);
  const [resetting, setResetting] = useState(false);

  function ensureCanEdit() {
    if (canEdit) return true;
    showToast(roleReady ? '관리자 권한이 필요합니다' : '권한 확인 중입니다', 'error');
    return false;
  }

  // ── Groups handlers ─────────────────────────────────────────
  function handleSelectGroup(id) {
    setSelectedId(id);
    setIsNew(false);
    const g = groups.find(r => r.id === id);
    if (g) setDraft(groupToDraft(g));
  }
  function handleNewGroup() {
    if (!ensureCanEdit()) return;
    setSelectedId(null);
    setIsNew(true);
    setDraft(emptyGroup());
  }
  async function handleSaveGroup() {
    if (!ensureCanEdit()) return;
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
      load();
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
    if (!ensureCanEdit()) return;
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
    load();
  }

  // ── Edges handlers ──────────────────────────────────────────
  async function handleSaveEdge(data) {
    if (!ensureCanEdit()) return;
    try {
      await upsertEdge(data);
      showToast('저장 완료', 'ok');
      setEdgeTarget(null);
      load();
    } catch (err) {
      showToast('저장 실패: ' + err.message, 'error');
      throw err;
    }
  }
  async function handleDeleteEdge(id) {
    if (!ensureCanEdit()) return;
    try {
      await deleteEdge(id);
      setDeletePending(null);
      load();
      showToast('삭제 완료', 'ok');
    } catch (err) {
      showToast('삭제 실패: ' + err.message, 'error');
    }
  }
  async function handleBatchDeleteEdges(ids) {
    if (!ensureCanEdit()) return false;
    try {
      await Promise.all(ids.map(id => deleteEdge(id)));
      showToast(`${ids.length}개 삭제 완료`, 'ok');
      load();
      return true;
    } catch (err) {
      showToast('삭제 실패: ' + err.message, 'error');
      return false;
    }
  }
  async function handleSeedEdges() {
    if (seeding) return;
    if (!ensureCanEdit()) return;
    setSeeding(true);
    try {
      const result = await seedEdges();
      showToast(`시드 완료 — 신규 ${result.inserted}개`, 'ok');
      load();
    } catch (err) {
      showToast('시드 실패: ' + err.message, 'error');
    } finally {
      setSeeding(false);
    }
  }
  async function handleResetEdges() {
    if (resetting) return;
    if (!ensureCanEdit()) return;
    setResetting(true);
    try {
      const result = await resetAllEdges();
      showToast(`초기화 완료 — ${result.deleted}개 삭제`, 'ok');
      setResetConfirm(false);
      load();
    } catch (err) {
      showToast('초기화 실패: ' + err.message, 'error');
    } finally {
      setResetting(false);
    }
  }

  if (dbError)
    return (
      <div className="card" style={{ padding: 32, textAlign: 'center', color: 'var(--negative)' }}>
        <div>데이터베이스 오류: {dbError}</div>
        <button className="btn primary" style={{ marginTop: 12 }} onClick={load}>
          다시 시도
        </button>
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
          canEdit={canEdit}
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
          canEdit={canEdit}
          resetConfirm={resetConfirm}
          resetting={resetting}
          onResetAsk={() => {
            if (ensureCanEdit()) setResetConfirm(true);
          }}
          onResetCancel={() => setResetConfirm(false)}
          onReset={handleResetEdges}
          seeding={seeding}
          onSeed={handleSeedEdges}
          onAdd={() => {
            if (ensureCanEdit()) setEdgeTarget('new');
          }}
          onEdit={edge => {
            if (ensureCanEdit()) setEdgeTarget(edge);
          }}
          onSave={handleSaveEdge}
          edgeTarget={edgeTarget}
          onCloseEdit={() => setEdgeTarget(null)}
          deletePending={deletePending}
          onDeleteStart={id => {
            if (ensureCanEdit()) setDeletePending(id);
          }}
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
