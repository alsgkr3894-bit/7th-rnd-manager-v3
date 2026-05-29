'use client';
import { useEffect, useState, useMemo, useCallback, useRef } from 'react';
import { createPortal } from 'react-dom';
import { Icon } from '@/components/icons';
import { PageHeader } from '@/components/ui/PageHeader';
import { showToast } from '@/components/Toast';
import { initDB } from '@/lib/db';
import { formatNumber } from '@/lib/format';
import { getPriceFiles, getPriceRowsByFileId } from '@/lib/price';
import { getAllIngredients } from '@/lib/ingredient';
import { buildUnitPriceMap, MENU_CATEGORIES } from '@/lib/recipe';
import { getAllRecipeGroups, saveRecipeGroup, deleteRecipeGroup } from '@/lib/cost/recipe-groups/store';
import {
  getAllEdges, upsertEdge, deleteEdge, seedEdges, resetAllEdges,
  edgeTotalCost,
} from '@/lib/cost/edge-dough';
import { EdgeCard } from '@/components/cost/edge-dough/EdgeCard';
import { EdgeEditModal } from '@/components/cost/edge-dough/EdgeEditModal';

// ── 탭 버튼 ───────────────────────────────────────────────────
function TabBar({ tab, setTab }) {
  const tabs = [
    { key: 'groups', label: '묶음 관리' },
    { key: 'edges',  label: '엣지 관리' },
  ];
  return (
    <div style={{ display: 'flex', gap: 0, borderBottom: '2px solid var(--divider)', marginBottom: 16 }}>
      {tabs.map(t => (
        <button key={t.key} onClick={() => setTab(t.key)}
          style={{
            padding: '10px 24px', fontSize: 13, fontWeight: 700, border: 'none', cursor: 'pointer',
            background: 'transparent', color: tab === t.key ? 'var(--accent-text)' : 'var(--text-3)',
            borderBottom: tab === t.key ? '2px solid var(--accent)' : '2px solid transparent',
            marginBottom: -2,
          }}>
          {t.label}
        </button>
      ))}
    </div>
  );
}

