'use client';
import { useEffect, useState, useMemo, useCallback } from 'react';
import { Icon } from '@/components/icons';
import { PageHeader, FilterBar } from '@/components/ui/PageHeader';
import { showToast } from '@/components/Toast';
import { initDB } from '@/lib/db';
import { formatNumber } from '@/lib/format';
import { getPriceFiles, getPriceRowsByFileId } from '@/lib/price';
import {
  getIngredientMetaMap, mergeIngredientRows,
  excludeIngredientByCode, restoreIngredientByCode,
  getCategoryStyle,
} from '@/lib/ingredient';

const SORT_OPTIONS = [
  { id: 'default',    label: '기본' },
  { id: 'name',       label: '이름순' },
  { id: 'price-desc', label: '단가↑' },
  { id: 'price-asc',  label: '단가↓' },
];

export default function Page() {
  const [rows,          setRows]          = useState([]);
  const [priceDate,     setPriceDate]     = useState(null);
  const [loading,       setLoading]       = useState(true);
  const [search,        setSearch]        = useState('');
  const [catFilter,     setCatFilter]     = useState('all');
  const [sort,          setSort]          = useState('default');
  const [deletePending, setDeletePending] = useState(null);
  const [showHidden,    setShowHidden]    = useState(false);

  const loadAll = useCallback(async () => {
    await initDB();
    const files = await getPriceFiles();
    const latest = files[0] || null;
    setPriceDate(latest?.updateDate || null);
    if (!latest) { setRows([]); return; }
    const [priceRows, metaMap] = await Promise.all([
      getPriceRowsByFileId(latest.id),
      getIngredientMetaMap(),
    ]);
    setRows(mergeIngredientRows(priceRows, metaMap));
  }, []);

  useEffect(() => {
    loadAll().catch(console.error).finally(() => setLoading(false));
  }, [loadAll]);

  async function handleExclude(productCode) {
    try {
      await excludeIngredientByCode(productCode);
      setRows(prev => prev.map(r => r.productCode === productCode ? { ...r, excluded: true } : r));
      setDeletePending(null);
      showToast('목록에서 숨겼습니다', 'ok');
    } catch (err) { showToast('실패: ' + err.message, 'err'); }
  }

  async function handleRestore(productCode) {
    try {
      await restoreIngredientByCode(productCode);
      setRows(prev => prev.map(r => r.productCode === productCode ? { ...r, excluded: false } : r));
      showToast('복원됐습니다', 'ok');
    } catch (err) { showToast('실패: ' + err.message, 'err'); }
  }

  const managedRows = useMemo(() => rows.filter(r => r.hasRecord), [rows]);

  const categories = useMemo(() => {
    const used = new Set(managedRows.map(r => r.category).filter(Boolean));
    return ['all', ...Array.from(used).sort((a, b) => a.localeCompare(b, 'ko'))];
  }, [managedRows]);

  const hiddenCount  = useMemo(() => managedRows.filter(r => r.excluded).length,           [managedRows]);
  const uncategorized = managedRows.filter(r => !r.excluded && !r.category).length;
  const visibleCount  = managedRows.filter(r => !r.excluded).length;

  const filtered = useMemo(() => {
    let list = showHidden ? managedRows : managedRows.filter(r => !r.excluded);
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
    if (sort === 'price-desc') return [...list].sort((a, b) => (b.priceWithTax || 0) - (a.priceWithTax || 0));
    if (sort === 'price-asc')  return [...list].sort((a, b) => (a.priceWithTax || 0) - (b.priceWithTax || 0));
    return list;
  }, [managedRows, catFilter, search, showHidden, sort]);

  const sub = loading
    ? '로딩 중…'
    : priceDate
      ? `제때 단가 기준 ${priceDate} · ${visibleCount}개${hiddenCount ? ` · 숨김 ${hiddenCount}개` : ''}${uncategorized ? ` · 미분류 ${uncategorized}개` : ''}`
      : '제때 가격 파일이 없습니다 — 제때상품관리에서 업로드해주세요';

  return (
    <main className="main">
      <PageHeader breadcrumb={['식자재', '식자재 리스트']} title="식자재 리스트" sub={sub}/>

      {!loading && !priceDate && (
        <div className="card" style={{marginTop:24, minHeight:180, display:'grid', placeItems:'center'}}>
          <div style={{textAlign:'center', color:'var(--text-3)'}}>
            <Icon.box style={{width:32, height:32, marginBottom:12, opacity:.4}}/>
            <div style={{fontWeight:600, marginBottom:4}}>제때 가격 데이터가 없습니다</div>
            <div style={{fontSize:13}}>제때상품관리 → 제때 가격 비교 메뉴에서 파일을 업로드하면 자동으로 목록이 표시됩니다.</div>
          </div>
        </div>
      )}

      {!loading && priceDate && managedRows.length === 0 && (
        <div className="card" style={{marginTop:24, minHeight:160, display:'grid', placeItems:'center'}}>
          <div style={{textAlign:'center', color:'var(--text-3)'}}>
            <Icon.tag style={{width:32, height:32, marginBottom:12, opacity:.4}}/>
            <div style={{fontWeight:600, marginBottom:4}}>아직 관리된 식자재가 없습니다</div>
            <div style={{fontSize:13}}>식자재 관리 메뉴에서 분류·포장단위를 설정하면 여기에 표시됩니다.</div>
          </div>
        </div>
      )}

      {/* 카테고리별 요약 카드 */}
      {managedRows.length > 0 && (
        <div style={{display:'flex', flexWrap:'wrap', gap:8}}>
          <div className="card" style={{padding:'10px 16px', cursor:'pointer', minWidth:80,
            outline: catFilter === 'all' ? '2px solid var(--accent)' : 'none', outlineOffset:2}}
            onClick={() => setCatFilter('all')}>
            <div style={{fontSize:11, color:'var(--text-3)'}}>전체</div>
            <div style={{fontSize:24, fontWeight:800, color:'var(--text-1)', lineHeight:1.2, marginTop:2}}>{visibleCount}</div>
          </div>
          {categories.filter(c => c !== 'all').map(c => {
            const cnt = managedRows.filter(r => r.category === c && !r.excluded).length;
            if (!cnt) return null;
            const cs = getCategoryStyle(c);
            return (
              <div key={c} className="card" style={{padding:'10px 16px', cursor:'pointer', minWidth:80,
                outline: catFilter === c ? `2px solid ${cs.color}` : 'none', outlineOffset:2}}
                onClick={() => setCatFilter(catFilter === c ? 'all' : c)}>
                <div style={{fontSize:11, color: cs.color, fontWeight:600}}>{c}</div>
                <div style={{fontSize:24, fontWeight:800, color: cs.color, lineHeight:1.2, marginTop:2}}>{cnt}</div>
              </div>
            );
          })}
          {uncategorized > 0 && (
            <div className="card" style={{padding:'10px 16px', cursor:'pointer', minWidth:80,
              outline: catFilter === '__none__' ? '2px solid var(--warn)' : 'none', outlineOffset:2}}
              onClick={() => setCatFilter(catFilter === '__none__' ? 'all' : '__none__')}>
              <div style={{fontSize:11, color:'var(--warn)', fontWeight:600}}>미분류</div>
              <div style={{fontSize:24, fontWeight:800, color:'var(--warn)', lineHeight:1.2, marginTop:2}}>{uncategorized}</div>
            </div>
          )}
        </div>
      )}

      {/* 필터 + 정렬 */}
      {managedRows.length > 0 && (
        <div style={{display:'flex', flexDirection:'column', gap:6}}>
          <div style={{display:'flex', gap:6, flexWrap:'wrap', alignItems:'center'}}>
            <span style={{fontSize:12, color:'var(--text-3)', marginRight:4}}>분류</span>
            {categories.map(c => (
              <button key={c}
                className={'chip' + (catFilter === c ? ' active' : '')}
                style={catFilter !== c && c !== 'all' ? getCategoryStyle(c) : undefined}
                onClick={() => setCatFilter(c)}>
                {c === 'all' ? `전체 (${managedRows.length})` : `${c} (${managedRows.filter(r => r.category === c).length})`}
              </button>
            ))}
            {uncategorized > 0 && (
              <button className={'chip' + (catFilter === '__none__' ? ' active' : '')}
                style={{color:'var(--warn)'}}
                onClick={() => setCatFilter(catFilter === '__none__' ? 'all' : '__none__')}>
                미분류 ({uncategorized})
              </button>
            )}
            {hiddenCount > 0 && (
              <button className={'chip' + (showHidden ? ' active' : '')}
                style={{marginLeft:'auto', color: showHidden ? undefined : 'var(--text-3)'}}
                onClick={() => setShowHidden(v => !v)}>
                {showHidden ? `숨김 포함 중 (${hiddenCount})` : `숨김 ${hiddenCount}개`}
              </button>
            )}
          </div>
          <div style={{display:'flex', gap:4, alignItems:'center'}}>
            <span style={{fontSize:12, color:'var(--text-3)', marginRight:4}}>정렬</span>
            {SORT_OPTIONS.map(s => (
              <button key={s.id}
                className={'chip' + (sort === s.id ? ' active' : '')}
                onClick={() => setSort(s.id)}>
                {s.label}
              </button>
            ))}
          </div>
          <FilterBar search={search} onSearch={setSearch}/>
        </div>
      )}

      {/* 테이블 */}
      {managedRows.length > 0 && (
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
                    <th style={{width:100}}>제품코드</th>
                    <th>제품명</th>
                    <th style={{width:80}}>온도</th>
                    <th style={{width:80}}>판매단위</th>
                    <th style={{width:70}}>과세</th>
                    <th style={{width:130, textAlign:'right'}}>부가세포함단가</th>
                    <th style={{width:160, textAlign:'right'}}>포장단위 / g·개당단가</th>
                    <th style={{width:140}}>분류</th>
                    <th>비고</th>
                    <th style={{width:64}}/>
                  </tr>
                </thead>
                <tbody>
                  {filtered.map(r => (
                    <IngredientRow key={r.productCode || r.id} r={r}
                      deletePending={deletePending === r.productCode}
                      onDeleteStart={() => setDeletePending(r.productCode)}
                      onDeleteCancel={() => setDeletePending(null)}
                      onDeleteConfirm={() => handleExclude(r.productCode)}
                      onRestore={() => handleRestore(r.productCode)}/>
                  ))}
                </tbody>
              </table>
            </div>
          )}
          <div style={{padding:'8px 16px', fontSize:11, color:'var(--text-3)', borderTop:'1px solid var(--divider)'}}>
            {filtered.length}개 표시 / 관리 중 {managedRows.length}개
          </div>
        </div>
      )}
    </main>
  );
}

