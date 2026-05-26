'use client';
import { useEffect, useState, useMemo, useCallback } from 'react';
import { Icon } from '@/components/icons';
import { PageHeader } from '@/components/ui/PageHeader';
import { initDB } from '@/lib/db';
import { formatNumber } from '@/lib/format';
import { getPriceFiles, getPriceRowsByFileId } from '@/lib/price';
import {
  getAllIngredients, getIngredientMetaMap, mergeIngredientRows,
  getCategoryStyle, sortMainCategories, sortHashTags,
  buildMetaOnlyRow,
} from '@/lib/ingredient';

const DISCONTINUED_FILTER  = '__discontinued__';
const UNCATEGORIZED_FILTER = '__none__';

const SCOPE_TABS = [
  { id: 'all',       label: '전체' },
  { id: '전용',      label: '전용' },
  { id: '범용',      label: '범용' },
  { id: '범용관리',  label: '범용관리' },
];

export default function Page() {
  const [rows,        setRows]        = useState([]);
  const [loading,     setLoading]     = useState(true);
  const [search,      setSearch]      = useState('');
  const [scopeFilter, setScopeFilter] = useState('all');
  const [catFilter,   setCatFilter]   = useState('all');
  const [tagFilter,   setTagFilter]   = useState('all');
  const [sort,        setSort]        = useState('default');

  const load = useCallback(async () => {
    await initDB();
    const files = await getPriceFiles();
    const latest = files[0] || null;

    const [allMeta, metaMap] = await Promise.all([
      getAllIngredients(),
      getIngredientMetaMap(),
    ]);

    if (!latest) {
      setRows(allMeta.filter(m => m.isManual || m.isSeeded).map(buildMetaOnlyRow));
      return;
    }

    const priceRows  = await getPriceRowsByFileId(latest.id);
    // 마스터(시드/수동)에 등록된 항목만 표시
    const merged     = mergeIngredientRows(priceRows, metaMap).filter(r => r.hasRecord);
    const priceCodeSet = new Set(priceRows.map(r => r.productCode).filter(Boolean));
    const orphanRows = allMeta
      .filter(m => (m.isManual || m.isSeeded) && (!m.productCode || !priceCodeSet.has(m.productCode)))
      .map(buildMetaOnlyRow);

    setRows([...merged, ...orphanRows]);
  }, []);

  useEffect(() => {
    load().catch(console.error).finally(() => setLoading(false));
  }, [load]);

  // ── 통계 ────────────────────────────────────────────────────
  const active        = rows.filter(r => !r.discontinued && !r.excluded);
  const totalCount    = active.length;
  const exclusiveCnt  = active.filter(r => r.scope === '전용').length;
  const generalCnt    = active.filter(r => r.scope === '범용').length;
  const generalMgtCnt = active.filter(r => r.scope === '범용관리').length;
  const linkedCount   = active.filter(r => r.jetteLinked).length;
  const discontinuedCount = rows.filter(r => r.discontinued).length;
  const linkPct       = totalCount > 0 ? Math.round(linkedCount / totalCount * 100) : 0;

  // ── 분류(메인) 집합 ─────────────────────────────────────────
  const mainCats = useMemo(() => {
    const set = new Set();
    rows.forEach(r => { if (!r.discontinued && !r.excluded && r.category) set.add(r.category); });
    return sortMainCategories(Array.from(set));
  }, [rows]);

  // ── 해시태그 집합 ──────────────────────────────────────────
  const hashTags = useMemo(() => {
    const set = new Set();
    rows.forEach(r => {
      if (r.discontinued || r.excluded) return;
      (r.tags || []).forEach(t => t && set.add(t));
    });
    return sortHashTags(Array.from(set));
  }, [rows]);

  const uncategorizedCount = rows.filter(r => !r.discontinued && !r.excluded && !r.category).length;

  // ── 필터링 + 정렬 ────────────────────────────────────────────
  const filtered = useMemo(() => {
    let list;
    if (catFilter === DISCONTINUED_FILTER) {
      list = rows.filter(r => r.discontinued);
    } else {
      list = rows.filter(r => !r.discontinued && !r.excluded);
      if (scopeFilter !== 'all')  list = list.filter(r => r.scope === scopeFilter);
      if (catFilter === UNCATEGORIZED_FILTER) list = list.filter(r => !r.category);
      else if (catFilter !== 'all') list = list.filter(r => r.category === catFilter);
      if (tagFilter !== 'all')    list = list.filter(r => (r.tags || []).includes(tagFilter));
    }
    const q = search.trim().toLowerCase();
    if (q) list = list.filter(r =>
      (r.ingredientName || r.displayName || r.productName || '').toLowerCase().includes(q) ||
      (r.productCode || '').toLowerCase().includes(q) ||
      (r.category    || '').toLowerCase().includes(q) ||
      (r.tags || []).some(t => t.toLowerCase().includes(q)) ||
      (r.manufacturer || '').toLowerCase().includes(q)
    );
    if (sort === 'name')
      return [...list].sort((a, b) =>
        (a.ingredientName || a.displayName || '').localeCompare(b.ingredientName || b.displayName || '', 'ko'));
    if (sort === 'category')
      return [...list].sort((a, b) => {
        const ca = a.category || 'ㅎ', cb = b.category || 'ㅎ';
        if (ca !== cb) return ca.localeCompare(cb, 'ko');
        return (a.ingredientName || '').localeCompare(b.ingredientName || '', 'ko');
      });
    if (sort === 'price-desc') return [...list].sort((a, b) => (b.unitPrice || 0) - (a.unitPrice || 0));
    if (sort === 'price-asc')  return [...list].sort((a, b) => (a.unitPrice || 0) - (b.unitPrice || 0));
    return list;
  }, [rows, scopeFilter, catFilter, tagFilter, search, sort]);

  const scopeTabCount = (id) => {
    if (id === 'all') return totalCount;
    return active.filter(r => r.scope === id).length;
  };

  return (
    <main className="main">
      <PageHeader
        breadcrumb={['식자재', '식자재 리스트']}
        title="식자재 리스트"
        sub="전체 식자재 마스터 카탈로그 — 단가·분류·매핑 상태를 한 곳에서 확인해요."
      />

      {/* 통계 카드 */}
      <div className="stat-row">
        <div className="stat-card">
          <div className="stat-label">전체 식자재</div>
          <div className="stat-value">{totalCount}<span className="unit">개</span></div>
          <div style={{fontSize:12, color:'var(--text-3)', marginTop:6}}>
            전용 {exclusiveCnt} · 범용 {generalCnt} · 범용관리 {generalMgtCnt}
          </div>
        </div>
        <div className="stat-card">
          <div className="stat-label">연동 식자재</div>
          <div className="stat-value" style={{color:'var(--positive)'}}>{linkedCount}<span className="unit">개</span></div>
          <div style={{fontSize:12, color:'var(--text-3)', marginTop:6}}>{linkPct}% 단가 매핑 완료</div>
        </div>
        <div className="stat-card">
          <div className="stat-label">미분류</div>
          <div className="stat-value" style={{color: uncategorizedCount > 0 ? 'var(--warn)' : undefined}}>
            {uncategorizedCount}<span className="unit">개</span>
          </div>
          <div style={{fontSize:12, color:'var(--text-3)', marginTop:6}}>분류 설정 필요</div>
        </div>
        <div className="stat-card">
          <div className="stat-label">단종</div>
          <div className="stat-value" style={{color:'var(--text-3)'}}>{discontinuedCount}<span className="unit">개</span></div>
          <div style={{fontSize:12, color:'var(--text-3)', marginTop:6}}>단종 카테고리 보관</div>
        </div>
      </div>

      {!loading && rows.length === 0 && (
        <div className="card" style={{minHeight:180, display:'grid', placeItems:'center'}}>
          <div style={{textAlign:'center', color:'var(--text-3)'}}>
            <Icon.box style={{width:32, height:32, marginBottom:12, opacity:.4}}/>
            <div style={{fontWeight:600, marginBottom:4}}>아직 식자재 데이터가 없습니다</div>
            <div style={{fontSize:13}}>식자재 관리 → 마스터 시드 적용 또는 제때 가격 파일 업로드가 필요합니다.</div>
          </div>
        </div>
      )}

      {rows.length > 0 && (
        <div style={{display:'flex', flexDirection:'column', gap:8}}>

          {/* 스코프 탭 + 검색 */}
          <div style={{display:'flex', alignItems:'center', justifyContent:'space-between', gap:16, flexWrap:'wrap'}}>
            <div style={{display:'flex', gap:2}}>
              {SCOPE_TABS.map(t => (
                <button key={t.id}
                  className={'chip' + (scopeFilter === t.id ? ' active' : '')}
                  onClick={() => setScopeFilter(t.id)}>
                  {t.label} {scopeTabCount(t.id)}
                </button>
              ))}
            </div>
            <div className="filter-search" style={{width:240}}>
              <Icon.search style={{width:15, height:15, color:'var(--text-3)', flexShrink:0}}/>
              <input value={search} onChange={e => setSearch(e.target.value)} placeholder="재료명·코드·태그 검색"/>
            </div>
          </div>

          {/* 분류 (메인) */}
          <div style={{display:'flex', gap:6, flexWrap:'wrap', alignItems:'center'}}>
            <span style={{fontSize:12, color:'var(--text-3)', marginRight:4, fontWeight:600}}>분류</span>
            <button className={'chip' + (catFilter === 'all' ? ' active' : '')} onClick={() => setCatFilter('all')}>
              전체
            </button>
            {mainCats.map(c => {
              const cnt = active.filter(r => r.category === c
                && (scopeFilter === 'all' || r.scope === scopeFilter)).length;
              return (
                <button key={c}
                  className={'chip' + (catFilter === c ? ' active' : '')}
                  style={catFilter !== c ? getCategoryStyle(c) : undefined}
                  onClick={() => setCatFilter(c)}>
                  {c} {cnt}
                </button>
              );
            })}
            {uncategorizedCount > 0 && (
              <button className={'chip' + (catFilter === UNCATEGORIZED_FILTER ? ' active' : '')}
                style={catFilter !== UNCATEGORIZED_FILTER ? {color:'var(--warn)'} : undefined}
                onClick={() => setCatFilter(catFilter === UNCATEGORIZED_FILTER ? 'all' : UNCATEGORIZED_FILTER)}>
                미분류 {uncategorizedCount}
              </button>
            )}
            {discontinuedCount > 0 && (
              <button className={'chip' + (catFilter === DISCONTINUED_FILTER ? ' active' : '')}
                style={catFilter !== DISCONTINUED_FILTER ? {color:'var(--text-3)', marginLeft:'auto'} : {marginLeft:'auto'}}
                onClick={() => setCatFilter(catFilter === DISCONTINUED_FILTER ? 'all' : DISCONTINUED_FILTER)}>
                단종 {discontinuedCount}
              </button>
            )}
          </div>

          {/* 해시태그 */}
          {hashTags.length > 0 && (
            <div style={{display:'flex', gap:6, flexWrap:'wrap', alignItems:'center'}}>
              <span style={{fontSize:12, color:'var(--text-3)', marginRight:4, fontWeight:600}}>#태그</span>
              <button className={'chip' + (tagFilter === 'all' ? ' active' : '')} onClick={() => setTagFilter('all')}>
                전체
              </button>
              {hashTags.map(t => {
                const cnt = active.filter(r => (r.tags || []).includes(t)
                  && (scopeFilter === 'all' || r.scope === scopeFilter)
                  && (catFilter === 'all' || r.category === catFilter)).length;
                if (!cnt) return null;
                return (
                  <button key={t}
                    className={'chip' + (tagFilter === t ? ' active' : '')}
                    style={tagFilter !== t ? {fontSize:11, opacity:.85} : undefined}
                    onClick={() => setTagFilter(tagFilter === t ? 'all' : t)}>
                    #{t} {cnt}
                  </button>
                );
              })}
              <div style={{marginLeft:'auto', display:'flex', gap:4}}>
                {[
                  {id:'default',    label:'기본'},
                  {id:'name',       label:'이름순'},
                  {id:'category',   label:'분류순'},
                  {id:'price-desc', label:'단가↑'},
                  {id:'price-asc',  label:'단가↓'},
                ].map(s => (
                  <button key={s.id}
                    className={'chip' + (sort === s.id ? ' active' : '')}
                    onClick={() => setSort(s.id)}>
                    {s.label}
                  </button>
                ))}
              </div>
            </div>
          )}
        </div>
      )}

      {/* 테이블 */}
      {rows.length > 0 && (
        <div className="card table-card">
          {filtered.length === 0 ? (
            <div style={{padding:'40px 0', textAlign:'center', color:'var(--text-3)', fontSize:13}}>
              조건에 맞는 항목이 없습니다
            </div>
          ) : (
            <div style={{overflowX:'auto'}}>
              <table className="data-table">
                <thead>
                  <tr>
                    <th style={{width:80}}>제품코드</th>
                    <th>재료명</th>
                    <th style={{width:96}}>분류</th>
                    <th style={{width:160}}>#태그</th>
                    <th style={{width:80}}>전용/범용</th>
                    <th style={{width:56}}>단위</th>
                    <th style={{width:110, textAlign:'right'}}>G·개당 단가</th>
                    <th style={{width:88}}>제조사</th>
                    <th style={{width:80}}>상태</th>
                  </tr>
                </thead>
                <tbody>
                  {filtered.map(r => (
                    <IngredientRow key={r.isManual || r.isSeeded ? `m-${r.id}` : r.productCode} r={r}/>
                  ))}
                </tbody>
              </table>
            </div>
          )}
          <div style={{padding:'8px 16px', fontSize:11, color:'var(--text-3)', borderTop:'1px solid var(--divider)'}}>
            {filtered.length}개 표시 / 전체 {rows.length}개
          </div>
        </div>
      )}
    </main>
  );
}

