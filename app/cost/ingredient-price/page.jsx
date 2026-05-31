'use client';
import { useEffect, useState, useMemo, useCallback } from 'react';
import dynamic from 'next/dynamic';
import { Icon } from '@/components/icons';
import { PageHeader } from '@/components/ui/PageHeader';
import { showToast } from '@/components/Toast';
import { useVisibilityRefresh } from '@/hooks/useVisibilityRefresh';
import { initDB } from '@/lib/db';
import { formatNumber } from '@/lib/format';
import { getPriceFiles, getPriceRowsByFileId } from '@/lib/price';
import {
  getAllIngredients, getIngredientMetaMap, upsertIngredientMeta,
  bulkImportIngredients, resetAllIngredients,
  sortMainCategories,
} from '@/lib/ingredient';
import { MASTER_IMPORT_SEED } from '@/lib/ingredient/master-import-seed';
import { getAllPizzaRecipes } from '@/lib/cost/pizza-detail';
import { getAllPersonalRecipes } from '@/lib/cost/personal-detail';
import { getAllSideRecipes } from '@/lib/cost/side-detail';
import { getAllRecipes } from '@/lib/recipe';
import { MasterRow } from '@/components/cost/ingredient-price/MasterRow';
import { calcUnitPrice } from '@/lib/cost/calc-unit-price';
import { buildIngredientUsageMap, sumCompositePrice } from '@/lib/cost/ingredient-price-helpers';
import { IngredientPriceSkeleton } from '@/components/ui/Skeleton';

const RegisterModal = dynamic(
  () => import('@/components/cost/ingredient-price/RegisterModal').then(m => m.RegisterModal),
  { ssr: false, loading: () => null }
);
const BulkPriceModal = dynamic(
  () => import('@/components/cost/ingredient-price/BulkPriceModal').then(m => m.BulkPriceModal),
  { ssr: false, loading: () => null }
);
const SyncBaseQtyModal = dynamic(
  () => import('@/components/cost/ingredient-price/SyncBaseQtyModal').then(m => m.SyncBaseQtyModal),
  { ssr: false, loading: () => null }
);
const UsageView = dynamic(
  () => import('@/components/cost/ingredient-price/UsageView').then(m => m.UsageView),
  { ssr: false, loading: () => <div className="skeleton" style={{ height: 200 }} /> }
);