// ── 메인 페이지 ───────────────────────────────────────────────
export default function Page() {
  const [tab,          setTab]          = useState('groups');
  const [allMeta,      setAllMeta]      = useState([]);
  const [unitPriceMap, setUnitPriceMap] = useState(new Map());
  const [loading,      setLoading]      = useState(true);
  const [dbError,      setDbError]      = useState(null);

  // Groups state
  const [groups,     setGroups]     = useState([]);
  const [selectedId, setSelectedId] = useState(null);
  const [isNew,      setIsNew]      = useState(false);
  const [draft,      setDraft]      = useState(null);
  const [saving,     setSaving]     = useState(false);

  // Edges state
  const [edges,        setEdges]        = useState([]);
  const [edgeTarget,   setEdgeTarget]   = useState(null);
  const [deletePending,setDeletePending]= useState(null);
  const [seeding,      setSeeding]      = useState(false);
  const [resetConfirm, setResetConfirm] = useState(false);
  const [resetting,    setResetting]    = useState(false);

  const load = useCallback(async () => {
    await initDB();
    const [files, meta, gs, edgeList] = await Promise.all([
      getPriceFiles(), getAllIngredients(), getAllRecipeGroups(), getAllEdges(),
    ]);
    const latest = files[0] || null;
    let priceRowMap = new Map();
    if (latest) {
      const rows = await getPriceRowsByFileId(latest.id);
      rows.forEach(r => { if (r.productCode) priceRowMap.set(r.productCode, r); });
    }
    setAllMeta(meta);
    setUnitPriceMap(buildUnitPriceMap(meta, priceRowMap));
    setGroups(gs);
    setEdges(edgeList);
  }, []);

  useEffect(() => { load().catch(err => { console.error(err); setDbError(err.message || '데이터 로드 실패'); }).finally(() => setLoading(false)); }, [load]);

  // ── Groups handlers ─────────────────────────────────────────
  function handleSelectGroup(id) {
    setSelectedId(id);
    setIsNew(false);
    const g = groups.find(r => r.id === id);
    if (g) setDraft(groupToDraft(g));
  }
  function handleNewGroup() {
    setSelectedId(null);
    setIsNew(true);
    setDraft(emptyGroup());
  }
  async function handleSaveGroup() {
    if (!draft?.name?.trim()) { showToast('묶음 이름을 입력해주세요'); return; }
    setSaving(true);
    try {
      const savedId = await saveRecipeGroup({ ...draft, id: isNew ? undefined : selectedId });
      showToast(isNew ? '묶음 등록 완료' : '묶음 수정 완료');
      await load();
      setIsNew(false);
      setSelectedId(isNew ? savedId : selectedId);
    } catch (e) { showToast('저장 실패: ' + e.message); }
    finally { setSaving(false); }
  }
  async function handleDeleteGroup() {
    if (!selectedId) return;
    const name = groups.find(r => r.id === selectedId)?.name || '';
    if (!window.confirm(`"${name}" 묶음을 삭제할까요?`)) return;
    try {
      await deleteRecipeGroup(selectedId);
    } catch (e) { showToast('삭제 실패: ' + e.message); return; }
    showToast('삭제 완료');
    setSelectedId(null); setIsNew(false); setDraft(null);
    await load();
  }

  // ── Edges handlers ──────────────────────────────────────────
  async function handleSaveEdge(data) {
    try {
      await upsertEdge(data);
      showToast('저장 완료', 'ok');
      setEdgeTarget(null);
      setEdges(await getAllEdges());
    } catch (err) { showToast('저장 실패: ' + err.message, 'err'); throw err; }
  }
  async function handleDeleteEdge(id) {
    try {
      await deleteEdge(id);
      setEdges(prev => prev.filter(e => e.id !== id));
      setDeletePending(null);
      showToast('삭제 완료', 'ok');
    } catch (err) { showToast('삭제 실패: ' + err.message, 'err'); }
  }
  async function handleSeedEdges() {
    if (seeding) return;
    setSeeding(true);
    try {
      const result = await seedEdges();
      showToast(`시드 완료 — 신규 ${result.inserted}개`, 'ok');
      setEdges(await getAllEdges());
    } catch (err) { showToast('시드 실패: ' + err.message, 'err'); }
    finally { setSeeding(false); }
  }
  async function handleResetEdges() {
    if (resetting) return;
    setResetting(true);
    try {
      const result = await resetAllEdges();
      showToast(`초기화 완료 — ${result.deleted}개 삭제`, 'ok');
      setResetConfirm(false); setEdges([]);
    } catch (err) { showToast('초기화 실패: ' + err.message, 'err'); }
    finally { setResetting(false); }
  }

  const showGroupEditor = isNew || selectedId != null;
  const edgeFilled = edges.filter(e => e.components?.length > 0).length;

  if (dbError) return (
    <main className="main">
      <PageHeader breadcrumb={['원가계산', '공통 관리']} title="공통 관리" sub="로드 실패"/>
      <div className="card" style={{ padding: 32, textAlign: 'center', color: 'var(--negative)' }}>
        데이터베이스 오류: {dbError}
      </div>
    </main>
  );

  return (
    <main className="main">
      <PageHeader
        breadcrumb={['원가계산', '공통 관리']}
        title="공통 관리"
        sub="공통묶음(도우·박스 등 고정 재료)과 엣지 원가를 관리합니다"
      />

      <TabBar tab={tab} setTab={setTab} />

      {/* ── 묶음 관리 탭 ── */}
      {tab === 'groups' && (
        <div style={{ display: 'grid', gridTemplateColumns: '280px 1fr', gap: 16, alignItems: 'start' }}>
          <div className="card" style={{ padding: 0, overflow: 'hidden' }}>
            <div style={{ padding: '12px 14px 8px', borderBottom: '1px solid var(--divider)' }}>
              <button className="btn primary" style={{ width: '100%', justifyContent: 'center' }} onClick={handleNewGroup}>
                <Icon.plus style={{ width: 13, height: 13 }}/> 새 묶음 추가
              </button>
            </div>
            {loading ? (
              <div style={{ padding: 24, textAlign: 'center', color: 'var(--text-3)', fontSize: 13 }}>로딩 중…</div>
            ) : groups.length === 0 ? (
              <div style={{ padding: 24, textAlign: 'center', color: 'var(--text-3)', fontSize: 13 }}>등록된 묶음이 없습니다</div>
            ) : (
              <div style={{ maxHeight: 'calc(100vh - 280px)', overflowY: 'auto' }}>
                {groups.map(g => {
                  const active = g.id === selectedId;
                  return (
                    <button key={g.id} onClick={() => handleSelectGroup(g.id)}
                      style={{ display: 'block', width: '100%', textAlign: 'left',
                        padding: '10px 14px', border: 0, cursor: 'pointer',
                        background: active ? 'var(--accent-soft)' : 'transparent',
                        borderLeft: active ? '3px solid var(--accent)' : '3px solid transparent' }}>
                      <div style={{ fontWeight: 600, fontSize: 13 }}>{g.name}</div>
                      <div style={{ fontSize: 11, color: 'var(--text-3)', marginTop: 2 }}>
                        사이즈: {(g.sizes || []).join(', ')} · 재료 {(g.ingredients || []).length}개
                      </div>
                    </button>
                  );
                })}
              </div>
            )}
          </div>

          {showGroupEditor && draft ? (
            <GroupEditor
              key={isNew ? 'new' : selectedId}
              draft={draft} setDraft={setDraft}
              allMeta={allMeta} unitPriceMap={unitPriceMap}
              isNew={isNew} saving={saving}
              onSave={handleSaveGroup}
              onDelete={!isNew ? handleDeleteGroup : null}
              onCancel={() => { setIsNew(false); setSelectedId(null); setDraft(null); }}
            />
          ) : (
            <div className="card" style={{ minHeight: 200, display: 'grid', placeItems: 'center' }}>
              <div style={{ textAlign: 'center', color: 'var(--text-3)' }}>
                <Icon.box style={{ width: 28, height: 28, opacity: .4, marginBottom: 8 }}/>
                <div style={{ fontSize: 13 }}>묶음을 선택하거나 새로 추가하세요</div>
              </div>
            </div>
          )}
        </div>
      )}

      {/* ── 엣지 관리 탭 ── */}
      {tab === 'edges' && (
        <div>
          <div style={{ display: 'flex', gap: 8, marginBottom: 16, flexWrap: 'wrap', alignItems: 'center' }}>
            <span style={{ fontSize: 13, color: 'var(--text-3)' }}>
              {edgeFilled}/{edges.length}개 구성 완료
            </span>
            <div style={{ marginLeft: 'auto', display: 'flex', gap: 6 }}>
              {resetConfirm ? (
                <span style={{ display: 'flex', gap: 6, alignItems: 'center' }}>
                  <span style={{ fontSize: 12, color: 'var(--negative)', fontWeight: 600 }}>
                    전체({edges.length}개) 삭제할까요?
                  </span>
                  <button className="btn" style={{ background: 'var(--negative)', color: '#fff', border: 'none' }}
                    onClick={handleResetEdges} disabled={resetting}>
                    {resetting ? '삭제 중…' : '삭제'}
                  </button>
                  <button className="btn" onClick={() => setResetConfirm(false)}>취소</button>
                </span>
              ) : (
                <button className="btn" onClick={() => setResetConfirm(true)}
                  style={{ color: 'var(--text-3)' }} disabled={edges.length === 0}>
                  <Icon.trash style={{ width: 14, height: 14 }}/> 초기화
                </button>
              )}
              <button className="btn" onClick={handleSeedEdges} disabled={seeding}>
                <Icon.download style={{ width: 14, height: 14 }}/>
                {seeding ? '시드 중…' : '마스터 시드 (5종)'}
              </button>
              <button className="btn primary" onClick={() => setEdgeTarget('new')}>
                <Icon.plus style={{ width: 14, height: 14 }}/> 추가
              </button>
            </div>
          </div>

          {loading ? (
            <div style={{ padding: 40, textAlign: 'center', color: 'var(--text-3)' }}>로딩 중…</div>
          ) : edges.length === 0 ? (
            <div className="card" style={{ minHeight: 200, display: 'grid', placeItems: 'center' }}>
              <div style={{ textAlign: 'center', color: 'var(--text-3)' }}>
                <Icon.calc style={{ width: 32, height: 32, marginBottom: 12, opacity: .4 }}/>
                <div style={{ fontWeight: 600, marginBottom: 4 }}>등록된 엣지·도우가 없습니다</div>
                <div style={{ fontSize: 13 }}>
                  <b>마스터 시드</b>로 5종 (치즈크러스트 L/R · 골드스윗크러스트 L/R · 씬도우 L) 일괄 등록
                </div>
              </div>
            </div>
          ) : (
            <div style={{ display: 'flex', flexDirection: 'column', gap: 8 }}>
              {edges.map(e => (
                <EdgeCard key={e.id} edge={e}
                  onEdit={() => setEdgeTarget(e)}
                  onDelete={deletePending === e.id ? null : () => setDeletePending(e.id)}
                />
              ))}
            </div>
          )}

          {deletePending && (
            <div style={{
              position: 'fixed', bottom: 24, left: '50%', transform: 'translateX(-50%)',
              background: 'var(--surface-1)', border: '1px solid var(--border)', borderRadius: 12,
              padding: '12px 18px', boxShadow: '0 4px 16px rgba(0,0,0,.15)',
              display: 'flex', gap: 10, alignItems: 'center', zIndex: 50,
            }}>
              <span style={{ fontSize: 13, fontWeight: 600 }}>이 엣지를 삭제할까요?</span>
              <button className="btn" style={{ background: 'var(--negative)', color: '#fff', border: 'none' }}
                onClick={() => handleDeleteEdge(deletePending)}>삭제</button>
              <button className="btn" onClick={() => setDeletePending(null)}>취소</button>
            </div>
          )}

          {edgeTarget !== null && (
            <EdgeEditModal
              initial={edgeTarget === 'new' ? null : edgeTarget}
              onSave={handleSaveEdge}
              onClose={() => setEdgeTarget(null)}
            />
          )}
        </div>
      )}
    </main>
  );
}

