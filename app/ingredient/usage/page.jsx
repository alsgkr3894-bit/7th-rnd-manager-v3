'use client';
import { useEffect, useState, useMemo, useCallback, Fragment } from 'react';
import { PageHeader } from '@/components/ui/PageHeader';
import { initDB } from '@/lib/db';
import { getAllIngredients, deriveScope } from '@/lib/ingredient';
import { SCOPE, SCOPE_STYLES } from '@/lib/ingredient/constants';
import { getPriceFiles, getPriceRowsByFileId } from '@/lib/price';
import { printUsageReport } from '@/lib/cost/usage-print';
import { getAllPizzaRecipes } from '@/lib/cost/pizza-detail';
import { getAllPersonalRecipes } from '@/lib/cost/personal-detail';
import { getAllSideRecipes } from '@/lib/cost/side-detail';
import { getAllRecipes } from '@/lib/recipe';

const CAT_COLORS = {
  '피자':   { bg: '#EFF6FF', color: '#1D4ED8' },
  '1인피자':{ bg: '#FFF7ED', color: '#C2410C' },
  '사이드': { bg: '#F0FDF4', color: '#15803D' },
};
const USAGE_CATS = ['전체', '피자', '사이드', '1인피자'];
const TIER_LABEL = ['많이 쓰는 재료 (8개 이상)', '보통 (4–7개)', '적게 쓰는 재료 (1–3개)'];
const tierOf = (count) => (count >= 8 ? 0 : count >= 4 ? 1 : 2);

