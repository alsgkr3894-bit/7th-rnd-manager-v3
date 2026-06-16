'use client';
import { useEffect, useState, useCallback, useMemo } from 'react';
import { useMounted } from '@/hooks/useMounted';
import { useLocalStorage } from '@/hooks/useLocalStorage';
import { PageHeader } from '@/components/ui/PageHeader';
import { initDB } from '@/lib/db';
import { downloadCsv } from '@/lib/download';
import { showToast } from '@/components/Toast';
import { getAllIngredients, buildProductTypeMap } from '@/lib/ingredient';
import { getManagedProducts, seedManagedProductsIfEmpty } from '@/lib/shipment';
import { buildIngredientUsageMap } from '@/lib/cost/ingredient-price-helpers';
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
  const [loading, setLoading] = useState(true);
  const [allMeta, setAllMeta] = useState([]);
  const [usageMap, setUsageMap] = useState({ byCode: new Map(), byName: new Map() });
  const [usageCat, setUsageCat] = useState('전체');
  const [menuSearch, setMenuSearch] = useState('');
  const [sortKey, setSortKey] = useState('count'); // 'count' | 'name'
  const [sortDir, setSortDir] = useState('desc');
  const [expanded, setExpanded] = useState(new Set());
  const [typeMap, setTypeMap] = useState(new Map()); // productCode → 제때 관리품목 productType (전용/범용)
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
  const mountedRef = useMounted();

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

  const load = useCallback(async () => {
    await initDB();
    const [meta, menuMasters, recipes, groups, edges, compositions, managed] = await Promise.all([
      getAllIngredients(),
      getAllMenuMaster(),
      getAllMenuRecipes(),
      getAllRecipeGroups(),
      getAllEdges(),
      getAllCompositions(),
      seedManagedProductsIfEmpty().then(() => getManagedProducts()),
    ]);
    if (!mountedRef.current) return;
    setAllMeta(meta);

    // 전용/범용 단일 출처 = 제때 관리품목(productType)
    setTypeMap(buildProductTypeMap(managed));

    const { byCode, byName } = buildIngredientUsageMap({
      menuMasters,
      detailRecipes: recipes,
      groups,
      edges,
      compositions,
    });
    setUsageMap({ byCode, byName });
  }, [mountedRef]);

  useEffect(() => {
    load()
      .catch(err => {
        if (mountedRef.current) {
          console.error('[IngredientUsage] load failed', err);
          showToast('데이터 로드 실패: ' + err.message, 'error');
        }
      })
      .finally(() => {
        if (mountedRef.current) setLoading(false);
      });
  }, [load, mountedRef]);

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
    downloadCsv([headers, ...rows], showUnused ? '미사용식자재.csv' : '식자재사용현황.csv');
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
          onShowUnused={setShowUnused}
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
