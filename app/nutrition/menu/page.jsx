'use client';
import { useState, useMemo } from 'react';
import { useVisibilityRefresh } from '@/hooks/useVisibilityRefresh';
import { useDBLoad } from '@/hooks/useDBLoad';
import { PageHeader } from '@/components/ui/PageHeader';
import { showToast } from '@/components/Toast';
import { getAllIngredients } from '@/lib/ingredient';
import { getAllMenuMaster } from '@/lib/menu-master';
import {
  getAllMenuRefs,
  getRawValueMap,
  getAllEdges,
  getAllToppings,
  getAllCompositions,
  getAllSetCompositions,
  getNutritionBaseDuplicateDiagnostics,
  repairNutritionBaseDuplicates,
  deleteMenuRefsByMenuCodes,
} from '@/lib/nutrition/values/store';
import { asDisplayText, asObjectArray, asRecord } from '@/lib/ui/prop-guards';
import { getMenuCodeRank } from '@/lib/menu-categories';
import { useConfirmDialog } from '@/hooks/useConfirmDialog';
import { buildNutritionMenuMasterDiagnostics } from '@/lib/nutrition/menu-master-diagnostics';
import { useCurrentRole } from '@/hooks/useCurrentRole';
import { DuplicateNotice, MissingMasterNotice } from './NutritionMenuNotices';
import { NutritionMenuSkeleton } from './NutritionMenuSkeleton';
import { NutritionMenuWorkspace } from './NutritionMenuWorkspace';

