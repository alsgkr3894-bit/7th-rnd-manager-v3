'use client';
import { useEffect, useState, useCallback } from 'react';
import { PageHeader } from '@/components/ui/PageHeader';
import { initDB } from '@/lib/db';
import { getAllMenuMaster } from '@/lib/menu-master';
import {
  getAllMenuRefs, getRawValueMap,
  getAllEdges, getAllToppings, getAllCompositions,
} from '@/lib/nutrition/values/store';
import { TabBase }    from '@/components/nutrition/menu/TabBase';
import { TabEdge }    from '@/components/nutrition/menu/TabEdge';
import { TabDerived } from '@/components/nutrition/menu/TabDerived';
import { TabResults } from '@/components/nutrition/menu/TabResults';

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

  if (loading) {
    return (
      <main className="main">
        <div style={{ display: 'grid', placeItems: 'center', minHeight: 300 }}>
          <div style={{ color: 'var(--text-4)' }}>불러오는 중…</div>
        </div>
      </main>
    );
  }

  return (
    <main className="main">
      <PageHeader
        breadcrumb={['영양성분', '영양성분 정보 및 계산']}
        title="영양성분 정보 및 계산"
        sub="베이스 영양성분 입력 → 엣지 설정 → 파생 메뉴 → 계산 결과 확인"
      />

      <div style={{ display: 'flex', gap: 0, marginTop: 20, borderBottom: '1px solid var(--border)' }}>
        {TABS.map((t, i) => (
          <button key={i} onClick={() => setTab(i)}
            style={{
              padding: '10px 20px', fontSize: 14, fontWeight: tab === i ? 700 : 400,
              color: tab === i ? 'var(--accent-text)' : 'var(--text-3)',
              background: 'none', border: 'none', cursor: 'pointer',
              borderBottom: tab === i ? '2px solid var(--accent)' : '2px solid transparent',
              marginBottom: -1,
            }}>
            {t}
          </button>
        ))}
      </div>

      {tab === 0 && <TabBase    menus={menus} rawMap={rawMap} onRefresh={load} menuMasters={menuMasters} />}
      {tab === 1 && <TabEdge    edges={edges} edgeMap={edgeMap} onRefresh={load} />}
      {tab === 2 && <TabDerived menus={menus} toppings={toppings} compositions={compositions} onRefresh={load} />}
      {tab === 3 && <TabResults menus={menus} rawMap={rawMap} edgeMap={edgeMap} compositions={compositions} toppings={toppings} />}
    </main>
  );
}
