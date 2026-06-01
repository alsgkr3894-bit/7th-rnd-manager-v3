'use client';
import { Icon } from '@/components/icons';
import { PageHeader } from '@/components/ui/PageHeader';
import { TabButton } from '@/components/cost/shared/TabButton';
import { formatNumber } from '@/lib/format';

/**
 * 원가 세부 페이지 공통 프레젠테이션 셸 (pizza / side / set / personal).
 *
 * 로직은 useDetailRecipePage 훅이, 렌더는 이 컴포넌트가 담당.
 * 페이지별로 다른 부분만 props로 주입:
 *   - 카드/모달/요약 컴포넌트, 빈 상태 안내문, 푸터 라벨
 *
 * @param {object}   p
 * @param {string[]} p.breadcrumb
 * @param {string}   p.title
 * @param {string}   p.noun            - 메뉴 명칭('사이드'·'피자'…) — sub 텍스트 생성용
 * @param {string}   p.emptySub        - 메뉴 0개일 때 sub 텍스트
 * @param {boolean}  p.loading
 * @param {string|null} p.dbError
 * @param {object[]} p.menus
 * @param {Map}      p.recipeMap
 * @param {{withRecipe:number, totalCost:number}} p.stats
 * @param {'summary'|'detail'} p.tab
 * @param {(t:string)=>void}   p.setTab
 * @param {(t:object|null)=>void} p.setTarget
 * @param {React.ReactNode} p.summaryContent - 종합 탭 본문
 * @param {React.ComponentType} p.DetailCard - 세부 카드 컴포넌트
 * @param {string}   p.emptyTitle
 * @param {React.ReactNode} p.emptyHint
 * @param {string}   p.footerLabel     - '원가 합계' | '베이스 원가 합계'
 * @param {React.ReactNode} p.modal     - 편집 모달 (페이지가 target 기준으로 렌더)
 */
export function CostDetailView({
  breadcrumb, title, noun, emptySub,
  loading, dbError, menus, recipeMap, stats,
  tab, setTab, setTarget,
  summaryContent, DetailCard, emptyTitle, emptyHint, footerLabel, modal,
}) {
  const sub = loading
    ? '로딩 중…'
    : menus.length === 0
      ? emptySub
      : `${noun} ${menus.length}개 · 레시피 ${stats.withRecipe}건 작성됨`;

  if (dbError) return (
    <main className="main">
      <PageHeader breadcrumb={breadcrumb} title={title} sub="로드 실패"/>
      <div className="card" style={{padding:32, textAlign:'center', color:'var(--negative)'}}>
        데이터베이스 오류: {dbError}
      </div>
    </main>
  );

  return (
    <main className="main">
      <PageHeader breadcrumb={breadcrumb} title={title} masterSource sub={sub}/>

      <div style={{display:'flex', gap:4, borderBottom:'1px solid var(--border)'}}>
        <TabButton active={tab === 'summary'} onClick={() => setTab('summary')}>
          종합 원가표
        </TabButton>
        <TabButton active={tab === 'detail'} onClick={() => setTab('detail')}>
          세부 원가표 {menus.length > 0 && `(${menus.length})`}
        </TabButton>
      </div>

      {tab === 'summary' && summaryContent}

      {tab === 'detail' && (
        <>
          {!loading && menus.length === 0 && (
            <div className="card" style={{minHeight:200, display:'grid', placeItems:'center'}}>
              <div style={{textAlign:'center', color:'var(--text-3)'}}>
                <Icon.doc style={{width:32, height:32, marginBottom:12, opacity:.4}}/>
                <div style={{fontWeight:600, marginBottom:4}}>{emptyTitle}</div>
                <div style={{fontSize:13}}>{emptyHint}</div>
              </div>
            </div>
          )}

          {menus.length > 0 && (
            <div style={{display:'flex', flexDirection:'column', gap:8}}>
              {menus.map(m => (
                <DetailCard
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
              <span>{footerLabel} {formatNumber(stats.totalCost)}원</span>
            </div>
          )}
        </>
      )}

      {modal}
    </main>
  );
}
