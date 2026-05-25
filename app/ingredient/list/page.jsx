'use client';
import { useEffect, useRef, useState, useMemo, useCallback } from 'react';
import { Icon } from '@/components/icons';
import { PageHeader, FilterBar } from '@/components/ui/PageHeader';
import { showToast } from '@/components/Toast';
import { initDB } from '@/lib/db';
import { formatNumber } from '@/lib/format';
import { getPriceFiles, getPriceRowsByFileId } from '@/lib/price';
import {
  getIngredientMetaMap, upsertIngredientMeta,
  mergeIngredientRows,
} from '@/lib/ingredient';

const DEFAULT_CATEGORIES = [
  '치즈류', '소스류', '도우/밀가루', '채소류', '육류/가공육',
  '수산류', '박스/포장재', '음료', '기타',
];

const UNIT_TYPES = ['g', 'kg', 'L', 'ml', '개', '캔', '팩', '봉', '병'];

export default function Page() {
  const [rows,       setRows]       = useState([]);
  const [priceDate,  setPriceDate]  = useState(null);
  const [loading,    setLoading]    = useState(true);
  const [search,     setSearch]     = useState('');
  const [catFilter,  setCatFilter]  = useState('all');
  // 편집 상태: productCode → {category, baseQuantity, baseUnitType, note}
  const [editing,    setEditing]    = useState({});
  const [saving,     setSaving]     = useState(new Set());

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

  // 분류·포장단위 인라인 저장
  async function saveMeta(productCode, patch) {
    setSaving(s => new Set(s).add(productCode));
    try {
      await upsertIngredientMeta({ productCode, ...patch });
      // 로컬 rows 즉시 반영 (재로드 없이)
      setRows(prev => prev.map(r =>
        r.productCode === productCode
          ? {
              ...r, ...patch,
              unitPrice: (patch.baseQuantity || r.baseQuantity) && r.priceWithTax
                ? Math.round(r.priceWithTax / (patch.baseQuantity ?? r.baseQuantity) * 100) / 100
                : r.unitPrice,
            }
          : r
      ));
      setEditing(e => { const n = { ...e }; delete n[productCode]; return n; });
    } catch (err) {
      showToast('저장 실패: ' + err.message, 'err');
    } finally {
      setSaving(s => { const n = new Set(s); n.delete(productCode); return n; });
    }
  }

  function startEdit(productCode, field, value) {
    setEditing(e => ({
      ...e,
      [productCode]: { ...(e[productCode] || {}), [field]: value },
    }));
  }

  function getEdit(productCode, field, fallback) {
    return editing[productCode]?.[field] ?? fallback;
  }

  // 필터 목록
  const categories = useMemo(() => {
    const used = new Set(rows.map(r => r.category).filter(Boolean));
    return ['all', ...Array.from(used).sort((a, b) => a.localeCompare(b, 'ko'))];
  }, [rows]);

  const filtered = useMemo(() => {
    let list = rows;
    if (catFilter !== 'all') list = list.filter(r => r.category === catFilter);
    const q = search.trim().toLowerCase();
    if (q) list = list.filter(r =>
      (r.productName || '').toLowerCase().includes(q) ||
      (r.productCode || '').toLowerCase().includes(q)
    );
    return list;
  }, [rows, catFilter, search]);

  const uncategorized = rows.filter(r => !r.category).length;

  const sub = loading
    ? '로딩 중…'
    : priceDate
      ? `제때 단가 기준 ${priceDate} · 총 ${rows.length}개${uncategorized ? ` · 미분류 ${uncategorized}개` : ''}`
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
                  </tr>
                </thead>
                <tbody>
                  {filtered.map(r => (
                    <IngredientRow
                      key={r.productCode}
                      r={r}
                      isSaving={saving.has(r.productCode)}
                      editState={editing[r.productCode] || {}}
                      onStartEdit={(field, val) => startEdit(r.productCode, field, val)}
                      onSave={(patch) => saveMeta(r.productCode, patch)}
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

function IngredientRow({ r, isSaving, editState, onStartEdit, onSave }) {
  const catRef  = useRef(null);
  const qtyRef  = useRef(null);
  const noteRef = useRef(null);

  // 분류 편집 중인지
  const editingCat  = 'category'     in editState;
  const editingQty  = 'baseQuantity' in editState;
  const editingNote = 'note'         in editState;

  function commitAll() {
    const patch = {};
    if (editingCat)  patch.category     = editState.category     ?? r.category;
    if (editingQty)  patch.baseQuantity = Number(editState.baseQuantity) || r.baseQuantity;
    if (editingNote) patch.note         = editState.note         ?? r.note;
    if (Object.keys(patch).length) onSave(patch);
  }

  const unitLabel = r.baseQuantity && r.baseUnitType
    ? `${formatNumber(r.baseQuantity)}${r.baseUnitType}`
    : '-';

  const unitPriceLabel = r.unitPrice != null
    ? `${r.unitPrice < 1 ? r.unitPrice.toFixed(2) : formatNumber(Math.round(r.unitPrice))}원/${r.baseUnitType || 'g'}`
    : null;

  return (
    <tr style={{opacity: isSaving ? .5 : 1}}>
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

      {/* 포장단위 + g당단가 */}
      <td className="num right">
        {editingQty ? (
          <span style={{display:'flex', gap:4, justifyContent:'flex-end', alignItems:'center'}}>
            <input
              ref={qtyRef}
              type="number"
              defaultValue={r.baseQuantity || ''}
              style={{width:70, textAlign:'right', fontSize:13, padding:'2px 6px',
                border:'1px solid var(--accent)', borderRadius:6, outline:'none'}}
              onChange={e => onStartEdit('baseQuantity', e.target.value)}
              onBlur={commitAll}
              onKeyDown={e => { if (e.key === 'Enter') { e.target.blur(); } if (e.key === 'Escape') commitAll(); }}
              autoFocus
            />
            <UnitSelect
              value={editState.baseUnitType ?? r.baseUnitType ?? 'g'}
              onChange={v => onStartEdit('baseUnitType', v)}
            />
          </span>
        ) : (
          <span
            title="클릭하여 포장단위 편집"
            style={{cursor:'pointer', color: r.baseQuantity ? undefined : 'var(--warn)'}}
            onClick={() => { onStartEdit('baseQuantity', r.baseQuantity || ''); onStartEdit('baseUnitType', r.baseUnitType || 'g'); }}
          >
            {r.baseQuantity
              ? <>{unitLabel}{unitPriceLabel && <><br/><span style={{fontSize:11, color:'var(--text-3)', fontWeight:400}}>{unitPriceLabel}</span></>}</>
              : <span style={{fontSize:12}}>설정 필요</span>}
          </span>
        )}
      </td>

      {/* 분류 */}
      <td>
        {editingCat ? (
          <CategorySelect
            value={editState.category ?? r.category}
            onChange={v => onStartEdit('category', v)}
            onBlur={commitAll}
          />
        ) : (
          <span
            title="클릭하여 분류 편집"
            style={{cursor:'pointer', display:'inline-block'}}
            onClick={() => onStartEdit('category', r.category || '')}
          >
            {r.category
              ? <span className="chip">{r.category}</span>
              : <span className="chip" style={{background:'var(--warn-soft)', color:'var(--warn)', fontSize:11}}>미분류</span>}
          </span>
        )}
      </td>

      {/* 비고 + 연동 표시 */}
      <td>
        <div style={{display:'flex', gap:6, alignItems:'center'}}>
          {editingNote ? (
            <input
              ref={noteRef}
              type="text"
              defaultValue={r.note || ''}
              style={{flex:1, fontSize:13, padding:'2px 6px',
                border:'1px solid var(--accent)', borderRadius:6, outline:'none'}}
              onChange={e => onStartEdit('note', e.target.value)}
              onBlur={commitAll}
              onKeyDown={e => { if (e.key === 'Enter') e.target.blur(); if (e.key === 'Escape') commitAll(); }}
              autoFocus
            />
          ) : (
            <span
              style={{cursor:'pointer', color:'var(--text-3)', fontSize:12, flex:1}}
              onClick={() => onStartEdit('note', r.note || '')}
            >
              {r.note || <span style={{opacity:.4}}>추가</span>}
            </span>
          )}
          {r.jetteLinked && (
            <span style={{
              fontSize:10, fontWeight:700, padding:'2px 6px', borderRadius:4,
              background:'var(--positive-soft)', color:'var(--positive)', whiteSpace:'nowrap',
            }}>제때 연동</span>
          )}
        </div>
      </td>
    </tr>
  );
}

function CategorySelect({ value, onChange, onBlur }) {
  return (
    <div style={{position:'relative', display:'inline-block'}}>
      <select
        value={value}
        autoFocus
        onChange={e => onChange(e.target.value)}
        onBlur={onBlur}
        style={{
          fontSize:12, padding:'3px 24px 3px 8px', borderRadius:6,
          border:'1px solid var(--accent)', outline:'none', cursor:'pointer',
          background:'var(--surface)', color:'var(--text-1)', appearance:'none',
          minWidth:100,
        }}
      >
        <option value="">미분류</option>
        {DEFAULT_CATEGORIES.map(c => <option key={c} value={c}>{c}</option>)}
      </select>
      <Icon.chevDown style={{
        position:'absolute', right:6, top:'50%', transform:'translateY(-50%)',
        width:12, height:12, pointerEvents:'none', color:'var(--text-3)',
      }}/>
    </div>
  );
}

function UnitSelect({ value, onChange }) {
  return (
    <div style={{position:'relative', display:'inline-block'}}>
      <select
        value={value}
        onChange={e => onChange(e.target.value)}
        style={{
          fontSize:12, padding:'2px 20px 2px 6px', borderRadius:6,
          border:'1px solid var(--border)', outline:'none',
          background:'var(--surface)', color:'var(--text-1)', appearance:'none',
          width:56,
        }}
      >
        {UNIT_TYPES.map(u => <option key={u} value={u}>{u}</option>)}
      </select>
      <Icon.chevDown style={{
        position:'absolute', right:4, top:'50%', transform:'translateY(-50%)',
        width:10, height:10, pointerEvents:'none', color:'var(--text-3)',
      }}/>
    </div>
  );
}
