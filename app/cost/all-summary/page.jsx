'use client';
import { useEffect, useState, useMemo } from 'react';
import { Icon } from '@/components/icons';
import { PageHeader } from '@/components/ui/PageHeader';
import { initDB } from '@/lib/db';
import { formatNumber } from '@/lib/format';
import { getAllMenuPrices } from '@/lib/cost/menu-price';
import { getAllRecipes, buildUnitPriceMap, calcCostBySizes } from '@/lib/recipe';
import { getAllIngredients } from '@/lib/ingredient';
import { costRateColor } from '@/lib/cost/rate-color';
import { downloadCsv } from '@/lib/download';

// ── 카테고리 정규화 ───────────────────────────────────────────
const CAT_ORDER = ['피자', '1인피자', '사이드', '세트박스', '기타'];

function normalizeCategory(cat) {
  if (!cat) return '기타';
  if (cat.startsWith('피자')) return '피자';
  if (cat === '1인피자') return '1인피자';
  if (cat === '사이드' || cat === '소스' || cat === '음료' || cat === '엣지') return '사이드';
  if (cat === '세트박스') return '세트박스';
  return '기타';
}

function catRank(cat) {
  const i = CAT_ORDER.indexOf(cat);
  return i === -1 ? 99 : i;
}

// ── 행 데이터 빌드 ────────────────────────────────────────────
function buildRows(recipes, unitPriceMap, menuPriceMap) {
  const rows = [];

  for (const recipe of recipes) {
    const costMap = calcCostBySizes(recipe, unitPriceMap);

    // 첫 번째 사이즈 기준으로 원가·판매가·원가율 계산
    const firstSize = recipe.sizes?.[0];
    if (!firstSize) continue;

    const cost = costMap[firstSize.label] || 0;

    // 판매가: recipe.sizes에 sellingPrice 있으면 사용, 없으면 menuPriceMap에서 조회
    let sellingPrice = firstSize.sellingPrice || null;
    if (!sellingPrice) {
      // menuPriceMap: menuName → { size → price }
      const priceEntry = menuPriceMap.get(recipe.menuName);
      sellingPrice = priceEntry?.[firstSize.label] ?? null;
    }

    const costRate = (cost > 0 && sellingPrice && sellingPrice > 0)
      ? (cost / sellingPrice) * 100
      : null;

    const cat = normalizeCategory(recipe.menuCategory);

    rows.push({
      id:           recipe.id,
      menuName:     recipe.menuName,
      rawCategory:  recipe.menuCategory || '기타',
      category:     cat,
      cost:         cost > 0 ? Math.round(cost) : null,
      sellingPrice,
      costRate,
      hasCost:      cost > 0,
    });
  }

  // menuPriceMap에는 있지만 레시피가 없는 메뉴도 포함
  const recipeNames = new Set(recipes.map(r => r.menuName));
  for (const [menuName, sizeMap] of menuPriceMap) {
    if (recipeNames.has(menuName)) continue;
    // 카테고리를 menuPrices 원본에서 알 수 없으므로 categoryHint 활용 불가 — 기타
    const sizeEntries = Object.entries(sizeMap);
    if (!sizeEntries.length) continue;
    const [firstSizeLabel, firstPrice] = sizeEntries[0];
    rows.push({
      id:           `mp-${menuName}`,
      menuName,
      rawCategory:  '',
      category:     '기타',
      cost:         null,
      sellingPrice: firstPrice,
      costRate:     null,
      hasCost:      false,
    });
  }

  return rows;
}

// ── CSV 내보내기 ─────────────────────────────────────────────
function exportCSV(rows) {
  const headers = ['메뉴명', '카테고리', '원가', '판매가', '원가율'];
  const body = rows.map(r => [
    r.menuName,
    r.rawCategory || r.category,
    r.cost != null ? r.cost : '',
    r.sellingPrice != null ? r.sellingPrice : '',
    r.costRate != null ? r.costRate.toFixed(1) + '%' : '',
  ]);
  downloadCsv([headers, ...body], '전메뉴원가종합.csv');
}

