'use client';
import { useEffect, useState, useCallback, useMemo, useRef } from 'react';
import { useVisibilityRefresh } from '@/hooks/useVisibilityRefresh';
import dynamic from 'next/dynamic';
import { PageHeader } from '@/components/ui/PageHeader';
import { Skeleton } from '@/components/ui/Skeleton';
import { SearchBox } from '@/components/ui/SearchBox';
import { showToast } from '@/components/Toast';
import { initDB } from '@/lib/db';
import { getAllIngredients } from '@/lib/ingredient';
import { getAllMenuMaster } from '@/lib/menu-master';
import {
  getAllMenuRefs,
  getRawValueMap,
  getAllEdges,
  getAllToppings,
  getAllIngredientValues,
  getAllCompositions,
  getAllSetCompositions,
  getNutritionBaseDuplicateDiagnostics,
  repairNutritionBaseDuplicates,
} from '@/lib/nutrition/values/store';
import { asDisplayText, asObjectArray } from '@/lib/ui/prop-guards';

const TabBase = dynamic(
  () => import('@/components/nutrition/menu/TabBase').then(m => ({ default: m.TabBase })),
  { ssr: false }
);
const TabEdge = dynamic(
  () => import('@/components/nutrition/menu/TabEdge').then(m => ({ default: m.TabEdge })),
  { ssr: false }
);
const TabDerived = dynamic(
  () => import('@/components/nutrition/menu/TabDerived').then(m => ({ default: m.TabDerived })),
  { ssr: false }
);
const TabToppings = dynamic(
  () => import('@/components/nutrition/menu/TabToppings').then(m => ({ default: m.TabToppings })),
  { ssr: false }
);
const TabResults = dynamic(
  () => import('@/components/nutrition/menu/TabResults').then(m => ({ default: m.TabResults })),
  { ssr: false }
);
const TabIngredientValues = dynamic(
  () =>
    import('@/components/nutrition/menu/TabIngredientValues').then(m => ({
      default: m.TabIngredientValues,
    })),
  { ssr: false }
);
const TabSetCalc = dynamic(
  () => import('@/components/nutrition/menu/TabSetCalc').then(m => ({ default: m.TabSetCalc })),
  { ssr: false }
);

const TABS = [
  '베이스 영양성분',
  '엣지 설정',
  '추가토핑',
  '파생 메뉴',
  '식자재 영양값',
  '계산 결과',
  '세트 계산',
];
const EMPTY_MAP = {};

function asRecord(value) {
  return value && typeof value === 'object' && !Array.isArray(value) ? value : EMPTY_MAP;
}

function DuplicateNotice({ diagnostics, repairing, onRepair }) {
  const duplicateRows = Number(diagnostics?.duplicateRows) || 0;
  if (!duplicateRows) return null;
  const menuSamples = asObjectArray(diagnostics?.menuGroups)
    .slice(0, 2)
    .map(group => asDisplayText(group.label || group.key))
    .filter(Boolean);
  const rawSamples = asObjectArray(diagnostics?.rawGroups)
    .slice(0, 2)
    .map(group => asDisplayText(group.label || group.key))
    .filter(Boolean);
  const samples = [...menuSamples, ...rawSamples].slice(0, 3);

  return (
    <div
      style={{
        marginTop: 14,
        padding: '12px 14px',
        border: '1px solid var(--warn)',
        borderRadius: 8,
        background: 'var(--warn-soft)',
        color: 'var(--text-1)',
        display: 'flex',
        gap: 12,
        alignItems: 'center',
        justifyContent: 'space-between',
        flexWrap: 'wrap',
      }}
    >
      <div style={{ minWidth: 260, flex: '1 1 420px' }}>
        <div style={{ fontSize: 13, fontWeight: 800, color: 'var(--warn)' }}>
          영양성분 중복 데이터 {duplicateRows}건 감지
        </div>
        <div style={{ marginTop: 3, fontSize: 12, color: 'var(--text-2)', lineHeight: 1.5 }}>
          메뉴코드 또는 메뉴+크러스트 기준으로 중복된 행이 있습니다. 최신 수정값을 남기고
          나머지를 정리할 수 있습니다.
          {samples.length > 0 && (
            <span style={{ display: 'block', color: 'var(--text-3)' }}>
              예: {samples.join(', ')}
            </span>
          )}
        </div>
      </div>
      <button className="btn sm" type="button" onClick={onRepair} disabled={repairing}>
        {repairing ? '정리 중…' : '중복 정리'}
      </button>
    </div>
  );
}