export default function Page() {
  const [loading,   setLoading]   = useState(true);
  const [allMeta,   setAllMeta]   = useState([]);
  const [usageMap,  setUsageMap]  = useState({ byCode: new Map(), byName: new Map() });
  const [usageCat,  setUsageCat]  = useState('전체');
  const [usageSort, setUsageSort] = useState('count_desc');
  const [expanded,  setExpanded]  = useState(new Set());
  const [priceStatus, setPriceStatus] = useState(new Map()); // productCode → 제때 productStatus (전용/범용 파생용)

  const load = useCallback(async () => {
    await initDB();
    const [meta, pizzaRecs, personalRecs, sideRecs, oldRecs, files] = await Promise.all([
      getAllIngredients(),
      getAllPizzaRecipes(),
      getAllPersonalRecipes(),
      getAllSideRecipes(),
      getAllRecipes(),
      getPriceFiles(),
    ]);
    setAllMeta(meta);

    // 최신 제때 가격파일에서 productStatus 수집 (전용/범용 판정)
    const statusMap = new Map();
    if (files[0]) {
      try {
        const prows = await getPriceRowsByFileId(files[0].id);
        for (const p of prows) if (p.productCode) statusMap.set(p.productCode, p.productStatus);
      } catch {}
    }
    setPriceStatus(statusMap);

    const uByCode = new Map();
    const uByName = new Map();
    const INCLUDE_TOP = new Set(['피자', '1인피자', '사이드']);

    function norm(s) { return (s || '').trim().toLowerCase().replace(/\s+/g, ''); }
    function cleanMenu(name) { return (name || '').replace(/\s+[LR]$/i, '').trim(); }

    // 재료명 → productCode 역방향 인덱스
    const nameToCode = new Map();
    for (const m of meta) {
      if (!m.productCode) continue;
      const n = norm(m.ingredientName);
      if (n && !nameToCode.has(n)) nameToCode.set(n, m.productCode);
    }

    function addUsage(productCode, ingredientName, menuName, topCat) {
      if (!menuName) return;
      const menu = cleanMenu(menuName);
      const n    = norm(ingredientName);
      const code = productCode || nameToCode.get(n) || null;

      if (code) {
        if (!uByCode.has(code)) uByCode.set(code, new Map());
        uByCode.get(code).set(menu, topCat);
      }
      if (n) {
        if (!uByName.has(n)) uByName.set(n, new Map());
        uByName.get(n).set(menu, topCat);
      }
    }

    // detail store — store 자체가 카테고리 보장
    for (const r of pizzaRecs)
      for (const c of (r.components || [])) addUsage(c.productCode, c.ingredientName, r.menuName, '피자');
    for (const r of personalRecs)
      for (const c of (r.components || [])) addUsage(c.productCode, c.ingredientName, r.menuName, '1인피자');
    for (const r of sideRecs)
      for (const c of (r.components || [])) addUsage(c.productCode, c.ingredientName, r.menuName, '사이드');

    // 구 레시피 시스템
    for (const r of oldRecs) {
      const top = (r.menuCategory || '').split('/')[0];
      if (!INCLUDE_TOP.has(top)) continue;
      for (const ing of (r.ingredients || [])) addUsage(ing.productCode, ing.ingredientName, r.menuName, top);
    }

    setUsageMap({ byCode: uByCode, byName: uByName });
  }, []);

  useEffect(() => {
    load().catch(console.error).finally(() => setLoading(false));
  }, [load]);

  // 카테고리 필터 무관하게 실제 사용 식자재 수 (미사용 계산용)
  const totalUsedCount = useMemo(() => {
    const { byCode, byName } = usageMap;
    function normStr(s) { return (s || '').trim().toLowerCase().replace(/\s+/g, ''); }
    return allMeta.filter(m => {
      const fromCode = (m.productCode ? byCode.get(m.productCode) : null) || new Map();
      const fromName = byName.get(normStr(m.ingredientName)) || new Map();
      return fromCode.size > 0 || fromName.size > 0;
    }).length;
  }, [allMeta, usageMap]);

  const usageRows = useMemo(() => {
    const { byCode, byName } = usageMap;
    function normStr(s) { return (s || '').trim().toLowerCase().replace(/\s+/g, ''); }

    return allMeta.map(m => {
      const code     = m.productCode || '';
      const dispName = m.ingredientName || '';

      const fromCode   = (code ? byCode.get(code) : null) || new Map();
      const fromMaster = byName.get(normStr(dispName)) || new Map();
      const menuMap    = new Map([...fromMaster, ...fromCode]);

      if (!menuMap.size) return null;

      const menus = [...menuMap.entries()]
        .filter(([, cat]) => usageCat === '전체' || cat === usageCat)
        .map(([menuName, cat]) => ({ menuName, cat }))
        .sort((a, b) => a.menuName.localeCompare(b.menuName, 'ko'));

      if (!menus.length) return null;
      const scope = (m.isManual || m.isSeeded)
        ? SCOPE.EXCLUSIVE
        : deriveScope({ productStatus: priceStatus.get(code) }, true);
      return { code, name: dispName, scope, count: menus.length, menus };
    }).filter(Boolean);
  }, [allMeta, usageMap, usageCat, priceStatus]);

  const sorted = useMemo(() => {
    const arr = [...usageRows];
    if (usageSort === 'count_desc') arr.sort((a, b) => b.count - a.count || a.name.localeCompare(b.name, 'ko'));
    else if (usageSort === 'count_asc') arr.sort((a, b) => a.count - b.count || a.name.localeCompare(b.name, 'ko'));
    else arr.sort((a, b) => a.name.localeCompare(b.name, 'ko'));
    return arr;
  }, [usageRows, usageSort]);

  const totalMenus = useMemo(
    () => new Set(usageRows.flatMap(r => r.menus.map(m => m.menuName))).size,
    [usageRows]
  );

  function toggle(code) {
    setExpanded(prev => {
      const next = new Set(prev);
      if (next.has(code)) next.delete(code); else next.add(code);
      return next;
    });
  }

  return (
    <main className="main">
      <PageHeader
        breadcrumb={['식자재', '제품별 사용현황']}
        title="제품별 사용현황"
        sub="각 식자재가 어느 메뉴 레시피에서 사용되는지 확인할 수 있어요."
      />

      {loading ? (
        <div className="card" style={{ padding: 40, textAlign: 'center', color: 'var(--text-3)', fontSize: 13 }}>
          로딩 중…
        </div>
      ) : allMeta.length === 0 ? (
        <div className="card" style={{ padding: 40, textAlign: 'center', color: 'var(--text-3)' }}>
          식자재 마스터 데이터가 없습니다. 식자재 관리 페이지에서 먼저 등록해주세요.
        </div>
      ) : (
        <>
          {/* 통계 */}
          <div style={{ display: 'flex', gap: 12, marginBottom: 10, fontSize: 12, color: 'var(--text-3)', alignItems: 'center' }}>
            <span>사용 식자재 <b style={{ color: 'var(--text-1)' }}>{sorted.length}</b>개</span>
            <span>·</span>
            <span>해당 메뉴 <b style={{ color: 'var(--text-1)' }}>{totalMenus}</b>개</span>
            <span>·</span>
            <span>미사용 <b style={{ color: 'var(--text-3)' }}>{allMeta.length - totalUsedCount}</b>개</span>
          </div>

          {/* 카테고리 필터 + 정렬 */}
          <div style={{ display: 'flex', gap: 8, flexWrap: 'wrap', alignItems: 'center', marginBottom: 8 }}>
            <div style={{ display: 'flex', gap: 4 }}>
              {USAGE_CATS.map(c => (
                <button key={c} className={'chip' + (usageCat === c ? ' active' : '')}
                  onClick={() => setUsageCat(c)}>{c}</button>
              ))}
            </div>
            <div style={{ marginLeft: 'auto', display: 'flex', gap: 6, alignItems: 'center' }}>
              <button className="btn sm" onClick={() => setExpanded(new Set(sorted.map(r => r.code || r.name)))}>
                모두 펼치기
              </button>
              <button className="btn sm" onClick={() => setExpanded(new Set())}>
                모두 접기
              </button>
              <button className="btn sm" onClick={() => printUsageReport(sorted, usageCat)}>
                PDF 출력
              </button>
              <span style={{ fontSize: 11, color: 'var(--text-3)', fontWeight: 600, marginLeft: 4 }}>정렬</span>
              <select
                value={usageSort}
                onChange={e => setUsageSort(e.target.value)}
                style={{ fontSize: 12, padding: '4px 8px', borderRadius: 6,
                  border: '1px solid var(--border)', background: 'var(--surface)',
                  color: 'var(--text-1)', cursor: 'pointer' }}>
                <option value="count_desc">많이 쓰는 순</option>
                <option value="count_asc">적게 쓰는 순</option>
                <option value="name_asc">이름 순</option>
              </select>
            </div>
          </div>

          {/* 테이블 */}
          <div className="card table-card">
            {sorted.length === 0 ? (
              <div style={{ padding: '40px 0', textAlign: 'center', color: 'var(--text-3)', fontSize: 13 }}>
                등록된 레시피가 없거나 해당 카테고리에 사용된 재료가 없어요.
              </div>
            ) : (
              <table className="data-table">
                <thead>
                  <tr>
                    <th style={{ width: 36 }}>순위</th>
                    <th>식자재명</th>
                    <th style={{ width: 90, textAlign: 'center' }}>사용 메뉴수</th>
                    <th>메뉴 목록</th>
                  </tr>
                </thead>
                <tbody>
                  {sorted.map((r, idx) => {
                    const open = expanded.has(r.code || r.name);
                    const SHOW = 4;
                    const visible = open ? r.menus : r.menus.slice(0, SHOW);
                    const more    = r.menus.length - SHOW;
                    const key     = r.code || r.name;
                    const byCount = usageSort === 'count_desc' || usageSort === 'count_asc';
                    const tier    = tierOf(r.count);
                    const showTier = byCount && (idx === 0 || tierOf(sorted[idx - 1].count) !== tier);
                    const sc = r.scope ? SCOPE_STYLES[r.scope] : null;
                    return (
                      <Fragment key={`${key}-${idx}`}>
                      {showTier && (
                        <tr>
                          <td colSpan={4} style={{
                            padding: '7px 12px', background: 'var(--surface-2)',
                            fontSize: 11, fontWeight: 700, color: 'var(--text-3)',
                            borderTop: '1px solid var(--divider)',
                          }}>{TIER_LABEL[tier]}</td>
                        </tr>
                      )}
                      <tr>
                        <td style={{ textAlign: 'center', color: 'var(--text-4)', fontSize: 12 }}>{idx + 1}</td>
                        <td>
                          <div style={{ fontWeight: 600, fontSize: 13, display: 'flex', alignItems: 'center', gap: 6 }}>
                            {r.name}
                            {r.scope && (
                              <span style={{
                                fontSize: 10, fontWeight: 700, padding: '1px 6px', borderRadius: 8,
                                color: sc?.color || 'var(--text-3)', background: sc?.bg || 'var(--surface-2)',
                                whiteSpace: 'nowrap',
                              }}>{r.scope}</span>
                            )}
                          </div>
                          {r.code && (
                            <div style={{ fontSize: 11, color: 'var(--text-4)', fontFamily: 'monospace' }}>{r.code}</div>
                          )}
                        </td>
                        <td style={{ textAlign: 'center' }}>
                          <span style={{
                            display: 'inline-block', minWidth: 32, padding: '2px 8px',
                            borderRadius: 99, fontWeight: 700, fontSize: 13,
                            background: r.count >= 8 ? '#DBEAFE' : r.count >= 4 ? '#D1FAE5' : 'var(--surface-2)',
                            color:      r.count >= 8 ? '#1D4ED8' : r.count >= 4 ? '#065F46' : 'var(--text-2)',
                          }}>
                            {r.count}
                          </span>
                        </td>
                        <td>
                          <div style={{ display: 'flex', flexWrap: 'wrap', gap: 4, alignItems: 'center' }}>
                            {visible.map(m => {
                              const cs = CAT_COLORS[m.cat] || { bg: 'var(--surface-2)', color: 'var(--text-3)' };
                              return (
                                <span key={m.menuName} style={{
                                  fontSize: 11, fontWeight: 600, padding: '2px 8px', borderRadius: 99,
                                  background: cs.bg, color: cs.color, whiteSpace: 'nowrap',
                                }}>
                                  {m.menuName}
                                </span>
                              );
                            })}
                            {!open && more > 0 && (
                              <button onClick={() => toggle(key)}
                                style={{ fontSize: 11, color: 'var(--accent)', border: 0, background: 'none',
                                  cursor: 'pointer', padding: '2px 4px', fontWeight: 600 }}>
                                +{more}개 더보기
                              </button>
                            )}
                            {open && r.menus.length > SHOW && (
                              <button onClick={() => toggle(key)}
                                style={{ fontSize: 11, color: 'var(--text-3)', border: 0, background: 'none',
                                  cursor: 'pointer', padding: '2px 4px' }}>
                                접기
                              </button>
                            )}
                          </div>
                        </td>
                      </tr>
                      </Fragment>
                    );
                  })}
                </tbody>
              </table>
            )}
            <div style={{ padding: '8px 16px', fontSize: 11, color: 'var(--text-3)', borderTop: '1px solid var(--divider)' }}>
              {sorted.length}개 식자재 · {usageCat !== '전체' ? `${usageCat} 필터 중` : '전체 카테고리'}
            </div>
          </div>
        </>
      )}
    </main>
  );
}