// ── 메인 컴포넌트 ─────────────────────────────────────────────
export default function Page() {
  const [rows,      setRows]      = useState([]);
  const [loading,   setLoading]   = useState(true);
  const [dbError,   setDbError]   = useState(null);
  const [catFilter, setCatFilter] = useState('전체');

  useEffect(() => {
    async function load() {
      await initDB();
      const [allMenuPrices, allRecipes, allIngredients] = await Promise.all([
        getAllMenuPrices(),
        getAllRecipes(),
        getAllIngredients(),
      ]);

      // unitPriceMap — priceRowMap 없이 priceOverride만 사용
      const upm = buildUnitPriceMap(allIngredients, new Map());

      // menuPriceMap: menuName → { sizeLabel → price }
      const menuPriceMap = new Map();
      for (const mp of allMenuPrices) {
        if (!mp.menuName || !mp.size) continue;
        if (!menuPriceMap.has(mp.menuName)) menuPriceMap.set(mp.menuName, {});
        if (mp.price != null) menuPriceMap.get(mp.menuName)[mp.size] = mp.price;
      }

      const built = buildRows(allRecipes, upm, menuPriceMap);

      // 정렬: 카테고리 순 → 메뉴명 가나다
      built.sort((a, b) => {
        const cr = catRank(a.category) - catRank(b.category);
        if (cr !== 0) return cr;
        return (a.menuName || '').localeCompare(b.menuName || '', 'ko');
      });

      setRows(built);
    }

    load()
      .catch(err => { console.error(err); setDbError(err.message || '데이터 로드 실패'); })
      .finally(() => setLoading(false));
  }, []);

  // ── 통계 ──────────────────────────────────────────────────
  const stats = useMemo(() => {
    const withCost = rows.filter(r => r.hasCost);
    const rates    = withCost.filter(r => r.costRate != null).map(r => r.costRate);
    const avgRate  = rates.length ? rates.reduce((a, b) => a + b, 0) / rates.length : null;
    const alertCnt = rates.filter(r => r > 40).length;
    return {
      total:    rows.length,
      withCost: withCost.length,
      avgRate,
      alertCnt,
    };
  }, [rows]);

  // ── 카테고리 필터 ─────────────────────────────────────────
  const cats = useMemo(() => {
    const present = [...new Set(rows.map(r => r.category))];
    const sorted  = CAT_ORDER.filter(c => present.includes(c));
    if (present.some(c => !CAT_ORDER.includes(c))) sorted.push('기타');
    return ['전체', ...sorted];
  }, [rows]);

  const filtered = useMemo(() => {
    if (catFilter === '전체') return rows;
    return rows.filter(r => r.category === catFilter);
  }, [rows, catFilter]);

  const hasAnyData = rows.length > 0;
  const hasRecipeData = rows.some(r => r.hasCost);

  // ── 렌더 ─────────────────────────────────────────────────
  if (dbError) return (
    <main className="main">
      <PageHeader
        breadcrumb={['원가계산', '종합전메뉴원가']}
        title="종합전메뉴원가"
        sub="로드 실패"
      />
      <div className="card" style={{ padding: 32, textAlign: 'center', color: 'var(--negative)' }}>
        데이터베이스 오류: {dbError}
      </div>
    </main>
  );

  return (
    <main className="main">
      <PageHeader
        breadcrumb={['원가계산', '종합전메뉴원가']}
        title="종합전메뉴원가"
        sub="모든 메뉴(피자/1인피자/사이드/세트박스)의 원가를 한 화면에서 비교"
        actions={
          hasAnyData && (
            <button className="btn" onClick={() => exportCSV(filtered)}>
              <Icon.download style={{ width: 13, height: 13 }}/> CSV 내보내기
            </button>
          )
        }
      />

      {/* 통계 카드 */}
      {!loading && hasAnyData && (
        <div className="stat-row" style={{ marginTop: 8 }}>
          <div className="stat-card">
            <div className="stat-label">등록 메뉴 수</div>
            <div className="stat-value">
              {stats.total}<span className="unit">개</span>
            </div>
          </div>
          <div className="stat-card">
            <div className="stat-label">레시피 등록</div>
            <div className="stat-value">
              {stats.withCost}<span className="unit">건</span>
            </div>
          </div>
          <div className="stat-card">
            <div className="stat-label">평균 원가율</div>
            <div className="stat-value" style={{ color: stats.avgRate != null ? costRateColor(stats.avgRate) : undefined }}>
              {stats.avgRate != null ? stats.avgRate.toFixed(1) : '—'}<span className="unit">%</span>
            </div>
          </div>
          <div className="stat-card">
            <div className="stat-label">원가율 경보 (40% 초과)</div>
            <div className="stat-value" style={{ color: stats.alertCnt > 0 ? 'var(--negative, #ef4444)' : undefined }}>
              {stats.alertCnt}<span className="unit">개</span>
            </div>
          </div>
        </div>
      )}

      {/* 카테고리 필터 chips */}
      {!loading && hasAnyData && (
        <div style={{ display: 'flex', gap: 6, flexWrap: 'wrap', margin: '12px 0 8px' }}>
          {cats.map(c => (
            <button
              key={c}
              className={'chip' + (catFilter === c ? ' active' : '')}
              onClick={() => setCatFilter(c)}
            >
              {c}
            </button>
          ))}
        </div>
      )}

      {/* 로딩 */}
      {loading && (
        <div className="card" style={{ padding: 40, textAlign: 'center', color: 'var(--text-3)', fontSize: 13 }}>
          로딩 중…
        </div>
      )}

      {/* 데이터 없음 */}
      {!loading && !hasAnyData && (
        <div className="card" style={{ marginTop: 24, minHeight: 260, display: 'grid', placeItems: 'center' }}>
          <div style={{ textAlign: 'center', color: 'var(--text-4)' }}>
            <div className="empty-icon-wrap"><Icon.calc style={{ width: 32, height: 32 }}/></div>
            <div style={{ fontWeight: 600, marginBottom: 4 }}>등록된 메뉴가 없습니다</div>
            <div style={{ fontSize: 13 }}>
              먼저 <b>메뉴 판매가</b>에서 메뉴를 등록하고<br/>
              각 카테고리 원가 탭에서 레시피를 작성해주세요.
            </div>
          </div>
        </div>
      )}

      {/* 레시피 데이터 없음 안내 (메뉴는 있지만 원가 없음) */}
      {!loading && hasAnyData && !hasRecipeData && (
        <div className="card" style={{ padding: '12px 16px', marginBottom: 8, color: 'var(--text-3)', fontSize: 13, display: 'flex', gap: 8, alignItems: 'center' }}>
          <Icon.doc style={{ width: 16, height: 16, opacity: .5, flexShrink: 0 }}/>
          레시피가 등록된 메뉴가 없습니다. 각 카테고리 원가 탭(피자/1인피자/사이드/세트)에서 레시피를 먼저 작성해주세요.
        </div>
      )}

      {/* 테이블 */}
      {!loading && hasAnyData && (
        <div className="card table-card">
          <div style={{ overflowX: 'auto' }}>
            <table className="data-table">
              <thead>
                <tr>
                  <th style={{ minWidth: 160 }}>메뉴명</th>
                  <th style={{ minWidth: 90 }}>카테고리</th>
                  <th style={{ minWidth: 100, textAlign: 'right' }}>원가 (첫 사이즈)</th>
                  <th style={{ minWidth: 100, textAlign: 'right' }}>판매가</th>
                  <th style={{ minWidth: 90,  textAlign: 'right' }}>원가율</th>
                </tr>
              </thead>
              <tbody>
                {filtered.map(r => (
                  <tr key={r.id}>
                    <td style={{ fontWeight: 500, whiteSpace: 'nowrap' }}>{r.menuName}</td>
                    <td style={{ whiteSpace: 'nowrap' }}>
                      <span className="chip">{r.rawCategory || r.category}</span>
                    </td>
                    <td style={{ textAlign: 'right', color: 'var(--text-2)' }}>
                      {r.cost != null ? `${formatNumber(r.cost)}원` : (
                        <span style={{ color: 'var(--text-4)', fontSize: 12 }}>레시피 미등록</span>
                      )}
                    </td>
                    <td style={{ textAlign: 'right', color: 'var(--text-2)' }}>
                      {r.sellingPrice != null ? `${formatNumber(r.sellingPrice)}원` : '—'}
                    </td>
                    <td style={{ textAlign: 'right' }}>
                      {r.costRate != null ? (
                        <span style={{ fontWeight: 700, color: costRateColor(r.costRate) }}>
                          {r.costRate.toFixed(1)}%
                        </span>
                      ) : (
                        <span style={{ color: 'var(--text-4)' }}>—</span>
                      )}
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
          <div style={{ padding: '8px 16px', fontSize: 11, color: 'var(--text-3)', borderTop: '1px solid var(--divider)' }}>
            {filtered.length}개 메뉴 표시
            {catFilter !== '전체' && ` · ${catFilter} 필터 적용 중`}
          </div>
        </div>
      )}
    </main>
  );
}
