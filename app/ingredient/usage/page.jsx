'use client';
import { useState, useMemo } from 'react';
import { useLocalStorage } from '@/hooks/useLocalStorage';
import { PageHeader } from '@/components/ui/PageHeader';
import { downloadCsv, makeFileNameWithBrand } from '@/lib/download';
import { showToast } from '@/components/Toast';
import { getAllIngredients, buildProductTypeMap } from '@/lib/ingredient';
import { getManagedProducts, seedManagedProductsIfEmpty } from '@/lib/shipment';
import { buildIngredientUsageMap } from '@/lib/cost/ingredient-price-helpers';
import { useDBLoad } from '@/hooks/useDBLoad';
import { useIngredientUsageRows } from '@/hooks/useIngredientUsageRows';
import { getAllRecipeGroups } from '@/lib/cost/recipe-groups/store';
import { getAllEdges } from '@/lib/cost/edge-dough';
import { getAllMenuMaster } from '@/lib/menu-master/store';
import { getAllMenuRecipes } from '@/lib/menu-recipes';
import { getAllCompositions } from '@/lib/nutrition/values/store';
import { KEYS } from '@/lib/note/keys';
import { IngredientUsageDashboard } from '@/components/ingredient/usage/IngredientUsageDashboard';
import { keyOf } from '@/components/ingredient/usage/usage-display-utils';

function toStringSet(value) {
  return new Set(normalizeStringList(value));
}

function normalizeStringList(value) {
  if (!Array.isArray(value)) return [];
  return value.filter(v => typeof v === 'string' && v.trim());
}

