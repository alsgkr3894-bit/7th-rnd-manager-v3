'use client';
import { useEffect, useState, useCallback, useMemo } from 'react';
import { Icon } from '@/components/icons';
import { PageHeader } from '@/components/ui/PageHeader';
import { showToast } from '@/components/Toast';
import { initDB } from '@/lib/db';
import { getPriceFiles, getPriceRowsByFileId } from '@/lib/price';
import { getAllIngredients } from '@/lib/ingredient';
import { buildUnitPriceMap } from '@/lib/recipe';
import { getAllRecipeGroups, saveRecipeGroup, deleteRecipeGroup } from '@/lib/cost/recipe-groups/store';
import { GroupEditor } from '@/components/cost/recipe-groups/GroupEditor';
import { emptyGroup, groupToDraft } from '@/lib/cost/group-utils';

// ── 메인 페이지 ───────────────────────────────────────────────
export default function Page() {
  const [groups,       setGroups]       = useState([]);
  const [allMeta,      setAllMeta]      = useState([]);
  const [unitPriceMap, setUnitPriceMap] = useState(new Map());
  const [selectedId,   setSelectedId]  = useState(null);
  const [isNew,        setIsNew]        = useState(false);
  const [draft,        setDraft]        = useState(null);
  const [saving,       setSaving]       = useState(false);
  const [loading,      setLoading]      = useState(true);
  const [dbError,      setDbError]      = useState(null);
  const [groupSearch,  setGroupSearch]  = useState('');

  const load = useCallback(async () => {
    await initDB();
    const [files, meta, gs] = await Promise.all([
      getPriceFiles(),
      getAllIngredients(),
      getAllRecipeGroups(),
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
  }, []);

  useEffect(() => { load().catch(err => { console.error(err); setDbError(err.message || '데이터 로드 실패'); }).finally(() => setLoading(false)); }, [load]);

  function handleSelect(id) {
    setSelectedId(id);
    setIsNew(false);
    const g = groups.find(r => r.id === id);
    if (g) setDraft(groupToDraft(g));
  }

  function handleNew() {
    setSelectedId(null);
    setIsNew(true);
    setDraft(emptyGroup());
  }

  async function handleSave() {
    if (!draft?.name?.trim()) { showToast('묶음 이름을 입력해주세요'); return; }
    setSaving(true);
    try {
      const savedId = await saveRecipeGroup({
        ...draft,
        id: isNew ? undefined : selectedId,
      });
      showToast(isNew ? '묶음 등록 완료' : '묶음 수정 완료');
      await load();
      setIsNew(false);
      setSelectedId(isNew ? savedId : selectedId);
    } catch (e) {
      showToast('저장 실패: ' + e.message);
    } finally {
      setSaving(false);
    }
  }

  async function handleDelete() {
    if (!selectedId) return;
    const name = groups.find(r => r.id === selectedId)?.name || '';
    if (!window.confirm(`"${name}" 묶음을 삭제할까요?`)) return;
    try {
      await deleteRecipeGroup(selectedId);
      showToast('삭제 완료');
      setSelectedId(null);
      setIsNew(false);
      setDraft(null);
      await load();
    } catch (e) {
      showToast('삭제 실패: ' + e.message);
    }
  }

  const filteredGroups = useMemo(() => {
    const q = groupSearch.trim().toLowerCase();
    if (!q) return groups;
    return groups.filter(g => (g.name || '').toLowerCase().includes(q));
  }, [groups, groupSearch]);

  const showEditor = isNew || selectedId != null;

  if (dbError) return (
    <main className="main">
      <PageHeader breadcrumb={['원가계산', '공통묶음 관리']} title="공통묶음 관리" sub="로드 실패"/>
      <div className="card" style={{ padding: 32, textAlign: 'center', color: 'var(--negative)' }}>
        데이터베이스 오류: {dbError}
      </div>
    </main>
  );

  return (
    <main className="main">
      <PageHeader
        breadcrumb={['원가계산', '공통묶음 관리']}
        title="공통묶음 관리"
        sub="여러 메뉴에 공통으로 들어가는 고정 식자재를 묶음으로 정의하세요. 레시피 편집 시 선택하여 원가에 자동 반영됩니다."
      />

      <div style={{ display: 'grid', gridTemplateColumns: '280px 1fr', gap: 16, marginTop: 8, alignItems: 'start' }}>

        {/* ── 왼쪽: 목록 ── */}
        <div className="card" style={{ padding: 0, overflow: 'hidden' }}>
          <div style={{ padding: '12px 14px 8px', borderBottom: '1px solid var(--divider)', display: 'flex', flexDirection: 'column', gap: 8 }}>
            <button className="btn primary" style={{ width: '100%', justifyContent: 'center' }} onClick={handleNew}>
              <Icon.plus style={{ width: 13, height: 13 }}/> 새 묶음 추가
            </button>
            <div className="filter-search" style={{ width: '100%' }}>
              <Icon.search style={{ width: 13, height: 13, color: 'var(--text-3)', flexShrink: 0 }}/>
              <input
                value={groupSearch}
                onChange={e => setGroupSearch(e.target.value)}
                placeholder="묶음 이름 검색"
              />
            </div>
          </div>

          {loading ? (
            <div style={{ padding: 24, textAlign: 'center', color: 'var(--text-3)', fontSize: 13 }}>로딩 중…</div>
          ) : groups.length === 0 ? (
            <div style={{ padding: 24, textAlign: 'center', color: 'var(--text-3)', fontSize: 13 }}>
              등록된 묶음이 없습니다
            </div>
          ) : filteredGroups.length === 0 ? (
            <div style={{ padding: 24, textAlign: 'center', color: 'var(--text-3)', fontSize: 13 }}>
              "{groupSearch}" 검색 결과 없음
            </div>
          ) : (
            <div style={{ maxHeight: 'calc(100vh - 260px)', overflowY: 'auto' }}>
              {filteredGroups.map(g => {
                const active = g.id === selectedId;
                return (
                  <button key={g.id} onClick={() => handleSelect(g.id)}
                    style={{ display: 'block', width: '100%', textAlign: 'left',
                      padding: '10px 14px', border: 0, cursor: 'pointer',
                      background: active ? 'var(--accent-soft)' : 'transparent',
                      borderLeft: active ? '3px solid var(--accent)' : '3px solid transparent' }}>
                    <div style={{ fontWeight: 600, fontSize: 13 }}>{g.name}</div>
                    <div style={{ fontSize: 11, color: 'var(--text-3)', marginTop: 2 }}>
                      사이즈: {(g.sizes || []).join(', ')} · 재료 {(g.ingredients || []).length}개
                    </div>
                    {g.defaultCategories?.length > 0 && (
                      <div style={{ fontSize: 10, color: 'var(--text-4)', marginTop: 2 }}>
                        기본적용: {g.defaultCategories.slice(0, 3).join(', ')}{g.defaultCategories.length > 3 ? ` 외 ${g.defaultCategories.length - 3}개` : ''}
                      </div>
                    )}
                  </button>
                );
              })}
            </div>
          )}
        </div>

        {/* ── 오른쪽: 에디터 ── */}
        {showEditor && draft ? (
          <GroupEditor
            key={isNew ? 'new' : selectedId}
            draft={draft}
            setDraft={setDraft}
            allMeta={allMeta}
            unitPriceMap={unitPriceMap}
            isNew={isNew}
            saving={saving}
            onSave={handleSave}
            onDelete={!isNew ? handleDelete : null}
            onCancel={() => { setIsNew(false); setSelectedId(null); setDraft(null); }}
          />
        ) : (
          <div className="card" style={{ minHeight: 280, display: 'grid', placeItems: 'center' }}>
            <div style={{ textAlign: 'center', color: 'var(--text-3)' }}>
              <Icon.box style={{ width: 28, height: 28, opacity: .4, marginBottom: 8 }}/>
              <div style={{ fontSize: 13 }}>묶음을 선택하거나 새로 추가하세요</div>
            </div>
          </div>
        )}
      </div>
    </main>
  );
}
