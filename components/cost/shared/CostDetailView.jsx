'use client';
import { useMemo, useState } from 'react';
import { Icon } from '@/components/icons';
import { PageHeader } from '@/components/ui/PageHeader';
import { TabButton } from '@/components/cost/shared/TabButton';
import { formatNumber } from '@/lib/format';
import { downloadCsv } from '@/lib/download';
import { Pagination } from '@/components/ui/Pagination';
import { SortButton } from '@/components/ui/SortButton';
import {
  SelectionToolbar,
  sortButtonOptions,
  useCostManageTable,
} from '@/components/cost/manage/table-utils';

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
 * @param {(ids:number[])=>Promise<void>} [p.onDeleteRecipes] - 선택된 세부 레시피 삭제
 */
export function CostDetailView({
  breadcrumb, title, noun, emptySub,
  loading, dbError, menus, recipeMap, stats, summaryRows = [],
  tab, setTab, setTarget,
  summaryContent, DetailCard, emptyTitle, emptyHint, footerLabel, modal,
  onDeleteRecipes,
}) {
  const sub = loading
    ? '로딩 중…'
    : menus.length === 0
      ? emptySub
      : `${noun} ${menus.length}개 · 레시피 ${stats.withRecipe}건 작성됨`;

  // 메뉴코드 → 원가/원가율 (summaryRows는 훅이 calcCost로 미리 계산해 전달)
  const costByCode = useMemo(
    () => new Map(summaryRows.map(r => [r.menuCode, r])),
    [summaryRows]
  );

  // 필터: 원가율 임계('all'|'40'|'45') · 원가 없는 메뉴만
  const [rateFilter, setRateFilter] = useState('all');
  const [onlyNoCost, setOnlyNoCost] = useState(false);

  const detailRows = useMemo(() => menus.map(menu => ({
    menu,
    recipe: recipeMap.get(menu.menuCode) || null,
    summary: costByCode.get(menu.menuCode) || null,
  })), [menus, recipeMap, costByCode]);

  const filteredRows = useMemo(() => detailRows.filter(r => {
    const cost = r.summary?.cost || 0;
    const rate = r.summary?.rate;
    if (onlyNoCost && !(!r.recipe || cost <= 0)) return false;
    if (rateFilter !== 'all' && !(rate != null && rate >= Number(rateFilter))) return false;
    return true;
  }), [detailRows, rateFilter, onlyNoCost]);

  const sortOptions = useMemo(() => [
    { id: 'name', label: '메뉴명', key: r => r.menu.menuName },
    { id: 'code', label: '메뉴코드', key: r => r.menu.menuCode },
    { id: 'price', label: '판매가', key: r => r.menu.price ?? -1 },
    { id: 'cost', label: '원가', key: r => r.summary?.cost ?? -1 },
  ], []);

  const table = useCostManageTable(filteredRows, {
    sortOptions,
    initialSort: { id: 'name', dir: 'asc' },
    getRowId: row => row.recipe?.id,
  });

  function handleExportCsv() {
    const headers = ['메뉴명', '메뉴코드', '카테고리', '원가', '판매가', '원가율(%)'];
    const body = filteredRows.map(r => [
      r.menu.menuName ?? '',
      r.menu.menuCode ?? '',
      r.menu.category ?? noun ?? '',
      r.summary?.cost != null ? r.summary.cost : '',
      r.menu.price ?? '',
      r.summary?.rate != null ? r.summary.rate.toFixed(1) : '',
    ]);
    downloadCsv([headers, ...body], `${title}_세부원가.csv`);
  }

  async function handleSelectedDelete() {
    const ids = Array.from(table.selected);
    if (ids.length === 0 || !onDeleteRecipes) return;
    await onDeleteRecipes(ids);
    table.clearSelection();
  }

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
              <div style={{display:'flex', alignItems:'center', justifyContent:'space-between', gap:8, flexWrap:'wrap'}}>
                <div style={{display:'flex', alignItems:'center', gap:8, flexWrap:'wrap'}}>
                  <SortButton
                    value={table.sort?.id}
                    options={sortButtonOptions(sortOptions, table.sort)}
                    onChange={table.changeSort}
                  />
                  <select
                    value={rateFilter}
                    onChange={e => setRateFilter(e.target.value)}
                    className="form-input"
                    style={{height:30, fontSize:12, padding:'0 8px', width:'auto'}}
                    title="원가율 기준 필터"
                  >
                    <option value="all">원가율 전체</option>
                    <option value="40">원가율 40% 이상</option>
                    <option value="45">원가율 45% 이상</option>
                  </select>
                  <label style={{display:'inline-flex', alignItems:'center', gap:5, fontSize:12, color:'var(--text-2)'}}>
                    <input
                      type="checkbox"
                      checked={onlyNoCost}
                      onChange={e => setOnlyNoCost(e.target.checked)}
                      style={{width:14, height:14, accentColor:'var(--accent)'}}
                    />
                    원가 없는 메뉴만
                  </label>
                  {(rateFilter !== 'all' || onlyNoCost) && (
                    <span style={{fontSize:12, color:'var(--text-3)'}}>{filteredRows.length}건 표시</span>
                  )}
                </div>
                <div style={{display:'flex', alignItems:'center', gap:8, flexWrap:'wrap'}}>
                  <SelectionToolbar
                    selectedCount={table.selected.size}
                    confirming={table.confirmingDelete}
                    noun="세부 레시피"
                    onAskDelete={() => table.setConfirmingDelete(true)}
                    onConfirmDelete={handleSelectedDelete}
                    onCancel={table.clearSelection}
                  />
                  <button
                    className="btn sm"
                    onClick={handleExportCsv}
                    disabled={filteredRows.length === 0}
                    title="현재 필터 결과를 CSV로 내보내기"
                  >
                    <Icon.download style={{width:14, height:14, marginRight:4}}/>
                    CSV
                  </button>
                </div>
              </div>

              <label style={{
                display:'inline-flex', alignItems:'center', gap:8, width:'fit-content',
                fontSize:12, color:'var(--text-3)', padding:'2px 4px',
              }}>
                <input
                  type="checkbox"
                  checked={table.allPageSelected}
                  onChange={table.togglePage}
                  style={{width:15, height:15, accentColor:'var(--accent)'}}
                />
                현재 페이지 레시피 선택
              </label>

              {table.paged.map(({ menu: m, recipe }) => (
                <div key={m.menuCode} style={{display:'grid', gridTemplateColumns:'24px 1fr', gap:8, alignItems:'center'}}>
                  <input
                    type="checkbox"
                    disabled={!recipe?.id}
                    checked={recipe?.id ? table.selected.has(recipe.id) : false}
                    onChange={() => recipe?.id && table.toggle(recipe.id)}
                    title={recipe?.id ? '선택' : '삭제할 세부 레시피가 없습니다'}
                    style={{width:16, height:16, accentColor:'var(--accent)'}}
                  />
                  <DetailCard
                    menu={m}
                    recipe={recipe}
                    onEdit={() => setTarget({ menu: m, recipe })}
                  />
                </div>
              ))}

              <Pagination
                page={table.page}
                totalPages={table.totalPages}
                onPage={table.goTo}
                total={table.total}
                pageSize={table.pageSize}
              />
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