export default function Page() {
  const [usageCat, setUsageCat] = useState('전체');
  const [menuSearch, setMenuSearch] = useState('');
  const [sortKey, setSortKey] = useState('count'); // 'count' | 'name'
  const [sortDir, setSortDir] = useState('desc');
  const [expanded, setExpanded] = useState(new Set());
  const [hiddenList, setHiddenList] = useLocalStorage(
    KEYS.INGREDIENT_USAGE_HIDDEN,
    [],
    normalizeStringList
  );
  const hidden = useMemo(() => toStringSet(hiddenList), [hiddenList]);
  const [showHidden, setShowHidden] = useState(false);
  const [onlyOne, setOnlyOne] = useState(false);
  const [showUnused, setShowUnused] = useState(false);
  const [excludedMenuList, setExcludedMenuList] = useLocalStorage(
    KEYS.INGREDIENT_USAGE_EXCL_MENUS,
    [],
    normalizeStringList
  );
  const excludedMenus = useMemo(() => toStringSet(excludedMenuList), [excludedMenuList]);

  // 검색창은 "사용 재료" 뷰에서는 메뉴명, "미사용" 뷰에서는 식자재명·코드로 의미가 바뀐다.
  // 뷰를 전환할 때 이전 뷰의 검색어가 그대로 남아있으면 다른 의미로 잘못 필터링되어
  // (예: 메뉴명으로 검색해두고 미사용을 누르면 그 텍스트가 식자재명에 안 걸려 결과가 0건이 됨)
  // 목록이 비어 보이는 문제가 생기므로, 전환 시 검색어를 초기화한다.
  function toggleShowUnused(updater) {
    setShowUnused(updater);
    setMenuSearch('');
  }

  const { data, loading, error, reload } = useDBLoad(
    async () => {
      const [meta, menuMasters, recipes, groups, edges, compositions, managed] = await Promise.all([
        getAllIngredients(),
        getAllMenuMaster(),
        getAllMenuRecipes(),
        getAllRecipeGroups(),
        getAllEdges(),
        getAllCompositions(),
        seedManagedProductsIfEmpty().then(() => getManagedProducts()),
      ]);
      return {
        allMeta: meta,
        typeMap: buildProductTypeMap(managed),
        usageMap: buildIngredientUsageMap({
          menuMasters,
          detailRecipes: recipes,
          groups,
          edges,
          compositions,
        }),
      };
    },
    {
      initialData: null,
      onError: err => {
        console.warn('[ingredient/usage] 로드 실패', err);
        showToast('데이터 로드 실패: ' + err.message, 'error');
      },
    }
  );
  const allMeta = data?.allMeta ?? [];
  const typeMap = data?.typeMap ?? new Map();
  const usageMap = data?.usageMap ?? { byCode: new Map(), byName: new Map() };

  function toggleHidden(k) {
    setHiddenList(prev => {
      const next = new Set(prev);
      if (next.has(k)) next.delete(k);
      else next.add(k);
      return [...next];
    });
  }
  function excludeMenu(menuName) {
    setExcludedMenuList(prev => {
      const next = new Set(prev).add(menuName);
      return [...next];
    });
  }
  function restoreMenu(menuName) {
    setExcludedMenuList(prev => {
      const next = new Set(prev);
      next.delete(menuName);
      return [...next];
    });
  }
  function restoreAllMenus() {
    setExcludedMenuList([]);
  }

  const { nonHidden, displayRows, hiddenCount, oneCount, menuCounts, totalUsedCount } =
    useIngredientUsageRows({
      allMeta,
      usageMap,
      typeMap,
      usageCat,
      menuSearch,
      sortKey,
      sortDir,
      showUnused,
      showHidden,
      onlyOne,
      hidden,
      excludedMenus,
    });

  function toggle(code) {
    setExpanded(prev => {
      const next = new Set(prev);
      if (next.has(code)) next.delete(code);
      else next.add(code);
      return next;
    });
  }

  function handleSort(key) {
    if (key === sortKey) setSortDir(d => (d === 'asc' ? 'desc' : 'asc'));
    else {
      setSortKey(key);
      setSortDir(key === 'count' ? 'desc' : 'asc');
    }
  }

  function exportCsv() {
    const headers = [
      '식자재명',
      '제품코드',
      '구분',
      '전체 메뉴수',
      '피자 메뉴수',
      '사이드 메뉴수',
      '사용 메뉴',
    ];
    const rows = displayRows.map(r => [
      r.name || '',
      r.code || '',
      r.scope || '',
      r.count,
      r.pizzaCount || 0,
      r.sideCount || 0,
      (r.menus || []).map(m => `${m.menuName}(${m.cat})`).join(', '),
    ]);
    downloadCsv(
      [headers, ...rows],
      makeFileNameWithBrand(showUnused ? '미사용식자재' : '식자재사용현황', 'csv')
    );
  }

  return (
    <main className="main">
      <PageHeader
        breadcrumb={['식자재', '제품별 사용현황']}
        title="제품별 사용현황"
        sub="각 식자재가 어느 메뉴 레시피에서 사용되는지 확인할 수 있어요."
      />

      {loading ? (
        <div className="card" style={{ padding: 20 }}>
          {Array.from({ length: 8 }).map((_, i) => (
            <div
              key={i}
              style={{
                height: 40,
                marginBottom: 8,
                borderRadius: 8,
                background: 'var(--surface-2)',
                opacity: 1 - i * 0.08,
              }}
            />
          ))}
        </div>
      ) : error ? (
        <div
          className="card"
          style={{ padding: 32, textAlign: 'center', color: 'var(--negative)' }}
        >
          <div>데이터를 불러오지 못했습니다: {error.message}</div>
          <button className="btn primary" style={{ marginTop: 12 }} onClick={reload}>
            다시 시도
          </button>
        </div>
      ) : allMeta.length === 0 ? (
        <div className="card" style={{ padding: 40, textAlign: 'center', color: 'var(--text-3)' }}>
          식자재 마스터 데이터가 없습니다. 식자재 관리 페이지에서 먼저 등록해주세요.
        </div>
      ) : (
        <IngredientUsageDashboard
          allMetaCount={allMeta.length}
          displayRows={displayRows}
          nonHidden={nonHidden}
          hidden={hidden}
          hiddenCount={hiddenCount}
          oneCount={oneCount}
          menuCounts={menuCounts}
          totalUsedCount={totalUsedCount}
          usageCat={usageCat}
          onUsageCat={setUsageCat}
          menuSearch={menuSearch}
          onMenuSearch={setMenuSearch}
          sortKey={sortKey}
          sortDir={sortDir}
          onSort={handleSort}
          expanded={expanded}
          onExpandAll={() => setExpanded(new Set(displayRows.map(keyOf)))}
          onCollapseAll={() => setExpanded(new Set())}
          onToggleRow={toggle}
          onToggleHidden={toggleHidden}
          showHidden={showHidden}
          onShowHidden={setShowHidden}
          onlyOne={onlyOne}
          onOnlyOne={setOnlyOne}
          showUnused={showUnused}
          onShowUnused={toggleShowUnused}
          excludedMenus={excludedMenus}
          onExcludeMenu={excludeMenu}
          onRestoreMenu={restoreMenu}
          onRestoreAllMenus={restoreAllMenus}
          onExportCsv={exportCsv}
        />
      )}
    </main>
  );
}
