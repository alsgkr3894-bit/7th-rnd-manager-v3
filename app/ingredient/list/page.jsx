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
} from '@/lib/ingredient';

export default function Page() {
  const [rows,       setRows]       = useState([]);
  const [priceDate,  setPriceDate]  = useState(null);
  const [loading,    setLoading]    = useState(true);
  const [search,     setSearch]     = useState('');
  const [catFilter,  setCatFilter]  = useState('all');
  const [deletePending,setDeletePending]= useState(null);
  const [showHidden,   setShowHidden]   = useState(false);

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

  // 필터 목록
  const categories = useMemo(() => {
    const used = new Set(rows.map(r => r.category).filter(Boolean));
    return ['all', ...Array.from(used).sort((a, b) => a.localeCompare(b, 'ko'))];
  }, [rows]);

  const hiddenCount = useMemo(() => rows.filter(r => r.excluded).length, [rows]);

  const filtered = useMemo(() => {
    let list = showHidden ? rows : rows.filter(r => !r.excluded);
    if (catFilter !== 'all') list = list.filter(r => r.category === catFilter);
    const q = search.trim().toLowerCase();
    if (q) list = list.filter(r =>
      (r.productName || '').toLowerCase().includes(q) ||
      (r.productCode || '').toLowerCase().includes(q)
    );
    return list;
  }, [rows, catFilter, search, showHidden]);

  const uncategorized = rows.filter(r => !r.excluded && !r.category).length;

  const visibleCount = rows.filter(r => !r.excluded).length;
  const sub = loading
    ? '로딩 중…'
    : priceDate
      ? `제때 단가 기준 ${priceDate} · ${visibleCount}개${hiddenCount ? ` · 숨김 ${hiddenCount}개` : ''}${uncategorized ? ` · 미분류 ${uncategorized}개` : ''}`
      : '제때 가격 파일이 없습니다 — 제때상품관리에서 업로드해주세요';

  return (
    <main className="main">
      <PageHeader
        breadcrumb={['식자재', '식자재 리스트']}
        title="식자재 리스트"
        sub={sub}
      />

      {/* 제때 데이터 없음 */}
      {!loading && !priceDate && (
        <div className="card" style={{marginTop:24, minHeight:180, display:'grid', placeItems:'center'}}>
          <div style={{textAlign:'center', color:'var(--text-3)'}}>
            <Icon.box style={{width:32, height:32, marginBottom:12, opacity:.4}}/>
            <div style={{fontWeight:600, marginBottom:4}}>제때 가격 데이터가 없습니다</div>
            <div style={{fontSize:13}}>제때상품관리 → 제때 가격 비교 메뉴에서 파일을 업로드하면 자동으로 목록이 표시됩니다.</div>
          </div>
        </div>
      )}

      {/* 필터 */}
      {rows.length > 0 && (
        <>
          <div style={{display:'flex', gap:6, flexWrap:'wrap', margin:'16px 0 8px', alignItems:'center'}}>
            <span style={{fontSize:12, color:'var(--text-3)', marginRight:4}}>분류</span>
            {categories.map(c => (
              <button key={c} className={'chip' + (catFilter === c ? ' active' : '')}
                onClick={() => setCatFilter(c)}>
                {c === 'all' ? `전체 (${rows.length})` : `${c} (${rows.filter(r => r.category === c).length})`}
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
                {showHidden ? `숨김 포함 중 (${hiddenCount})` : `숨김 항목 ${hiddenCount}개`}
              </button>
            )}
          </div>
          <FilterBar search={search} onSearch={setSearch}/>
        </>
      )}

      {/* 테이블 */}
      {rows.length > 0 && (
        <div className="card table-card" style={{marginTop:12}}>
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
                    <IngredientRow
                      key={r.productCode}
                      r={r}
                      deletePending={deletePending === r.productCode}
                      onDeleteStart={() => setDeletePending(r.productCode)}
                      onDeleteCancel={() => setDeletePending(null)}
                      onDeleteConfirm={() => handleExclude(r.productCode)}
                      onRestore={() => handleRestore(r.productCode)}
                    />
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

// ── 행 컴포넌트 ───────────────────────────────────────────────

function IngredientRow({ r, deletePending, onDeleteStart, onDeleteCancel, onDeleteConfirm, onRestore }) {
  const unitLabel = r.baseQuantity && r.baseUnitType
    ? `${formatNumber(r.baseQuantity)}${r.baseUnitType}` : '-';
  const unitPriceLabel = r.unitPrice != null
    ? `${r.unitPrice < 1 ? r.unitPrice.toFixed(2) : formatNumber(Math.round(r.unitPrice))}원/${r.baseUnitType || 'g'}`
    : null;

  return (
    <tr style={{opacity: r.excluded ? .5 : 1, background: r.excluded ? 'var(--surface-2)' : undefined}}>
      <td className="num" style={{color:'var(--text-3)', fontSize:12}}>{r.productCode || '-'}</td>
      <td style={{fontWeight:600}}>
        <span title={r.productName !== r.displayName ? `원본: ${r.productName}` : undefined}>
          {r.displayName || r.productName}
        </span>
      </td>
      <td style={{fontSize:12, color:'var(--text-2)'}}>{r.temperature || '-'}</td>
      <td style={{fontSize:12, color:'var(--text-2)'}}>{r.salesUnit || '-'}</td>
      <td style={{fontSize:12, color:'var(--text-3)'}}>{r.taxType || '-'}</td>
      <td className="num right" style={{fontWeight:700}}>
        {r.priceWithTax != null ? <>{formatNumber(r.priceWithTax)}<span className="unit">원</span></> : '-'}
      </td>

      {/* 포장단위 + g당단가 (읽기 전용) */}
      <td className="num right" style={{color: r.baseQuantity ? undefined : 'var(--text-4)', fontSize:12}}>
        {r.baseQuantity
          ? <>{unitLabel}{unitPriceLabel && <><br/><span style={{fontSize:11, color:'var(--text-3)', fontWeight:400}}>{unitPriceLabel}</span></>}</>
          : '—'}
      </td>

      {/* 분류 (읽기 전용) */}
      <td>
        {r.category
          ? <span className="chip">{r.category}</span>
          : <span className="chip" style={{background:'var(--warn-soft)', color:'var(--warn)', fontSize:11}}>미분류</span>}
      </td>

      {/* 비고 + 연동 표시 (읽기 전용) */}
      <td>
        <div style={{display:'flex', gap:6, alignItems:'center'}}>
          <span style={{color:'var(--text-3)', fontSize:12, flex:1}}>
            {r.note || <span style={{opacity:.3}}>—</span>}
          </span>
          {r.jetteLinked && !r.excluded && (
            <span style={{
              fontSize:10, fontWeight:700, padding:'2px 6px', borderRadius:4,
              background:'var(--positive-soft)', color:'var(--positive)', whiteSpace:'nowrap',
            }}>제때 연동</span>
          )}
        </div>
      </td>

      {/* 삭제/복원 */}
      <td style={{textAlign:'center'}}>
        {r.excluded ? (
          <button className="btn sm" style={{fontSize:11}} onClick={onRestore}>복원</button>
        ) : deletePending ? (
          <span style={{display:'flex', gap:3}}>
            <button className="btn sm"
              style={{background:'var(--negative)', color:'#fff', border:'none', fontSize:11}}
              onClick={onDeleteConfirm}>삭제</button>
            <button className="btn sm" style={{fontSize:11}} onClick={onDeleteCancel}>취소</button>
          </span>
        ) : (
          <button className="btn sm" onClick={onDeleteStart}
            style={{color:'var(--text-3)', padding:'3px 7px'}}>
            <Icon.trash style={{width:13, height:13}}/>
          </button>
        )}
      </td>
    </tr>
  );
}

