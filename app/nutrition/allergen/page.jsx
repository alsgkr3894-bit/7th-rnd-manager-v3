'use client';
import { useState, useMemo, useCallback, useEffect } from 'react';
import Link from 'next/link';
import { useVisibilityRefresh } from '@/hooks/useVisibilityRefresh';
import { Icon } from '@/components/icons';
import { PageHeader } from '@/components/ui/PageHeader';
import { initDB } from '@/lib/db';
import { getAllIngredients } from '@/lib/ingredient';
import { getAllMenuMaster } from '@/lib/menu-master';
import { getAllRecipeGroups } from '@/lib/cost/recipe-groups/store';
import { getAllEdges } from '@/lib/cost/edge-dough';
import { getAllPizzaRecipes } from '@/lib/cost/pizza-detail';
import { getAllPersonalRecipes } from '@/lib/cost/personal-detail';
import { getAllSideRecipes } from '@/lib/cost/side-detail';
import { getAllSetRecipes } from '@/lib/cost/set-detail';
import { getAllRecipes } from '@/lib/recipe';
import { buildIngredientMenuMap, getMenusForIngredient } from '@/lib/cost/ingredient-menu-map';
import { ALLERGEN_SEED } from '@/lib/nutrition/allergen/store';
import { SmallStatCard } from '@/components/ui/SmallStatCard';
import { SearchBox } from '@/components/ui/SearchBox';

/**
 * 알레르기 정보 페이지 — 자동 집계 뷰
 *
 * 식자재 관리(cost_ingredients)의 allergens 필드 + 레시피 매핑으로
 * 메뉴별 알레르기를 자동 집계. 수동 메뉴 연결 불필요.
 *
 * 두 가지 뷰:
 *   - 식자재별: 각 식자재의 알레르기 항목 + 매칭된 메뉴 수
 *   - 메뉴별 매트릭스: 메뉴 × 22종 알레르기 체크 (출력용)
 */
