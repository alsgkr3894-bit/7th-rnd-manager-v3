'use client';
import { useEffect, useState, useCallback } from 'react';
import { useMounted } from '@/hooks/useMounted';
import { Icon } from '@/components/icons';
import { PageHeader } from '@/components/ui/PageHeader';
import { Pagination } from '@/components/ui/Pagination';
import { usePagination } from '@/hooks/usePagination';
import { showToast } from '@/components/Toast';
import { ConfirmDialog } from '@/components/ui/ConfirmDialog';
import { Skeleton } from '@/components/ui/Skeleton';
import { useVisibilityRefresh } from '@/hooks/useVisibilityRefresh';
import { initDB } from '@/lib/db';
import { downloadCsvText } from '@/lib/download';
import {
  getAllMenuMaster,
  upsertMenuMaster,
  deleteMenuMaster,
  getMenuDeletePlan,
  resetAllMenuMaster,
  pushMasterToPrices,
} from '@/lib/menu-master';
import { resetAllMenuPrices } from '@/lib/cost/menu-price';
import { seedMenuMaster } from '@/lib/menu-master/seed';
import { normalizePersonalPizzaCodes } from '@/lib/menu-master/normalize';
import { MenuPriceUploadCard } from '@/components/cost/menu-price/MenuPriceUploadCard';
import { BulkPriceModal } from '@/components/cost/menu-price/BulkPriceModal';
import { MenuMasterEditModal } from '@/components/menu-master/MenuMasterEditModal';
import { MenuMasterStatsRow } from '@/components/menu-master/MenuMasterStatsRow';
import { MenuMasterTableRow } from '@/components/menu-master/MenuMasterTableRow';
import { MENU_CATEGORY } from '@/lib/menu-categories';
import { getActiveBrandId } from '@/lib/active-brand';
import { useIsMainBrand } from '@/hooks/useIsMainBrand';
import { useMenuMasterFilters } from '@/hooks/useMenuMasterFilters';
import { useCurrentRole } from '@/hooks/useCurrentRole';
import {
  loadMenuRecipeSummaryMap,
  MENU_RECIPE_SUMMARY_STATUS,
} from '@/lib/menu-master/recipe-summary';

// 7번가(main) 전용 피자 카테고리 프리셋. 다른 브랜드는 빈 프리셋 → 자유 입력,
// 칩·통계는 실제 데이터에 존재하는 카테고리에서 동적으로 도출한다.
const PIZZA_CATEGORIES = [
  MENU_CATEGORY.PIZZA,
  MENU_CATEGORY.PERSONAL,
  MENU_CATEGORY.SIDE,
  MENU_CATEGORY.SET,
  MENU_CATEGORY.SAUCE,
  MENU_CATEGORY.DRINK,
  MENU_CATEGORY.EDGE,
];
// CATEGORIES는 모듈 레벨에서 평가하면 SSR/hydration에서 항상 main(피자)으로 고정된다.
// 브랜드별 분기는 컴포넌트 내부 useEffect(brandCats)와 EditModal prop으로 처리한다.
const PIZZA_SUBS = ['프리미엄 스페셜', '프리미엄', '오리지널', '하프앤하프'];

const DELETE_PLAN_LABELS = {
  cost_selling_prices: '판매가',
  menu_recipes: '메뉴 레시피',
  nutrition_menu_ref: '영양 메뉴',
  nutrition_raw_values: '영양값',
};

function buildMenuDeleteMessage(row, plan, loading) {
  const lines = [
    `"${row.menuName}" 메뉴를 삭제합니다.`,
    '연결된 판매가, 메뉴 레시피, 영양 참조 데이터도 함께 정리됩니다.',
  ];
  if (loading) {
    lines.push('영향 범위를 계산 중입니다.');
    return lines.join('\n');
  }
  if (!plan) {
    lines.push('영향 범위를 불러오지 못했습니다.');
    return lines.join('\n');
  }
  const counts = plan.linkedCounts || {};
  const summary = Object.entries(DELETE_PLAN_LABELS)
    .map(([storeName, label]) => `${label} ${Number(counts[storeName]) || 0}건`)
    .join(' · ');
  lines.push(`삭제 영향: ${summary}`);
  return lines.join('\n');
}

