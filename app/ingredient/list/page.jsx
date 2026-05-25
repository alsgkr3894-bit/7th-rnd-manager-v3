'use client';
import { useEffect, useState, useMemo, useCallback } from 'react';
import { Icon } from '@/components/icons';
import { PageHeader } from '@/components/ui/PageHeader';
import { initDB } from '@/lib/db';
import { formatNumber } from '@/lib/format';
import { getPriceFiles, getPriceRowsByFileId } from '@/lib/price';
import {
  getAllIngredients, getIngredientMetaMap, mergeIngredientRows, getCategoryStyle,
} from '@/lib/ingredient';

export default function Page() {
  const [rows,       setRows]       = useState([]);
  const [loading,    setLoading]    = useState(true);
  const [search,     setSearch]     = useState('');
  const [typeFilter, setTypeFilter] = useState('all'); // all | managed | bulk
  const [catFilter,  setCatFilter]  = useState('all');
  const [sort,       setSort]       = useState('default');

  const load = useCallback(async () => {
    await initDB();
    const files = await getPriceFiles();
    const latest = files[0] || null;

    const [allMeta, metaMap] = await Promise.all([
      getAllIngredients(),
      getIngredientMetaMap(),
    ]);

    if (!latest) {
      setRows(allMeta.filter(m => m.isManual).map(buildManualRow));
      return;
    }

    const priceRows  = await getPriceRowsByFileId(latest.id);
    const merged     = mergeIngredientRows(priceRows, metaMap);
    const priceCodeSet = new Set(priceRows.map(r => r.productCode).filter(Boolean));
    const manualRows = allMeta
      .filter(m => m.isManual && (!m.productCode || !priceCodeSet.has(m.productCode)))
      .map(buildManualRow);

    setRows([...merged, ...manualRows]);
  }, []);

  useEffect(() => {
    load().catch(console.error).finally(() => setLoading(false));
  }, [load]);

  // ── 통계 ────────────────────────────────────────────────────
  const totalCount    = rows.length;
  const managedCount  = rows.filter(r => r.hasRecord).length;
  const bulkCount     = rows.filter(r => !r.hasRecord).length;
  const linkedCount   = rows.filter(r => r.jetteLinked && !r.excluded).length;
  const unlinkedCount = rows.filter(r => r.hasRecord && !r.jetteLinked && !r.excluded).length;
  const unusedCount   = rows.filter(r => r.excluded).length;
  const linkPct       = totalCount > 0 ? Math.round(linkedCount / totalCount * 100) : 0;

  // ── 카테고리 목록 ────────────────────────────────────────────
  const categories = useMemo(() => {
    const used = new Set(rows.filter(r => !r.excluded).map(r => r.category).filter(Boolean));
    return ['all', ...Array.from(used).sort((a, b) => a.localeCompare(b, 'ko'))];
  }, [rows]);

  const uncategorizedCount = rows.filter(r => !r.excluded && !r.category).length;

  // ── 필터링 + 정렬 ────────────────────────────────────────────
  const filtered = useMemo(() => {
    let list = rows.filter(r => !r.excluded);
    if (typeFilter === 'managed') list = list.filter(r => r.hasRecord);
    else if (typeFilter === 'bulk') list = list.filter(r => !r.hasRecord);
    if (catFilter === '__none__') list = list.filter(r => !r.category);
    else if (catFilter !== 'all') list = list.filter(r => r.category === catFilter);
    const q = search.trim().toLowerCase();
    if (q) list = list.filter(r =>
      (r.ingredientName || r.displayName || r.productName || '').toLowerCase().includes(q) ||
      (r.productCode || '').toLowerCase().includes(q)
    );
    if (sort === 'name')
      return [...list].sort((a, b) =>
        (a.ingredientName || a.displayName || '').localeCompare(b.ingredientName || b.displayName || '', 'ko'));
    if (sort === 'price-desc') return [...list].sort((a, b) => (b.unitPrice || 0) - (a.unitPrice || 0));
    if (sort === 'price-asc')  return [...list].sort((a, b) => (a.unitPrice || 0) - (b.unitPrice || 0));
    return list;
  }, [rows, typeFilter, catFilter, search, sort]);

  const typeTabCount = (id) => {
    const base = rows.filter(r => !r.excluded);
    if (id === 'managed') return base.filter(r => r.hasRecord).length;
    if (id === 'bulk')    return base.filter(r => !r.hasRecord).length;
    return base.length;
  };

  return (
    <main className="main">
      <PageHeader
        breadcrumb={['식자재', '식자재 리스트']}
        title="식자재 리스트"
        sub="전체 식자재 마스터 카탈로그 — 단가·분류·매핑 상태를 한 곳에서 확인해요."
      />

      {/* ── 통계 카드 4종 ── */}
      <div className="stat-row">
        <div className="stat-card">
          <div className="stat-label">전체 식자재</div>
          <div className="stat-value">{totalCount}<span className="unit">개</span></div>
          <div style={{fontSize:12, color:'var(--text-3)', marginTop:6}}>
            관리품목 {managedCount} · 범용상품 {bulkCount}
          </div>
        </div>
        <div className="stat-card">
          <div className="stat-label">연동 식자재</div>
          <div className="stat-value" style={{color:'var(--positive)'}}>{linkedCount}<span className="unit">개</span></div>
          <div style={{fontSize:12, color:'var(--text-3)', marginTop:6}}>{linkPct}% 단가 매핑 완료</div>
        </div>
        <div className="stat-card">
          <div className="stat-label">미연동</div>
          <div className="stat-value" style={{color: unlinkedCount > 0 ? 'var(--warn)' : undefined}}>
            {unlinkedCount}<span className="unit">개</span>
          </div>
          <div style={{fontSize:12, color:'var(--text-3)', marginTop:6}}>단가표 매칭 필요</div>
        </div>
        <div className="stat-card">
          <div className="stat-label">불용 재료</div>
          <div className="stat-value">{unusedCount}<span className="unit">개</span></div>
          <div style={{fontSize:12, color:'var(--text-3)', marginTop:6}}>숨김 처리된 항목</div>
        </div>
      </div>

      {/* ── 빈 상태 ── */}
      {!loading && rows.length === 0 && (
        <div className="card" style={{minHeight:180, display:'grid', placeItems:'center'}}>
          <div style={{textAlign:'center', color:'var(--text-3)'}}>
            <Icon.box style={{width:32, height:32, marginBottom:12, opacity:.4}}/>
            <div style={{fontWeight:600, marginBottom:4}}>제때 가격 데이터가 없습니다</div>
            <div style={{fontSize:13}}>제때상품관리 → 제때 가격 비교 메뉴에서 파일을 업로드해주세요.</div>
          </div>
        </div>
      )}

      {/* ── 필터 영역 ── */}
      {rows.length > 0 && (
        <div style={{display:'flex', flexDirection:'column', gap:8}}>

          {/* 타입 탭 + 검색 */}
          <div style={{display:'flex', alignItems:'center', justifyContent:'space-between', gap:16, flexWrap:'wrap'}}>
            <div style={{display:'flex', gap:2}}>
              {[
                { id:'all',     label:'전체' },
                { id:'managed', label:'관리품목' },
                { id:'bulk',    label:'범용상품' },
              ].map(t => (
                <button key={t.id}
                  className={'chip' + (typeFilter === t.id ? ' active' : '')}
                  onClick={() => setTypeFilter(t.id)}>
                  {t.label} {typeTabCount(t.id)}
                </button>
              ))}
            </div>
            <div className="filter-search" style={{width:240}}>
              <Icon.search style={{width:15, height:15, color:'var(--text-3)', flexShrink:0}}/>
              <input value={search} onChange={e => setSearch(e.target.value)} placeholder="재료명·코드 검색"/>
            </div>
          </div>

          {/* 카테고리 칩 */}
          <div style={{display:'flex', gap:6, flexWrap:'wrap', alignItems:'center'}}>
            {categories.map(c => {
              const base = rows.filter(r => !r.excluded && (typeFilter === 'all' || (typeFilter === 'managed' ? r.hasRecord : !r.hasRecord)));
              const cnt = c === 'all' ? base.length : base.filter(r => r.category === c).length;
              return (
                <button key={c}
                  className={'chip' + (catFilter === c ? ' active' : '')}
                  style={catFilter !== c && c !== 'all' ? getCategoryStyle(c) : undefined}
                  onClick={() => setCatFilter(c)}>
                  {c === 'all' ? '전체' : c} {cnt}
                </button>
              );
            })}
            {uncategorizedCount > 0 && (
              <button className={'chip' + (catFilter === '__none__' ? ' active' : '')}
                style={{color: catFilter !== '__none__' ? 'var(--warn)' : undefined}}
                onClick={() => setCatFilter(catFilter === '__none__' ? 'all' : '__none__')}>
                미분류 {uncategorizedCount}
              </button>
            )}
            <div style={{marginLeft:'auto', display:'flex', gap:4}}>
              {[
                {id:'default',    label:'기본'},
                {id:'name',       label:'이름순'},
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
        </div>
      )}

      {/* ── 테이블 ── */}
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
                    <th style={{width:88}}>카테고리</th>
                    <th style={{width:88}}>분류</th>
                    <th style={{width:56}}>단위</th>
                    <th style={{width:120, textAlign:'right'}}>G·개당 단가</th>
                    <th style={{width:96}}>마지막 변경</th>
                    <th style={{width:76}}>상태</th>
                  </tr>
                </thead>
                <tbody>
                  {filtered.map(r => (
                    <IngredientRow key={r.isManual ? `m-${r.id}` : r.productCode} r={r}/>
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

// ── 수동 행 빌더 ──────────────────────────────────────────────

function buildManualRow(m) {
  const baseQty  = m.baseQuantity ?? null;
  const unitType = m.baseUnitType || 'g';
  const unitPrice = baseQty && baseQty > 0 && m.priceOverride
    ? Math.round(m.priceOverride / baseQty * 100) / 100
    : null;
  return {
    id:            m.id,
    productCode:   m.productCode || null,
    productName:   m.ingredientName,
    displayName:   m.ingredientName,
    ingredientName:m.ingredientName,
    temperature:   null,
    salesUnit:     null,
    taxType:       m.taxType  || '과세',
    price:         m.priceOverride,
    priceWithTax:  m.priceOverride,
    category:      m.category || '',
    baseQuantity:  baseQty,
    baseUnitType:  unitType,
    note:          m.note     || '',
    unitPrice,
    jetteLinked:   false,
    excluded:      m.excluded === true,
    hasRecord:     true,
    isManual:      true,
    updatedAt:     m.updatedAt || null,
  };
}

// ── 행 컴포넌트 ──────────────────────────────────────────────

function IngredientRow({ r }) {
  const name  = r.ingredientName || r.displayName || r.productName;
  const unit  = r.baseUnitType  || r.salesUnit || 'g';
  const uPrice = r.unitPrice;
  const unitPriceLabel = uPrice != null
    ? `${uPrice < 1 ? uPrice.toFixed(2) : uPrice % 1 === 0 ? formatNumber(uPrice) : uPrice.toFixed(1)}원/${unit}`
    : null;
  const updatedAt = r.updatedAt ? r.updatedAt.slice(0, 10).replace(/-/g, '.') : '-';

  return (
    <tr>
      <td style={{color:'var(--text-3)', fontSize:12}}>
        {r.isManual
          ? <span style={{fontSize:10, padding:'1px 5px', borderRadius:3, background:'var(--surface-3)', color:'var(--text-3)'}}>수동</span>
          : r.productCode || '-'}
      </td>
      <td style={{fontWeight:600}}>
        <span title={r.productName !== name ? `원본: ${r.productName}` : undefined}>{name}</span>
      </td>
      <td>
        {r.category
          ? <span className="chip" style={{...getCategoryStyle(r.category), padding:'2px 8px', fontSize:11}}>{r.category}</span>
          : <span style={{color:'var(--text-4)', fontSize:12}}>—</span>}
      </td>
      <td>
        {r.hasRecord
          ? <span className="chip" style={{background:'var(--accent-soft)', color:'var(--accent-text)', padding:'2px 8px', fontSize:11}}>관리품목</span>
          : <span className="chip" style={{background:'var(--surface-3)', color:'var(--text-2)', padding:'2px 8px', fontSize:11}}>범용상품</span>}
      </td>
      <td style={{fontSize:12, color:'var(--text-2)'}}>{unit}</td>
      <td style={{textAlign:'right', fontSize:12, fontWeight: unitPriceLabel ? 600 : undefined,
        color: unitPriceLabel ? undefined : 'var(--text-4)'}}>
        {unitPriceLabel || '—'}
      </td>
      <td style={{fontSize:12, color:'var(--text-3)'}}>{updatedAt}</td>
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
