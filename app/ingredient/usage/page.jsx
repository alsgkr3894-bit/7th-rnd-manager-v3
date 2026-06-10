'use client';
import { useEffect, useState, useMemo, useCallback, Fragment, useRef } from 'react';
import { PageHeader } from '@/components/ui/PageHeader';
import { SortableTh } from '@/components/ui/SortableTh';
import { SearchBox } from '@/components/ui/SearchBox';
import { initDB } from '@/lib/db';
import { downloadCsv } from '@/lib/download';
import { getAllIngredients, buildProductTypeMap, scopeLabelFor } from '@/lib/ingredient';
import { SCOPE_STYLES, SCOPE_UNASSIGNED } from '@/lib/ingredient/constants';
import { getManagedProducts, seedManagedProductsIfEmpty } from '@/lib/shipment';
import { MENU_CATEGORY } from '@/lib/menu-categories';
import { printUsageReport } from '@/lib/cost/usage-print';
import { getAllPizzaRecipes } from '@/lib/cost/pizza-detail';
import { getAllPersonalRecipes } from '@/lib/cost/personal-detail';
import { getAllSideRecipes } from '@/lib/cost/side-detail';
import { getAllRecipes } from '@/lib/recipe';
import { KEYS } from '@/lib/note/keys';

function normStr(s) {
  return (s || '').trim().toLowerCase().replace(/\s+/g, '');
}
function cleanMenu(name) {
  return (name || '').replace(/\s+[LR]$/i, '').trim();
}

function makeAddUsage(nameToCode, uByCode, uByName) {
  return function addUsage(productCode, ingredientName, menuName, topCat) {
    if (!menuName) return;
    const menu = cleanMenu(menuName);
    const n = normStr(ingredientName);
    const code = productCode || nameToCode.get(n) || null;
    if (code) {
      if (!uByCode.has(code)) uByCode.set(code, new Map());
      uByCode.get(code).set(menu, topCat);
    }
    if (n) {
      if (!uByName.has(n)) uByName.set(n, new Map());
      uByName.get(n).set(menu, topCat);
    }
  };
}

const CAT_COLORS = {
  피자: { bg: '#EFF6FF', color: '#1D4ED8' },
  '1인피자': { bg: '#FFF7ED', color: '#C2410C' },
  사이드: { bg: '#F0FDF4', color: '#15803D' },
};
const USAGE_CATS = ['전체', MENU_CATEGORY.PIZZA, MENU_CATEGORY.SIDE, MENU_CATEGORY.PERSONAL];
const USAGE_THRESHOLD = { HIGH: 8, MID: 4 };
const TIER_LABEL = ['많이 쓰는 재료 (8개 이상)', '보통 (4–7개)', '적게 쓰는 재료 (1–3개)'];
const tierOf = count => (count >= USAGE_THRESHOLD.HIGH ? 0 : count >= USAGE_THRESHOLD.MID ? 1 : 2);
const keyOf = r => r.code || r.name;

function toStringSet(value) {
  if (!Array.isArray(value)) return new Set();
  return new Set(value.filter(v => typeof v === 'string' && v.trim()));
}

