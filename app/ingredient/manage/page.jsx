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
  deleteIngredient, getCategoryStyle, sortCategoryTags,
  seedMasterIngredients, INGREDIENT_MASTER_SEED,
} from '@/lib/ingredient';
import { IngredientForm } from './IngredientForm';

const DISCONTINUED_FILTER = '__discontinued__';
const UNCATEGORIZED_FILTER = '__none__';

export default function Page() {
  const [rows,         setRows]         = useState([]);
  const [priceDate,    setPriceDate]    = useState(null);
  const [loading,      setLoading]      = useState(true);
  const [search,       setSearch]       = useState('');
  const [catFilter,    setCatFilter]    = useState('all');
  const [formTarget,   setFormTarget]   = useState(null);
  const [deletePending,setDeletePending]= useState(null);
  const [seeding,      setSeeding]      = useState(false);

  const load = useCallback(async () => {
    await initDB();
    const files = await getPriceFiles();
    const latest = files[0] || null;
    setPriceDate(latest?.updateDate || null);

    const [allMeta, metaMap] = await Promise.all([
      getAllIngredients(),
      getIngredientMetaMap(),
    ]);

    if (!latest) {
      setRows(allMeta.filter(m => m.isManual || m.isSeeded).map(buildMetaOnlyRow));
      return;
    }

    const priceRows = await getPriceRowsByFileId(latest.id);
    const merged    = mergeIngredientRows(priceRows, metaMap);
    const priceCodeSet = new Set(priceRows.map(r => r.productCode).filter(Boolean));

    // 가격파일에 없는 메타(수동 + 시드된 항목)
    const orphanMetaRows = allMeta
      .filter(m => (m.isManual || m.isSeeded) && (!m.productCode || !priceCodeSet.has(m.productCode)))
      .map(buildMetaOnlyRow);

    setRows([...merged, ...orphanMetaRows]);
  }, []);

  useEffect(() => {
    load().catch(console.error).finally(() => setLoading(false));
  }, [load]);

  async function handleSeed() {
    if (seeding) return;
    setSeeding(true);
    try {
      const result = await seedMasterIngredients(INGREDIENT_MASTER_SEED);
      showToast(`마스터 시드 적용 완료 — 신규 ${result.inserted} · 갱신 ${result.updated}`, 'ok');
      await load();
    } catch (err) {
      showToast('시드 실패: ' + err.message, 'err');
    } finally {
      setSeeding(false);
    }
  }

  async function handleSave(formData) {
    try {
      if (formTarget === 'new') {
        await addIngredient(formData);
        showToast('식자재 추가 완료', 'ok');
      } else if (formTarget.isManual && formTarget.id && !formTarget.productCode) {
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
      if (row.isManual && row.id && !row.productCode) {
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

  // ── 카테고리 태그 집합 (메인 카테고리 우선) ──
  const tagSet = useMemo(() => {
    const set = new Set();
    rows.forEach(r => {
      if (r.discontinued) return;
      (r.categories || []).forEach(t => t && set.add(t));
    });
    return sortCategoryTags(Array.from(set));
  }, [rows]);

  const discontinuedCount = rows.filter(r => r.discontinued).length;
  const uncategorized     = rows.filter(r => !r.discontinued && !r.excluded && (!r.categories || !r.categories.length)).length;

  // ── 필터링 ──
  const filtered = useMemo(() => {
    let list;
    if (catFilter === DISCONTINUED_FILTER) {
      list = rows.filter(r => r.discontinued);
    } else {
      list = rows.filter(r => !r.discontinued);
      if (catFilter === UNCATEGORIZED_FILTER) {
        list = list.filter(r => !r.categories || !r.categories.length);
      } else if (catFilter !== 'all') {
        list = list.filter(r => (r.categories || []).includes(catFilter));
      }
    }
    const q = search.trim().toLowerCase();
    if (q) list = list.filter(r =>
      (r.ingredientName || r.displayName || r.productName || '').toLowerCase().includes(q) ||
      (r.productCode || '').toLowerCase().includes(q) ||
      (r.categories || []).some(c => c.toLowerCase().includes(q)) ||
      (r.manufacturer || '').toLowerCase().includes(q)
    );
    return list;
  }, [rows, catFilter, search]);

  const managedCount = rows.filter(r => r.hasRecord).length;

  const sub = loading
    ? '로딩 중…'
    : priceDate
      ? `제때 단가 기준 ${priceDate} · 전체 ${rows.length}개 · 관리 중 ${managedCount}개${discontinuedCount ? ` · 단종 ${discontinuedCount}개` : ''}`
      : rows.length > 0
        ? `제때 가격 파일 없음 · 메타 ${rows.length}개`
        : '제때 가격 파일이 없습니다 — 마스터 시드 적용 또는 가격파일 업로드가 필요합니다';

  return (
    <main className="main">
      <PageHeader
        breadcrumb={['식자재', '식자재 관리']}
        title="식자재 관리"
        sub={sub}
        actions={
          <>
            <button className="btn" onClick={handleSeed} disabled={seeding}>
              <Icon.download style={{width:14, height:14}}/>
              {seeding ? '시드 중…' : `마스터 시드 (${INGREDIENT_MASTER_SEED.length})`}
            </button>
            <button className="btn primary" onClick={() => setFormTarget('new')}>
              <Icon.plus style={{width:14, height:14}}/> 식자재 추가
            </button>
          </>
        }
      />

      {!loading && !priceDate && rows.length === 0 && (
        <div className="card" style={{minHeight:180, display:'grid', placeItems:'center'}}>
          <div style={{textAlign:'center', color:'var(--text-3)'}}>
            <Icon.box style={{width:32, height:32, marginBottom:12, opacity:.4}}/>
            <div style={{fontWeight:600, marginBottom:4}}>아직 데이터가 없습니다</div>
            <div style={{fontSize:13}}>상단의 <b>마스터 시드</b> 버튼으로 80개 마스터 품목을 일괄 등록하거나, 제때 가격 파일을 업로드해주세요.</div>
          </div>
        </div>
      )}

      {rows.length > 0 && (
        <div style={{display:'flex', flexDirection:'column', gap:6}}>
          <div style={{display:'flex', gap:6, flexWrap:'wrap', alignItems:'center'}}>
            <span style={{fontSize:12, color:'var(--text-3)', marginRight:4}}>분류</span>
            <button className={'chip' + (catFilter === 'all' ? ' active' : '')}
              onClick={() => setCatFilter('all')}>
              전체 {rows.filter(r => !r.discontinued).length}
            </button>
            {tagSet.map(c => (
              <button key={c}
                className={'chip' + (catFilter === c ? ' active' : '')}
                style={catFilter !== c ? getCategoryStyle(c) : undefined}
                onClick={() => setCatFilter(c)}>
                {c} {rows.filter(r => !r.discontinued && (r.categories || []).includes(c)).length}
              </button>
            ))}
            {uncategorized > 0 && (
              <button className={'chip' + (catFilter === UNCATEGORIZED_FILTER ? ' active' : '')}
                style={catFilter !== UNCATEGORIZED_FILTER ? {color:'var(--warn)'} : undefined}
                onClick={() => setCatFilter(catFilter === UNCATEGORIZED_FILTER ? 'all' : UNCATEGORIZED_FILTER)}>
                미분류 {uncategorized}
              </button>
            )}
            {discontinuedCount > 0 && (
              <button className={'chip' + (catFilter === DISCONTINUED_FILTER ? ' active' : '')}
                style={catFilter !== DISCONTINUED_FILTER
                  ? {color:'var(--text-3)', marginLeft:'auto'}
                  : {marginLeft:'auto'}}
                onClick={() => setCatFilter(catFilter === DISCONTINUED_FILTER ? 'all' : DISCONTINUED_FILTER)}>
                단종 {discontinuedCount}
              </button>
            )}
          </div>
          <FilterBar search={search} onSearch={setSearch}/>
        </div>
      )}

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
                    <th style={{width:88}}>제품코드</th>
                    <th>제품명</th>
                    <th style={{width:60}}>온도</th>
                    <th style={{width:88}}>포장단위</th>
                    <th style={{width:80}}>전용/범용</th>
                    <th style={{width:110, textAlign:'right'}}>부가세포함단가</th>
                    <th style={{width:110, textAlign:'right'}}>g·개당단가</th>
                    <th style={{width:180}}>분류</th>
                    <th style={{width:100}}>제조사</th>
                    <th style={{width:80}}/>
                  </tr>
                </thead>
                <tbody>
                  {filtered.map(r => {
                    const rowKey = r.isManual ? `m-${r.id}` : r.productCode;
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

// ── 가격파일에 없는 메타(수동·시드) 행 빌더 ──────────────────

function buildMetaOnlyRow(m) {
  const baseQty  = m.baseQuantity ?? null;
  const unitType = m.baseUnitType || 'g';
  const unitPrice = baseQty && baseQty > 0 && m.priceOverride
    ? Math.round(m.priceOverride / baseQty * 100) / 100
    : null;
  const categories = Array.isArray(m.categories) && m.categories.length
    ? m.categories
    : (m.category ? [m.category] : []);
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
    categories,
    category:      categories[0] || '',
    manufacturer:  m.manufacturer || '',
    discontinued:  m.discontinued === true,
    baseQuantity:  baseQty,
    baseUnitType:  unitType,
    note:          m.note || '',
    unitPrice,
    jetteLinked:   false,
    excluded:      m.excluded === true,
    hasRecord:     true,
    isManual:      m.isManual === true,
    isSeeded:      m.isSeeded === true,
    updatedAt:     m.updatedAt || null,
  };
}

// ── 행 컴포넌트 ───────────────────────────────────────────────

function ManageRow({ r, deletePending, onEdit, onDeleteStart, onDeleteCancel, onDeleteConfirm, onRestore }) {
  const name = r.ingredientName || r.displayName || r.productName;
  const unitLabel = r.baseQuantity && r.baseUnitType
    ? `${formatNumber(r.baseQuantity)}${r.baseUnitType}`
    : (r.salesUnit || '-');
  const unitPriceLabel = r.unitPrice != null
    ? `${r.unitPrice < 1 ? r.unitPrice.toFixed(2) : formatNumber(Math.round(r.unitPrice))}원/${r.baseUnitType || 'g'}`
    : null;
  const scopeLabel = r.hasRecord ? '전용' : '범용';
  const tags = sortCategoryTags(r.categories || []);

  return (
    <tr style={{opacity: r.excluded ? .5 : 1, background: r.excluded ? 'var(--surface-2)' : undefined}}>
      <td className="num" style={{color:'var(--text-3)', fontSize:11}}>
        {r.isManual && !r.productCode
          ? <span style={{fontSize:10, padding:'1px 5px', borderRadius:3, background:'var(--surface-3)', color:'var(--text-3)'}}>수동</span>
          : r.productCode || '-'}
      </td>
      <td style={{fontWeight:600, fontSize:13}}>
        <span title={r.productName !== name ? `원본: ${r.productName}` : undefined}>{name}</span>
        {r.discontinued && (
          <span style={{
            marginLeft:6, fontSize:10, fontWeight:700, padding:'1px 5px', borderRadius:3,
            background:'var(--surface-3)', color:'var(--text-3)',
          }}>단종</span>
        )}
      </td>
      <td style={{fontSize:12, color:'var(--text-2)'}}>{r.temperature || '-'}</td>
      <td style={{fontSize:12, color:'var(--text-2)'}}>{unitLabel}</td>
      <td style={{fontSize:11}}>
        <span className="chip" style={{
          padding:'2px 7px', fontSize:11,
          background: r.hasRecord ? 'var(--accent-soft)' : 'var(--surface-3)',
          color: r.hasRecord ? 'var(--accent-text)' : 'var(--text-2)',
        }}>{scopeLabel}</span>
      </td>
      <td className="num right" style={{fontWeight:600, fontSize:12}}>
        {r.priceWithTax != null ? <>{formatNumber(r.priceWithTax)}<span className="unit">원</span></> : '-'}
      </td>
      <td className="num right" style={{fontSize:12, color: unitPriceLabel ? undefined : 'var(--text-4)'}}>
        {unitPriceLabel || '—'}
      </td>
      <td>
        {tags.length > 0
          ? <div style={{display:'flex', gap:3, flexWrap:'wrap'}}>
              {tags.map(t => (
                <span key={t} className="chip" style={{...getCategoryStyle(t), padding:'1px 6px', fontSize:10}}>{t}</span>
              ))}
            </div>
          : <span className="chip" style={{background:'var(--warn-soft)', color:'var(--warn)', fontSize:10, padding:'1px 6px'}}>미분류</span>}
      </td>
      <td style={{fontSize:12, color:'var(--text-2)'}}>{r.manufacturer || '-'}</td>
      <td style={{textAlign:'center'}}>
        {r.excluded ? (
          <button className="btn sm" style={{fontSize:11}} onClick={onRestore}>복원</button>
        ) : deletePending ? (
          <span style={{display:'flex', gap:3}}>
            <button className="btn sm"
              style={{background:'var(--negative)', color:'#fff', border:'none', fontSize:11}}
              onClick={onDeleteConfirm}>{r.isManual && !r.productCode ? '삭제' : '숨김'}</button>
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
