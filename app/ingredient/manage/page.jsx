'use client';
import { useEffect, useState, useMemo, useCallback } from 'react';
import { useDebounce } from '@/hooks/useDebounce';
import { useVisibilityRefresh } from '@/hooks/useVisibilityRefresh';
import { Icon } from '@/components/icons';
import { restoreRecord } from '@/lib/db';
import { PageHeader, FilterBar } from '@/components/ui/PageHeader';
import { showToast } from '@/components/Toast';
import { ConfirmDialog } from '@/components/ui/ConfirmDialog';
import { initDB } from '@/lib/db';
import { getPriceFiles, getPriceRowsByFileId } from '@/lib/price';
import {
  getManagedProducts,
  addManagedProduct,
  updateManagedProduct,
  seedManagedProductsIfEmpty,
} from '@/lib/shipment';
import { TYPE_LABEL } from '@/components/jette/managed-products-constants';
import {
  getAllIngredients,
  getIngredientMetaMap,
  mergeIngredientRows,
  addIngredient,
  updateIngredient,
  upsertIngredientMeta,
  excludeIngredientByCode,
  restoreIngredientByCode,
  deleteIngredient,
  getCategoryStyle,
  sortMainCategories,
  sortHashTags,
  seedMasterIngredients,
  INGREDIENT_MASTER_SEED,
  resetAllIngredients,
  removeCategoryFromAll,
  removeTagFromAll,
  buildMetaOnlyRow,
  computeIngredientIssues,
} from '@/lib/ingredient';
import { KEYS } from '@/lib/note/keys';
import { DISCONTINUED_FILTER, UNCATEGORIZED_FILTER } from '@/lib/ingredient/constants';
import { migrateNutritionToIngredients } from '@/lib/nutrition/migrate-to-ingredient';
import { IngredientForm } from './IngredientForm';
import { ManageRow } from '@/components/ingredient/ManageRow';
import { IssuesView } from '@/components/ingredient/IssuesView';
import { IngredientBatchToolbar } from '@/components/ingredient/BatchToolbar';
import { bulkDeleteIngredients } from '@/lib/ingredient';
import { TabButton } from '@/components/cost/shared/TabButton';

// scope 라벨('전용'/'범용'/'범용관리') → productType 코드
const scopeToType = label =>
  Object.keys(TYPE_LABEL).find(code => TYPE_LABEL[code] === label) || null;

// 제때 연동 항목의 전용/범용을 제때 관리품목(ref_shipment_products.productType)에 반영
async function syncManagedScope(target, scopeLabel) {
  const productType = scopeToType(scopeLabel);
  if (!target.productCode || !productType) return;
  const managed = await getManagedProducts();
  const existing = managed.find(p => p.productCode === target.productCode);
  if (existing) {
    if (existing.productType !== productType)
      await updateManagedProduct({ id: existing.id, productType });
  } else {
    await addManagedProduct({
      productCode: target.productCode,
      productName: target.productName || target.ingredientName || '',
      productType,
    });
  }
}