export default function Page() {
  const [rows,       setRows]       = useState([]);
  const [fileInfo,   setFileInfo]   = useState(null);
  const [loading,    setLoading]    = useState(true);
  const [dbError,    setDbError]    = useState(null);
  const [search,     setSearch]     = useState('');
  const [taxFilter,  setTaxFilter]  = useState('all');
  const [deltaFilter,setDeltaFilter]= useState('all'); // all | up | down | new | same
  const [regTarget,  setRegTarget]  = useState(null);  // 마스터 등록 모달 대상 행
  const [bulkOpen,   setBulkOpen]   = useState(false); // 일괄 가격 업로드 모달
  const [syncQtyOpen,setSyncQtyOpen]= useState(false); // 제때 수량 동기화 모달
  const [importing,  setImporting]  = useState(false);
  const [resetting,  setResetting]  = useState(false);
  const [viewTab,    setViewTab]    = useState('price'); // 'price' | 'usage'
  const [usageMap,   setUsageMap]   = useState({ byCode: new Map(), byName: new Map() });
  const [usageCat,   setUsageCat]   = useState('전체');
  const [usageSort,  setUsageSort]  = useState('count_desc'); // count_desc|count_asc|name_asc

  const load = useCallback(async () => {
    await initDB();
    const files  = await getPriceFiles();
    const latest = files[0] || null;
    const prev   = files[1] || null;

    const [allMeta, metaMap] = await Promise.all([
      getAllIngredients(),
      getIngredientMetaMap(),
    ]);

    // 마스터가 비어있으면 빈 목록 (usageMap 빌드는 계속 진행)
    if (!allMeta.length) { setRows([]); }

    let prevPriceMap = new Map();
    let priceRows = [];
    let priceCodeSet = new Set();

    if (latest) {
      setFileInfo({ name: latest.fileName || latest.name || '', date: latest.updateDate || latest.date || '' });
      const [latestRows, prevRows] = await Promise.all([
        getPriceRowsByFileId(latest.id),
        prev ? getPriceRowsByFileId(prev.id) : Promise.resolve([]),
      ]);
      priceRows = latestRows;
      priceCodeSet = new Set(priceRows.map(r => r.productCode).filter(Boolean));
      if (prev) {
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
        const unitPrice = calcUnitPrice(pr?.priceWithTax, baseQty);
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
        const compositePrice = sumCompositePrice(m.compositeOf, priceRowMap);

        const effectivePrice = compositePrice ?? m.priceOverride ?? null;
        const unitPrice = calcUnitPrice(effectivePrice, baseQty);

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

    // ── 제품별 사용현황 빌드 (오류 시 토스트만 — 단가 탭은 유지) ──────
    try {
      const [pizzaRecs, personalRecs, sideRecs, oldRecs] = await Promise.all([
        getAllPizzaRecipes(),
        getAllPersonalRecipes(),
        getAllSideRecipes(),
        getAllRecipes(),
      ]);
      setUsageMap(buildIngredientUsageMap({ allMeta, pizzaRecs, personalRecs, sideRecs, oldRecs }));
    } catch (usageErr) {
      console.warn('[ingredient-price] 사용현황 빌드 실패:', usageErr);
      showToast('사용현황 데이터를 불러오지 못했습니다', 'err');
    }
  }, []);

  useEffect(() => {
    load().catch(err => { console.error(err); setDbError(err.message || '데이터 로드 실패'); }).finally(() => setLoading(false));
  }, [load]);
  useVisibilityRefresh(load);

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
            <button className="btn" onClick={() => setBulkOpen(true)} disabled={importing || resetting}>
              <Icon.upload style={{width:14, height:14}}/>
              일괄 가격 업로드
            </button>
            <button className="btn" onClick={() => setSyncQtyOpen(true)} disabled={importing || resetting}>
              <Icon.arrowDown style={{width:14, height:14}}/>
              제때 수량 동기화
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

      {loading && <IngredientPriceSkeleton />}

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

      {!loading && rows.length > 0 && (
        <>
          {/* 탭 전환 */}
          <div style={{ display:'flex', gap:0, border:'1px solid var(--border)', borderRadius:8, overflow:'hidden', width:'fit-content', marginBottom:12 }}>
            {[{ key:'price', label:'단가 목록' }, { key:'usage', label:'제품별 사용현황' }].map(({ key, label }) => (
              <button key={key} onClick={() => setViewTab(key)}
                style={{
                  padding:'7px 20px', fontSize:13, fontWeight:700, border:'none', cursor:'pointer',
                  background: viewTab === key ? 'var(--accent)' : 'var(--surface-2)',
                  color: viewTab === key ? '#fff' : 'var(--text-2)',
                }}>
                {label}
              </button>
            ))}
          </div>
        </>
      )}

      {!loading && rows.length > 0 && viewTab === 'usage' && (
        <UsageView
          rows={rows}
          usageMap={usageMap}
          usageCat={usageCat}
          setUsageCat={setUsageCat}
          usageSort={usageSort}
          setUsageSort={setUsageSort}
        />
      )}

      {!loading && rows.length > 0 && viewTab === 'price' && (
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
          <div className="card table-card content-enter">
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

      {/* 일괄 가격 업로드 모달 */}
      {bulkOpen && (
        <BulkPriceModal
          existingIngredients={rows.map(r => r.meta).filter(Boolean)}
          onDone={async (count) => {
            showToast(`${count}개 단가 업데이트 완료`);
            setBulkOpen(false);
            await load();
          }}
          onClose={() => setBulkOpen(false)}
        />
      )}

      {/* 제때 수량 동기화 모달 */}
      {syncQtyOpen && (
        <SyncBaseQtyModal
          onDone={async (count) => {
            showToast(`${count}개 기준수량 동기화 완료`);
            setSyncQtyOpen(false);
            await load();
          }}
          onClose={() => setSyncQtyOpen(false)}
        />
      )}
    </main>
  );
}
