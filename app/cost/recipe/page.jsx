'use client';
import { useEffect, useRef, useState, Suspense } from 'react';
import { usePathname, useSearchParams } from 'next/navigation';
import { Icon } from '@/components/icons';
import { PageHeader } from '@/components/ui/PageHeader';
import { showToast } from '@/components/Toast';
import { downloadCsvText } from '@/lib/download';
import { saveRecipe, deleteRecipe, MENU_CATEGORIES } from '@/lib/recipe';
import { useRecipeWorkbenchData } from '@/hooks/useRecipeWorkbenchData';
import { useRecipeListState } from '@/hooks/useRecipeListState';
import { RecipeSidebar } from '@/components/cost/recipe/RecipeSidebar';
import { useVisibilityRefresh } from '@/hooks/useVisibilityRefresh';
import { onPriceUpload } from '@/lib/price/price-events';
import { ConfirmDialog } from '@/components/ui/ConfirmDialog';
import { TabButton } from '@/components/cost/shared/TabButton';
import { CommonManageView } from '@/components/cost/manage/CommonManageView';
import dynamic from 'next/dynamic';

const RecipeEditor = dynamic(
  () => import('@/components/cost/recipe/RecipeEditor').then(m => ({ default: m.RecipeEditor })),
  {
    loading: () => (
      <div style={{ padding: 48, textAlign: 'center', color: 'var(--text-3)' }}>로딩 중…</div>
    ),
  }
);

const emptyDraft = () => ({
  menuCode: '',
  menuName: '',
  menuCategory: '피자',
  sizes: [
    { label: 'L', sellingPrice: '' },
    { label: 'R', sellingPrice: '' },
  ],
  ingredients: [],
  groupIds: null, // null = 카테고리 기본값 사용
  note: '',
});

function sizesToDraft(sizes) {
  return (sizes || []).map(s => ({
    ...s,
    sellingPrice: s.sellingPrice != null ? String(s.sellingPrice) : '',
  }));
}

function prepareRecipeForEdit(rec) {
  return {
    ...rec,
    sizes: rec.sizes?.length ? sizesToDraft(rec.sizes) : [{ label: '', sellingPrice: '' }],
    ingredients: (rec.ingredients || []).map(i => ({
      ...i,
      quantities: { ...(i.quantities || {}) },
    })),
  };
}

