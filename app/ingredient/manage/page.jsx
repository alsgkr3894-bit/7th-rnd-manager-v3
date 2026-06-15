'use client';
import { useEffect, useState, useCallback } from 'react';
import { useDebounce } from '@/hooks/useDebounce';
import { Icon } from '@/components/icons';
import { restoreRecord } from '@/lib/db';
import { PageHeader } from '@/components/ui/PageHeader';
import { showToast } from '@/components/Toast';
import { ConfirmDialog } from '@/components/ui/ConfirmDialog';
import { getManagedProducts, addManagedProduct, updateManagedProduct } from '@/lib/shipment';
import { TYPE_LABEL } from '@/components/jette/managed-products-constants';
import {
  addIngredient,
  updateIngredient,
  upsertIngredientMeta,
  excludeIngredientByCode,
  restoreIngredientByCode,
  deleteIngredient,
  seedMasterIngredients,
  INGREDIENT_MASTER_SEED,
  resetAllIngredients,
  repairIngredientProductCodeDuplicates,
  removeCategoryFromAll,
  removeTagFromAll,
  bulkDeleteIngredients,
} from '@/lib/ingredient';
import { KEYS } from '@/lib/note/keys';
import { useIsMainBrand } from '@/hooks/useIsMainBrand';
import { useBatchSelection } from '@/hooks/useBatchSelection';
import { useLocalStorage } from '@/hooks/useLocalStorage';
import { IngredientForm } from './IngredientForm';
import { IssuesView } from '@/components/ingredient/IssuesView';
import { IngredientBatchToolbar } from '@/components/ingredient/BatchToolbar';
import { TabButton } from '@/components/cost/shared/TabButton';
import { IngredientManagePanel } from './IngredientManagePanel';
import { IngredientSettingsPanel } from './IngredientSettingsPanel';
import { IngredientDiagnostics } from './IngredientDiagnostics';
import { useIngredientManageData } from './useIngredientManageData';
import { useIngredientManageView } from './useIngredientManageView';
import { useCurrentRole } from '@/hooks/useCurrentRole';
import dynamic from 'next/dynamic';

const SuppliersView = dynamic(
  () => import('@/components/cost/ingredient-price/SuppliersView').then(m => m.SuppliersView),
  { ssr: false, loading: () => <div className="skeleton" style={{ height: 200 }} /> }
);

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

async function restoreDeletedIngredientBackup(backup) {
  if (!backup?.ingredient) return;
  await restoreRecord('cost_ingredients', backup.ingredient);
  if (backup.nutritionSnapshot) {
    await restoreRecord('nutrition_ingredient_values', backup.nutritionSnapshot);
  }
}

async function restoreDeletedIngredientBackups(backups) {
  const failures = [];
  for (const backup of backups) {
    try {
      await restoreDeletedIngredientBackup(backup);
    } catch (err) {
      failures.push(err);
    }
  }
  if (failures.length > 0) {
    throw new Error(`${failures.length}개 항목 복구 실패`);
  }
}

function warnIngredientCascadeFailures(records) {
  const count = records.reduce((sum, rec) => sum + (rec?.cascadeErrors?.length || 0), 0);
  if (count > 0) {
    showToast(`삭제는 완료됐지만 연관 데이터 정리 ${count}건을 확인해야 합니다.`, 'warn', 7000);
  }
}

function buildBulkDeleteToast(removed, failures) {
  if (failures.length === 0) return { message: `${removed.length}개 삭제됨`, type: 'ok' };
  if (removed.length === 0) return { message: `${failures.length}개 삭제 실패`, type: 'error' };
  return {
    message: `${removed.length}개 삭제됨 · ${failures.length}개 실패`,
    type: 'warn',
  };
}

