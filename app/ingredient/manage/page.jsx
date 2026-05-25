'use client';
import { useEffect, useState, useMemo, useCallback } from 'react';
import { Icon } from '@/components/icons';
import { PageHeader, FilterBar } from '@/components/ui/PageHeader';
import { showToast } from '@/components/Toast';
import { initDB } from '@/lib/db';
import { formatNumber } from '@/lib/format';
import { getPriceFiles, getPriceRowsByFileId } from '@/lib/price';
import {
  getAllIngredients, getIngredientMetaMap, mergeIngredientRows,
  addIngredient, updateIngredient, upsertIngredientMeta,
  excludeIngredientByCode, restoreIngredientByCode,
  deleteIngredient, getCategoryStyle,
} from '@/lib/ingredient';
import { IngredientForm } from './IngredientForm';

export default function Page() {
  const [rows,         setRows]         = useState([]);
  const [priceDate,    setPriceDate]    = useState(null);
  const [loading,      setLoading]      = useState(true);
  const [search,       setSearch]       = useState('');
  const [catFilter,    setCatFilter]    = useState('all');
  const [formTarget,   setFormTarget]   = useState(null);
  const [deletePending,setDeletePending]= useState(null); // full row object

  const load = useCallback(async () => {
    await initDB();
    const files = await getPriceFiles();
    const latest = files[0] || null;
    setPriceDate(latest?.updateDate || null);

    const [allMeta, metaMap] = await Promise.all([
      getAllIngredients(),
      getIngredientMetaMap(),
    ]);

    let merged = [];
    if (latest) {
      const priceRows = await getPriceRowsByFileId(latest.id);
      merged = mergeIngredientRows(priceRows, metaMap);

      // manual items not in price_rows
      const priceCodeSet = new Set(priceRows.map(r => r.productCode).filter(Boolean));
      const manualRows = allMeta
        .filter(m => m.isManual && (!m.productCode || !priceCodeSet.has(m.productCode)))
        .map(m => {
          const baseQty = m.baseQuantity ?? null;
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
            taxType:       m.taxType || '과세',
            price:         m.priceOverride,
            priceWithTax:  m.priceOverride,
            category:      m.category    || '',
            baseQuantity:  baseQty,
            baseUnitType:  unitType,
            note:          m.note        || '',
            unitPrice,
            jetteLinked:   false,
            excluded:      m.excluded === true,
            hasRecord:     true,
            isManual:      true,
          };
        });
      setRows([...merged, ...manualRows]);
    } else {
      // no price file — show only manual items
      const manualRows = allMeta
        .filter(m => m.isManual)
        .map(m => {
          const baseQty = m.baseQuantity ?? null;
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
            taxType:       m.taxType || '과세',
            price:         m.priceOverride,
            priceWithTax:  m.priceOverride,
            category:      m.category    || '',
            baseQuantity:  baseQty,
            baseUnitType:  unitType,
            note:          m.note        || '',
            unitPrice,
            jetteLinked:   false,
            excluded:      m.excluded === true,
            hasRecord:     true,
            isManual:      true,
          };
        });
      setRows(manualRows);
    }
  }, []);

  useEffect(() => {
    load().catch(console.error).finally(() => setLoading(false));
  }, [load]);

  async function handleSave(formData) {
    try {
      if (formTarget === 'new') {
        await addIngredient(formData);
        showToast('식자재 추가 완료', 'ok');
      } else if (formTarget.isManual && formTarget.id) {
        await updateIngredient(formTarget.id, formData);
        showToast('저장 완료', 'ok');
      } else {
        await upsertIngredientMeta({ productCode: formTarget.productCode, ...formData });
        showToast('저장 완료', 'ok');
      }
      setFormTarget(null);
      await load();
    } catch (err) {
      showToast('저장 실패: ' + err.message, 'err');
      throw err;
    }
  }

  async function handleExclude(row) {
    try {
      if (row.isManual && row.id) {
        await deleteIngredient(row.id);
        setRows(prev => prev.filter(r => !(r.isManual && r.id === row.id)));
        showToast('삭제됐습니다', 'ok');
      } else {
        await excludeIngredientByCode(row.productCode);
        setRows(prev => prev.map(r =>
          r.productCode === row.productCode ? { ...r, excluded: true, hasRecord: true } : r
        ));
        showToast('숨겼습니다', 'ok');
      }
      setDeletePending(null);
    } catch (err) { showToast('실패: ' + err.message, 'err'); }
  }

  async function handleRestore(productCode) {
    try {
      await restoreIngredientByCode(productCode);
      setRows(prev => prev.map(r =>
        r.productCode === productCode ? { ...r, excluded: false } : r
      ));
      showToast('복원됐습니다', 'ok');
    } catch (err) { showToast('실패: ' + err.message, 'err'); }
  }

  const categories = useMemo(() => {
    const used = new Set(rows.filter(r => r.category).map(r => r.category));
    return ['all', ...Array.from(used).sort((a, b) => a.localeCompare(b, 'ko'))];
  }, [rows]);

  const filtered = useMemo(() => {
    let list = rows;
    if (catFilter === '__none__') list = list.filter(r => !r.category);
    else if (catFilter !== 'all') list = list.filter(r => r.category === catFilter);
    const q = search.trim().toLowerCase();
    if (q) list = list.filter(r =>
      (r.ingredientName || r.displayName || r.productName || '').toLowerCase().includes(q) ||
      (r.productCode || '').toLowerCase().includes(q) ||
      (r.category    || '').toLowerCase().includes(q)
    );
    return list;
  }, [rows, catFilter, search]);

  const managedCount  = rows.filter(r => r.hasRecord).length;
  const uncategorized = rows.filter(r => r.hasRecord && !r.excluded && !r.category).length;

  const sub = loading
    ? '로딩 중…'
    : priceDate
      ? `제때 단가 기준 ${priceDate} · 전체 ${rows.length}개 · 관리 중 ${managedCount}개${uncategorized ? ` · 미분류 ${uncategorized}개` : ''}`
      : rows.length > 0
        ? `제때 가격 파일 없음 · 수동 등록 ${rows.length}개`
        : '제때 가격 파일이 없습니다 — 제때상품관리에서 업로드해주세요';

  return (
    <main className="main">
      <PageHeader
        breadcrumb={['식자재', '식자재 관리']}
        title="식자재 관리"
        sub={sub}
        actions={
          <button className="btn primary" onClick={() => setFormTarget('new')}>
            <Icon.plus style={{width:14, height:14}}/> 식자재 추가
          </button>
        }
      />

      {!loading && !priceDate && rows.length === 0 && (
        <div className="card" style={{marginTop:24, minHeight:180, display:'grid', placeItems:'center'}}>
          <div style={{textAlign:'center', color:'var(--text-3)'}}>
            <Icon.box style={{width:32, height:32, marginBottom:12, opacity:.4}}/>
            <div style={{fontWeight:600, marginBottom:4}}>제때 가격 데이터가 없습니다</div>
            <div style={{fontSize:13}}>제때상품관리 → 제때 가격 비교 메뉴에서 파일을 업로드하면 자동으로 목록이 표시됩니다.</div>
          </div>
        </div>
      )}

      {rows.length > 0 && (
        <>
          <div style={{display:'flex', gap:6, flexWrap:'wrap', margin:'16px 0 8px', alignItems:'center'}}>
            <span style={{fontSize:12, color:'var(--text-3)', marginRight:4}}>분류</span>
            {categories.map(c => (
              <button key={c}
                className={'chip' + (catFilter === c ? ' active' : '')}
                style={catFilter !== c && c !== 'all' ? getCategoryStyle(c) : undefined}
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
          </div>
          <FilterBar search={search} onSearch={setSearch}/>
        </>
      )}

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
                    <th style={{width:80}}/>
                  </tr>
                </thead>
                <tbody>
                  {filtered.map(r => {
                    const rowKey = r.isManual ? `manual-${r.id}` : r.productCode;
                    const isPending = r.isManual
                      ? deletePending?.isManual && deletePending?.id === r.id
                      : deletePending?.productCode === r.productCode;
                    return (
                      <ManageRow
                        key={rowKey}
                        r={r}
                        deletePending={isPending}
                        onEdit={() => setFormTarget(r)}
                        onDeleteStart={() => setDeletePending(r)}
                        onDeleteCancel={() => setDeletePending(null)}
                        onDeleteConfirm={() => handleExclude(r)}
                        onRestore={() => handleRestore(r.productCode)}
                      />
                    );
                  })}
                </tbody>
              </table>
            </div>
          )}
          <div style={{padding:'8px 16px', fontSize:11, color:'var(--text-3)', borderTop:'1px solid var(--divider)'}}>
            {filtered.length}개 표시 / 전체 {rows.length}개 · 관리 중 {managedCount}개
          </div>
        </div>
      )}

      {formTarget !== null && (
        <IngredientForm
          initial={formTarget === 'new' ? null : formTarget}
          onSave={handleSave}
          onClose={() => setFormTarget(null)}
        />
      )}
    </main>
  );
}