/** 사용횟수 배지 색상 — 많이(파랑)/보통(초록)/단발(주의)/그 외(중립) */
function usageCountStyle(count) {
  if (count >= USAGE_THRESHOLD.HIGH) return { background: '#DBEAFE', color: '#1D4ED8' };
  if (count >= USAGE_THRESHOLD.MID) return { background: '#D1FAE5', color: '#065F46' };
  if (count === 1) return { background: 'var(--warn-soft)', color: 'var(--warn)' };
  return { background: 'var(--surface-2)', color: 'var(--text-2)' };
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
  const [hidden, setHidden] = useState(() => new Set());
  const [showHidden, setShowHidden] = useState(false);
  const [onlyOne, setOnlyOne] = useState(false);
  const [showUnused, setShowUnused] = useState(false);
  const [excludedMenus, setExcludedMenus] = useState(() => new Set()); // 목록에서 제외할 메뉴명
  const mountedRef = useRef(true);

  // 숨김 목록 복원 (마운트 1회)
  useEffect(() => {
    try {
      const raw = localStorage.getItem(KEYS.INGREDIENT_USAGE_HIDDEN);
      if (raw) setHidden(toStringSet(JSON.parse(raw)));
    } catch {}
    try {
      const rawM = localStorage.getItem(KEYS.INGREDIENT_USAGE_EXCL_MENUS);
      if (rawM) setExcludedMenus(toStringSet(JSON.parse(rawM)));
    } catch {}
  }, []);
  function toggleHidden(k) {
    setHidden(prev => {
      const next = new Set(prev);
      if (next.has(k)) next.delete(k);
      else next.add(k);
      try {
        localStorage.setItem(KEYS.INGREDIENT_USAGE_HIDDEN, JSON.stringify([...next]));
      } catch {}
      return next;
    });
  }
  function persistExcluded(next) {
    try {
      localStorage.setItem(KEYS.INGREDIENT_USAGE_EXCL_MENUS, JSON.stringify([...next]));
    } catch {}
  }
  function excludeMenu(menuName) {
    setExcludedMenus(prev => {
      const next = new Set(prev).add(menuName);
      persistExcluded(next);
      return next;
    });
  }
  function restoreMenu(menuName) {
    setExcludedMenus(prev => {
      const next = new Set(prev);
      next.delete(menuName);
      persistExcluded(next);
      return next;
    });
  }
  function restoreAllMenus() {
    setExcludedMenus(() => {
      persistExcluded(new Set());
      return new Set();
    });
  }

  const load = useCallback(async () => {
    await initDB();
    const [meta, pizzaRecs, personalRecs, sideRecs, oldRecs, managed] = await Promise.all([
      getAllIngredients(),
      getAllPizzaRecipes(),
      getAllPersonalRecipes(),
      getAllSideRecipes(),
      getAllRecipes(),
      seedManagedProductsIfEmpty().then(() => getManagedProducts()),
    ]);
    if (!mountedRef.current) return;
    setAllMeta(meta);

    // 전용/범용 단일 출처 = 제때 관리품목(productType)
    setTypeMap(buildProductTypeMap(managed));

    const uByCode = new Map();
    const uByName = new Map();
    const INCLUDE_TOP = new Set(['피자', '1인피자', '사이드']);

    const nameToCode = new Map();
    for (const m of meta) {
      if (!m.productCode) continue;
      const n = normStr(m.ingredientName);
      if (n && !nameToCode.has(n)) nameToCode.set(n, m.productCode);
    }

    const addUsage = makeAddUsage(nameToCode, uByCode, uByName);

    for (const r of pizzaRecs)
      for (const c of r.components || [])
        addUsage(c.productCode, c.ingredientName, r.menuName, '피자');
    for (const r of personalRecs)
      for (const c of r.components || [])
        addUsage(c.productCode, c.ingredientName, r.menuName, '1인피자');
    for (const r of sideRecs)
      for (const c of r.components || [])
        addUsage(c.productCode, c.ingredientName, r.menuName, '사이드');
    for (const r of oldRecs) {
      const top = (r.menuCategory || '').split('/')[0];
      if (!INCLUDE_TOP.has(top)) continue;
      for (const ing of r.ingredients || [])
        addUsage(ing.productCode, ing.ingredientName, r.menuName, top);
    }

    setUsageMap({ byCode: uByCode, byName: uByName });
  }, []);

  useEffect(() => {
    mountedRef.current = true;
    load()
      .catch(err => {
        if (mountedRef.current) console.error(err);
      })
      .finally(() => {
        if (mountedRef.current) setLoading(false);
      });

    return () => {
      mountedRef.current = false;
    };
  }, [load]);

  const totalUsedCount = useMemo(() => {
    const { byCode, byName } = usageMap;
    return allMeta.filter(m => {
      const fromCode = (m.productCode ? byCode.get(m.productCode) : null) || new Map();
      const fromName = byName.get(normStr(m.ingredientName)) || new Map();
      return fromCode.size > 0 || fromName.size > 0;
    }).length;
  }, [allMeta, usageMap]);

  const usageRows = useMemo(() => {
    const { byCode, byName } = usageMap;
    const q = menuSearch.trim().toLowerCase();
    return allMeta
      .filter(m => !m.discontinued)
      .map(m => {
        const code = m.productCode || '';
        const dispName = m.ingredientName || '';

        const fromCode = (code ? byCode.get(code) : null) || new Map();
        const fromMaster = byName.get(normStr(dispName)) || new Map();
        const menuMap = new Map([...fromMaster, ...fromCode]);
        if (!menuMap.size) return null;

        const menus = [...menuMap.entries()]
          .filter(
            ([menuName, cat]) =>
              !excludedMenus.has(menuName) &&
              (usageCat === '전체' || cat === usageCat) &&
              (!q || menuName.toLowerCase().includes(q))
          )
          .map(([menuName, cat]) => ({ menuName, cat }))
          .sort((a, b) => a.menuName.localeCompare(b.menuName, 'ko'));
        if (!menus.length) return null;

        // 코드 있으면 제때 관리품목(productType) 기준, 없으면 지정값 또는 미지정
        const scope = code ? scopeLabelFor(typeMap, code) : m.scope || SCOPE_UNASSIGNED;
        return { code, name: dispName, scope, count: menus.length, menus };
      })
      .filter(Boolean);
  }, [allMeta, usageMap, usageCat, menuSearch, typeMap, excludedMenus]);

  const unusedRows = useMemo(() => {
    const { byCode, byName } = usageMap;
    const q = menuSearch.trim().toLowerCase();
    return allMeta
      .filter(m => m && !m.discontinued) // null guard + 단종 항목 제외
      .map(m => {
        const code = m.productCode || '';
        const name = m.ingredientName || '';
        const fromCode = (code ? byCode.get(code) : null) || new Map();
        const fromName = byName.get(normStr(name)) || new Map();
        if (fromCode.size > 0 || fromName.size > 0) return null;
        if (q && !name.toLowerCase().includes(q) && !code.toLowerCase().includes(q)) return null;
        const scope = code ? scopeLabelFor(typeMap, code) : m.scope || SCOPE_UNASSIGNED;
        return { code, name, scope, count: 0, menus: [] };
      })
      .filter(Boolean);
  }, [allMeta, menuSearch, typeMap, usageMap]);

  const sorted = useMemo(() => {
    const arr = [...(showUnused ? unusedRows : usageRows)];
    if (sortKey === 'count') {
      arr.sort(
        (a, b) =>
          (sortDir === 'asc' ? a.count - b.count : b.count - a.count) ||
          a.name.localeCompare(b.name, 'ko')
      );
    } else {
      arr.sort((a, b) => {
        const c = a.name.localeCompare(b.name, 'ko');
        return sortDir === 'asc' ? c : -c;
      });
    }
    return arr;
  }, [showUnused, unusedRows, usageRows, sortKey, sortDir]);

  const nonHidden = useMemo(
    () => usageRows.filter(r => !hidden.has(keyOf(r))),
    [usageRows, hidden]
  );
  const hiddenCount = usageRows.length - nonHidden.length;
  const oneCount = useMemo(() => nonHidden.filter(r => r.count === 1).length, [nonHidden]);

  const displayRows = useMemo(() => {
    let arr = sorted;
    if (onlyOne && !showUnused) arr = arr.filter(r => r.count === 1);
    arr = showUnused
      ? arr
      : showHidden
        ? arr.filter(r => hidden.has(keyOf(r)))
        : arr.filter(r => !hidden.has(keyOf(r)));
    return arr;
  }, [sorted, onlyOne, showHidden, showUnused, hidden]);

  const totalMenus = useMemo(
    () => new Set(nonHidden.flatMap(r => r.menus.map(m => m.menuName))).size,
    [nonHidden]
  );

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
    const headers = ['식자재명', '제품코드', '구분', '사용 메뉴수', '사용 메뉴'];
    const rows = displayRows.map(r => [
      r.name || '',
      r.code || '',
      r.scope || '',
      r.count,
      (r.menus || []).map(m => `${m.menuName}(${m.cat})`).join(', '),
    ]);
    downloadCsv([headers, ...rows], showUnused ? '미사용식자재.csv' : '식자재사용현황.csv');
  }

  const byCount = sortKey === 'count' && !showUnused;

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
        <>
          {/* 요약 카드 */}
          <div className="stat-row">
            <div className="stat-card">
              <div className="stat-label">사용 재료</div>
              <div className="stat-value">
                {nonHidden.length}
                <span className="unit">개</span>
              </div>
            </div>
            <div
              className="stat-card"
              style={{ cursor: 'pointer', outline: onlyOne ? '2px solid var(--warn)' : undefined }}
              onClick={() => {
                setOnlyOne(v => !v);
                setShowUnused(false);
              }}
            >
              <div className="stat-label">1개 메뉴만 사용 ⚠</div>
              <div
                className="stat-value"
                style={{ color: oneCount > 0 ? 'var(--warn)' : undefined }}
              >
                {oneCount}
                <span className="unit">개</span>
              </div>
              <div style={{ fontSize: 11, color: 'var(--text-3)', marginTop: 6 }}>
                {onlyOne ? '필터 해제' : '클릭하여 보기'}
              </div>
            </div>
            <div
              className="stat-card"
              style={{
                cursor: 'pointer',
                outline: showUnused ? '2px solid var(--accent)' : undefined,
              }}
              onClick={() => {
                setShowUnused(v => !v);
                setOnlyOne(false);
                setShowHidden(false);
              }}
            >
              <div className="stat-label">미사용</div>
              <div className="stat-value" style={{ color: 'var(--text-3)' }}>
                {allMeta.length - totalUsedCount}
                <span className="unit">개</span>
              </div>
              <div style={{ fontSize: 11, color: 'var(--text-3)', marginTop: 6 }}>
                {showUnused ? '필터 해제' : '클릭하여 보기'}
              </div>
            </div>
            <div
              className="stat-card"
              style={{
                cursor: hiddenCount ? 'pointer' : 'default',
                outline: showHidden ? '2px solid var(--accent)' : undefined,
              }}
              onClick={() => hiddenCount && setShowHidden(v => !v)}
            >
              <div className="stat-label">숨김</div>
              <div
                className="stat-value"
                style={{ color: hiddenCount > 0 ? 'var(--accent)' : undefined }}
              >
                {hiddenCount}
                <span className="unit">개</span>
              </div>
              {hiddenCount > 0 && (
                <div style={{ fontSize: 11, color: 'var(--text-3)', marginTop: 6 }}>
                  {showHidden ? '숨김 보기 끄기' : '숨김만 보기'}
                </div>
              )}
            </div>
          </div>

          {/* 메뉴명 검색 */}
          <div style={{ margin: '10px 0 0' }}>
            <SearchBox
              value={menuSearch}
              onChange={setMenuSearch}
              placeholder={
                showUnused ? '식자재명·제품코드 검색' : '메뉴명으로 사용 식자재 찾기 (예: 페퍼로니)'
              }
            />
          </div>

          {/* 카테고리 필터 + 액션 */}
          <div
            style={{
              display: 'flex',
              gap: 8,
              flexWrap: 'wrap',
              alignItems: 'center',
              margin: '0 0 8px',
            }}
          >
            <div className="usage-chip-row">
              {USAGE_CATS.map(c => (
                <button
                  key={c}
                  className={'chip' + (usageCat === c ? ' active' : '')}
                  onClick={() => setUsageCat(c)}
                >
                  {c}
                </button>
              ))}
            </div>
            <div className="usage-action-row">
              <button
                className="btn sm"
                onClick={() => setExpanded(new Set(displayRows.map(keyOf)))}
              >
                모두 펼치기
              </button>
              <button className="btn sm" onClick={() => setExpanded(new Set())}>
                모두 접기
              </button>
              <button className="btn sm" onClick={() => printUsageReport(displayRows, usageCat)}>
                PDF 출력
              </button>
              <button className="btn sm" onClick={exportCsv} disabled={displayRows.length === 0}>
                CSV 내보내기
              </button>
            </div>
          </div>

          {/* 메뉴 해당 수 / 상태 */}
          <div style={{ fontSize: 12, color: 'var(--text-3)', marginBottom: 8 }}>
            해당 메뉴 <b style={{ color: 'var(--text-1)' }}>{totalMenus}</b>개
            {showHidden && (
              <span style={{ marginLeft: 8, color: 'var(--accent)' }}>· 숨김 항목만 표시 중</span>
            )}
            {showUnused && (
              <span style={{ marginLeft: 8, color: 'var(--accent)' }}>
                · 미사용 식자재만 표시 중
              </span>
            )}
            {onlyOne && (
              <span style={{ marginLeft: 8, color: 'var(--warn)' }}>· 1개 사용만 표시 중</span>
            )}
          </div>

          {/* 제외된 메뉴 복원 바 */}
          {!showUnused && excludedMenus.size > 0 && (
            <div
              style={{
                display: 'flex',
                flexWrap: 'wrap',
                alignItems: 'center',
                gap: 6,
                padding: '8px 10px',
                marginBottom: 8,
                borderRadius: 8,
                background: 'var(--surface-2)',
                border: '1px solid var(--border)',
              }}
            >
              <span style={{ fontSize: 12, fontWeight: 700, color: 'var(--text-3)' }}>
                목록 제외 메뉴 {excludedMenus.size}개
              </span>
              {[...excludedMenus].map(name => (
                <span
                  key={name}
                  style={{
                    display: 'inline-flex',
                    alignItems: 'center',
                    gap: 4,
                    fontSize: 11,
                    fontWeight: 600,
                    padding: '2px 6px 2px 8px',
                    borderRadius: 99,
                    background: 'var(--surface)',
                    color: 'var(--text-2)',
                    border: '1px solid var(--border)',
                  }}
                >
                  {name}
                  <button
                    onClick={() => restoreMenu(name)}
                    title="다시 목록에 표시"
                    style={{
                      border: 0,
                      background: 'transparent',
                      cursor: 'pointer',
                      color: 'var(--accent)',
                      padding: 0,
                      lineHeight: 1,
                      fontSize: 13,
                      display: 'inline-flex',
                    }}
                  >
                    ↺
                  </button>
                </span>
              ))}
              <button className="btn sm" style={{ marginLeft: 'auto' }} onClick={restoreAllMenus}>
                전체 복원
              </button>
            </div>
          )}

          {/* 테이블 */}
          <div className="card table-card">
            {displayRows.length === 0 ? (
              <div
                style={{
                  padding: '40px 0',
                  textAlign: 'center',
                  color: 'var(--text-3)',
                  fontSize: 13,
                }}
              >
                {showHidden
                  ? '숨긴 재료가 없습니다.'
                  : showUnused
                    ? '조건에 맞는 미사용 식자재가 없습니다.'
                    : '등록된 레시피가 없거나 해당 조건에 맞는 재료가 없어요.'}
              </div>
            ) : (
              <table className="data-table">
                <thead>
                  <tr>
                    <th style={{ width: 36 }}>순위</th>
                    <SortableTh sortKey="name" active={sortKey} dir={sortDir} onClick={handleSort}>
                      식자재명
                    </SortableTh>
                    <SortableTh
                      sortKey="count"
                      active={sortKey}
                      dir={sortDir}
                      onClick={handleSort}
                      width={96}
                    >
                      사용 메뉴수
                    </SortableTh>
                    <th>메뉴 목록</th>
                    <th style={{ width: 56 }}></th>
                  </tr>
                </thead>
                <tbody>
                  {displayRows.map((r, idx) => {
                    const k = keyOf(r);
                    const open = expanded.has(k);
                    const SHOW = 4;
                    const visible = open ? r.menus : r.menus.slice(0, SHOW);
                    const more = r.menus.length - SHOW;
                    const tier = tierOf(r.count);
                    const showTier =
                      byCount && (idx === 0 || tierOf(displayRows[idx - 1].count) !== tier);
                    const sc = r.scope ? SCOPE_STYLES[r.scope] : null;
                    const isHidden = hidden.has(k);
                    return (
                      <Fragment key={`${k}-${idx}`}>
                        {showTier && (
                          <tr>
                            <td
                              colSpan={5}
                              style={{
                                padding: '7px 12px',
                                background: 'var(--surface-2)',
                                fontSize: 11,
                                fontWeight: 700,
                                color: 'var(--text-3)',
                                borderTop: '1px solid var(--divider)',
                              }}
                            >
                              {TIER_LABEL[tier]}
                            </td>
                          </tr>
                        )}
                        <tr style={isHidden ? { opacity: 0.55 } : undefined}>
                          <td style={{ textAlign: 'center', color: 'var(--text-4)', fontSize: 12 }}>
                            {idx + 1}
                          </td>
                          <td>
                            <div
                              style={{
                                fontWeight: 600,
                                fontSize: 13,
                                display: 'flex',
                                alignItems: 'center',
                                gap: 6,
                              }}
                            >
                              {r.name}
                              {r.scope && (
                                <span
                                  style={{
                                    fontSize: 10,
                                    fontWeight: 700,
                                    padding: '1px 6px',
                                    borderRadius: 8,
                                    color: sc?.color || 'var(--text-3)',
                                    background: sc?.bg || 'var(--surface-2)',
                                    whiteSpace: 'nowrap',
                                  }}
                                >
                                  {r.scope}
                                </span>
                              )}
                            </div>
                            {r.code && (
                              <div
                                style={{
                                  fontSize: 11,
                                  color: 'var(--text-4)',
                                  fontFamily: 'monospace',
                                }}
                              >
                                {r.code}
                              </div>
                            )}
                          </td>
                          <td style={{ textAlign: 'center' }}>
                            <span
                              style={{
                                display: 'inline-block',
                                minWidth: 32,
                                padding: '2px 8px',
                                borderRadius: 99,
                                fontWeight: 700,
                                fontSize: 13,
                                ...usageCountStyle(r.count),
                              }}
                            >
                              {r.count}
                            </span>
                          </td>
                          <td>
                            <div
                              style={{
                                display: 'flex',
                                flexWrap: 'wrap',
                                gap: 4,
                                alignItems: 'center',
                              }}
                            >
                              {visible.map(m => {
                                const cs = CAT_COLORS[m.cat] || {
                                  bg: 'var(--surface-2)',
                                  color: 'var(--text-3)',
                                };
                                return (
                                  <span
                                    key={m.menuName}
                                    style={{
                                      fontSize: 11,
                                      fontWeight: 600,
                                      padding: '2px 6px 2px 8px',
                                      borderRadius: 99,
                                      background: cs.bg,
                                      color: cs.color,
                                      whiteSpace: 'nowrap',
                                      display: 'inline-flex',
                                      alignItems: 'center',
                                      gap: 4,
                                    }}
                                  >
                                    {m.menuName}
                                    <button
                                      onClick={() => excludeMenu(m.menuName)}
                                      title="이 메뉴를 사용현황 목록에서 제외"
                                      style={{
                                        border: 0,
                                        background: 'transparent',
                                        cursor: 'pointer',
                                        color: 'inherit',
                                        opacity: 0.55,
                                        padding: 0,
                                        lineHeight: 1,
                                        fontSize: 12,
                                        display: 'inline-flex',
                                      }}
                                    >
                                      ×
                                    </button>
                                  </span>
                                );
                              })}
                              {!open && more > 0 && (
                                <button
                                  onClick={() => toggle(k)}
                                  style={{
                                    fontSize: 11,
                                    color: 'var(--accent)',
                                    border: 0,
                                    background: 'none',
                                    cursor: 'pointer',
                                    padding: '2px 4px',
                                    fontWeight: 600,
                                  }}
                                >
                                  +{more}개 더보기
                                </button>
                              )}
                              {open && r.menus.length > SHOW && (
                                <button
                                  onClick={() => toggle(k)}
                                  style={{
                                    fontSize: 11,
                                    color: 'var(--text-3)',
                                    border: 0,
                                    background: 'none',
                                    cursor: 'pointer',
                                    padding: '2px 4px',
                                  }}
                                >
                                  접기
                                </button>
                              )}
                            </div>
                          </td>
                          <td style={{ textAlign: 'center' }}>
                            <button
                              className="btn sm"
                              style={{
                                fontSize: 10,
                                padding: '2px 6px',
                                color: isHidden ? 'var(--accent)' : 'var(--text-3)',
                              }}
                              title={isHidden ? '표시' : '숨김(목록·출력 제외)'}
                              onClick={() => toggleHidden(k)}
                            >
                              {isHidden ? '표시' : '숨김'}
                            </button>
                          </td>
                        </tr>
                      </Fragment>
                    );
                  })}
                </tbody>
              </table>
            )}
            <div
              style={{
                padding: '8px 16px',
                fontSize: 11,
                color: 'var(--text-3)',
                borderTop: '1px solid var(--divider)',
              }}
            >
              {displayRows.length}개 표시 ·{' '}
              {showUnused
                ? '미사용 필터 중'
                : usageCat !== '전체'
                  ? `${usageCat} 필터 중`
                  : '전체 카테고리'}
              {hiddenCount > 0 ? ` · 숨김 ${hiddenCount}개` : ''}
            </div>
          </div>
        </>
      )}
    </main>
  );
}
