'use client';
import { useEffect, useState, useCallback, useMemo } from 'react';
import { useVisibilityRefresh } from '@/hooks/useVisibilityRefresh';
import dynamic from 'next/dynamic';
import { PageHeader } from '@/components/ui/PageHeader';
import { Skeleton } from '@/components/ui/Skeleton';
import { SearchBox } from '@/components/ui/SearchBox';
import { initDB } from '@/lib/db';
import { getAllMenuMaster } from '@/lib/menu-master';
import {
  getAllMenuRefs, getRawValueMap,
  getAllEdges, getAllToppings, getAllCompositions,
} from '@/lib/nutrition/values/store';

const TabBase    = dynamic(() => import('@/components/nutrition/menu/TabBase').then(m => ({ default: m.TabBase })), { ssr: false });
const TabEdge    = dynamic(() => import('@/components/nutrition/menu/TabEdge').then(m => ({ default: m.TabEdge })), { ssr: false });
const TabDerived = dynamic(() => import('@/components/nutrition/menu/TabDerived').then(m => ({ default: m.TabDerived })), { ssr: false });
const TabResults = dynamic(() => import('@/components/nutrition/menu/TabResults').then(m => ({ default: m.TabResults })), { ssr: false });

const TABS = ['베이스 영양성분', '엣지 설정', '파생 메뉴', '계산 결과'];

export default function Page() {
  const [tab,          setTab]          = useState(0);
  const [menus,        setMenus]        = useState([]);
  const [menuMasters,  setMenuMasters]  = useState([]);
  const [rawMap,       setRawMap]       = useState({});
  const [edges,        setEdges]        = useState([]);
  const [edgeMap,      setEdgeMap]      = useState({});
  const [toppings,     setToppings]     = useState([]);
  const [compositions, setCompositions] = useState([]);
  const [loading,      setLoading]      = useState(true);
  const [menuSearch,   setMenuSearch]   = useState('');

  const filteredMenus = useMemo(() => {
    const q = menuSearch.trim().toLowerCase();
    if (!q) return menus;
    return menus.filter(m =>
      m.menuName?.toLowerCase().includes(q) || m.menuCode?.toLowerCase().includes(q)
    );
  }, [menus, menuSearch]);

  const load = useCallback(async () => {
    await initDB();
    const [menuRefs, rawValues, edgeList, toppingList, compositionList, masters] = await Promise.all([
      getAllMenuRefs(), getRawValueMap(),
      getAllEdges(), getAllToppings(), getAllCompositions(),
      getAllMenuMaster(),
    ]);
    const edgeMap = Object.fromEntries(edgeList.map(edge => [edge.edgeCode, edge]));
    setMenus(menuRefs);
    setMenuMasters(masters);
    setRawMap(rawValues);
    setEdges(edgeList);
    setEdgeMap(edgeMap);
    setToppings(toppingList);
    setCompositions(compositionList);
    setLoading(false);
  }, []);

  useEffect(() => { load(); }, [load]);
  useVisibilityRefresh(load);

  return (
    <main className="main">
      <PageHeader
        breadcrumb={['영양성분', '영양성분 정보 및 계산']}
        title="영양성분 정보 및 계산"
        masterSource
        sub="베이스 영양성분 입력 → 엣지 설정 → 파생 메뉴 → 계산 결과 확인"
      />

      {loading ? (
        <>
          {/* Tab bar skeleton */}
          <div style={{ display: 'flex', gap: 4, marginTop: 20, borderBottom: '1px solid var(--border)', paddingBottom: 1 }}>
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
                      <td><Skeleton width={100} height={13} /></td>
                      <td><Skeleton width="75%" height={13} /></td>
                      <td><Skeleton width={48} height={13} /></td>
                      <td><Skeleton width={48} height={13} /></td>
                      <td><Skeleton width={48} height={13} /></td>
                      <td><Skeleton width={48} height={13} /></td>
                      <td><Skeleton width={48} height={13} /></td>
                      <td><Skeleton width={48} height={13} /></td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          </div>
        </>
      ) : (
        <div className="content-enter">
          <div style={{ display: 'flex', gap: 12, alignItems: 'center', marginTop: 20, flexWrap: 'wrap' }}>
            <div className="tabs" style={{ flex: '1 1 auto' }}>
              {TABS.map((t, i) => (
                <button key={i} onClick={() => setTab(i)}
                  className={`tab ${tab === i ? 'active' : ''}`}>
                  {t}
                </button>
              ))}
            </div>
            {(tab === 0 || tab === 2 || tab === 3) && (
              <div style={{ flex: '0 0 220px' }}>
                <SearchBox value={menuSearch} onChange={setMenuSearch} placeholder="메뉴명·코드 검색" />
              </div>
            )}
          </div>

          {tab === 0 && <TabBase    menus={filteredMenus} rawMap={rawMap} onRefresh={load} menuMasters={menuMasters} />}
          {tab === 1 && <TabEdge    edges={edges} edgeMap={edgeMap} onRefresh={load} />}
          {tab === 2 && <TabDerived menus={filteredMenus} toppings={toppings} compositions={compositions} onRefresh={load} />}
          {tab === 3 && <TabResults menus={filteredMenus} rawMap={rawMap} edgeMap={edgeMap} compositions={compositions} toppings={toppings} />}
        </div>
      )}
    </main>
  );
}