// ── 묶음 데이터 유틸 ─────────────────────────────────────────
const emptyGroup = () => ({
  name: '', description: '',
  sizes: ['L', 'R'],
  defaultCategories: ['피자', '피자/프리미엄 스페셜', '피자/프리미엄', '피자/오리지널', '피자/하프앤하프'],
  ingredients: [],
});

function groupToDraft(g) {
  return {
    ...g,
    sizes: g.sizes?.length ? g.sizes : ['L', 'R'],
    defaultCategories: g.defaultCategories || [],
    ingredients: (g.ingredients || []).map(i => ({ ...i, quantities: { ...(i.quantities || {}) } })),
  };
}

// ── 묶음 편집기 ───────────────────────────────────────────────
function GroupEditor({ draft, setDraft, allMeta, unitPriceMap, isNew, saving, onSave, onDelete, onCancel }) {
  const sizeLabels = useMemo(() => draft.sizes.filter(Boolean), [draft.sizes]);

  function setField(k, v) { setDraft(d => ({ ...d, [k]: v })); }
  function setSize(idx, v) { setDraft(d => { const s = [...d.sizes]; s[idx] = v; return { ...d, sizes: s }; }); }
  function addSize() { setDraft(d => ({ ...d, sizes: [...d.sizes, ''] })); }
  function removeSize(idx) { setDraft(d => ({ ...d, sizes: d.sizes.filter((_, i) => i !== idx) })); }
  function toggleCat(cat) {
    setDraft(d => {
      const cats = d.defaultCategories || [];
      return { ...d, defaultCategories: cats.includes(cat) ? cats.filter(c => c !== cat) : [...cats, cat] };
    });
  }
  function setIngQty(li, sl, v) {
    setDraft(d => ({
      ...d,
      ingredients: d.ingredients.map((line, i) =>
        i !== li ? line : { ...line, quantities: { ...line.quantities, [sl]: v } }
      ),
    }));
  }
  function addIng(meta) {
    const info = unitPriceMap.get(meta.productCode);
    const quantities = {};
    sizeLabels.forEach(sl => { quantities[sl] = ''; });
    setDraft(d => ({
      ...d,
      ingredients: [...d.ingredients, {
        productCode: meta.productCode,
        ingredientName: meta.ingredientName || '',
        quantities,
        unitType: info?.baseUnitType || meta.baseUnitType || 'g',
      }],
    }));
  }
  function removeIng(idx) { setDraft(d => ({ ...d, ingredients: d.ingredients.filter((_, i) => i !== idx) })); }

  const costBySizes = useMemo(() => {
    const result = {};
    for (const sl of sizeLabels) {
      result[sl] = draft.ingredients.reduce((acc, line) => {
        const info = unitPriceMap.get(line.productCode);
        if (!info?.unitPrice) return acc;
        const qty = parseFloat(line.quantities?.[sl]) || 0;
        return acc + (qty ? info.unitPrice * qty : 0);
      }, 0);
    }
    return result;
  }, [draft.ingredients, sizeLabels, unitPriceMap]);

  const ALL_CATS = [...MENU_CATEGORIES, '기타'];

  return (
    <div className="card" style={{ padding: '20px 24px' }}>
      <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: 18 }}>
        <div style={{ fontWeight: 700, fontSize: 15 }}>{isNew ? '새 공통묶음 등록' : `${draft.name} 수정`}</div>
        <div style={{ display: 'flex', gap: 6 }}>
          {onDelete && <button className="btn" style={{ color: 'var(--negative)' }} onClick={onDelete}>삭제</button>}
          <button className="btn" onClick={onCancel}>취소</button>
          <button className="btn primary" onClick={onSave} disabled={saving}>{saving ? '저장 중…' : isNew ? '등록' : '수정'}</button>
        </div>
      </div>

      <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '12px 20px', marginBottom: 20 }}>
        <div>
          <FL>묶음 이름 *</FL>
          <input className="form-input" value={draft.name} onChange={e => setField('name', e.target.value)} placeholder="예) 피자L 공통"/>
        </div>
        <div>
          <FL>설명 (선택)</FL>
          <input className="form-input" value={draft.description || ''} onChange={e => setField('description', e.target.value)} placeholder="묶음 설명"/>
        </div>
      </div>

      <SL>사이즈 레이블</SL>
      <div style={{ marginBottom: 20 }}>
        <div style={{ display: 'flex', flexWrap: 'wrap', gap: 6, marginBottom: 4 }}>
          {draft.sizes.map((s, i) => (
            <div key={i} style={{ display: 'flex', alignItems: 'center', gap: 4 }}>
              <input className="form-input" value={s} onChange={e => setSize(i, e.target.value)} style={{ width: 60 }}/>
              {draft.sizes.length > 1 && (
                <button className="btn" style={{ padding: '3px 6px' }} onClick={() => removeSize(i)}>
                  <Icon.close style={{ width: 11, height: 11 }}/>
                </button>
              )}
            </div>
          ))}
          <button className="btn" style={{ fontSize: 12 }} onClick={addSize}><Icon.plus style={{ width: 12, height: 12 }}/> 추가</button>
        </div>
        <div style={{ fontSize: 11, color: 'var(--text-4)' }}>레시피 사이즈 레이블과 일치하면 해당 사이즈 원가에 자동 반영</div>
      </div>

      <SL>기본 적용 카테고리</SL>
      <div style={{ display: 'flex', flexWrap: 'wrap', gap: 6, marginBottom: 20 }}>
        {ALL_CATS.map(cat => {
          const on = (draft.defaultCategories || []).includes(cat);
          return (
            <button key={cat} type="button" onClick={() => toggleCat(cat)}
              style={{ padding: '4px 10px', borderRadius: 999, fontSize: 12, fontWeight: 600, cursor: 'pointer', border: '1px solid',
                borderColor: on ? 'var(--accent)' : 'var(--border)',
                background: on ? 'var(--accent-soft)' : 'var(--surface)',
                color: on ? 'var(--accent-text)' : 'var(--text-2)' }}>
              {cat}
            </button>
          );
        })}
      </div>

      <SL>식자재</SL>
      {draft.ingredients.length > 0 && (
        <div style={{ marginBottom: 8, overflowX: 'auto' }}>
          <table style={{ width: '100%', borderCollapse: 'collapse', fontSize: 13 }}>
            <thead>
              <tr style={{ borderBottom: '2px solid var(--divider)' }}>
                <th style={TH}>식자재명</th>
                <th style={{ ...TH, width: 80, textAlign: 'right' }}>단가</th>
                {sizeLabels.map(sl => (
                  <th key={sl} style={{ ...TH, width: 100 }} colSpan={2}>
                    <span style={{ fontSize: 10, padding: '1px 5px', borderRadius: 3, fontWeight: 700, background: 'rgba(56,189,248,.15)', color: 'var(--accent)', marginRight: 4 }}>{sl}</span>
                    사용량/소계
                  </th>
                ))}
                <th style={{ ...TH, width: 40 }}>단위</th>
                <th style={{ ...TH, width: 32 }}></th>
              </tr>
            </thead>
            <tbody>
              {draft.ingredients.map((line, i) => {
                const info = unitPriceMap.get(line.productCode);
                const hasPrice = info?.unitPrice != null;
                return (
                  <tr key={i} style={{ borderBottom: '1px solid var(--divider)' }}>
                    <td style={{ padding: '6px 8px' }}>
                      <div style={{ fontWeight: 500 }}>{line.ingredientName}</div>
                      {!hasPrice && <div style={{ fontSize: 10, color: '#f59e0b' }}>⚠ 단가 미등록</div>}
                    </td>
                    <td style={{ padding: '6px 8px', textAlign: 'right', color: 'var(--text-3)', fontSize: 12 }}>
                      {hasPrice ? `${info.unitPrice < 1 ? info.unitPrice.toFixed(2) : formatNumber(info.unitPrice)}원` : '—'}
                    </td>
                    {sizeLabels.map(sl => {
                      const qty = line.quantities?.[sl] ?? '';
                      const sub = hasPrice && parseFloat(qty) > 0 ? Math.round(info.unitPrice * parseFloat(qty) * 10) / 10 : null;
                      return [
                        <td key={sl + '_q'} style={{ padding: '4px', width: 70 }}>
                          <input className="form-input" type="number" value={qty}
                            onChange={e => setIngQty(i, sl, e.target.value)}
                            style={{ width: '100%', padding: '3px 5px', textAlign: 'right' }}/>
                        </td>,
                        <td key={sl + '_s'} style={{ padding: '4px 6px', textAlign: 'right', fontSize: 12,
                          color: sub != null ? 'var(--text-1)' : 'var(--text-4)', fontWeight: sub != null ? 600 : undefined, width: 60 }}>
                          {sub != null ? `${formatNumber(sub)}원` : '—'}
                        </td>,
                      ];
                    })}
                    <td style={{ padding: '6px 4px', fontSize: 12, color: 'var(--text-3)' }}>{line.unitType}</td>
                    <td style={{ padding: '6px 2px', textAlign: 'center' }}>
                      <button onClick={() => removeIng(i)} style={{ border: 0, background: 'transparent', cursor: 'pointer', color: 'var(--text-4)', padding: '2px' }}>
                        <Icon.close style={{ width: 11, height: 11 }}/>
                      </button>
                    </td>
                  </tr>
                );
              })}
            </tbody>
            {sizeLabels.length > 0 && (
              <tfoot>
                <tr style={{ borderTop: '2px solid var(--divider)', background: 'var(--surface-2)' }}>
                  <td style={{ padding: '6px 8px', fontWeight: 700, fontSize: 12 }}>합계</td>
                  <td/>
                  {sizeLabels.map(sl => {
                    const total = costBySizes[sl] || 0;
                    return [
                      <td key={sl + '_qt'}/>,
                      <td key={sl + '_st'} style={{ padding: '6px', textAlign: 'right', fontWeight: 700, fontSize: 13, color: 'var(--accent)' }}>
                        {total > 0 ? `${formatNumber(Math.round(total))}원` : '—'}
                      </td>,
                    ];
                  })}
                  <td/><td/>
                </tr>
              </tfoot>
            )}
          </table>
        </div>
      )}
      <IngredientSearch allMeta={allMeta} unitPriceMap={unitPriceMap} onSelect={addIng} alreadyAdded={draft.ingredients.map(i => i.productCode)}/>
    </div>
  );
}

