'use client';
import { useEffect, useState, useCallback, useMemo } from 'react';
import { Icon } from '@/components/icons';
import { PageHeader } from '@/components/ui/PageHeader';
import { showToast } from '@/components/Toast';
import { initDB } from '@/lib/db';
import { formatNumber } from '@/lib/format';
import { getAllMenuPrices } from '@/lib/cost/menu-price';
import {
  getPersonalRecipeMap, upsertPersonalRecipe,
  personalTotalCost,
} from '@/lib/cost/personal-detail';
import { PersonalDetailCard } from '@/components/cost/personal-detail/PersonalDetailCard';
import { PersonalDetailEditModal } from '@/components/cost/personal-detail/PersonalDetailEditModal';
import { SimpleSummaryTable } from '@/components/cost/shared/SimpleSummaryTable';
import { TabButton } from '@/components/cost/shared/TabButton';

export default function Page() {
  const [tab, setTab] = useState('detail');
  const [menus, setMenus]       = useState([]);
  const [recipeMap, setRecipeMap] = useState(new Map());
  const [loading, setLoading]   = useState(true);
  const [dbError, setDbError]   = useState(null);
  const [target, setTarget]     = useState(null);

  const load = useCallback(async () => {
    await initDB();
    const [allMenus, recMap] = await Promise.all([
      getAllMenuPrices(),
      getPersonalRecipeMap(),
    ]);
    setMenus(allMenus.filter(m => m.category === '1인피자'));
    setRecipeMap(recMap);
  }, []);

  useEffect(() => {
    load().catch(err => { console.error(err); setDbError(err.message || '데이터 로드 실패'); }).finally(() => setLoading(false));
  }, [load]);

  async function handleSave(data) {
    try {
      const result = await upsertPersonalRecipe(data);
      const msg = result.mode === 'insert' ? '레시피 등록 완료' :
                  !data.id ? '기존 레시피 덮어씌움' : '레시피 수정 완료';
      showToast(msg, 'ok');
      setTarget(null);
      const newMap = await getPersonalRecipeMap();
      setRecipeMap(newMap);
    } catch (err) {
      showToast('저장 실패: ' + err.message, 'err');
      throw err;
    }
  }

  const stats = useMemo(() => {
    let withRecipe = 0;
    let totalCost = 0;
    for (const m of menus) {
      const r = recipeMap.get(m.menuCode);
      if (r && r.components?.length > 0) {
        withRecipe++;
        totalCost += personalTotalCost(r);
      }
    }
    return { withRecipe, totalCost };
  }, [menus, recipeMap]);

  const summaryRows = useMemo(() => menus.map(m => {
    const recipe = recipeMap.get(m.menuCode);
    const cost = personalTotalCost(recipe);
    const rate = (m.price && cost > 0) ? (cost / m.price * 100) : null;
    return {
      menuCode: m.menuCode,
      menuName: m.menuName,
      price:    m.price,
      cost,
      rate,
    };
  }), [menus, recipeMap]);

  const sub = loading
    ? '로딩 중…'
    : menus.length === 0
      ? '메뉴 판매가에 등록된 1인피자 메뉴가 없습니다'
      : `1인피자 ${menus.length}개 · 레시피 ${stats.withRecipe}건 작성됨`;

  if (dbError) return (
    <main className="main">
      <PageHeader breadcrumb={['원가계산', '1인피자']} title="1인피자 원가" sub="로드 실패"/>
      <div className="card" style={{padding:32, textAlign:'center', color:'var(--negative)'}}>데이터베이스 오류: {dbError}</div>
    </main>
  );

  return (
    <main className="main">
      <PageHeader
        breadcrumb={['원가계산', '1인피자']}
        title="1인피자 원가"
        masterSource
        sub={sub}
      />

      <div style={{display:'flex', gap:4, borderBottom:'1px solid var(--border)'}}>
        <TabButton active={tab === 'summary'} onClick={() => setTab('summary')}>
          종합 원가표
        </TabButton>
        <TabButton active={tab === 'detail'} onClick={() => setTab('detail')}>
          세부 원가표 {menus.length > 0 && `(${menus.length})`}
        </TabButton>
      </div>

      {tab === 'summary' && (
        <SimpleSummaryTable rows={summaryRows} showSize={false}/>
      )}

      {tab === 'detail' && (
        <>
          {!loading && menus.length === 0 && (
            <div className="card" style={{minHeight:200, display:'grid', placeItems:'center'}}>
              <div style={{textAlign:'center', color:'var(--text-3)'}}>
                <Icon.doc style={{width:32, height:32, marginBottom:12, opacity:.4}}/>
                <div style={{fontWeight:600, marginBottom:4}}>1인피자 메뉴가 없습니다</div>
                <div style={{fontSize:13}}>
                  메뉴 판매가에서 1인피자 분류로 등록해주세요 (예: <code>IP-001</code>).
                </div>
              </div>
            </div>
          )}

          {menus.length > 0 && (
            <div style={{display:'flex', flexDirection:'column', gap:8}}>
              {menus.map(m => (
                <PersonalDetailCard
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
              <span>원가 합계 {formatNumber(stats.totalCost)}원</span>
            </div>
          )}
        </>
      )}

      {target && (
        <PersonalDetailEditModal
          menu={target.menu}
          initial={target.recipe}
          onSave={handleSave}
          onClose={() => setTarget(null)}
        />
      )}
    </main>
  );
}