export default function Page() {
  const [tab, setTab] = useState(0);
  const [menus, setMenus] = useState([]);
  const [menuMasters, setMenuMasters] = useState([]);
  const [rawMap, setRawMap] = useState({});
  const [edges, setEdges] = useState([]);
  const [edgeMap, setEdgeMap] = useState({});
  const [toppings, setToppings] = useState([]);
  const [ingredients, setIngredients] = useState([]);
  const [ingredientValues, setIngredientValues] = useState([]);
  const [compositions, setCompositions] = useState([]);
  const [setComps, setSetComps] = useState([]);
  const [loading, setLoading] = useState(true);
  const [menuSearch, setMenuSearch] = useState('');
  const [duplicateDiagnostics, setDuplicateDiagnostics] = useState(null);
  const [repairingDuplicates, setRepairingDuplicates] = useState(false);
  const mountedRef = useRef(true);

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
      ingredientValueList,
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
        getAllIngredientValues(),
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
      asObjectArray(menuRefs).sort((a, b) =>
        asDisplayText(a.menuCode).localeCompare(asDisplayText(b.menuCode), 'ko')
      )
    );
    setMenuMasters(asObjectArray(masters));
    setRawMap(asRecord(rawValues));
    setEdges(safeEdgeList);
    setEdgeMap(nextEdgeMap);
    setToppings(asObjectArray(toppingList));
    setIngredients(asObjectArray(ingredientList));
    setIngredientValues(asObjectArray(ingredientValueList));
    setCompositions(asObjectArray(compositionList));
    setSetComps(asObjectArray(setCompList));
    setDuplicateDiagnostics(duplicateDiag);
    setLoading(false);
  }, []);

  useEffect(() => {
    mountedRef.current = true;
    load().catch(err => {
      if (!mountedRef.current) return;
      console.error(err);
      setLoading(false);
    });

    return () => {
      mountedRef.current = false;
    };
  }, [load]);
  useVisibilityRefresh(load);

  const handleRepairDuplicates = useCallback(async () => {
    if (repairingDuplicates) return;
    if (!confirm('중복된 영양성분 데이터를 정리합니다. 최신 수정값 1건만 남길까요?')) return;
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
  }, [load, repairingDuplicates]);

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

      {loading ? (
        <>
          {/* Tab bar skeleton */}
          <div
            style={{
              display: 'flex',
              gap: 4,
              marginTop: 20,
              borderBottom: '1px solid var(--border)',
              paddingBottom: 1,
            }}
          >
            {TABS.map((_, i) => (
              <Skeleton key={i} width={110} height={34} radius={8} style={{ marginBottom: -1 }} />
            ))}
          </div>

          {/* Toolbar skeleton */}
          <div style={{ display: 'flex', gap: 8, alignItems: 'center', marginTop: 16 }}>
            <Skeleton width={200} height={32} radius={8} />
            <Skeleton width={120} height={32} radius={8} />
            <Skeleton width={88} height={32} radius={8} style={{ marginLeft: 'auto' }} />
          </div>

          {/* Table skeleton */}
          <div className="card table-card" style={{ marginTop: 12 }}>
            <div style={{ overflowX: 'auto' }}>
              <table className="data-table">
                <thead>
                  <tr>
                    {[145, null, 70, 70, 70, 70, 70, 70].map((w, i) => (
                      <th key={i} style={w ? { width: w } : undefined}>
                        <Skeleton width={w ? w * 0.6 : '60%'} height={11} />
                      </th>
                    ))}
                  </tr>
                </thead>
                <tbody>
                  {Array.from({ length: 5 }).map((_, i) => (
                    <tr key={i}>
                      <td>
                        <Skeleton width={100} height={13} />
                      </td>
                      <td>
                        <Skeleton width="75%" height={13} />
                      </td>
                      <td>
                        <Skeleton width={48} height={13} />
                      </td>
                      <td>
                        <Skeleton width={48} height={13} />
                      </td>
                      <td>
                        <Skeleton width={48} height={13} />
                      </td>
                      <td>
                        <Skeleton width={48} height={13} />
                      </td>
                      <td>
                        <Skeleton width={48} height={13} />
                      </td>
                      <td>
                        <Skeleton width={48} height={13} />
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          </div>
        </>
      ) : (
        <div className="content-enter">
          <div
            style={{
              display: 'flex',
              gap: 12,
              alignItems: 'center',
              marginTop: 20,
              flexWrap: 'wrap',
            }}
          >
            <div className="tabs" style={{ flex: '1 1 auto' }}>
              {TABS.map((t, i) => (
                <button
                  key={i}
                  onClick={() => setTab(i)}
                  className={`tab ${tab === i ? 'active' : ''}`}
                >
                  {t}
                </button>
              ))}
            </div>
            {(tab === 0 || tab === 3 || tab === 5) && !loading && (
              <div style={{ flex: '0 0 220px' }}>
                <SearchBox
                  value={menuSearch}
                  onChange={setMenuSearch}
                  placeholder="메뉴명·코드 검색"
                />
              </div>
            )}
          </div>

          {tab === 0 && (
            <TabBase
              menus={filteredMenus}
              rawMap={rawMap}
              onRefresh={load}
              menuMasters={menuMasters}
            />
          )}
          {tab === 1 && <TabEdge edges={edges} edgeMap={edgeMap} onRefresh={load} />}
          {tab === 2 && (
            <TabToppings toppings={toppings} ingredients={ingredients} onRefresh={load} />
          )}
          {tab === 3 && (
            <TabDerived
              menus={menus}
              ingredients={ingredients}
              ingredientValues={ingredientValues}
              compositions={compositions}
              onRefresh={load}
              menuMasters={menuMasters}
              menuSearch={menuSearch}
              onOpenBase={() => setTab(0)}
              onOpenIngredientValues={() => setTab(4)}
            />
          )}
          {tab === 4 && <TabIngredientValues onRefresh={load} />}
          {tab === 5 && (
            <TabResults
              menus={menus}
              rawMap={rawMap}
              edgeMap={edgeMap}
              compositions={compositions}
              toppings={toppings}
              ingredientValues={ingredientValues}
              menuMasters={menuMasters}
              menuSearch={menuSearch}
            />
          )}
          {tab === 6 && (
            <TabSetCalc
              menus={menus}
              rawMap={rawMap}
              edgeMap={edgeMap}
              setComps={setComps}
              menuMasters={menuMasters}
              onRefresh={load}
            />
          )}
        </div>
      )}
    </main>
  );
}