export default function Page() {
  const isMain = useIsMainBrand(); // 마스터 시드는 7번가 전용
  const { isViewer } = useCurrentRole();
  const {
    rows,
    setRows,
    prevPriceMap,
    priceDate,
    loading,
    load,
    brokenRefs,
    productCodeDupes,
    newJetteRows,
    jetteRemovedRows,
  } = useIngredientManageData();
  const [search, setSearch] = useState('');
  const debouncedSearch = useDebounce(search, 200);
  const [catFilter, setCatFilter] = useLocalStorage(KEYS.INGREDIENT_CAT_FILTER, 'all', value =>
    typeof value === 'string' && value ? value : 'all'
  );
  const [tagFilter, setTagFilter] = useState('all');
  const [view, setView] = useState('manage'); // 'manage' | 'issues' | 'settings' | 'suppliers'
  const [formTarget, setFormTarget] = useState(null);
  const [deletePending, setDeletePending] = useState(null);
  const [seeding, setSeeding] = useState(false);
  const [resetConfirm, setResetConfirm] = useState(false);
  const [resetting, setResetting] = useState(false);
  const [confirmRemove, setConfirmRemove] = useState(null); // { type:'cat'|'tag', value }
  const [dedupeConfirm, setDedupeConfirm] = useState(false);
  const [dedupeBusy, setDedupeBusy] = useState(false);
  const { batchMode, selected, clearSelection, startBatch, exitBatch, toggleSelect } =
    useBatchSelection();
  const {
    activeCount,
    managedCount,
    discontinuedCount,
    categoryCounts,
    mainCats,
    tagCounts,
    hashTags,
    originSuggestions,
    uncategorized,
    issueRows,
    duplicateDiagnostics,
    duplicateGroupCount,
    filtered,
    sub,
  } = useIngredientManageView({
    rows,
    prevPriceMap,
    catFilter,
    tagFilter,
    debouncedSearch,
    loading,
    priceDate,
  });

  // 검색어 변경 시에도 선택 초기화
  useEffect(() => {
    clearSelection();
  }, [debouncedSearch, clearSelection]);

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

  async function handleRepairProductCodeDuplicates() {
    if (dedupeBusy) return;
    setDedupeBusy(true);
    try {
      const result = await repairIngredientProductCodeDuplicates();
      showToast(`제품코드 중복 ${result.removed || 0}건 정리 완료`, 'ok');
      setDedupeConfirm(false);
      await load();
    } catch (err) {
      showToast('중복 정리 실패: ' + err.message, 'err');
    } finally {
      setDedupeBusy(false);
    }
  }

  const handleSave = useCallback(
    async formData => {
      try {
        if (formTarget === 'new' || formTarget?.__copyFrom) {
          await addIngredient(formData);
          showToast('식자재 추가 완료', 'ok');
        } else if (formTarget.isManual && formTarget.id) {
          // 수동 항목은 productCode(자체코드) 유무와 무관하게 전체 필드 저장(buildRecord)
          // — 단가·분류 등이 누락 없이 반영되도록 updateIngredient 경로 사용
          await updateIngredient(formTarget.id, formData);
          showToast('저장 완료', 'ok');
        } else {
          if (!formTarget.productCode)
            throw new Error('제때 연동 항목에 productCode가 없습니다. 데이터를 확인해 주세요.');
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

  const handleExclude = useCallback(
    async row => {
      try {
        if (row.isManual && row.id && !row.productCode) {
          // deleteIngredient가 { ingredient, nutritionSnapshot } 반환 → 모두 복원
          const backup = await deleteIngredient(row.id);
          warnIngredientCascadeFailures([backup]);
          setRows(prev => prev.filter(r => !(r.isManual && r.id === row.id)));
          showToast(`"${row.ingredientName || row.displayName || '식자재'}" 삭제됨`, 'ok', 5000, {
            label: '실행취소',
            onClick: async () => {
              try {
                await restoreDeletedIngredientBackup(backup);
                await load();
                showToast('삭제를 되돌렸습니다', 'ok');
              } catch (err) {
                console.error('[IngredientManage] undo delete failed', err);
                showToast('실행취소 실패: ' + err.message, 'error');
              }
            },
          });
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
    },
    [load, setRows]
  );

  const handleRestore = useCallback(
    async productCode => {
      try {
        await restoreIngredientByCode(productCode);
        setRows(prev =>
          prev.map(r => (r.productCode === productCode ? { ...r, excluded: false } : r))
        );
        showToast('복원됐습니다', 'ok');
      } catch (err) {
        showToast('실패: ' + err.message, 'err');
      }
    },
    [setRows]
  );

  // 필터 변경 시 선택 Set 초기화 — 필터로 숨겨진 항목이 선택된 채로 일괄삭제되는 것 방지
  const handleSetCatFilter = useCallback(
    val => {
      setCatFilter(val);
      clearSelection();
    },
    [clearSelection, setCatFilter]
  );
  const handleSetTagFilter = useCallback(
    val => {
      setTagFilter(val);
      clearSelection();
    },
    [clearSelection, setTagFilter]
  );
  const handleDeleteCancel = useCallback(() => setDeletePending(null), []);

  // 제때 신규 미등록 항목 → 식자재관리 자동 등록
  const handleAutoRegister = useCallback(
    async row => {
      try {
        await addIngredient({
          ingredientName: row.displayName || row.productName || '',
          productCode: row.productCode || '',
          category: '',
          tags: [],
          isManual: true,
        });
        showToast(`${row.displayName || row.productName} 등록됨`, 'ok');
        await load();
      } catch (err) {
        showToast('등록 실패: ' + err.message, 'err');
      }
    },
    [load]
  );

  const handleBatchDelete = useCallback(async () => {
    if (selected.size === 0) return;
    const ids = Array.from(selected);
    try {
      const { removed, failures } = await bulkDeleteIngredients(ids);
      warnIngredientCascadeFailures(removed);
      if (removed.length > 0) {
        const removedIds = new Set(removed.map(rec => rec.ingredient?.id).filter(Boolean));
        setRows(prev => prev.filter(r => !removedIds.has(r.id)));
        exitBatch();
      }
      const toast = buildBulkDeleteToast(removed, failures);
      const undoAction =
        removed.length > 0
          ? {
              label: '실행취소',
              onClick: async () => {
                try {
                  await restoreDeletedIngredientBackups(removed);
                  await load();
                  showToast(`${removed.length}개 복구했습니다`, 'ok');
                } catch (err) {
                  console.error('[IngredientManage] undo batch delete failed', err);
                  showToast('실행취소 실패: ' + err.message, 'error');
                }
              },
            }
          : null;
      showToast(toast.message, toast.type, 5000, undoAction);
    } catch (err) {
      showToast('삭제 실패: ' + err.message, 'error');
    }
  }, [selected, load, exitBatch, setRows]);

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
                onExit={exitBatch}
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
                      style={{
                        background: 'var(--negative)',
                        color: 'var(--surface)',
                        border: 'none',
                      }}
                      onClick={handleReset}
                      disabled={resetting || isViewer}
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
                    disabled={rows.length === 0 || isViewer}
                  >
                    <Icon.trash style={{ width: 14, height: 14 }} /> 데이터 초기화
                  </button>
                )}
                <button
                  className="btn"
                  onClick={startBatch}
                  disabled={rows.length === 0 || isViewer}
                >
                  선택
                </button>
                {isMain && (
                  <button className="btn" onClick={handleSeed} disabled={seeding || isViewer}>
                    <Icon.download style={{ width: 14, height: 14 }} />
                    {seeding ? '시드 중…' : `마스터 시드 (${INGREDIENT_MASTER_SEED.length})`}
                  </button>
                )}
                <button
                  className="btn primary"
                  onClick={() => setFormTarget('new')}
                  disabled={isViewer}
                >
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
            관리 {activeCount}
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
          <TabButton active={view === 'suppliers'} onClick={() => setView('suppliers')}>
            공급업체
          </TabButton>
        </div>
      )}

      {!loading && rows.length === 0 && (
        <div className="card" style={{ minHeight: 180, display: 'grid', placeItems: 'center' }}>
          <div style={{ textAlign: 'center', color: 'var(--text-3)' }}>
            <Icon.box style={{ width: 32, height: 32, marginBottom: 12, opacity: 0.4 }} />
            <div style={{ fontWeight: 600, marginBottom: 4 }}>아직 데이터가 없습니다</div>
            <div style={{ fontSize: 13 }}>
              {isMain ? (
                <>
                  상단의 <b>마스터 시드</b> 버튼으로 80개 마스터 품목을 일괄 등록하거나, 제때 가격
                  파일을 업로드해주세요.
                </>
              ) : (
                <>
                  <b>식자재 추가</b> 버튼으로 직접 등록하거나, 제때 가격 파일을 업로드해주세요.
                </>
              )}
            </div>
          </div>
        </div>
      )}

      <IngredientDiagnostics
        brokenRefs={brokenRefs}
        productCodeDupes={productCodeDupes}
        duplicateGroupCount={duplicateGroupCount}
        duplicateDiagnostics={duplicateDiagnostics}
        dedupeConfirm={dedupeConfirm}
        dedupeBusy={dedupeBusy}
        onDedupeConfirm={() => setDedupeConfirm(true)}
        onDedupeCancel={() => setDedupeConfirm(false)}
        onRepairProductCodeDuplicates={handleRepairProductCodeDuplicates}
      />

      {/* ── 관리 뷰 ── */}
      {rows.length > 0 && view === 'manage' && (
        <IngredientManagePanel
          rows={rows}
          filtered={filtered}
          activeCount={activeCount}
          managedCount={managedCount}
          mainCats={mainCats}
          categoryCounts={categoryCounts}
          hashTags={hashTags}
          tagCounts={tagCounts}
          uncategorized={uncategorized}
          discontinuedCount={discontinuedCount}
          catFilter={catFilter}
          tagFilter={tagFilter}
          search={search}
          onSearch={setSearch}
          onCatFilter={handleSetCatFilter}
          onTagFilter={handleSetTagFilter}
          batchMode={batchMode}
          selected={selected}
          toggleSelect={toggleSelect}
          deletePending={deletePending}
          onEdit={setFormTarget}
          onCopy={row => setFormTarget({ __copyFrom: row })}
          onDeleteStart={setDeletePending}
          onDeleteCancel={handleDeleteCancel}
          onDeleteConfirm={handleExclude}
          onRestore={handleRestore}
        />
      )}

      {/* ── 이슈 뷰 ── */}
      {view === 'issues' && (
        <>
          {newJetteRows.length > 0 && (
            <div className="card" style={{ marginBottom: 12 }}>
              <div className="card-header">
                <div>
                  <div className="card-title" style={{ color: 'var(--accent)' }}>
                    제때 신규 미등록 ({newJetteRows.length}개)
                  </div>
                  <div className="card-sub">최신 제때 파일에 있지만 식자재관리에 없는 항목</div>
                </div>
              </div>
              <table className="data-table">
                <thead>
                  <tr>
                    <th>제품명</th>
                    <th style={{ width: 110 }}>제품코드</th>
                    <th style={{ width: 90 }} />
                  </tr>
                </thead>
                <tbody>
                  {newJetteRows.map(row => (
                    <tr key={row.productCode}>
                      <td style={{ fontWeight: 500 }}>{row.displayName || row.productName}</td>
                      <td className="mono muted" style={{ fontSize: 12 }}>
                        {row.productCode || '—'}
                      </td>
                      <td>
                        <button
                          className="btn sm"
                          onClick={() => handleAutoRegister(row)}
                          disabled={isViewer}
                        >
                          자동 등록
                        </button>
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          )}

          {jetteRemovedRows.length > 0 && (
            <div className="card" style={{ marginBottom: 12 }}>
              <div className="card-header">
                <div>
                  <div className="card-title" style={{ color: 'var(--warn)' }}>
                    제때 제거 후보 ({jetteRemovedRows.length}개)
                  </div>
                  <div className="card-sub">이전 파일에 있었으나 최신 파일에서 사라진 항목</div>
                </div>
              </div>
              <table className="data-table">
                <thead>
                  <tr>
                    <th>식자재명</th>
                    <th style={{ width: 110 }}>제품코드</th>
                    <th style={{ width: 100 }} />
                  </tr>
                </thead>
                <tbody>
                  {jetteRemovedRows.map(row => (
                    <tr key={row.productCode || row.id}>
                      <td style={{ fontWeight: 500 }}>
                        {row.ingredientName || row.displayName || '—'}
                      </td>
                      <td className="mono muted" style={{ fontSize: 12 }}>
                        {row.productCode || '—'}
                      </td>
                      <td>
                        <button
                          className="btn sm"
                          style={{ color: 'var(--negative)' }}
                          onClick={() => row.productCode && handleExclude(row)}
                          disabled={isViewer}
                        >
                          단종 처리
                        </button>
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          )}

          {rows.length > 0 && <IssuesView issueRows={issueRows} onEdit={setFormTarget} />}
        </>
      )}

      {/* ── 분류·태그 관리 뷰 ── */}
      {rows.length > 0 && view === 'settings' && (
        <IngredientSettingsPanel
          mainCats={mainCats}
          categoryCounts={categoryCounts}
          hashTags={hashTags}
          tagCounts={tagCounts}
          onRemoveRequest={setConfirmRemove}
        />
      )}

      {/* ── 공급업체 뷰 ── */}
      {view === 'suppliers' && <SuppliersView />}

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
          initial={formTarget === 'new' || formTarget?.__copyFrom ? null : formTarget}
          copyFrom={formTarget?.__copyFrom || null}
          onSave={handleSave}
          onClose={() => setFormTarget(null)}
          extraCategories={mainCats}
          originSuggestions={originSuggestions}
          existingProductCodes={rows.filter(r => r.productCode).map(r => r.productCode)}
        />
      )}
    </main>
  );
}