// ── 행 컴포넌트 ──────────────────────────────────────────────

function IngredientRow({ r }) {
  const name  = r.ingredientName || r.displayName || r.productName;
  const unit  = r.baseUnitType  || r.salesUnit || 'g';
  const uPrice = r.unitPrice;
  const unitPriceLabel = uPrice != null
    ? `${uPrice < 1 ? uPrice.toFixed(2) : uPrice % 1 === 0 ? formatNumber(uPrice) : uPrice.toFixed(1)}원/${unit}`
    : null;
  const tags = sortHashTags(r.tags || []);
  const scopeColor = r.scope === '전용' ? 'var(--accent)'
    : r.scope === '범용관리' ? 'var(--positive)'
    : 'var(--text-2)';
  const scopeBg = r.scope === '전용' ? 'var(--accent-soft)'
    : r.scope === '범용관리' ? 'var(--positive-soft)'
    : 'var(--surface-3)';

  return (
    <tr style={{opacity: r.discontinued ? .55 : 1}}>
      <td style={{color:'var(--text-3)', fontSize:11}}>
        {r.isManual && !r.productCode
          ? <span style={{fontSize:10, padding:'1px 5px', borderRadius:3, background:'var(--surface-3)', color:'var(--text-3)'}}>수동</span>
          : r.productCode || '-'}
      </td>
      <td style={{fontWeight:600, fontSize:13}}>
        <span title={r.productName !== name ? `원본: ${r.productName}` : undefined}>{name}</span>
        {r.discontinued && (
          <span style={{marginLeft:6, fontSize:10, fontWeight:700, padding:'1px 5px', borderRadius:3,
            background:'var(--surface-3)', color:'var(--text-3)'}}>단종</span>
        )}
      </td>
      <td>
        {r.category
          ? <span className="chip" style={{...getCategoryStyle(r.category), padding:'2px 8px', fontSize:11}}>{r.category}</span>
          : <span style={{color:'var(--text-4)', fontSize:11}}>—</span>}
      </td>
      <td>
        {tags.length > 0
          ? <div style={{display:'flex', gap:3, flexWrap:'wrap'}}>
              {tags.map(t => (
                <span key={t} style={{
                  padding:'1px 5px', fontSize:10, fontWeight:500, borderRadius:3,
                  background:'var(--surface-2)', color:'var(--text-2)',
                }}>#{t}</span>
              ))}
            </div>
          : <span style={{color:'var(--text-4)', fontSize:11}}>—</span>}
      </td>
      <td>
        <span style={{
          padding:'2px 8px', fontSize:11, fontWeight:600, borderRadius:6,
          background: scopeBg, color: scopeColor,
        }}>{r.scope || '-'}</span>
      </td>
      <td style={{fontSize:12, color:'var(--text-2)'}}>{unit}</td>
      <td style={{textAlign:'right', fontSize:12, fontWeight: unitPriceLabel ? 600 : undefined,
        color: unitPriceLabel ? undefined : 'var(--text-4)'}}>
        {unitPriceLabel || '—'}
      </td>
      <td style={{fontSize:12, color:'var(--text-2)'}}>{r.manufacturer || '-'}</td>
      <td>
        <span style={{display:'flex', alignItems:'center', gap:5, fontSize:12, fontWeight:600,
          color: r.jetteLinked ? 'var(--positive)' : 'var(--warn)'}}>
          <span style={{width:6, height:6, borderRadius:'50%', flexShrink:0,
            background: r.jetteLinked ? 'var(--positive)' : 'var(--warn)'}}/>
          {r.jetteLinked ? '연동' : '미연동'}
        </span>
      </td>
    </tr>
  );
}