export default function Page() {
  const [ingredients,  setIngredients]  = useState([]);
  const [menuMasters,  setMenuMasters]  = useState([]);
  const [mapData,      setMapData]      = useState({ ingredientToMenus: new Map(), menuToIngredients: new Map() });
  const [loading,      setLoading]      = useState(true);
  const [search,       setSearch]       = useState('');
  const [viewMode,     setViewMode]     = useState('ingredient'); // 'ingredient' | 'menu'

  const load = useCallback(async () => {
    await initDB();
    const [ings, masters, groups, edges, pizzaRecs, personalRecs, sideRecs, setRecs, oldRecs] = await Promise.all([
      getAllIngredients(),
      getAllMenuMaster(),
      getAllRecipeGroups(),
      getAllEdges(),
      getAllPizzaRecipes(),
      getAllPersonalRecipes(),
      getAllSideRecipes(),
      getAllSetRecipes(),
      getAllRecipes(),
    ]);
    setIngredients(ings);
    setMenuMasters(masters);
    const detailRecipes = [
      ...pizzaRecs.map(r => ({ ...r, category: '피자' })),
      ...personalRecs.map(r => ({ ...r, category: '1인피자' })),
      ...sideRecs.map(r => ({ ...r, category: '사이드' })),
      ...setRecs.map(r => ({ ...r, category: '세트박스' })),
    ];
    setMapData(buildIngredientMenuMap({ menuMasters: masters, detailRecipes, oldRecipes: oldRecs, groups, edges }));
  }, []);

  useEffect(() => { load().catch(console.error).finally(() => setLoading(false)); }, [load]);
  useVisibilityRefresh(load);

  // 알레르기 있는 식자재
  const allergenIngredients = useMemo(() =>
    ingredients.filter(i => i.allergens?.length && !i.discontinued && !i.excluded),
    [ingredients]
  );

  // ── 식자재 기준 뷰 ─────────────────────────────────────────
  const ingredientRows = useMemo(() => {
    const q = search.toLowerCase().trim();
    return allergenIngredients.filter(ing => {
      if (!q) return true;
      const allergenNames = ALLERGEN_SEED.filter(a => (ing.allergens || []).includes(a.allergenCode)).map(a => a.allergenName).join(' ');
      return (
        (ing.ingredientName || '').toLowerCase().includes(q) ||
        (ing.productCode || '').toLowerCase().includes(q) ||
        allergenNames.toLowerCase().includes(q)
      );
    });
  }, [allergenIngredients, search]);

  // ── 메뉴별 매트릭스 뷰 ─────────────────────────────────────
  const menuMatrix = useMemo(() => {
    const ingByKey = new Map();
    for (const ing of allergenIngredients) {
      if (ing.productCode) ingByKey.set(`code:${ing.productCode}`, ing);
      const n = (ing.ingredientName || '').trim().toLowerCase().replace(/\s+/g, '');
      if (n) ingByKey.set(`name:${n}`, ing);
    }

    // menuCode → Set<allergenCode>
    const menuAllergens = new Map();
    const menuMeta = new Map();
    for (const [key, menus] of mapData.ingredientToMenus) {
      const ing = ingByKey.get(key);
      if (!ing?.allergens?.length) continue;
      for (const [menuCode, meta] of menus) {
        if (!menuAllergens.has(menuCode)) { menuAllergens.set(menuCode, new Set()); menuMeta.set(menuCode, meta); }
        for (const code of ing.allergens) menuAllergens.get(menuCode).add(code);
      }
    }

    const rows = [...menuAllergens.entries()]
      .map(([menuCode, codes]) => ({ menuCode, ...menuMeta.get(menuCode), allergenCodes: codes }))
      .sort((a, b) => (a.menuName || '').localeCompare(b.menuName || '', 'ko'));

    const q = search.toLowerCase().trim();
    if (!q) return rows;
    return rows.filter(r =>
      (r.menuName || '').toLowerCase().includes(q) ||
      ALLERGEN_SEED.filter(a => r.allergenCodes.has(a.allergenCode)).some(a => a.allergenName.toLowerCase().includes(q))
    );
  }, [allergenIngredients, mapData, search]);

  const totalWithAllergen = allergenIngredients.length;
  const totalIngredients = ingredients.filter(i => !i.discontinued && !i.excluded).length;

  return (
    <main className="main">
      <PageHeader
        breadcrumb={['영양성분', '알레르기 정보']}
        title="알레르기 정보"
        masterSource
        sub="식자재 관리에서 식자재별 알레르기 항목을 체크하면 자동으로 메뉴에 매칭됩니다"
      />

      <div style={{ display: 'flex', gap: 12, marginTop: 20 }}>
        <SmallStatCard label="알레르기 등록 식자재" value={totalWithAllergen} />
        <SmallStatCard label="전체 식자재" value={totalIngredients} />
        <SmallStatCard label="알레르기 매칭 메뉴" value={menuMatrix.length} />
      </div>

      {/* 법정 22종 안내 */}
      <div className="card" style={{ marginTop: 16, padding: '12px 20px' }}>
        <div style={{ fontSize: 12, fontWeight: 600, color: 'var(--text-3)', marginBottom: 8 }}>한국 법정 알레르기 22종</div>
        <div style={{ display: 'flex', flexWrap: 'wrap', gap: 6 }}>
          {ALLERGEN_SEED.map(al => (
            <span key={al.allergenCode} style={{ fontSize: 12, padding: '3px 10px', borderRadius: 20, background: 'var(--surface-2)', color: 'var(--text-2)' }}>
              {al.allergenName}
            </span>
          ))}
        </div>
      </div>

      {totalWithAllergen === 0 && (
        <div style={{ marginTop: 12, padding: '10px 16px', borderRadius: 10,
          background: 'var(--warn-soft)', color: 'var(--warn)',
          fontSize: 13, fontWeight: 600, display: 'flex', alignItems: 'center', gap: 8 }}>
          <Icon.alert style={{ width: 16, height: 16, flexShrink: 0 }}/>
          알레르기 등록 식자재 없음 —{' '}
          <Link href="/ingredient/manage" style={{ color: 'inherit', textDecoration: 'underline' }}>식자재 관리에서 입력</Link>
        </div>
      )}

      <div style={{ marginTop: 16, display: 'flex', gap: 8, alignItems: 'center' }}>
        <SearchBox value={search} onChange={setSearch} placeholder="식자재명·메뉴명·알레르기 검색" />
        <div style={{ display: 'flex', gap: 4, borderBottom: '1px solid var(--border)' }}>
          {['ingredient', 'menu'].map(mode => (
            <button key={mode} onClick={() => setViewMode(mode)}
              style={{ padding: '8px 14px', border: 0, background: 'transparent', fontSize: 13,
                fontWeight: viewMode === mode ? 700 : 500,
                color: viewMode === mode ? 'var(--accent)' : 'var(--text-3)',
                borderBottom: viewMode === mode ? '2px solid var(--accent)' : '2px solid transparent',
                cursor: 'pointer', marginBottom: -1 }}>
              {mode === 'ingredient' ? '식자재별' : '메뉴별 매트릭스'}
            </button>
          ))}
        </div>
      </div>

      <div className="card table-card" style={{ marginTop: 12 }}>
        {loading ? (
          <div style={{ padding: 40, textAlign: 'center', color: 'var(--text-4)' }}>불러오는 중…</div>
        ) : viewMode === 'ingredient' ? (
          ingredientRows.length === 0 ? (
            <div className="empty-state">
              <div className="empty-icon-wrap"><Icon.beaker style={{ width: 28, height: 28 }} /></div>
              <div className="empty-title">알레르기 등록 식자재가 없어요</div>
              <div className="empty-sub"><Link href="/ingredient/manage">식자재 관리</Link>에서 식자재별 알레르기를 체크하세요</div>
            </div>
          ) : (
            <table className="data-table">
              <thead>
                <tr>
                  <th>식자재명</th>
                  <th>제때 코드</th>
                  <th>알레르기 항목</th>
                  <th>매칭 메뉴 수</th>
                </tr>
              </thead>
              <tbody>
                {ingredientRows.map(ing => {
                  const menus = getMenusForIngredient(mapData.ingredientToMenus, ing.productCode, ing.ingredientName);
                  const allergenNames = ALLERGEN_SEED.filter(a => (ing.allergens || []).includes(a.allergenCode)).map(a => a.allergenName);
                  return (
                    <tr key={ing.id || ing.productCode || ing.ingredientName}>
                      <td style={{ fontWeight: 600 }}>{ing.ingredientName}</td>
                      <td className="mono muted">{ing.productCode || '—'}</td>
                      <td>
                        <div style={{ display: 'flex', flexWrap: 'wrap', gap: 4 }}>
                          {allergenNames.map(name => (
                            <span key={name} style={{ fontSize: 11, padding: '2px 8px', borderRadius: 999, background: 'var(--accent)', color: '#fff', fontWeight: 700 }}>
                              {name}
                            </span>
                          ))}
                        </div>
                      </td>
                      <td style={{ textAlign: 'center' }}>
                        {menus.size > 0
                          ? <span style={{ fontWeight: 700, color: 'var(--positive)' }}>{menus.size}</span>
                          : <span style={{ color: 'var(--text-4)' }}>0</span>}
                      </td>
                    </tr>
                  );
                })}
              </tbody>
            </table>
          )
        ) : (
          // 메뉴별 매트릭스
          menuMatrix.length === 0 ? (
            <div className="empty-state">
              <div className="empty-icon-wrap"><Icon.doc style={{ width: 28, height: 28 }} /></div>
              <div className="empty-title">표시할 메뉴가 없어요</div>
              <div className="empty-sub">식자재에 알레르기를 등록하고 원가 레시피에 구성품을 추가하면 자동 매칭됩니다</div>
            </div>
          ) : (
            <div style={{ overflowX: 'auto' }}>
              <table className="data-table" style={{ minWidth: 900 }}>
                <thead>
                  <tr>
                    <th style={{ minWidth: 160, position: 'sticky', left: 0, background: 'var(--surface-2)', zIndex: 2 }}>메뉴명</th>
                    <th style={{ width: 80 }}>카테고리</th>
                    {ALLERGEN_SEED.map(al => (
                      <th key={al.allergenCode} style={{ width: 46, fontSize: 11, textAlign: 'center', padding: '8px 2px', wordBreak: 'keep-all', lineHeight: 1.3 }}>
                        {al.allergenName}
                      </th>
                    ))}
                  </tr>
                </thead>
                <tbody>
                  {menuMatrix.map(row => (
                    <tr key={row.menuCode || row.menuName}>
                      <td style={{ fontWeight: 600, position: 'sticky', left: 0, background: 'var(--surface)', zIndex: 1 }}>{row.menuName}</td>
                      <td><span className="chip">{row.category}</span></td>
                      {ALLERGEN_SEED.map(al => {
                        const has = row.allergenCodes.has(al.allergenCode);
                        return (
                          <td key={al.allergenCode} style={{ textAlign: 'center' }}>
                            {has
                              ? <span style={{ display: 'inline-block', width: 16, height: 16, borderRadius: '50%', background: 'var(--accent)' }} />
                              : <span style={{ color: 'var(--text-4)', fontSize: 11 }}>—</span>}
                          </td>
                        );
                      })}
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          )
        )}
      </div>
      <div style={{ marginTop: 8, fontSize: 12, color: 'var(--text-4)' }}>
        {viewMode === 'ingredient' ? `${ingredientRows.length}개 식자재` : `${menuMatrix.length}개 메뉴`} 표시
      </div>
    </main>
  );
}
