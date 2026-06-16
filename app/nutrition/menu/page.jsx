'use client';
import { useEffect, useState, useCallback, useMemo } from 'react';
import { useMounted } from '@/hooks/useMounted';
import { useVisibilityRefresh } from '@/hooks/useVisibilityRefresh';
import { PageHeader } from '@/components/ui/PageHeader';
import { showToast } from '@/components/Toast';
import { initDB } from '@/lib/db';
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
  const [menus, setMenus] = useState([]);
  const [menuMasters, setMenuMasters] = useState([]);
  const [rawMap, setRawMap] = useState({});
  const [edges, setEdges] = useState([]);
  const [edgeMap, setEdgeMap] = useState({});
  const [toppings, setToppings] = useState([]);
  const [ingredients, setIngredients] = useState([]);
  const [compositions, setCompositions] = useState([]);
  const [setComps, setSetComps] = useState([]);
  const [loading, setLoading] = useState(true);
  const [menuSearch, setMenuSearch] = useState('');
  const [duplicateDiagnostics, setDuplicateDiagnostics] = useState(null);
  const [menuMasterDiagnostics, setMenuMasterDiagnostics] = useState(null);
  const [repairingDuplicates, setRepairingDuplicates] = useState(false);
  const [repairingOrphanMenus, setRepairingOrphanMenus] = useState(false);
  const mountedRef = useMounted();
  const { showConfirm, confirmElement } = useConfirmDialog();
  const { isAdmin } = useCurrentRole();

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

  const load = useCallback(async () => {
    await initDB();
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
    if (!mountedRef.current) return;
    const safeEdgeList = asObjectArray(edgeList);
    const nextEdgeMap = Object.fromEntries(
      safeEdgeList
        .map(edge => [asDisplayText(edge.edgeCode), edge])
        .filter(([edgeCode]) => edgeCode)
    );
    setMenus(
      asObjectArray(menuRefs).sort((a, b) => {
        const ra = getMenuCodeRank(a.menuCode);
        const rb = getMenuCodeRank(b.menuCode);
        if (ra !== rb) return ra - rb;
        return asDisplayText(a.menuCode).localeCompare(asDisplayText(b.menuCode), 'ko');
      })
    );
    setMenuMasters(asObjectArray(masters));
    setRawMap(asRecord(rawValues));
    setEdges(safeEdgeList);
    setEdgeMap(nextEdgeMap);
    setToppings(asObjectArray(toppingList));
    setIngredients(asObjectArray(ingredientList));
    setCompositions(asObjectArray(compositionList));
    setSetComps(asObjectArray(setCompList));
    setDuplicateDiagnostics(duplicateDiag);
    setMenuMasterDiagnostics(
      buildNutritionMenuMasterDiagnostics({ menuRefs, menuMasters: masters })
    );
    setLoading(false);
  }, [mountedRef]);

  useEffect(() => {
    load().catch(err => {
      if (!mountedRef.current) return;
      console.error('[NutritionMenu] load failed', err);
      setLoading(false);
    });
  }, [load, mountedRef]);
  useVisibilityRefresh(load);

  const handleRepairDuplicates = useCallback(async () => {
    if (repairingDuplicates) return;
    const ok = await showConfirm({
      message: '중복된 영양성분 데이터를 정리합니다. 최신 수정값 1건만 남길까요?',
    });
    if (!ok) return;
    setRepairingDuplicates(true);
    try {
      const result = await repairNutritionBaseDuplicates();
      showToast(`중복 ${result.removed || 0}건 정리 완료`, 'ok');
      await load();
    } catch (err) {
      showToast(`중복 정리 실패: ${err?.message || err}`, 'error');
    } finally {
      if (mountedRef.current) setRepairingDuplicates(false);
    }
  }, [load, repairingDuplicates, mountedRef, showConfirm]);

  const handleRepairOrphanMenus = useCallback(async () => {
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
      await load();
    } catch (err) {
      showToast(`누락 메뉴 정리 실패: ${err?.message || err}`, 'error');
    } finally {
      if (mountedRef.current) setRepairingOrphanMenus(false);
    }
  }, [isAdmin, load, menuMasterDiagnostics, mountedRef, repairingOrphanMenus, showConfirm]);

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
      ) : (
        <NutritionMenuWorkspace
          tab={tab}
          onTab={setTab}
          menus={menus}
          filteredMenus={filteredMenus}
          rawMap={rawMap}
          onRefresh={load}
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
