'use client';
import { useEffect, useState, useMemo, useCallback } from 'react';
import { createPortal } from 'react-dom';
import { Icon } from '@/components/icons';
import { PageHeader } from '@/components/ui/PageHeader';
import { showToast } from '@/components/Toast';
import { initDB } from '@/lib/db';
import { formatNumber } from '@/lib/format';
import { getPriceFiles, getPriceRowsByFileId } from '@/lib/price';
import {
  getAllIngredients, getIngredientMetaMap, upsertIngredientMeta,
  bulkImportIngredients, resetAllIngredients,
  getCategoryStyle, sortMainCategories,
  SEED_MAIN_CATEGORIES,
} from '@/lib/ingredient';
import { MASTER_IMPORT_SEED } from '@/lib/ingredient/master-import-seed';

const UNIT_TYPES = ['g', 'kg', 'L', 'ml', '개', '캔', '팩', '봉', '병', 'EA', 'BOX'];

export default function Page() {
  const [rows,       setRows]       = useState([]);
  const [fileInfo,   setFileInfo]   = useState(null);
  const [loading,    setLoading]    = useState(true);
  const [dbError,    setDbError]    = useState(null);
  const [search,     setSearch]     = useState('');
  const [taxFilter,  setTaxFilter]  = useState('all');
  const [deltaFilter,setDeltaFilter]= useState('all'); // all | up | down | new | same
  const [regTarget,  setRegTarget]  = useState(null);  // 마스터 등록 모달 대상 행
  const [importing,  setImporting]  = useState(false);
  const [resetting,  setResetting]  = useState(false);

  const load = useCallback(async () => {
    await initDB();
    const files  = await getPriceFiles();
    const latest = files[0] || null;
    const prev   = files[1] || null;

    const [allMeta, metaMap] = await Promise.all([
      getAllIngredients(),
      getIngredientMetaMap(),
    ]);

    // 마스터가 비어있으면 빈 목록
    if (!allMeta.length) { setRows([]); return; }

    let prevPriceMap = new Map();
    let priceRows = [];
    let priceCodeSet = new Set();

    if (latest) {
      setFileInfo({ name: latest.fileName || latest.name || '', date: latest.updateDate || latest.date || '' });
      priceRows = await getPriceRowsByFileId(latest.id);
      priceCodeSet = new Set(priceRows.map(r => r.productCode).filter(Boolean));
      if (prev) {
        const prevRows = await getPriceRowsByFileId(prev.id);
        prevRows.forEach(r => { if (r.productCode) prevPriceMap.set(r.productCode, r.priceWithTax); });
      }
    }

    // 제때 파일 Row → Map
    const priceRowMap = new Map(priceRows.map(r => [r.productCode, r]));

    // 1) 제때 연동 항목 (마스터에 등록된 것 중 제때 파일에 있는 것)
    const linkedRows = allMeta
      .filter(m => !m.discontinued && !m.excluded && m.productCode && priceCodeSet.has(m.productCode))
      .map(m => {
        const pr       = priceRowMap.get(m.productCode);
        const baseQty  = m.baseQuantity ?? null;
        const unitType = m.baseUnitType || pr?.salesUnit || 'g';
        const unitPrice = (baseQty && baseQty > 0 && pr?.priceWithTax)
          ? Math.round(pr.priceWithTax / baseQty * 100) / 100 : null;
        const prevPrice  = prevPriceMap.get(m.productCode);
        const priceDelta = prevPrice != null ? (pr.priceWithTax - prevPrice) : null;
        const isNew      = prevPrice == null && prev != null;
        return {
          ...pr,
          meta: m,
          isLinked:     true,
          masterName:   m.ingredientName || pr?.productName || '',
          category:     m.category || '',
          baseQuantity: baseQty,
          baseUnitType: unitType,
          taxType:      pr?.taxType || m.taxType || '과세',
          unitPrice,
          priceDelta,
          isNew,
        };
      });

    // 2) 수동 항목 (마스터에 있지만 제때 파일에 없는 것 — 자체코드·합산코드 포함)
    const manualRows = allMeta
      .filter(m => !m.discontinued && !m.excluded && (!m.productCode || !priceCodeSet.has(m.productCode)))
      .map(m => {
        const baseQty  = m.baseQuantity ?? null;
        const unitType = m.baseUnitType || 'g';

        // 합산 단가: compositeOf 코드들의 제때 단가를 합산
        let compositePrice = null;
        if (Array.isArray(m.compositeOf) && m.compositeOf.length > 0) {
          const sum = m.compositeOf.reduce((acc, code) => {
            const pr = priceRowMap.get(code);
            return acc + (pr?.priceWithTax ?? 0);
          }, 0);
          if (sum > 0) compositePrice = sum;
        }

        const effectivePrice = compositePrice ?? m.priceOverride ?? null;
        const unitPrice = (baseQty && baseQty > 0 && effectivePrice)
          ? Math.round(effectivePrice / baseQty * 100) / 100 : null;

        return {
          productCode:    m.productCode || '',
          productName:    m.ingredientName || '',
          meta:           m,
          isLinked:       false,
          isComposite:    Array.isArray(m.compositeOf) && m.compositeOf.length > 0,
          masterName:     m.ingredientName || '',
          category:       m.category || '',
          taxType:        m.taxType || '과세',
          priceWithTax:   effectivePrice,
          baseQuantity:   baseQty,
          baseUnitType:   unitType,
          unitPrice,
          priceDelta:     null,
          isNew:          false,
        };
      });

    setRows([...linkedRows, ...manualRows]);
  }, []);

  useEffect(() => {
    load().catch(err => { console.error(err); setDbError(err.message || '데이터 로드 실패'); }).finally(() => setLoading(false));
  }, [load]);

  const handleReset = useCallback(async () => {
    setResetting(true);
    try {
      const { deleted } = await resetAllIngredients();
      showToast(`마스터 초기화 완료 — ${deleted}개 삭제`);
      await load();
    } catch (e) {
      showToast('초기화 실패: ' + e.message);
    } finally {
      setResetting(false);
    }
  }, [load]);

  const handleBulkImport = useCallback(async () => {
    setImporting(true);
    try {
      const result = await bulkImportIngredients(MASTER_IMPORT_SEED);
      showToast(`마스터 가져오기 완료 — 신규 ${result.inserted}개, 업데이트 ${result.updated}개`);
      await load();
    } catch (e) {
      showToast('가져오기 실패: ' + e.message);
    } finally {
      setImporting(false);
    }
  }, [load]);

  // ── 통계 ─────────────────────────────────────────────────────
  const stats = useMemo(() => {
    const upCount   = rows.filter(r => r.priceDelta > 0).length;
    const downCount = rows.filter(r => r.priceDelta < 0).length;
    const newCount  = rows.filter(r => r.isNew).length;
    return { total: rows.length, upCount, downCount, newCount };
  }, [rows]);

  // ── 분류 목록 ─────────────────────────────────────────────────
  const mainCats = useMemo(() => {
    const set = new Set();
    rows.forEach(r => { if (r.category) set.add(r.category); });
    return sortMainCategories(Array.from(set));
  }, [rows]);

  // ── 필터 ─────────────────────────────────────────────────────
  const filtered = useMemo(() => {
    let list = rows;
    if (taxFilter  !== 'all') list = list.filter(r => r.taxType === taxFilter);
    if (deltaFilter === 'up')   list = list.filter(r => r.priceDelta > 0);
    if (deltaFilter === 'down') list = list.filter(r => r.priceDelta < 0);
    if (deltaFilter === 'new')  list = list.filter(r => r.isNew);
    if (deltaFilter === 'same') list = list.filter(r => r.priceDelta === 0);
    const q = search.trim().toLowerCase();
    if (q) list = list.filter(r =>
      (r.productName || '').toLowerCase().includes(q) ||
      (r.productCode || '').toLowerCase().includes(q) ||
      (r.masterName  || '').toLowerCase().includes(q)
    );
    return list;
  }, [rows, taxFilter, deltaFilter, search]);

  if (dbError) return (
    <main className="main">
      <PageHeader breadcrumb={['원가계산', '식자재 단가 마스터']} title="식자재 단가 마스터" sub="로드 실패"/>
      <div className="card" style={{padding:32, textAlign:'center', color:'var(--negative)'}}>데이터베이스 오류: {dbError}</div>
    </main>
  );

  return (
    <main className="main">
      <PageHeader
        breadcrumb={['원가계산', '식자재 단가 마스터']}
        title="식자재 단가 마스터"
        sub="제때 최신 단가 기준 — 마스터에 등록된 항목은 포장단위·개당 단가가 자동 계산돼요."
        actions={
          <div style={{display:'flex', gap:8}}>
            <button className="btn" onClick={handleReset} disabled={resetting || importing}
              style={{color:'var(--negative)'}}>
              {resetting ? '초기화 중…' : '마스터 초기화'}
            </button>
            <button className="btn primary" onClick={handleBulkImport} disabled={importing || resetting}>
              <Icon.download style={{width:14, height:14}}/>
              {importing ? '가져오는 중…' : '마스터 시드 가져오기 (118개)'}
            </button>
          </div>
        }
      />

      {/* 파일 기준 */}
      {fileInfo && (
        <div style={{display:'flex', alignItems:'center', gap:8, marginBottom:4, fontSize:12, color:'var(--text-3)'}}>
          <Icon.doc style={{width:13, height:13}}/>
          <span>기준 파일: <b style={{color:'var(--text-2)'}}>{fileInfo.name}</b>
            {fileInfo.date && <span style={{marginLeft:6}}>({fileInfo.date})</span>}
          </span>
        </div>
      )}

      {/* 통계 카드 */}
      <div className="stat-row">
        <div className="stat-card">
          <div className="stat-label">전체 제품</div>
          <div className="stat-value">{stats.total}<span className="unit">개</span></div>
        </div>
        <div className="stat-card" style={{cursor:'pointer'}}
          onClick={() => setDeltaFilter(v => v === 'up' ? 'all' : 'up')}>
          <div className="stat-label">단가 인상</div>
          <div className="stat-value" style={{color: stats.upCount > 0 ? 'var(--negative, #ef4444)' : undefined}}>
            {stats.upCount}<span className="unit">개</span>
          </div>
          <div style={{fontSize:11, color:'var(--text-3)', marginTop:6}}>클릭하여 필터</div>
        </div>
        <div className="stat-card" style={{cursor:'pointer'}}
          onClick={() => setDeltaFilter(v => v === 'down' ? 'all' : 'down')}>
          <div className="stat-label">단가 인하</div>
          <div className="stat-value" style={{color: stats.downCount > 0 ? 'var(--positive)' : undefined}}>
            {stats.downCount}<span className="unit">개</span>
          </div>
          <div style={{fontSize:11, color:'var(--text-3)', marginTop:6}}>클릭하여 필터</div>
        </div>
        <div className="stat-card" style={{cursor:'pointer'}}
          onClick={() => setDeltaFilter(v => v === 'new' ? 'all' : 'new')}>
          <div className="stat-label">신규 항목</div>
          <div className="stat-value" style={{color: stats.newCount > 0 ? 'var(--accent)' : undefined}}>
            {stats.newCount}<span className="unit">개</span>
          </div>
          <div style={{fontSize:11, color:'var(--text-3)', marginTop:6}}>클릭하여 필터</div>
        </div>
      </div>

      {!loading && rows.length === 0 && (
        <div className="card" style={{minHeight:200, display:'grid', placeItems:'center'}}>
          <div style={{textAlign:'center', color:'var(--text-3)'}}>
            <Icon.box style={{width:32, height:32, marginBottom:12, opacity:.4}}/>
            <div style={{fontWeight:600, marginBottom:6}}>마스터에 등록된 식자재가 없습니다</div>
            <div style={{fontSize:13, marginBottom:12}}>우측 상단 버튼으로 마스터 시드를 가져오면 제때 단가와 자동 연동됩니다.</div>
            <button className="btn primary" onClick={handleBulkImport} disabled={importing}>
              <Icon.download style={{width:14, height:14}}/>
              {importing ? '가져오는 중…' : '마스터 시드 가져오기 (118개)'}
            </button>
          </div>
        </div>
      )}

      {rows.length > 0 && (
        <>
          {/* 필터 바 */}
          <div style={{display:'flex', gap:8, flexWrap:'wrap', alignItems:'center', marginBottom:4}}>
            <div style={{display:'flex', gap:4, alignItems:'center'}}>
              <span style={{fontSize:11, color:'var(--text-3)', fontWeight:600}}>과세</span>
              {['all','과세','면세'].map(t => (
                <button key={t} className={'chip' + (taxFilter === t ? ' active' : '')}
                  onClick={() => setTaxFilter(t)}>{t === 'all' ? '전체' : t}</button>
              ))}
            </div>
          </div>

          {/* 검색 */}
          <div style={{display:'flex', alignItems:'center', gap:8, marginBottom:8, flexWrap:'wrap'}}>
            <div className="filter-search" style={{width:260}}>
              <Icon.search style={{width:15, height:15, color:'var(--text-3)', flexShrink:0}}/>
              <input value={search} onChange={e => setSearch(e.target.value)}
                placeholder="제품코드·제품명·마스터명 검색"/>
            </div>
          </div>

          {/* 테이블 */}
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
                      <th style={{width:90}}>제품코드</th>
                      <th>제품명</th>
                      <th style={{width:120, textAlign:'right'}}>부가세포함가</th>
                      <th style={{width:100}}>포장단위</th>
                      <th style={{width:120, textAlign:'right'}}>개당 단가</th>
                      <th style={{width:110, textAlign:'right'}}>단가변동</th>
                      <th style={{width:30}}></th>
                      <th style={{width:60}}></th>
                    </tr>
                  </thead>
                  <tbody>
                    {filtered.map((r, i) => (
                      <MasterRow
                        key={r.meta?.id ?? r.productCode ?? `row-${i}`}
                        r={r}
                        onRegClick={() => setRegTarget(r)}
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
        </>
      )}

      {/* 마스터 등록 모달 */}
      {regTarget && (
        <RegisterModal
          row={regTarget}
          onSave={async (data) => {
            await upsertIngredientMeta({ productCode: regTarget.productCode, ...data });
            showToast('마스터 등록 완료');
            setRegTarget(null);
            await load();
          }}
          onClose={() => setRegTarget(null)}
        />
      )}
    </main>
  );
}

// ── 테이블 행 ─────────────────────────────────────────────────
function MasterRow({ r, onRegClick }) {
  const [showNote, setShowNote] = useState(false);
  const note = r.meta?.note || '';

  const vatLabel = r.priceWithTax != null ? `${formatNumber(r.priceWithTax)}원` : '—';

  const packLabel = r.baseQuantity
    ? `${formatNumber(r.baseQuantity)} ${r.baseUnitType || 'g'}`
    : '—';

  const uPrice = r.unitPrice;
  const unitPriceLabel = uPrice != null
    ? `${uPrice < 1 ? uPrice.toFixed(2) : uPrice % 1 === 0 ? formatNumber(uPrice) : uPrice.toFixed(1)}원/${r.baseUnitType || 'g'}`
    : '—';

  let deltaNode;
  if (r.isNew) {
    deltaNode = <span style={{fontSize:11, padding:'1px 6px', borderRadius:4,
      background:'rgba(56,189,248,.15)', color:'var(--accent, #38bdf8)', fontWeight:700}}>신규</span>;
  } else if (r.priceDelta == null) {
    deltaNode = <span style={{color:'var(--text-4)', fontSize:12}}>—</span>;
  } else if (r.priceDelta === 0) {
    deltaNode = <span style={{color:'var(--text-3)', fontSize:12}}>변동없음</span>;
  } else {
    const color = r.priceDelta > 0 ? 'var(--negative, #ef4444)' : 'var(--positive, #10b981)';
    deltaNode = (
      <span style={{color, fontWeight:700, fontSize:13}}>
        {r.priceDelta > 0 ? '+' : ''}{formatNumber(r.priceDelta)}원
      </span>
    );
  }

  return (
    <>
      <tr>
        <td style={{color:'var(--text-3)', fontSize:11, fontFamily:'monospace'}}>
          {r.productCode || '—'}
        </td>
        <td>
          <div style={{display:'flex', alignItems:'center', gap:6}}>
            <span style={{fontWeight:600, fontSize:13}}>{r.masterName || r.productName || '—'}</span>
            {r.isLinked
              ? <span style={{fontSize:10, padding:'1px 5px', borderRadius:3, fontWeight:700,
                  background:'rgba(56,189,248,.15)', color:'var(--accent, #38bdf8)', flexShrink:0}}>제때</span>
              : <span style={{fontSize:10, padding:'1px 5px', borderRadius:3, fontWeight:700,
                  background:'var(--surface-3)', color:'var(--text-3)', flexShrink:0}}>수동</span>
            }
          </div>
          {r.isLinked && r.productName && r.productName !== r.masterName && (
            <div style={{fontSize:11, color:'var(--text-3)', marginTop:1}}>제때: {r.productName}</div>
          )}
        </td>
        <td style={{textAlign:'right', fontSize:13, fontWeight:600}}>
          {vatLabel}
          {r.taxType === '면세' && r.priceWithTax != null && (
            <span style={{marginLeft:4, fontSize:10, color:'var(--text-3)', fontWeight:400}}>면세</span>
          )}
        </td>
        <td style={{fontSize:12, color: r.baseQuantity ? 'var(--text-2)' : 'var(--text-4)'}}>
          {packLabel}
        </td>
        <td style={{textAlign:'right', fontSize:12,
          color: uPrice != null ? 'var(--accent, #38bdf8)' : 'var(--text-4)',
          fontWeight: uPrice != null ? 600 : undefined}}>
          {unitPriceLabel}
        </td>
        <td style={{textAlign:'right'}}>{deltaNode}</td>
        <td>
          {note && (
            <button
              onClick={() => setShowNote(v => !v)}
              style={{border:0, background:'transparent', cursor:'pointer', padding:'2px 4px',
                color: showNote ? 'var(--accent)' : 'var(--text-4)', lineHeight:1}}
              title="비고 보기">
              <Icon.note style={{width:14, height:14}}/>
            </button>
          )}
        </td>
        <td>
          <button className="btn" style={{padding:'3px 8px', fontSize:11}}
            onClick={onRegClick} title="포장단위·분류 수정">
            수정
          </button>
        </td>
      </tr>
      {showNote && note && (
        <tr>
          <td colSpan={8} style={{
            background:'var(--surface-2)', fontSize:12, color:'var(--text-2)',
            padding:'6px 14px 8px', borderTop:0,
          }}>
            <span style={{color:'var(--text-4)', marginRight:6, fontSize:11}}>비고</span>
            {note}
          </td>
        </tr>
      )}
    </>
  );
}

// ── 마스터 등록 모달 ──────────────────────────────────────────
function RegisterModal({ row, onSave, onClose }) {
  const existing = row.meta;
  const [ingredientName, setIngredientName] = useState(existing?.ingredientName || row.productName || '');
  const [category,       setCategory]       = useState(existing?.category || '');
  const [baseQuantity,   setBaseQuantity]   = useState(existing?.baseQuantity != null ? String(existing.baseQuantity) : '');
  const [baseUnitType,   setBaseUnitType]   = useState(existing?.baseUnitType || 'g');
  const [customCat,      setCustomCat]      = useState(
    !!existing?.category && !SEED_MAIN_CATEGORIES.includes(existing?.category)
  );
  const [saving, setSaving] = useState(false);

  async function handleSubmit(e) {
    e.preventDefault();
    setSaving(true);
    try {
      await onSave({
        ingredientName: ingredientName.trim() || row.productName,
        category:       category.trim(),
        baseQuantity:   baseQuantity ? Number(baseQuantity) : null,
        baseUnitType:   baseUnitType,
        taxType:        row.taxType || '과세',
      });
    } finally {
      setSaving(false);
    }
  }

  return createPortal(
    <div style={{position:'fixed', inset:0, background:'rgba(0,0,0,.45)',
      display:'grid', placeItems:'center', zIndex:300}}
      onClick={e => { if (e.target === e.currentTarget) onClose(); }}>
      <div className="card" style={{width:'min(480px,95vw)', padding:'24px 28px'}}>

        {/* 헤더 */}
        <div style={{display:'flex', justifyContent:'space-between', alignItems:'flex-start', marginBottom:16}}>
          <div>
            <div style={{fontWeight:700, fontSize:15}}>
              {existing ? '마스터 정보 수정' : '마스터에 등록'}
            </div>
            <div style={{fontSize:11, color:'var(--text-3)', marginTop:4}}>
              제때 코드: <span style={{fontFamily:'monospace', color:'var(--accent)'}}>{row.productCode}</span>
            </div>
          </div>
          <button className="btn" style={{padding:'4px 8px'}} onClick={onClose}>
            <Icon.close style={{width:16, height:16}}/>
          </button>
        </div>

        {/* 제때 정보 (읽기 전용) */}
        <div style={{padding:'10px 12px', background:'var(--surface-2)', borderRadius:8,
          marginBottom:16, fontSize:12, display:'grid', gridTemplateColumns:'1fr 1fr', gap:'4px 16px'}}>
          <InfoRow label="제품명"   value={row.productName}/>
          <InfoRow label="부가세포함가" value={row.priceWithTax != null ? `${formatNumber(row.priceWithTax)}원` : '—'}/>
          <InfoRow label="온도"     value={row.temperature || '—'}/>
          <InfoRow label="과세구분" value={row.taxType || '—'}/>
          <InfoRow label="판매단위" value={row.salesUnit || '—'}/>
        </div>

        <form onSubmit={handleSubmit} style={{display:'flex', flexDirection:'column', gap:14}}>

          <FormField label="마스터 재료명" hint="비워두면 제때 제품명 자동 사용">
            <input className="form-input" value={ingredientName}
              onChange={e => setIngredientName(e.target.value)}
              placeholder={row.productName}/>
          </FormField>

          <FormField label="분류">
            <div style={{display:'flex', gap:6}}>
              {customCat ? (
                <input className="form-input" value={category}
                  onChange={e => setCategory(e.target.value)}
                  placeholder="직접 입력" style={{flex:1}}/>
              ) : (
                <select className="form-input" value={category}
                  onChange={e => setCategory(e.target.value)} style={{flex:1}}>
                  <option value="">미분류</option>
                  {SEED_MAIN_CATEGORIES.map(c => <option key={c} value={c}>{c}</option>)}
                </select>
              )}
              <button type="button" className="btn" style={{whiteSpace:'nowrap', flexShrink:0}}
                onClick={() => { setCustomCat(v => !v); setCategory(''); }}>
                {customCat ? '목록에서 선택' : '직접 입력'}
              </button>
            </div>
          </FormField>

          <FormField label="포장수량" hint="개당 단가 계산에 사용 (예: 1000 g, 20 ea)">
            <div style={{display:'flex', gap:8}}>
              <input className="form-input" type="number" value={baseQuantity}
                onChange={e => setBaseQuantity(e.target.value)}
                placeholder="예) 1000" style={{flex:1}}/>
              <select className="form-input" value={baseUnitType}
                onChange={e => setBaseUnitType(e.target.value)} style={{width:80}}>
                {UNIT_TYPES.map(u => <option key={u} value={u}>{u}</option>)}
              </select>
            </div>
          </FormField>

          <div style={{display:'flex', gap:8, justifyContent:'flex-end', marginTop:4}}>
            <button type="button" className="btn" onClick={onClose}>취소</button>
            <button type="submit" className="btn primary" disabled={saving}>
              {saving ? '저장 중…' : existing ? '수정' : '등록'}
            </button>
          </div>
        </form>
      </div>
    </div>,
    document.body
  );
}

function InfoRow({ label, value }) {
  return (
    <div style={{display:'flex', gap:6, alignItems:'baseline'}}>
      <span style={{fontSize:11, color:'var(--text-3)', minWidth:60}}>{label}</span>
      <span style={{fontSize:12, color:'var(--text-1)', fontWeight:500}}>{value}</span>
    </div>
  );
}

function FormField({ label, hint, children }) {
  return (
    <div>
      <div style={{fontSize:13, fontWeight:600, color:'var(--text-2)', marginBottom:6}}>
        {label}
        {hint && <span style={{fontSize:11, fontWeight:400, color:'var(--text-3)', marginLeft:6}}>{hint}</span>}
      </div>
      {children}
    </div>
  );
}
