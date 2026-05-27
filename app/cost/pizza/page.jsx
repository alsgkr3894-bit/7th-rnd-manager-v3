'use client';
import { useEffect, useState, useCallback, useMemo } from 'react';
import { Icon } from '@/components/icons';
import { PageHeader } from '@/components/ui/PageHeader';
import { showToast } from '@/components/Toast';
import { initDB } from '@/lib/db';
import { formatNumber } from '@/lib/format';
import { getAllMenuPrices } from '@/lib/cost/menu-price';
import {
  getPizzaRecipeMap, upsertPizzaRecipe, deletePizzaRecipe,
  pizzaBaseCost,
} from '@/lib/cost/pizza-detail';
import { getAllEdges } from '@/lib/cost/edge-dough';
import { buildPizzaSummary } from '@/lib/cost/pizza-summary';
import { PizzaDetailCard } from '@/components/cost/pizza-detail/PizzaDetailCard';
import { PizzaDetailEditModal } from '@/components/cost/pizza-detail/PizzaDetailEditModal';
import { PizzaSummaryTable } from '@/components/cost/pizza-summary/PizzaSummaryTable';

export default function Page() {
  const [tab, setTab] = useState('detail'); // 'summary' | 'detail'
  const [menus, setMenus]       = useState([]);
  const [recipeMap, setRecipeMap] = useState(new Map());
  const [edges, setEdges]       = useState([]);
  const [loading, setLoading]   = useState(true);
  const [target, setTarget]     = useState(null); // { menu, recipe | null }

  const load = useCallback(async () => {
    await initDB();
    const [allMenus, recMap, allEdges] = await Promise.all([
      getAllMenuPrices(),
      getPizzaRecipeMap(),
      getAllEdges(),
    ]);
    setMenus(allMenus.filter(m => m.category === '피자'));
    setRecipeMap(recMap);
    setEdges(allEdges);
  }, []);

  useEffect(() => {
    load().catch(console.error).finally(() => setLoading(false));
  }, [load]);

  async function handleSave(data) {
    try {
      await upsertPizzaRecipe(data);
      showToast('저장 완료', 'ok');
      setTarget(null);
      await load();
    } catch (err) {
      showToast('저장 실패: ' + err.message, 'err');
      throw err;
    }
  }

  // 통계 (세부 탭)
  const stats = useMemo(() => {
    let withRecipe = 0;
    let totalBase = 0;
    for (const m of menus) {
      const r = recipeMap.get(m.menuCode);
      if (r && r.components?.length > 0) {
        withRecipe++;
        totalBase += pizzaBaseCost(r);
      }
    }
    return { withRecipe, totalBase };
  }, [menus, recipeMap]);

  // 종합 매트릭스
  const summary = useMemo(
    () => buildPizzaSummary({ menus, recipeMap, edges }),
    [menus, recipeMap, edges]
  );

  const sub = loading
    ? '로딩 중…'
    : menus.length === 0
      ? '메뉴 판매가에 등록된 피자 메뉴가 없습니다 — 먼저 메뉴 판매가에서 등록해주세요'
      : `피자 메뉴 ${menus.length}개 · 레시피 ${stats.withRecipe}건 작성됨`;

  return (
    <main className="main">
      <PageHeader
        breadcrumb={['원가계산', '피자']}
        title="피자 원가"
        sub={sub}
      />

      {/* 탭 */}
      <div style={{display:'flex', gap:4, borderBottom:'1px solid var(--border)'}}>
        <TabButton active={tab === 'summary'} onClick={() => setTab('summary')}>
          종합 원가표
        </TabButton>
        <TabButton active={tab === 'detail'} onClick={() => setTab('detail')}>
          세부 원가표 {menus.length > 0 && `(${menus.length})`}
        </TabButton>
      </div>

      {/* 종합 탭 — 메뉴 × 4엣지 매트릭스 */}
      {tab === 'summary' && (
        <PizzaSummaryTable rows={summary}/>
      )}

      {/* 세부 탭 */}
      {tab === 'detail' && (
        <>
          {!loading && menus.length === 0 && (
            <div className="card" style={{minHeight:200, display:'grid', placeItems:'center'}}>
              <div style={{textAlign:'center', color:'var(--text-3)'}}>
                <Icon.doc style={{width:32, height:32, marginBottom:12, opacity:.4}}/>
                <div style={{fontWeight:600, marginBottom:4}}>피자 메뉴가 없습니다</div>
                <div style={{fontSize:13}}>
                  먼저 <b>메뉴 판매가</b>에서 피자 분류로 메뉴를 등록해주세요.<br/>
                  메뉴코드 형식: <code>PZ-001-L</code>, <code>PZ-001-R</code>
                </div>
              </div>
            </div>
          )}

          {menus.length > 0 && (
            <div style={{display:'flex', flexDirection:'column', gap:8}}>
              {menus.map(m => (
                <PizzaDetailCard
                  key={m.menuCode}
                  menu={m}
                  recipe={recipeMap.get(m.menuCode) || null}
                  onEdit={() => setTarget({ menu: m, recipe: recipeMap.get(m.menuCode) || null })}
                />
              ))}
            </div>
          )}

          {menus.length > 0 && (
            <div style={{
              padding:'10px 16px', fontSize:12, color:'var(--text-3)',
              background:'var(--surface-2)', borderRadius:10,
              display:'flex', justifyContent:'space-between',
            }}>
              <span>레시피 작성 {stats.withRecipe}/{menus.length}건</span>
              <span>베이스 원가 합계 {formatNumber(stats.totalBase)}원</span>
            </div>
          )}
        </>
      )}

      {target && (
        <PizzaDetailEditModal
          menu={target.menu}
          initial={target.recipe}
          onSave={handleSave}
          onClose={() => setTarget(null)}
        />
      )}
    </main>
  );
}

function TabButton({ active, onClick, children }) {
  return (
    <button onClick={onClick} style={{
      padding:'10px 18px', border:0,
      background:'transparent', cursor:'pointer',
      fontSize:13, fontWeight: active ? 700 : 500,
      color: active ? 'var(--accent)' : 'var(--text-3)',
      borderBottom: active ? '2px solid var(--accent)' : '2px solid transparent',
      marginBottom:-1,
    }}>
      {children}
    </button>
  );
}