/* ── 메인 페이지 ── */
export default function Page() {
  const isMain = useIsMainBrand(); // 기본 코드 등록·피자 일괄가는 7번가 전용
  const { isViewer } = useCurrentRole();
  const [rows, setRows] = useState([]);
  const [loading, setLoading] = useState(true);
  const [seeding, setSeeding] = useState(false);
  const [resetting, setResetting] = useState(false);
  const [editRow, setEditRow] = useState(null);
  const [addOpen, setAddOpen] = useState(false);
  const [bulkModal, setBulkModal] = useState(false);
  const [confirmReset, setConfirmReset] = useState(false);
  const [deleteTarget, setDeleteTarget] = useState(null); // 개별 삭제 대상 row
  const [deletePlan, setDeletePlan] = useState(null);
  const [deletePlanLoading, setDeletePlanLoading] = useState(false);
  const [recipeSummaryMap, setRecipeSummaryMap] = useState(new Map());
  // 브랜드 카테고리 프리셋 — SSR/첫 렌더는 서버와 동일하게 기본값(피자)로 두고,
  // 마운트 후 활성 브랜드에 맞춰 교정한다(하이드레이션 불일치 방지).
  const [brandCats, setBrandCats] = useState(PIZZA_CATEGORIES);
  const {
    catFilter,
    setCatFilter,
    statusFilter,
    setStatusFilter,
    subFilter,
    setSubFilter,
    search,
    setSearch,
    statusFiltered,
    displayCategories,
    catCounts,
    filtered,
  } = useMenuMasterFilters(rows, brandCats);
  const mountedRef = useMounted();
  // 마운트 후 실제 활성 브랜드 판별 — localStorage를 읽어 비-main이면 빈 프리셋으로 교정
  useEffect(() => {
    setBrandCats(getActiveBrandId() === 'main' ? PIZZA_CATEGORIES : []);
  }, []);

  const load = useCallback(async () => {
    await initDB();
    // 기존 데이터의 1인피자 P-ONE-###-ONE 코드 정규화 (idempotent — 변경 없으면 no-op)
    await normalizePersonalPizzaCodes().catch(e =>
      console.warn('[menu-master] 코드 정규화 실패', e)
    );
    const nextRows = await getAllMenuMaster();
    let nextRecipeSummaryMap = new Map();
    try {
      nextRecipeSummaryMap = await loadMenuRecipeSummaryMap(nextRows);
    } catch (err) {
      console.warn('[menu-master] 레시피 원가 요약 계산 실패', err);
    }
    if (mountedRef.current) {
      setRows(nextRows);
      setRecipeSummaryMap(nextRecipeSummaryMap);
    }
  }, [mountedRef]);

  useEffect(() => {
    load()
      .catch(err => {
        if (mountedRef.current) console.error('[MenuMaster] load failed', err);
      })
      .finally(() => {
        if (mountedRef.current) setLoading(false);
      });
  }, [load, mountedRef]);
  useVisibilityRefresh(load);

  // 마스터 변경 후 소비처 미러(cost_selling_prices) 동기화.
  // 단방향(마스터→판매가)만 여기서 수행. 반대 방향(판매가 업로드→마스터)은
  // lib/cost/menu-price/store.js의 syncMenuMasterFromPrices 에서 처리.
  async function syncMirror() {
    try {
      await pushMasterToPrices();
    } catch (err) {
      console.warn('판매가 미러 동기화 실패:', err);
    }
  }

  async function handleDeleteRow(row) {
    try {
      const result = await deleteMenuMaster(row.id);
      if (result?.cascadeErrors?.length) {
        showToast(
          `"${row.menuName}" 삭제됨 · 연관 영양 데이터 정리 ${result.cascadeErrors.length}건 확인 필요`,
          'warn'
        );
      } else {
        showToast(`"${row.menuName}" 삭제됨`, 'ok');
      }
      setDeleteTarget(null);
      await syncMirror();
      await load();
    } catch (err) {
      showToast('삭제 실패: ' + err.message, 'error');
    }
  }

  async function openDeleteDialog(row) {
    setDeleteTarget(row);
    setDeletePlan(null);
    setDeletePlanLoading(true);
    try {
      const plan = await getMenuDeletePlan(row.id);
      if (mountedRef.current) setDeletePlan(plan);
    } catch (err) {
      console.warn('[menu-master] 삭제 영향 계산 실패', err);
      if (mountedRef.current) setDeletePlan(null);
    } finally {
      if (mountedRef.current) setDeletePlanLoading(false);
    }
  }

  async function handleResetAndSeed() {
    setResetting(true);
    try {
      await resetAllMenuMaster();
      await resetAllMenuPrices(); // 미러도 함께 비움
      await load();
      showToast('초기화 완료', 'ok');
    } catch (err) {
      showToast('실패: ' + err.message, 'error');
    } finally {
      setResetting(false);
    }
  }

  async function handleSeed() {
    setSeeding(true);
    try {
      const { inserted } = await seedMenuMaster();
      await syncMirror();
      await load();
      showToast(`${inserted}개 등록 완료`, 'ok');
    } catch (err) {
      showToast('등록 실패: ' + err.message, 'error');
    } finally {
      setSeeding(false);
    }
  }

  function handleExportCsv() {
    const headers = ['메뉴코드', '메뉴명', '규격', '판매가', '상태', '카테고리'];
    const rows = filtered.map(r => [
      r.menuCode || '',
      r.menuName || '',
      r.size || '',
      r.price != null ? String(r.price) : '',
      r.status || '',
      r.category || '',
    ]);
    const csv = [headers, ...rows]
      .map(r => r.map(v => '"' + String(v).replace(/"/g, '""') + '"').join(','))
      .join('\n');
    downloadCsvText(csv, '메뉴마스터.csv');
    showToast(`엑셀 ${filtered.length}개 내보내기 완료`, 'ok');
  }

  async function handleSaveRow(data) {
    try {
      const result = await upsertMenuMaster(data);
      await syncMirror();
      await load();
      setEditRow(null);
      setAddOpen(false);
      // data.id 없이 mode:'update' → menuCode 중복으로 기존 항목 병합
      if (result.mode === 'update' && !data.id) {
        showToast(`기존 항목(${data.menuCode}) 갱신됨 — 새 항목으로 추가되지 않았습니다`, 'warn');
      } else {
        showToast('저장 완료', 'ok');
      }
    } catch (err) {
      showToast('저장 실패: ' + err.message, 'error');
    }
  }

  const active = rows.filter(r => r.status === 'active');
  const discontinued = rows.filter(r => r.status === 'discontinued');
  const testRows = rows.filter(r => r.status === 'test');
  const recipeSummaries = [...recipeSummaryMap.values()].filter(
    summary => summary.status !== MENU_RECIPE_SUMMARY_STATUS.UNSUPPORTED
  );
  const recipeWritten = recipeSummaries.filter(summary => summary.hasRecipe).length;
  const recipeNeedsCheck = recipeSummaries.filter(
    summary => summary.hasRecipe && summary.status !== MENU_RECIPE_SUMMARY_STATUS.READY
  ).length;

  const { page, goTo, totalPages, paged, total } = usePagination(filtered, 60);

  return (
    <main className="main">
      <PageHeader
        breadcrumb={['메뉴', '메뉴 마스터']}
        title="메뉴 마스터"
        sub={
          loading
            ? '로딩 중…'
            : `총 ${rows.length}개 · 원가·영양·원산지·알레르기 전 모듈의 기준 데이터`
        }
        actions={
          <>
            <button
              className="btn"
              onClick={handleExportCsv}
              disabled={rows.length === 0}
              style={{ color: 'var(--text-2)' }}
            >
              <Icon.download style={{ width: 14, height: 14 }} /> 엑셀로 내보내기
            </button>
            <button
              className="btn"
              onClick={() => setBulkModal(true)}
              disabled={rows.length === 0 || isViewer}
            >
              <Icon.calc style={{ width: 14, height: 14 }} /> 코드별 일괄 가격
            </button>
            {isMain && (
              <button className="btn" onClick={handleSeed} disabled={seeding || isViewer}>
                <Icon.download style={{ width: 14, height: 14 }} />
                {seeding ? '등록 중…' : '기본 코드 등록'}
              </button>
            )}
            <button
              className="btn"
              onClick={() => setConfirmReset(true)}
              disabled={resetting || isViewer}
              style={{ color: 'var(--negative)' }}
            >
              <Icon.trash style={{ width: 14, height: 14 }} />
              {resetting ? '처리 중…' : '초기화'}
            </button>
            <button className="btn primary" onClick={() => setAddOpen(true)} disabled={isViewer}>
              <Icon.plus style={{ width: 14, height: 14 }} /> 메뉴 추가
            </button>
          </>
        }
      />

      {/* 통계 */}
      <MenuMasterStatsRow
        rows={rows}
        activeRows={active}
        discontinuedRows={discontinued}
        testRows={testRows}
        displayCategories={displayCategories}
        recipeSummaries={recipeSummaries}
        recipeWritten={recipeWritten}
        recipeNeedsCheck={recipeNeedsCheck}
      />

      {loading && (
        <div className="card table-card">
          <div className="table-wrap">
            <table className="data-table">
              <thead>
                <tr>
                  <th style={{ width: 145 }}>메뉴코드</th>
                  <th>메뉴명</th>
                  <th style={{ width: 200 }}>분류 태그</th>
                  <th style={{ width: 60 }}>사이즈</th>
                  <th style={{ width: 100 }}>판매가</th>
                  <th style={{ width: 120 }}>레시피/원가</th>
                  <th style={{ width: 80 }}>상태</th>
                  <th style={{ width: 60 }}></th>
                </tr>
              </thead>
              <tbody>
                {Array.from({ length: 5 }).map((_, i) => (
                  <tr key={i}>
                    <td>
                      <Skeleton width={100} height={13} />
                    </td>
                    <td>
                      <Skeleton width="80%" height={13} />
                    </td>
                    <td>
                      <div style={{ display: 'flex', gap: 4 }}>
                        <Skeleton width={44} height={20} radius={999} />
                        <Skeleton width={72} height={20} radius={999} />
                      </div>
                    </td>
                    <td>
                      <Skeleton width={32} height={13} />
                    </td>
                    <td>
                      <Skeleton width={60} height={13} style={{ marginLeft: 'auto' }} />
                    </td>
                    <td>
                      <Skeleton width={70} height={20} radius={6} />
                    </td>
                    <td>
                      <Skeleton width={44} height={20} radius={6} />
                    </td>
                    <td>
                      <Skeleton width={28} height={28} radius={6} />
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        </div>
      )}

      {!loading && rows.length === 0 && (
        <div className="empty-state" style={{ padding: '60px 20px' }}>
          <div
            style={{
              width: 56,
              height: 56,
              borderRadius: 16,
              background: 'var(--surface-2)',
              display: 'grid',
              placeItems: 'center',
              color: 'var(--text-4)',
              border: '1px solid var(--border)',
            }}
          >
            <Icon.box style={{ width: 28, height: 28 }} />
          </div>
          <div className="empty-title">메뉴 마스터 데이터가 없습니다</div>
          <div className="empty-sub">
            {isMain
              ? '기본 코드 등록 버튼으로 전체 코드 체계를 불러오세요.'
              : '메뉴 추가 버튼으로 메뉴를 직접 등록하세요.'}
          </div>
          {isMain && (
            <button
              className="btn primary"
              onClick={handleSeed}
              disabled={seeding}
              style={{ marginTop: 4 }}
            >
              <Icon.plus style={{ width: 14, height: 14 }} />
              {seeding ? '등록 중…' : '기본 코드 등록'}
            </button>
          )}
        </div>
      )}

      {rows.length > 0 && (
        <div className="content-enter">
          {/* 필터 */}
          <div style={{ display: 'flex', flexDirection: 'column', gap: 8 }}>
            <div style={{ display: 'flex', gap: 6, flexWrap: 'wrap', alignItems: 'center' }}>
              <span
                style={{ fontSize: 12, color: 'var(--text-3)', marginRight: 4, fontWeight: 600 }}
              >
                상태
              </span>
              {[
                { id: 'all', label: `전체 ${rows.length}` },
                { id: 'active', label: `활성 ${active.length}` },
                { id: 'discontinued', label: `단종 ${discontinued.length}` },
                { id: 'test', label: `테스트 ${testRows.length}` },
              ].map(t => (
                <button
                  key={t.id}
                  className={'chip' + (statusFilter === t.id ? ' active' : '')}
                  onClick={() => {
                    setStatusFilter(t.id);
                    setCatFilter('all');
                  }}
                >
                  {t.label}
                </button>
              ))}
              <div className="filter-search" style={{ width: 220, marginLeft: 'auto' }}>
                <Icon.search
                  style={{ width: 14, height: 14, color: 'var(--text-3)', flexShrink: 0 }}
                />
                <input
                  value={search}
                  onChange={e => setSearch(e.target.value)}
                  placeholder="코드·메뉴명 검색"
                />
              </div>
            </div>

            <div style={{ display: 'flex', gap: 6, flexWrap: 'wrap', alignItems: 'center' }}>
              <span
                style={{ fontSize: 12, color: 'var(--text-3)', marginRight: 4, fontWeight: 600 }}
              >
                분류
              </span>
              <button
                className={'chip' + (catFilter === 'all' ? ' active' : '')}
                onClick={() => {
                  setCatFilter('all');
                  setSubFilter('all');
                }}
              >
                전체 {catCounts.all}
              </button>
              {displayCategories.map(
                c =>
                  catCounts[c] > 0 && (
                    <button
                      key={c}
                      className={'chip' + (catFilter === c ? ' active' : '')}
                      onClick={() => {
                        setCatFilter(c);
                        setSubFilter('all');
                      }}
                    >
                      {c} {catCounts[c]}
                    </button>
                  )
              )}
            </div>

            {catFilter === '피자' && (
              <div style={{ display: 'flex', gap: 6, flexWrap: 'wrap', alignItems: 'center' }}>
                <span
                  style={{ fontSize: 12, color: 'var(--text-3)', marginRight: 4, fontWeight: 600 }}
                >
                  중분류
                </span>
                <button
                  className={'chip' + (subFilter === 'all' ? ' active' : '')}
                  onClick={() => setSubFilter('all')}
                >
                  전체
                </button>
                {PIZZA_SUBS.map(s => (
                  <button
                    key={s}
                    className={'chip' + (subFilter === s ? ' active' : '')}
                    onClick={() => setSubFilter(s)}
                  >
                    {s}
                  </button>
                ))}
              </div>
            )}
          </div>

          {/* 테이블 */}
          <div className="card table-card">
            {filtered.length === 0 ? (
              <div
                style={{
                  padding: '40px 0',
                  textAlign: 'center',
                  color: 'var(--text-3)',
                  fontSize: 13,
                }}
              >
                조건에 맞는 항목이 없습니다
              </div>
            ) : (
              <div className="table-wrap">
                <table className="data-table stagger-rows">
                  <thead>
                    <tr>
                      <th style={{ width: 145 }}>메뉴코드</th>
                      <th>메뉴명</th>
                      <th style={{ width: 200 }}>분류 태그</th>
                      <th style={{ width: 60 }}>사이즈</th>
                      <th style={{ width: 100, textAlign: 'right' }}>판매가</th>
                      <th style={{ width: 120 }}>레시피/원가</th>
                      <th style={{ width: 80 }}>상태</th>
                      <th style={{ width: 60 }}></th>
                    </tr>
                  </thead>
                  <tbody>
                    {paged.map(row => (
                      <MenuMasterTableRow
                        key={row.id}
                        row={row}
                        recipeSummary={recipeSummaryMap.get(row.menuCode)}
                        isViewer={isViewer}
                        onEdit={setEditRow}
                        onDelete={openDeleteDialog}
                      />
                    ))}
                  </tbody>
                </table>
              </div>
            )}
            <div style={{ borderTop: '1px solid var(--divider)' }}>
              <Pagination
                page={page}
                totalPages={totalPages}
                onPage={goTo}
                total={total}
                pageSize={60}
              />
              {totalPages <= 1 && (
                <div style={{ padding: '8px 16px', fontSize: 11, color: 'var(--text-3)' }}>
                  {filtered.length}개 표시 / 전체 {rows.length}개
                </div>
              )}
            </div>
          </div>
        </div>
      )}

      {/* 일괄 업로드 — 업로드 시 마스터로 자동 반영 */}
      <MenuPriceUploadCard onReplaced={load} />

      {editRow && (
        <MenuMasterEditModal
          row={editRow}
          isNew={false}
          onSave={handleSaveRow}
          onClose={() => setEditRow(null)}
          presetCategories={brandCats}
          onRecipeSaved={load}
        />
      )}

      {addOpen && (
        <MenuMasterEditModal
          row={null}
          isNew
          onSave={handleSaveRow}
          onClose={() => setAddOpen(false)}
          presetCategories={brandCats}
          onRecipeSaved={load}
        />
      )}

      {bulkModal && <BulkPriceModal onClose={() => setBulkModal(false)} onDone={load} />}

      {deleteTarget && (
        <ConfirmDialog
          open
          message={buildMenuDeleteMessage(deleteTarget, deletePlan, deletePlanLoading)}
          danger
          onConfirm={() => handleDeleteRow(deleteTarget)}
          onCancel={() => {
            setDeleteTarget(null);
            setDeletePlan(null);
          }}
        />
      )}

      {confirmReset && (
        <ConfirmDialog
          open
          message="메뉴 마스터 전체를 삭제합니다. 계속할까요?"
          danger
          onConfirm={() => {
            setConfirmReset(false);
            handleResetAndSeed();
          }}
          onCancel={() => setConfirmReset(false)}
        />
      )}
    </main>
  );
}
