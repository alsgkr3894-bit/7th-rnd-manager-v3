'use client';
import { useEffect, useState, useMemo, useCallback } from 'react';
import { Icon } from '@/components/icons';
import { PageHeader, FilterBar } from '@/components/ui/PageHeader';
import { showToast } from '@/components/Toast';
import { initDB } from '@/lib/db';
import { formatNumber } from '@/lib/format';
import { getAllIngredients, addIngredient, updateIngredient, deleteIngredient } from '@/lib/ingredient';
import { getPriceFiles, getPriceRowsByFileId } from '@/lib/price';
import { simplifyIngredientName } from '@/lib/normalize';
import { IngredientForm } from './IngredientForm';

export default function Page() {
  const [rows,       setRows]       = useState([]);
  const [loading,    setLoading]    = useState(true);
  const [search,     setSearch]     = useState('');
  const [catFilter,  setCatFilter]  = useState('all');
  const [formTarget, setFormTarget] = useState(null); // null=닫힘 | 'new' | {record}
  const [deleteTarget, setDeleteTarget] = useState(null); // id

  const load = useCallback(async () => {
    await initDB();
    const [meta, priceFiles] = await Promise.all([getAllIngredients(), getPriceFiles()]);
    const latest = priceFiles[0] || null;

    // 제때 연동 항목의 ingredientName이 비어 있으면 price_rows에서 보완
    if (latest) {
      const priceRows = await getPriceRowsByFileId(latest.id);
      const byCode    = new Map(priceRows.map(p => [p.productCode, p]));
      setRows(meta.map(r => {
        if (!r.ingredientName && r.productCode && byCode.has(r.productCode)) {
          return { ...r, ingredientName: simplifyIngredientName(byCode.get(r.productCode).productName) };
        }
        return r;
      }));
    } else {
      setRows(meta);
    }
  }, []);

  useEffect(() => {
    load().catch(console.error).finally(() => setLoading(false));
  }, [load]);

  // ── 저장 ──────────────────────────────────────────────────
  async function handleSave(formData) {
    try {
      if (formTarget === 'new') {
        await addIngredient(formData);
        showToast('식자재 추가 완료', 'ok');
      } else {
        await updateIngredient(formTarget.id, formData);
        showToast('수정 완료', 'ok');
      }
      setFormTarget(null);
      await load();
    } catch (err) {
      showToast('저장 실패: ' + err.message, 'err');
      throw err;
    }
  }

  // ── 삭제 ──────────────────────────────────────────────────
  async function handleDelete(id) {
    try {
      await deleteIngredient(id);
      setDeleteTarget(null);
      showToast('삭제 완료', 'ok');
      await load();
    } catch (err) {
      showToast('삭제 실패: ' + err.message, 'err');
    }
  }

  // ── 필터 ──────────────────────────────────────────────────
  const categories = useMemo(() => {
    const used = new Set(rows.map(r => r.category).filter(Boolean));
    return ['all', ...Array.from(used).sort((a, b) => a.localeCompare(b, 'ko'))];
  }, [rows]);

  const filtered = useMemo(() => {
    let list = catFilter === 'all'      ? rows
             : catFilter === '__none__' ? rows.filter(r => !r.category)
             : rows.filter(r => r.category === catFilter);
    const q = search.trim().toLowerCase();
    if (q) list = list.filter(r =>
      (r.ingredientName || '').toLowerCase().includes(q) ||
      (r.productCode    || '').toLowerCase().includes(q) ||
      (r.category       || '').toLowerCase().includes(q)
    );
    return list;
  }, [rows, catFilter, search]);

  const uncategorized = rows.filter(r => !r.category).length;

  return (
    <main className="main">
      <PageHeader
        breadcrumb={['식자재', '식자재 관리']}
        title="식자재 관리"
        sub={loading ? '로딩 중…' : `총 ${rows.length}개${uncategorized ? ` · 미분류 ${uncategorized}개` : ''}`}
        actions={
          <button className="btn primary" onClick={() => setFormTarget('new')}>
            <Icon.plus style={{width:14, height:14}}/> 식자재 추가
          </button>
        }
      />

      {/* 카테고리 필터 */}
      {rows.length > 0 && (
        <>
          <div style={{display:'flex', gap:6, flexWrap:'wrap', margin:'16px 0 8px', alignItems:'center'}}>
            {categories.map(c => (
              <button key={c} className={'chip' + (catFilter === c ? ' active' : '')}
                onClick={() => setCatFilter(c)}>
                {c === 'all'
                  ? `전체 (${rows.length})`
                  : `${c} (${rows.filter(r => r.category === c).length})`}
              </button>
            ))}
            {uncategorized > 0 && (
              <button
                className={'chip' + (catFilter === '__none__' ? ' active' : '')}
                style={{color:'var(--warn)'}}
                onClick={() => setCatFilter(catFilter === '__none__' ? 'all' : '__none__')}>
                미분류 ({uncategorized})
              </button>
            )}
          </div>
          <FilterBar search={search} onSearch={setSearch}/>
        </>
      )}

      {/* 빈 상태 */}
      {!loading && rows.length === 0 && (
        <div className="card" style={{marginTop:24, minHeight:200, display:'grid', placeItems:'center'}}>
          <div style={{textAlign:'center', color:'var(--text-3)'}}>
            <Icon.tag style={{width:32, height:32, marginBottom:12, opacity:.4}}/>
            <div style={{fontWeight:600, marginBottom:4}}>등록된 식자재가 없습니다</div>
            <div style={{fontSize:13, marginBottom:16}}>식자재 추가 버튼으로 직접 등록하거나<br/>식자재 리스트에서 분류를 설정하면 자동으로 추가됩니다.</div>
            <button className="btn primary" onClick={() => setFormTarget('new')}>
              <Icon.plus style={{width:14, height:14}}/> 식자재 추가
            </button>
          </div>
        </div>
      )}

      {/* 테이블 */}
      {filtered.length > 0 && (
        <div className="card table-card" style={{marginTop:12}}>
          <div style={{overflowX:'auto'}}>
            <table className="data-table">
              <thead>
                <tr>
                  <th style={{width:120}}>분류</th>
                  <th>재료명</th>
                  <th style={{width:110}}>제때 제품코드</th>
                  <th style={{width:130, textAlign:'right'}}>포장단위</th>
                  <th style={{width:150, textAlign:'right'}}>단가 (부가세포함)</th>
                  <th style={{width:130, textAlign:'right'}}>g·개당 단가</th>
                  <th style={{width:70}}>과세</th>
                  <th style={{width:80, textAlign:'center'}}>연동</th>
                  <th>비고</th>
                  <th style={{width:90}}/>
                </tr>
              </thead>
              <tbody>
                {filtered.map(r => (
                  <ManageRow
                    key={r.id}
                    r={r}
                    deletePending={deleteTarget === r.id}
                    onEdit={() => setFormTarget(r)}
                    onDeleteStart={() => setDeleteTarget(r.id)}
                    onDeleteCancel={() => setDeleteTarget(null)}
                    onDeleteConfirm={() => handleDelete(r.id)}
                  />
                ))}
              </tbody>
            </table>
          </div>
          <div style={{padding:'8px 16px', fontSize:11, color:'var(--text-3)', borderTop:'1px solid var(--divider)'}}>
            {filtered.length}개 표시 / 전체 {rows.length}개
          </div>
        </div>
      )}

      {/* 추가/수정 모달 */}
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

// ── 행 ───────────────────────────────────────────────────────

function ManageRow({ r, deletePending, onEdit, onDeleteStart, onDeleteCancel, onDeleteConfirm }) {
  const unitLabel = r.baseQuantity && r.baseUnitType
    ? `${formatNumber(r.baseQuantity)}${r.baseUnitType}` : '-';

  const effectivePrice = r.priceOverride ?? null; // 수동 단가
  const unitPrice = r.baseQuantity && r.baseQuantity > 0 && effectivePrice
    ? Math.round(effectivePrice / r.baseQuantity * 100) / 100
    : null;

  return (
    <tr>
      <td>
        {r.category
          ? <span className="chip">{r.category}</span>
          : <span className="chip" style={{background:'var(--warn-soft)', color:'var(--warn)', fontSize:11}}>미분류</span>}
      </td>
      <td style={{fontWeight:600}}>{r.ingredientName}</td>
      <td style={{fontSize:12, color:'var(--text-3)'}}>{r.productCode || <span style={{color:'var(--text-4)'}}>—</span>}</td>
      <td className="num right" style={{color:'var(--text-2)'}}>{unitLabel}</td>
      <td className="num right">
        {effectivePrice != null
          ? <>{formatNumber(effectivePrice)}<span className="unit">원</span></>
          : <span style={{fontSize:12, color:'var(--text-4)'}}>—</span>}
      </td>
      <td className="num right" style={{fontSize:12}}>
        {unitPrice != null
          ? <>{unitPrice < 1 ? unitPrice.toFixed(2) : formatNumber(Math.round(unitPrice))}<span className="unit">원/{r.baseUnitType||'g'}</span></>
          : <span style={{color:'var(--text-4)'}}>—</span>}
      </td>
      <td style={{fontSize:12, color:'var(--text-3)'}}>{r.taxType || '-'}</td>
      <td style={{textAlign:'center'}}>
        {r.productCode
          ? <span title="제때 연동" style={{color:'var(--positive)', fontSize:13}}>●</span>
          : <span title="수동 등록" style={{color:'var(--text-4)', fontSize:13}}>○</span>}
      </td>
      <td style={{fontSize:12, color:'var(--text-3)'}}>{r.note || '-'}</td>
      <td>
        {deletePending ? (
          <span style={{display:'flex', gap:4, alignItems:'center'}}>
            <button className="btn sm" style={{background:'var(--negative)', color:'#fff', border:'none'}}
              onClick={onDeleteConfirm}>삭제</button>
            <button className="btn sm" onClick={onDeleteCancel}>취소</button>
          </span>
        ) : (
          <span style={{display:'flex', gap:4}}>
            <button className="btn sm" onClick={onEdit}><Icon.edit style={{width:13,height:13}}/></button>
            <button className="btn sm" onClick={onDeleteStart}><Icon.trash style={{width:13,height:13}}/></button>
          </span>
        )}
      </td>
    </tr>
  );
}