export default function Page() {
  const [tab, setTab] = useState(0);
  const [menuSearch, setMenuSearch] = useState('');
  const [repairingDuplicates, setRepairingDuplicates] = useState(false);
  const [repairingOrphanMenus, setRepairingOrphanMenus] = useState(false);
  const { showConfirm, confirmElement } = useConfirmDialog();
  const { isAdmin } = useCurrentRole();

  const { data, loading, error, reload } = useDBLoad(
    async () => {
      const [
        menuRefs,
        rawValues,
        edgeList,
        toppingList,
        compositionList,
        masters,
        ingredientList,
        setCompList,
        duplicateDiag,
      ] = await Promise.all([
        getAllMenuRefs(),
        getRawValueMap(),
        getAllEdges(),
        getAllToppings(),
        getAllCompositions(),
        getAllMenuMaster(),
        getAllIngredients(),
        getAllSetCompositions(),
        getNutritionBaseDuplicateDiagnostics(),
      ]);
      const safeEdgeList = asObjectArray(edgeList);
      const edgeMap = Object.fromEntries(
        safeEdgeList
          .map(edge => [asDisplayText(edge.edgeCode), edge])
          .filter(([edgeCode]) => edgeCode)
      );
      return {
        menus: asObjectArray(menuRefs).sort((a, b) => {
          const ra = getMenuCodeRank(a.menuCode);
          const rb = getMenuCodeRank(b.menuCode);
          if (ra !== rb) return ra - rb;
          return asDisplayText(a.menuCode).localeCompare(asDisplayText(b.menuCode), 'ko');
        }),
        menuMasters: asObjectArray(masters),
        rawMap: asRecord(rawValues),
        edges: safeEdgeList,
        edgeMap,
        toppings: asObjectArray(toppingList),
        ingredients: asObjectArray(ingredientList),
        compositions: asObjectArray(compositionList),
        setComps: asObjectArray(setCompList),
        duplicateDiagnostics: duplicateDiag,
        menuMasterDiagnostics: buildNutritionMenuMasterDiagnostics({
          menuRefs,
          menuMasters: masters,
        }),
      };
    },
    { initialData: null, onError: err => console.error('[NutritionMenu] load failed', err) }
  );
  const menus = useMemo(() => data?.menus ?? [], [data?.menus]);
  const menuMasters = data?.menuMasters ?? [];
  const rawMap = data?.rawMap ?? {};
  const edges = data?.edges ?? [];
  const edgeMap = data?.edgeMap ?? {};
  const toppings = data?.toppings ?? [];
  const ingredients = data?.ingredients ?? [];
  const compositions = data?.compositions ?? [];
  const setComps = data?.setComps ?? [];
  const duplicateDiagnostics = data?.duplicateDiagnostics ?? null;
  const menuMasterDiagnostics = data?.menuMasterDiagnostics ?? null;
  useVisibilityRefresh(reload);

  const filteredMenus = useMemo(() => {
    const safeMenus = asObjectArray(menus);
    const q = asDisplayText(menuSearch).trim().toLowerCase();
    if (!q) return safeMenus;
    return safeMenus.filter(
      m =>
        asDisplayText(m.menuName).toLowerCase().includes(q) ||
        asDisplayText(m.menuCode).toLowerCase().includes(q)
    );
  }, [menus, menuSearch]);

  async function handleRepairDuplicates() {
    if (repairingDuplicates) return;
    const ok = await showConfirm({
      message: '중복된 영양성분 데이터를 정리합니다. 최신 수정값 1건만 남길까요?',
    });
    if (!ok) return;
    setRepairingDuplicates(true);
    try {
      const result = await repairNutritionBaseDuplicates();
      showToast(`중복 ${result.removed || 0}건 정리 완료`, 'ok');
      reload();
    } catch (err) {
      showToast(`중복 정리 실패: ${err?.message || err}`, 'error');
    } finally {
      setRepairingDuplicates(false);
    }
  }

  async function handleRepairOrphanMenus() {
    if (repairingOrphanMenus) return;
    if (!isAdmin) {
      showToast('누락 영양 메뉴 정리는 관리자만 가능합니다.', 'warn');
      return;
    }
    const orphanRefs = asObjectArray(menuMasterDiagnostics?.orphanMenuRefs);
    if (orphanRefs.length === 0) return;
    const ok = await showConfirm({
      message: `메뉴마스터에 없는 영양 메뉴 ${orphanRefs.length}건과 연결 영양값을 삭제합니다. 계속할까요?`,
      danger: true,
    });
    if (!ok) return;
    setRepairingOrphanMenus(true);
    try {
      const result = await deleteMenuRefsByMenuCodes(orphanRefs.map(row => row.menuCode));
      showToast(
        `누락 메뉴 ${result.deletedMenuRefs || 0}건 · 영양값 ${result.deletedRawValues || 0}건 정리 완료`,
        'ok',
        7000
      );
      reload();
    } catch (err) {
      showToast(`누락 메뉴 정리 실패: ${err?.message || err}`, 'error');
    } finally {
      setRepairingOrphanMenus(false);
    }
  }

  return (
    <main className="main">
      <PageHeader
        breadcrumb={['영양성분', '영양성분 정보 및 계산']}
        title="영양성분 정보 및 계산"
        masterSource
        sub="베이스 영양성분 입력 → 엣지 설정 → 파생 메뉴 → 계산 결과 확인"
      />

      <DuplicateNotice
        diagnostics={duplicateDiagnostics}
        repairing={repairingDuplicates}
        onRepair={handleRepairDuplicates}
      />
      <MissingMasterNotice
        diagnostics={menuMasterDiagnostics}
        repairing={repairingOrphanMenus}
        onRepair={handleRepairOrphanMenus}
        isAdmin={isAdmin}
      />

      {loading ? (
        <NutritionMenuSkeleton />
      ) : error ? (
        <div
          className="card"
          style={{ padding: 32, textAlign: 'center', color: 'var(--negative)' }}
        >
          <div>데이터를 불러오지 못했습니다: {error.message}</div>
          <button className="btn primary" style={{ marginTop: 12 }} onClick={reload}>
            다시 시도
          </button>
        </div>
      ) : (
        <NutritionMenuWorkspace
          tab={tab}
          onTab={setTab}
          menus={menus}
          filteredMenus={filteredMenus}
          rawMap={rawMap}
          onRefresh={reload}
          menuMasters={menuMasters}
          edges={edges}
          edgeMap={edgeMap}
          toppings={toppings}
          ingredients={ingredients}
          compositions={compositions}
          setComps={setComps}
          menuSearch={menuSearch}
          onMenuSearch={setMenuSearch}
        />
      )}
      {confirmElement}
    </main>
  );
}