// ── 행 컴포넌트 ───────────────────────────────────────────────

function ManageRow({ r, deletePending, onEdit, onDeleteStart, onDeleteCancel, onDeleteConfirm, onRestore }) {
  const name = r.ingredientName || r.displayName || r.productName;
  const unitLabel = r.baseQuantity && r.baseUnitType
    ? `${formatNumber(r.baseQuantity)}${r.baseUnitType}` : '-';
  const unitPriceLabel = r.unitPrice != null
    ? `${r.unitPrice < 1 ? r.unitPrice.toFixed(2) : formatNumber(Math.round(r.unitPrice))}원/${r.baseUnitType || 'g'}`
    : null;

  return (
    <tr style={{opacity: r.excluded ? .5 : 1, background: r.excluded ? 'var(--surface-2)' : !r.hasRecord ? 'var(--surface-2)' : undefined}}>
      <td className="num" style={{color:'var(--text-3)', fontSize:12}}>
        {r.isManual
          ? <span style={{fontSize:10, padding:'1px 5px', borderRadius:3, background:'var(--surface-3)', color:'var(--text-3)'}}>수동</span>
          : r.productCode || '-'}
      </td>
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
          <span style={{color:'var(--text-3)', fontSize:12, flex:1}}>
            {r.note || <span style={{opacity:.3}}>—</span>}
          </span>
          {r.jetteLinked && !r.excluded && r.hasRecord && (
            <span style={{
              fontSize:10, fontWeight:700, padding:'2px 6px', borderRadius:4,
              background:'var(--positive-soft)', color:'var(--positive)', whiteSpace:'nowrap',
            }}>제때 연동</span>
          )}
        </div>
      </td>
      <td style={{textAlign:'center'}}>
        {r.excluded ? (
          <button className="btn sm" style={{fontSize:11}} onClick={onRestore}>복원</button>
        ) : deletePending ? (
          <span style={{display:'flex', gap:3}}>
            <button className="btn sm"
              style={{background:'var(--negative)', color:'#fff', border:'none', fontSize:11}}
              onClick={onDeleteConfirm}>{r.isManual ? '삭제' : '숨김'}</button>
            <button className="btn sm" style={{fontSize:11}} onClick={onDeleteCancel}>취소</button>
          </span>
        ) : (
          <span style={{display:'flex', gap:4}}>
            <button className="btn sm" onClick={onEdit}>
              <Icon.edit style={{width:13, height:13}}/>
            </button>
            <button className="btn sm" onClick={onDeleteStart} style={{color:'var(--text-3)'}}>
              <Icon.trash style={{width:13, height:13}}/>
            </button>
          </span>
        )}
      </td>
    </tr>
  );
}