function handleExportCsv(filtered) {
  const headers = ['메뉴코드', '메뉴명', '카테고리', '규격'];
  const rows = filtered.map(r => [
    r.menuCode || '',
    r.menuName || '',
    r.menuCategory || '',
    r.size || '',
  ]);
  const csv = [headers, ...rows]
    .map(r => r.map(v => '"' + String(v).replace(/"/g, '""') + '"').join(','))
    .join('\n');
  downloadCsvText(csv, '레시피목록.csv');
}

// ── 메인 페이지 ───────────────────────────────────────────────
export default function Page() {
  return (
    <Suspense
      fallback={
        <main className="main">
          <div style={{ padding: 48, textAlign: 'center', color: 'var(--text-3)' }}>로딩 중…</div>
        </main>
      }
    >
      <RecipeContent />
    </Suspense>
  );
}

function RecipeContent() {
  const pathname = usePathname();
  const searchParams = useSearchParams();

  const {
    recipes,
    allMeta,
    menuMasters,
    unitPriceMap,
    menuPricesMap,
    allGroups,
    loading,
    dbError,
    reload,
  } = useRecipeWorkbenchData();

  const listState = useRecipeListState({
    recipes,
    allGroups,
    initialSearch: searchParams?.get('q') || '',
  });

  const [selectedId, setSelectedId] = useState(null);
  // from=sample 파라미터: URL sync effect보다 먼저 읽어야 하므로 useState initializer 사용
  const [isNew, setIsNew] = useState(() => searchParams?.get('from') === 'sample');
  const [draft, setDraft] = useState(() => {
    if (searchParams?.get('from') !== 'sample') return null;
    const name = searchParams.get('name') || '';
    const cat = searchParams.get('cat') || '피자';
    return {
      ...emptyDraft(),
      menuName: name,
      menuCategory: MENU_CATEGORIES.includes(cat) ? cat : '피자',
    };
  });
  const [saving, setSaving] = useState(false);
  const [tab, setTab] = useState(() => {
    const t = searchParams?.get('tab');
    return t === 'groups' || t === 'edges' ? t : 'recipe';
  });
  const [pendingDeleteId, setPendingDeleteId] = useState(null);

  // selectedId 변경 감지용 ref — draft 동기화 effect에서 불필요한 재실행 방지
  const prevSelectedId = useRef(null);

  useVisibilityRefresh(reload);
  useEffect(() => onPriceUpload(reload), [reload]);

  // URL sync for search filter + active tab
  useEffect(() => {
    const params = new URLSearchParams();
    if (tab !== 'recipe') params.set('tab', tab);
    if (listState.search) params.set('q', listState.search);
    const qs = params.toString();
    window.history.replaceState(null, '', qs ? `${pathname}?${qs}` : pathname);
  }, [listState.search, tab, pathname]);

  // load 후 선택된 레시피 draft 동기화 — selectedId가 실제로 바뀔 때만 실행
  useEffect(() => {
    if (!isNew && selectedId != null && selectedId !== prevSelectedId.current) {
      prevSelectedId.current = selectedId;
      const rec = recipes.find(r => r.id === selectedId);
      if (rec) setDraft(prepareRecipeForEdit(rec));
    } else if (isNew) {
      prevSelectedId.current = null;
    }
  }, [recipes, isNew, selectedId]);

  function handleSelect(id) {
    setSelectedId(id);
    setIsNew(false);
    const rec = recipes.find(r => r.id === id);
    if (rec) setDraft(prepareRecipeForEdit(rec));
  }

  function handleNew() {
    setSelectedId(null);
    setIsNew(true);
    setDraft(emptyDraft());
  }

  async function handleSave() {
    if (saving) return; // 연타/단축키 중복 저장 방지
    if (!draft?.menuName?.trim()) {
      showToast('메뉴명을 입력해주세요');
      return;
    }
    setSaving(true);
    try {
      const savedId = await saveRecipe({
        ...draft,
        id: isNew ? undefined : selectedId,
        sizes: draft.sizes
          .filter(s => s.label?.trim())
          .map(s => ({
            label: s.label,
            sellingPrice: s.sellingPrice !== '' ? Number(s.sellingPrice) : null,
          })),
      });
      showToast(isNew ? '레시피 등록 완료' : '레시피 수정 완료');
      await reload();
      setIsNew(false);
      setSelectedId(savedId);
    } catch (e) {
      showToast('저장 실패: ' + e.message);
    } finally {
      setSaving(false);
    }
  }

  async function handleDuplicate(recipeId, e) {
    e?.stopPropagation();
    const rec = recipes.find(r => r.id === recipeId);
    if (!rec) return;
    try {
      const { id: _id, updatedAt: _updatedAt, ...rest } = rec;
      const newId = await saveRecipe({
        ...rest,
        menuName: `복사본 - ${rec.menuName}`,
        menuCode: '',
      });
      showToast(`"${rec.menuName}" 복제 완료`);
      await reload();
      setIsNew(false);
      setSelectedId(newId);
    } catch (err) {
      showToast('복제 실패: ' + err.message);
    }
  }

  async function handleDelete(id) {
    if (!id) return;
    try {
      await deleteRecipe(id);
      showToast('삭제 완료');
      setSelectedId(null);
      setIsNew(false);
      setDraft(null);
      await reload();
    } catch (e) {
      showToast('삭제 실패: ' + e.message);
    }
  }

  const showEditor = isNew || selectedId != null;

  if (loading)
    return (
      <main className="main">
        <PageHeader
          breadcrumb={['원가계산', '원가 계산']}
          title="메뉴 원가 계산"
          sub="불러오는 중…"
        />
        <div style={{ padding: '40px 0', textAlign: 'center', color: 'var(--text-3)' }}>
          불러오는 중…
        </div>
      </main>
    );

  if (dbError)
    return (
      <main className="main">
        <PageHeader breadcrumb={['원가계산', '원가 계산']} title="메뉴 원가 계산" sub="로드 실패" />
        <div
          className="card"
          style={{ padding: 32, textAlign: 'center', color: 'var(--negative)' }}
        >
          데이터베이스 오류: {dbError}
        </div>
      </main>
    );

  return (
    <main className="main">
      <PageHeader
        breadcrumb={['원가계산', '원가 계산']}
        title="메뉴 원가 계산"
        masterSource
        sub="사이즈별 식자재 사용량을 입력하면 원가와 원가율이 자동 계산됩니다."
        actions={
          tab === 'recipe' ? (
            <button
              className="btn"
              onClick={() => {
                handleExportCsv(listState.filteredRecipes);
                showToast(`CSV ${listState.filteredRecipes.length}개 내보내기 완료`, 'ok');
              }}
              disabled={listState.filteredRecipes.length === 0}
            >
              <Icon.download style={{ width: 14, height: 14 }} /> 엑셀로 내보내기
            </button>
          ) : undefined
        }
      />

      {/* 상단 탭 — 원가 레시피 / 묶음 관리 / 엣지 관리 (공통관리 통합) */}
      <div
        style={{ display: 'flex', gap: 4, borderBottom: '1px solid var(--border)', marginTop: 8 }}
      >
        <TabButton active={tab === 'recipe'} onClick={() => setTab('recipe')}>
          원가 레시피
        </TabButton>
        <TabButton active={tab === 'groups'} onClick={() => setTab('groups')}>
          묶음 관리
        </TabButton>
        <TabButton active={tab === 'edges'} onClick={() => setTab('edges')}>
          엣지 관리
        </TabButton>
      </div>

      {tab !== 'recipe' && (
        <div style={{ marginTop: 16 }}>
          {/* key={tab}으로 탭 전환 시 상태 초기화 — draft/edit 상태 잔류 방지 */}
          <CommonManageView key={tab} tab={tab} />
        </div>
      )}

      {tab === 'recipe' && (
        <div className="recipe-main-grid" style={{ marginTop: 8 }}>
          {/* ── 왼쪽: 메뉴 목록 ── */}
          <RecipeSidebar
            listState={listState}
            loading={loading}
            recipes={recipes}
            selectedId={selectedId}
            unitPriceMap={unitPriceMap}
            allGroups={allGroups}
            onNew={handleNew}
            onSelect={handleSelect}
            onDuplicate={handleDuplicate}
          />

          {/* ── 오른쪽: 에디터 ── */}
          {showEditor && draft ? (
            <RecipeEditor
              key={isNew ? 'new' : selectedId}
              draft={draft}
              setDraft={setDraft}
              allMeta={allMeta}
              menuMasters={menuMasters}
              menuPricesMap={menuPricesMap}
              unitPriceMap={unitPriceMap}
              allGroups={allGroups}
              isNew={isNew}
              saving={saving}
              onSave={handleSave}
              onDelete={!isNew ? () => setPendingDeleteId(selectedId) : null}
              onCancel={() => {
                setIsNew(false);
                setSelectedId(null);
                setDraft(null);
              }}
            />
          ) : (
            <div className="card" style={{ minHeight: 280, display: 'grid', placeItems: 'center' }}>
              <div style={{ textAlign: 'center', color: 'var(--text-3)' }}>
                <Icon.box style={{ width: 28, height: 28, opacity: 0.4, marginBottom: 8 }} />
                <div style={{ fontSize: 13 }}>메뉴를 선택하거나 새로 추가하세요</div>
              </div>
            </div>
          )}
        </div>
      )}

      {pendingDeleteId && (
        <ConfirmDialog
          open
          message="레시피를 삭제할까요?"
          danger
          onConfirm={() => {
            handleDelete(pendingDeleteId);
            setPendingDeleteId(null);
          }}
          onCancel={() => setPendingDeleteId(null)}
        />
      )}
    </main>
  );
}