function IngredientRow({ r, deletePending, onDeleteStart, onDeleteCancel, onDeleteConfirm, onRestore }) {
  const name = r.ingredientName || r.displayName || r.productName;
  const unitLabel = r.baseQuantity && r.baseUnitType
    ? `${formatNumber(r.baseQuantity)}${r.baseUnitType}` : '-';
  const unitPriceLabel = r.unitPrice != null
    ? `${r.unitPrice < 1 ? r.unitPrice.toFixed(2) : formatNumber(Math.round(r.unitPrice))}원/${r.baseUnitType || 'g'}`
    : null;

  return (
    <tr style={{opacity: r.excluded ? .5 : 1, background: r.excluded ? 'var(--surface-2)' : undefined}}>
      <td className="num" style={{color:'var(--text-3)', fontSize:12}}>{r.productCode || '-'}</td>
      <td style={{fontWeight:600}}>
        <span title={r.productName !== name ? `원본: ${r.productName}` : undefined}>{name}</span>
      </td>
      <td style={{fontSize:12, color:'var(--text-2)'}}>{r.temperature || '-'}</td>
      <td style={{fontSize:12, color:'var(--text-2)'}}>{r.salesUnit || '-'}</td>
      <td style={{fontSize:12, color:'var(--text-3)'}}>{r.taxType || '-'}</td>
      <td className="num right" style={{fontWeight:700}}>
        {r.priceWithTax != null ? <>{formatNumber(r.priceWithTax)}<span className="unit">원</span></> : '-'}
      </td>
      <td className="num right" style={{color: r.baseQuantity ? undefined : 'var(--text-4)', fontSize:12}}>
        {r.baseQuantity
          ? <>{unitLabel}{unitPriceLabel && <><br/><span style={{fontSize:11, color:'var(--text-3)', fontWeight:400}}>{unitPriceLabel}</span></>}</>
          : '—'}
      </td>
      <td>
        {r.category
          ? <span className="chip" style={getCategoryStyle(r.category)}>{r.category}</span>
          : <span className="chip" style={{background:'var(--warn-soft)', color:'var(--warn)', fontSize:11}}>미분류</span>}
      </td>
      <td>
        <div style={{display:'flex', gap:6, alignItems:'center'}}>
          <span style={{color:'var(--text-3)', fontSize:12, flex:1}}>{r.note || <span style={{opacity:.3}}>—</span>}</span>
          {r.jetteLinked && !r.excluded && (
            <span style={{fontSize:10, fontWeight:700, padding:'2px 6px', borderRadius:4,
              background:'var(--positive-soft)', color:'var(--positive)', whiteSpace:'nowrap'}}>제때 연동</span>
          )}
        </div>
      </td>
      <td style={{textAlign:'center'}}>
        {r.excluded ? (
          <button className="btn sm" style={{fontSize:11}} onClick={onRestore}>복원</button>
        ) : deletePending ? (
          <span style={{display:'flex', gap:3}}>
            <button className="btn sm" style={{background:'var(--negative)', color:'#fff', border:'none', fontSize:11}}
              onClick={onDeleteConfirm}>삭제</button>
            <button className="btn sm" style={{fontSize:11}} onClick={onDeleteCancel}>취소</button>
          </span>
        ) : (
          <button className="btn sm" onClick={onDeleteStart} style={{color:'var(--text-3)', padding:'3px 7px'}}>
            <Icon.trash style={{width:13, height:13}}/>
          </button>
        )}
      </td>
    </tr>
  );
}