export default function Page() {
  const [rows, setRows] = useState([]);
  const [prevPriceMap, setPrevPriceMap] = useState(null);
  const [priceDate, setPriceDate] = useState(null);
  const [loading, setLoading] = useState(true);
  const [search, setSearch] = useState('');
  const debouncedSearch = useDebounce(search, 200);
  const [catFilter, setCatFilter] = useState(() => {
    try {
      return localStorage.getItem(KEYS.INGREDIENT_CAT_FILTER) || 'all';
    } catch {
      return 'all';
    }
  });
  const [tagFilter, setTagFilter] = useState('all');
  const [view, setView] = useState('manage'); // 'manage' | 'issues'
  const [formTarget, setFormTarget] = useState(null);
  const [deletePending, setDeletePending] = useState(null);
  const [seeding, setSeeding] = useState(false);
  const [resetConfirm, setResetConfirm] = useState(false);
  const [resetting, setResetting] = useState(false);
  const [confirmRemove, setConfirmRemove] = useState(null); // { type:'cat'|'tag', value }
  const [brokenRefs, setBrokenRefs] = useState([]);
  const [batchMode, setBatchMode] = useState(false);
  const [selected, setSelected] = useState(new Set());

  const load = useCallback(async () => {
    await initDB();
    // 기존 수동 원산지/알레르기 데이터를 식자재로 일회성 이전 (idempotent)
    await migrateNutritionToIngredients().catch(e =>
      console.warn('[ingredient/manage] 마이그레이션 실패', e)
    );
    const files = await getPriceFiles();
    const latest = files[0] || null;
    const prev = files[1] ?? null;
    setPriceDate(latest?.updateDate || null);

    const [allMeta, metaMap, managed] = await Promise.all([
      getAllIngredients(),
      getIngredientMetaMap(),
      seedManagedProductsIfEmpty().then(() => getManagedProducts()),
    ]);
    // 전용/범용 단일 출처 = 제때 관리품목(productType)
    const typeMap = new Map(
      managed.filter(p => p.productCode).map(p => [p.productCode, p.productType])
    );

    if (!latest) {
      setPrevPriceMap(null);
      const metaRows = allMeta.filter(m => m.isManual || m.isSeeded).map(buildMetaOnlyRow);
      setRows(metaRows);
      const codeSetMeta = new Set(allMeta.filter(m => m.productCode).map(m => m.productCode));
      setBrokenRefs(allMeta.filter(m =>
        Array.isArray(m.compositeOf) && m.compositeOf.length > 0 &&
        m.compositeOf.some(c => c && !codeSetMeta.has(c))
      ));
      return;
    }

    const priceRows = await getPriceRowsByFileId(latest.id);
    const merged = mergeIngredientRows(priceRows, metaMap, typeMap).filter(r => r.hasRecord);
    const priceCodeSet = new Set(priceRows.map(r => r.productCode).filter(Boolean));

    const orphanMetaRows = allMeta
      .filter(
        m => (m.isManual || m.isSeeded) && (!m.productCode || !priceCodeSet.has(m.productCode))
      )
      .map(buildMetaOnlyRow);

    // 이전 가격파일 — 단가 변동 이슈 감지용
    if (prev) {
      const prevRows = await getPriceRowsByFileId(prev.id);
      setPrevPriceMap(new Map(prevRows.map(r => [r.productCode, r.priceWithTax])));
    } else {
      setPrevPriceMap(null);
    }

    const allRows = [...merged, ...orphanMetaRows];
    setRows(allRows);

    // compositeOf 참조 무결성 검사
    const codeSet = new Set(allMeta.filter(m => m.productCode).map(m => m.productCode));
    const broken = allMeta.filter(m =>
      Array.isArray(m.compositeOf) && m.compositeOf.length > 0 &&
      m.compositeOf.some(c => c && !codeSet.has(c))
    );
    setBrokenRefs(broken);
  }, []);

  useEffect(() => {
    load()
      .catch(console.error)
      .finally(() => setLoading(false));
  }, [load]);
  useVisibilityRefresh(load);

  useEffect(() => {
    try {
      localStorage.setItem(KEYS.INGREDIENT_CAT_FILTER, catFilter);
    } catch {}
  }, [catFilter]);

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

  async function handleReset() {
    if (resetting) return;
    setResetting(true);
    try {
      const result = await resetAllIngredients();
      showToast(`초기화 완료 — ${result.deleted}개 삭제`, 'ok');
      setResetConfirm(false);
      await load();
    } catch (err) {
      showToast('초기화 실패: ' + err.message, 'err');
    } finally {
      setResetting(false);
    }
  }

  async function handleRemoveCategory(cat) {
    try {
      const { updated } = await removeCategoryFromAll(cat);
      showToast(`'${cat}' 분류 삭제 — ${updated}개 항목 갱신`, 'ok');
      await load();
    } catch (e) {
      showToast('삭제 실패: ' + e.message, 'err');
    }
  }
  async function handleRemoveTag(tag) {
    try {
      const { updated } = await removeTagFromAll(tag);
      showToast(`'#${tag}' 태그 삭제 — ${updated}개 항목 갱신`, 'ok');
      await load();
    } catch (e) {
      showToast('삭제 실패: ' + e.message, 'err');
    }
  }

  const handleSave = useCallback(
    async formData => {
      try {
        if (formTarget === 'new') {
          await addIngredient(formData);
          showToast('식자재 추가 완료', 'ok');
        } else if (formTarget.isManual && formTarget.id) {
          // 수동 항목은 productCode(자체코드) 유무와 무관하게 전체 필드 저장(buildRecord)
          // — 단가·분류 등이 누락 없이 반영되도록 updateIngredient 경로 사용
          await updateIngredient(formTarget.id, formData);
          showToast('저장 완료', 'ok');
        } else {
          await upsertIngredientMeta({ productCode: formTarget.productCode, ...formData });
          // 제때 연동 항목의 전용/범용 단일 출처 = 제때 관리품목(productType)
          await syncManagedScope(formTarget, formData.scope);
          showToast('저장 완료', 'ok');
        }
        setFormTarget(null);
        await load();
      } catch (err) {
        showToast('저장 실패: ' + err.message, 'err');
        throw err;
      }
    },
    [formTarget, load]
  );

  const handleExclude = useCallback(async row => {
    try {
      if (row.isManual && row.id && !row.productCode) {
        // deleteIngredient가 삭제된 원본 cost_ingredients 레코드를 반환 → 그걸로 복원
        const backup = await deleteIngredient(row.id);
        setRows(prev => prev.filter(r => !(r.isManual && r.id === row.id)));
        showToast(
          `"${row.ingredientName || row.displayName || '식자재'}" 삭제됨`,
          'ok', 5000,
          {
            label: '실행취소',
            onClick: async () => {
              if (backup) await restoreRecord('cost_ingredients', backup).catch(() => {});
              await load();
            },
          }
        );
      } else {
        await excludeIngredientByCode(row.productCode);
        setRows(prev =>
          prev.map(r =>
            r.productCode === row.productCode ? { ...r, excluded: true, hasRecord: true } : r
          )
        );
        showToast('숨겼습니다', 'ok');
      }
      setDeletePending(null);
    } catch (err) {
      showToast('실패: ' + err.message, 'err');
    }
  }, [load]);

  const handleRestore = useCallback(async productCode => {
    try {
      await restoreIngredientByCode(productCode);
      setRows(prev =>
        prev.map(r => (r.productCode === productCode ? { ...r, excluded: false } : r))
      );
      showToast('복원됐습니다', 'ok');
    } catch (err) {
      showToast('실패: ' + err.message, 'err');
    }
  }, []);

  const handleSetCatFilter = useCallback(val => setCatFilter(val), []);
  const handleSetTagFilter = useCallback(val => setTagFilter(val), []);
  const handleDeleteCancel = useCallback(() => setDeletePending(null), []);

  const toggleSelect = useCallback(id => {
    setSelected(prev => {
      const next = new Set(prev);
      if (next.has(id)) next.delete(id); else next.add(id);
      return next;
    });
  }, []);

  const handleBatchDelete = useCallback(async () => {
    if (selected.size === 0) return;
    const ids = Array.from(selected);
    try {
      const removed = await bulkDeleteIngredients(ids);
      setRows(prev => prev.filter(r => !ids.includes(r.id)));
      setSelected(new Set());
      setBatchMode(false);
      showToast(`${removed.length}개 삭제됨`, 'ok', 5000, {
        label: '실행취소',
        onClick: async () => {
          for (const rec of removed) {
            await restoreRecord('cost_ingredients', rec).catch(() => {});
          }
          await load();
        },
      });
    } catch (err) {
      showToast('삭제 실패: ' + err.message, 'error');
    }
  }, [selected, load]);

  // ── 분류·태그 집합 ──
  const mainCats = useMemo(() => {
    const set = new Set();
    rows.forEach(r => {
      if (!r.discontinued && r.category) set.add(r.category);
    });
    return sortMainCategories(Array.from(set));
  }, [rows]);

  const hashTags = useMemo(() => {
    const set = new Set();
    rows.forEach(r => {
      if (r.discontinued) return;
      (r.tags || []).forEach(t => t && set.add(t));
    });
    return sortHashTags(Array.from(set));
  }, [rows]);

  const discontinuedCount = rows.filter(r => r.discontinued).length;

  // 원산지 자동완성 후보 — 기존 입력된 표시품목명·국가 수집
  const originSuggestions = useMemo(() => {
    const names = new Set(),
      countries = new Set();
    for (const r of rows) {
      const origin = r.origin;
      if (!origin) continue;
      const items = Array.isArray(origin) ? origin : [origin]; // 구버전 객체 방어
      for (const it of items) {
        if (it.displayName) names.add(it.displayName);
        if (it.country) countries.add(it.country);
      }
    }
    return { names: [...names], countries: [...countries] };
  }, [rows]);
  const uncategorized = rows.filter(r => !r.discontinued && !r.excluded && !r.category).length;

  // ── 이슈 행 추출 ──
  const issueRows = useMemo(
    () => computeIngredientIssues(rows, prevPriceMap),
    [rows, prevPriceMap]
  );

  // ── 필터링 ──
  const filtered = useMemo(() => {
    let list;
    if (catFilter === DISCONTINUED_FILTER) {
      list = rows.filter(r => r.discontinued);
    } else {
      list = rows.filter(r => !r.discontinued && !r.excluded);
      if (catFilter === UNCATEGORIZED_FILTER) {
        list = list.filter(r => !r.category);
      } else if (catFilter !== 'all') {
        list = list.filter(r => r.category === catFilter);
      }
      if (tagFilter !== 'all') list = list.filter(r => (r.tags || []).includes(tagFilter));
    }
    const q = debouncedSearch.trim().toLowerCase();
    if (q)
      list = list.filter(
        r =>
          (r.ingredientName || r.displayName || r.productName || '').toLowerCase().includes(q) ||
          (r.productCode || '').toLowerCase().includes(q) ||
          (r.category || '').toLowerCase().includes(q) ||
          (r.tags || []).some(t => t.toLowerCase().includes(q)) ||
          (r.manufacturer || '').toLowerCase().includes(q)
      );
    return list;
  }, [rows, catFilter, tagFilter, debouncedSearch]);

  const managedCount = rows.filter(r => r.hasRecord).length;

  const sub = loading
    ? '로딩 중…'
    : priceDate
      ? `제때 단가 기준 ${priceDate} · 전체 ${rows.length}개 · 관리 중 ${managedCount}개${discontinuedCount ? ` · 단종 ${discontinuedCount}개` : ''}`
      : rows.length > 0
        ? `제때 가격 파일 없음 · 메타 ${rows.length}개`
        : '제때 가격 파일이 없습니다 — 마스터 시드 적용 또는 가격파일 업로드 필요';

  return (
    <main className="main page-enter">
      <PageHeader
        breadcrumb={['식자재', '식자재 관리']}
        title="식자재 관리"
        sub={sub}
        actions={
          <>
            {batchMode ? (
              <IngredientBatchToolbar
                selected={selected}
                onDelete={handleBatchDelete}
                onExit={() => { setBatchMode(false); setSelected(new Set()); }}
              />
            ) : (
              <>
                {resetConfirm ? (
                  <span style={{ display: 'flex', gap: 6, alignItems: 'center' }}>
                    <span style={{ fontSize: 12, color: 'var(--negative)', fontWeight: 600 }}>
                      모든 식자재 데이터({rows.length}개)를 삭제할까요?
                    </span>
                    <button
                      className="btn"
                      style={{ background: 'var(--negative)', color: '#fff', border: 'none' }}
                      onClick={handleReset}
                      disabled={resetting}
                    >
                      {resetting ? '삭제 중…' : '삭제'}
                    </button>
                    <button className="btn" onClick={() => setResetConfirm(false)}>
                      취소
                    </button>
                  </span>
                ) : (
                  <button
                    className="btn"
                    onClick={() => setResetConfirm(true)}
                    style={{ color: 'var(--text-3)' }}
                    disabled={rows.length === 0}
                  >
                    <Icon.trash style={{ width: 14, height: 14 }} /> 데이터 초기화
                  </button>
                )}
                <button
                  className="btn"
                  onClick={() => { setBatchMode(true); setSelected(new Set()); }}
                  disabled={rows.length === 0}
                >
                  선택
                </button>
                <button className="btn" onClick={handleSeed} disabled={seeding}>
                  <Icon.download style={{ width: 14, height: 14 }} />
                  {seeding ? '시드 중…' : `마스터 시드 (${INGREDIENT_MASTER_SEED.length})`}
                </button>
                <button className="btn primary" onClick={() => setFormTarget('new')}>
                  <Icon.plus style={{ width: 14, height: 14 }} /> 식자재 추가
                </button>
              </>
            )}
          </>
        }
      />

      {/* 탭 */}
      {rows.length > 0 && (
        <div
          style={{
            display: 'flex',
            gap: 2,
            borderBottom: '1px solid var(--divider)',
            marginBottom: -12,
          }}
        >
          <TabButton active={view === 'manage'} onClick={() => setView('manage')}>
            관리 {rows.filter(r => !r.discontinued).length}
          </TabButton>
          <TabButton
            active={view === 'issues'}
            onClick={() => setView('issues')}
            badge={issueRows.length > 0 ? issueRows.length : null}
          >
            이슈
          </TabButton>
          <TabButton active={view === 'settings'} onClick={() => setView('settings')}>
            분류·태그
          </TabButton>
        </div>
      )}

      {!loading && rows.length === 0 && (
        <div className="card" style={{ minHeight: 180, display: 'grid', placeItems: 'center' }}>
          <div style={{ textAlign: 'center', color: 'var(--text-3)' }}>
            <Icon.box style={{ width: 32, height: 32, marginBottom: 12, opacity: 0.4 }} />
            <div style={{ fontWeight: 600, marginBottom: 4 }}>아직 데이터가 없습니다</div>
            <div style={{ fontSize: 13 }}>
              상단의 <b>마스터 시드</b> 버튼으로 80개 마스터 품목을 일괄 등록하거나, 제때 가격
              파일을 업로드해주세요.
            </div>
          </div>
        </div>
      )}

      {/* compositeOf 깨진 참조 경고 */}
      {brokenRefs.length > 0 && (
        <div className="info-banner" style={{ marginBottom: 8, background: 'var(--warn-soft)', borderColor: 'var(--warn-soft)' }}>
          <div className="info-banner-ico" style={{ background: 'var(--warn)', color: '#fff' }}>
            <Icon.alert style={{ width: 16, height: 16 }} />
          </div>
          <div style={{ fontSize: 13 }}>
            <b>복합 식자재 참조 오류 {brokenRefs.length}건</b> —{' '}
            {brokenRefs.slice(0, 3).map(r => r.ingredientName).join(', ')}
            {brokenRefs.length > 3 && ` 외 ${brokenRefs.length - 3}개`}가 존재하지 않는 코드를 compositeOf로 참조합니다.
          </div>
        </div>
      )}

      {/* ── 관리 뷰 ── */}
      {rows.length > 0 && view === 'manage' && (
        <>
          <div style={{ display: 'flex', flexDirection: 'column', gap: 6 }}>
            <div style={{ display: 'flex', gap: 6, flexWrap: 'wrap', alignItems: 'center' }}>
              <span
                style={{ fontSize: 12, color: 'var(--text-3)', marginRight: 4, fontWeight: 600 }}
              >
                분류
              </span>
              <button
                className={'chip' + (catFilter === 'all' ? ' active' : '')}
                onClick={() => handleSetCatFilter('all')}
              >
                전체 {rows.filter(r => !r.discontinued).length}
              </button>
              {mainCats.map(c => (
                <button
                  key={c}
                  className={'chip' + (catFilter === c ? ' active' : '')}
                  style={catFilter !== c ? getCategoryStyle(c) : undefined}
                  onClick={() => handleSetCatFilter(c)}
                >
                  {c} {rows.filter(r => !r.discontinued && r.category === c).length}
                </button>
              ))}
              {uncategorized > 0 && (
                <button
                  className={'chip' + (catFilter === UNCATEGORIZED_FILTER ? ' active' : '')}
                  style={catFilter !== UNCATEGORIZED_FILTER ? { color: 'var(--warn)' } : undefined}
                  onClick={() =>
                    handleSetCatFilter(
                      catFilter === UNCATEGORIZED_FILTER ? 'all' : UNCATEGORIZED_FILTER
                    )
                  }
                >
                  미분류 {uncategorized}
                </button>
              )}
              {discontinuedCount > 0 && (
                <button
                  className={'chip' + (catFilter === DISCONTINUED_FILTER ? ' active' : '')}
                  style={
                    catFilter !== DISCONTINUED_FILTER
                      ? { color: 'var(--text-3)', marginLeft: 'auto' }
                      : { marginLeft: 'auto' }
                  }
                  onClick={() =>
                    handleSetCatFilter(
                      catFilter === DISCONTINUED_FILTER ? 'all' : DISCONTINUED_FILTER
                    )
                  }
                >
                  단종 {discontinuedCount}
                </button>
              )}
            </div>
            {hashTags.length > 0 && (
              <div style={{ display: 'flex', gap: 6, flexWrap: 'wrap', alignItems: 'center' }}>
                <span
                  style={{ fontSize: 12, color: 'var(--text-3)', marginRight: 4, fontWeight: 600 }}
                >
                  #태그
                </span>
                <button
                  className={'chip' + (tagFilter === 'all' ? ' active' : '')}
                  onClick={() => handleSetTagFilter('all')}
                >
                  전체
                </button>
                {hashTags.map(t => {
                  const cnt = rows.filter(
                    r => !r.discontinued && (r.tags || []).includes(t)
                  ).length;
                  if (!cnt) return null;
                  return (
                    <button
                      key={t}
                      className={'chip' + (tagFilter === t ? ' active' : '')}
                      onClick={() => handleSetTagFilter(tagFilter === t ? 'all' : t)}
                    >
                      #{t} {cnt}
                    </button>
                  );
                })}
              </div>
            )}
            <FilterBar search={search} onSearch={setSearch} />
          </div>

          <div className="card table-card">
            {filtered.length === 0 ? (
              <div
                style={{
                  padding: '40px 0',
                  textAlign: 'center',
                  color: 'var(--text-3)',
                  fontSize: 13,
                }}
              >
                조건에 맞는 항목이 없습니다
              </div>
            ) : (
              <div style={{ overflowX: 'auto' }}>
                <table className="data-table stagger-rows">
                  <thead>
                    <tr>
                      {batchMode && <th style={{ width: 36 }} />}
                      <th style={{ width: 88 }}>제품코드</th>
                      <th>제품명</th>
                      <th style={{ width: 60 }}>온도</th>
                      <th style={{ width: 88 }}>포장단위</th>
                      <th style={{ width: 80 }}>전용/범용</th>
                      <th style={{ width: 108, textAlign: 'right' }}>부가세포함단가</th>
                      <th style={{ width: 96 }}>분류</th>
                      <th style={{ width: 140 }}>#태그</th>
                      <th style={{ width: 96 }}>제조사</th>
                      <th style={{ width: 76 }} />
                    </tr>
                  </thead>
                  <tbody>
                    {filtered.map((r, i) => {
                      // 인덱스 suffix — 제때 파일에 같은 productCode가 중복돼도 key 충돌 방지
                      const rowKey = `${r.productCode ?? r.id ?? 'm'}-${i}`;
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
                          onDeleteCancel={handleDeleteCancel}
                          onDeleteConfirm={() => handleExclude(r)}
                          onRestore={() => handleRestore(r.productCode)}
                          batchMode={batchMode}
                          isSelected={selected.has(r.id)}
                          onToggleSelect={toggleSelect}
                        />
                      );
                    })}
                  </tbody>
                </table>
              </div>
            )}
            <div
              style={{
                padding: '8px 16px',
                fontSize: 11,
                color: 'var(--text-3)',
                borderTop: '1px solid var(--divider)',
              }}
            >
              {filtered.length}개 표시 / 전체 {rows.length}개 · 관리 중 {managedCount}개
            </div>
          </div>
        </>
      )}

      {/* ── 이슈 뷰 ── */}
      {rows.length > 0 && view === 'issues' && (
        <IssuesView issueRows={issueRows} onEdit={setFormTarget} />
      )}

      {/* ── 분류·태그 관리 뷰 ── */}
      {rows.length > 0 && view === 'settings' && (
        <div
          className="card"
          style={{ padding: '18px 20px', display: 'flex', flexDirection: 'column', gap: 20 }}
        >
          <div>
            <div style={{ fontSize: 13, fontWeight: 700, marginBottom: 8 }}>
              분류 ({mainCats.length})
            </div>
            {mainCats.length === 0 ? (
              <div style={{ fontSize: 13, color: 'var(--text-3)' }}>등록된 분류가 없습니다</div>
            ) : (
              <div style={{ display: 'flex', flexWrap: 'wrap', gap: 8 }}>
                {mainCats.map(c => {
                  const cnt = rows.filter(r => !r.discontinued && r.category === c).length;
                  return (
                    <span
                      key={c}
                      style={{
                        display: 'inline-flex',
                        alignItems: 'center',
                        gap: 6,
                        padding: '4px 6px 4px 10px',
                        borderRadius: 8,
                        border: '1px solid var(--border)',
                        fontSize: 13,
                        fontWeight: 600,
                        ...getCategoryStyle(c),
                      }}
                    >
                      {c} <span style={{ fontSize: 11, opacity: 0.7 }}>{cnt}</span>
                      <button
                        onClick={() => setConfirmRemove({ type: 'cat', value: c })}
                        title="분류 삭제"
                        style={{
                          border: 0,
                          background: 'transparent',
                          cursor: 'pointer',
                          color: 'inherit',
                          opacity: 0.6,
                          display: 'inline-flex',
                          padding: 0,
                        }}
                      >
                        <Icon.close style={{ width: 12, height: 12 }} />
                      </button>
                    </span>
                  );
                })}
              </div>
            )}
          </div>
          <div>
            <div style={{ fontSize: 13, fontWeight: 700, marginBottom: 8 }}>
              #태그 ({hashTags.length})
            </div>
            {hashTags.length === 0 ? (
              <div style={{ fontSize: 13, color: 'var(--text-3)' }}>등록된 태그가 없습니다</div>
            ) : (
              <div style={{ display: 'flex', flexWrap: 'wrap', gap: 8 }}>
                {hashTags.map(t => {
                  const cnt = rows.filter(
                    r => !r.discontinued && (r.tags || []).includes(t)
                  ).length;
                  return (
                    <span
                      key={t}
                      style={{
                        display: 'inline-flex',
                        alignItems: 'center',
                        gap: 6,
                        padding: '4px 6px 4px 10px',
                        borderRadius: 8,
                        background: 'var(--surface-2)',
                        color: 'var(--text-2)',
                        fontSize: 13,
                        fontWeight: 500,
                      }}
                    >
                      #{t} <span style={{ fontSize: 11, opacity: 0.7 }}>{cnt}</span>
                      <button
                        onClick={() => setConfirmRemove({ type: 'tag', value: t })}
                        title="태그 삭제"
                        style={{
                          border: 0,
                          background: 'transparent',
                          cursor: 'pointer',
                          color: 'inherit',
                          opacity: 0.6,
                          display: 'inline-flex',
                          padding: 0,
                        }}
                      >
                        <Icon.close style={{ width: 12, height: 12 }} />
                      </button>
                    </span>
                  );
                })}
              </div>
            )}
          </div>
          <div style={{ fontSize: 11, color: 'var(--text-4)' }}>
            ※ 삭제 시 해당 분류/태그가 모든 식자재에서 제거됩니다(식자재 자체는 유지).
          </div>
        </div>
      )}

      {confirmRemove && (
        <ConfirmDialog
          open
          danger
          message={
            confirmRemove.type === 'cat'
              ? `'${confirmRemove.value}' 분류를 모든 식자재에서 제거할까요?`
              : `'#${confirmRemove.value}' 태그를 모든 식자재에서 제거할까요?`
          }
          confirmLabel="삭제"
          onConfirm={() => {
            const { type, value } = confirmRemove;
            setConfirmRemove(null);
            if (type === 'cat') handleRemoveCategory(value);
            else handleRemoveTag(value);
          }}
          onCancel={() => setConfirmRemove(null)}
        />
      )}

      {formTarget !== null && (
        <IngredientForm
          initial={formTarget === 'new' ? null : formTarget}
          onSave={handleSave}
          onClose={() => setFormTarget(null)}
          extraCategories={mainCats}
          originSuggestions={originSuggestions}
        />
      )}
    </main>
  );
}