// ── 식자재 검색 (portal) ─────────────────────────────────────
function IngredientSearch({ allMeta, unitPriceMap, onSelect, alreadyAdded }) {
  const [q, setQ] = useState('');
  const [open, setOpen] = useState(false);
  const [activeIdx, setActiveIdx] = useState(-1);
  const [rect, setRect] = useState(null);
  const ref = useRef(null);
  const listRef = useRef(null);
  const addedSet = useMemo(() => new Set(alreadyAdded), [alreadyAdded]);

  const results = useMemo(() => {
    const term = q.trim().toLowerCase();
    if (!term) return [];
    return allMeta.filter(m =>
      m.productCode && !addedSet.has(m.productCode) &&
      ((m.ingredientName || '').toLowerCase().includes(term) || (m.productCode || '').toLowerCase().includes(term))
    ).slice(0, 15);
  }, [q, allMeta, addedSet]);

  useEffect(() => { setActiveIdx(-1); }, [results]);

  const updateRect = useCallback(() => {
    if (ref.current) {
      const r = ref.current.getBoundingClientRect();
      setRect({ top: r.bottom + 2, left: r.left, width: r.width });
    }
  }, []);

  useEffect(() => { if (open) updateRect(); }, [open, q, updateRect]);
  useEffect(() => {
    if (!open) return;
    window.addEventListener('scroll', updateRect, true);
    return () => window.removeEventListener('scroll', updateRect, true);
  }, [open, updateRect]);

  useEffect(() => {
    const h = e => {
      if (ref.current && !ref.current.contains(e.target) &&
          !(listRef.current && listRef.current.contains(e.target))) setOpen(false);
    };
    document.addEventListener('mousedown', h);
    return () => document.removeEventListener('mousedown', h);
  }, []);

  useEffect(() => {
    if (activeIdx < 0 || !listRef.current) return;
    listRef.current.children[activeIdx]?.scrollIntoView({ block: 'nearest' });
  }, [activeIdx]);

  function select(m) { onSelect(m); setQ(''); setOpen(false); setActiveIdx(-1); }
  function handleKeyDown(e) {
    if (!open || !results.length) return;
    if (e.key === 'ArrowDown') { e.preventDefault(); setActiveIdx(i => Math.min(i + 1, results.length - 1)); }
    else if (e.key === 'ArrowUp') { e.preventDefault(); setActiveIdx(i => Math.max(i - 1, 0)); }
    else if (e.key === 'Enter') { e.preventDefault(); if (activeIdx >= 0) select(results[activeIdx]); }
    else if (e.key === 'Escape') { setOpen(false); setActiveIdx(-1); }
  }

  const dropdown = open && results.length > 0 && rect && createPortal(
    <div ref={listRef} style={{
      position: 'fixed', top: rect.top, left: rect.left, width: rect.width,
      zIndex: 9999, background: 'var(--surface-1)', border: '1px solid var(--border)',
      borderRadius: 8, boxShadow: '0 4px 20px rgba(0,0,0,.2)', maxHeight: 260, overflowY: 'auto',
    }}>
      {results.map((m, idx) => {
        const info = unitPriceMap.get(m.productCode);
        const isActive = idx === activeIdx;
        return (
          <button key={m.productCode} onClick={() => select(m)} onMouseEnter={() => setActiveIdx(idx)}
            style={{ display: 'block', width: '100%', textAlign: 'left', padding: '8px 14px', border: 0,
              background: isActive ? 'var(--accent-soft)' : 'transparent', cursor: 'pointer', borderBottom: '1px solid var(--divider)' }}>
            <div style={{ fontWeight: 500, fontSize: 13, color: isActive ? 'var(--accent-text)' : undefined }}>{m.ingredientName}</div>
            <div style={{ fontSize: 11, color: 'var(--text-3)', marginTop: 1, display: 'flex', gap: 8 }}>
              <span style={{ fontFamily: 'monospace' }}>{m.productCode}</span>
              {info?.unitPrice != null ? <span>{info.unitPrice < 1 ? info.unitPrice.toFixed(2) : formatNumber(info.unitPrice)}원/{info.baseUnitType}</span>
                : <span style={{ color: '#f59e0b' }}>단가미등록</span>}
            </div>
          </button>
        );
      })}
    </div>,
    document.body
  );

  return (
    <div ref={ref} style={{ marginTop: 8 }}>
      <div className="filter-search" style={{ gap: 6 }}>
        <Icon.search style={{ width: 14, height: 14, color: 'var(--text-3)', flexShrink: 0 }}/>
        <input value={q} onChange={e => { setQ(e.target.value); setOpen(!!e.target.value.trim()); }}
          onFocus={() => { if (q.trim()) setOpen(true); }}
          onKeyDown={handleKeyDown} placeholder="식자재 검색하여 추가… (↑↓ Enter)"/>
        {q && <button onClick={() => { setQ(''); setOpen(false); }}
          style={{ border: 0, background: 'transparent', cursor: 'pointer', color: 'var(--text-4)', padding: 0 }}>
          <Icon.close style={{ width: 12, height: 12 }}/>
        </button>}
      </div>
      {dropdown}
    </div>
  );
}

// ── 스타일 헬퍼 ──────────────────────────────────────────────
const TH = { padding: '5px 8px', textAlign: 'left', fontWeight: 600, fontSize: 11, color: 'var(--text-3)', whiteSpace: 'nowrap' };
function SL({ children }) {
  return <div style={{ fontSize: 12, fontWeight: 700, color: 'var(--text-3)', textTransform: 'uppercase', letterSpacing: '0.05em', marginBottom: 8, paddingBottom: 4, borderBottom: '1px solid var(--divider)' }}>{children}</div>;
}
function FL({ children }) {
  return <div style={{ fontSize: 12, fontWeight: 600, color: 'var(--text-2)', marginBottom: 5 }}>{children}</div>;
}
