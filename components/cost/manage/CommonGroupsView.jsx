'use client';

import { useMemo } from 'react';
import dynamic from 'next/dynamic';
import { Icon } from '@/components/icons';
import { SearchBox } from '@/components/ui/SearchBox';

const GroupEditor = dynamic(
  () =>
    import('@/components/cost/recipe-groups/GroupEditor').then(m => ({ default: m.GroupEditor })),
  { ssr: false }
);

export function CommonGroupsView({
  groups = [],
  loading = false,
  search = '',
  onSearch,
  selectedId = null,
  isNew = false,
  draft = null,
  setDraft,
  allMeta = [],
  unitPriceMap,
  saving = false,
  canEdit = false,
  onNew,
  onSelect,
  onSave,
  onAskDelete,
  onCancel,
}) {
  const filteredGroups = useMemo(() => {
    const q = search.trim().toLowerCase();
    if (!q) return groups;
    return groups.filter(group => group.name?.toLowerCase().includes(q));
  }, [groups, search]);
  const showEditor = isNew || selectedId != null;

  return (
    <div
      className="cost-manage-grid"
      style={{
        display: 'grid',
        gridTemplateColumns: '280px 1fr',
        gap: 16,
        alignItems: 'start',
      }}
    >
      <div className="card" style={{ padding: 0, overflow: 'hidden' }}>
        <div style={{ padding: '12px 14px 8px', borderBottom: '1px solid var(--divider)' }}>
          <button
            className="btn primary"
            style={{ width: '100%', justifyContent: 'center', marginBottom: 8 }}
            onClick={onNew}
            disabled={!canEdit}
          >
            <Icon.plus style={{ width: 13, height: 13 }} /> 새 묶음 추가
          </button>
          <SearchBox value={search} onChange={onSearch} placeholder="묶음 이름 검색" />
        </div>
        {loading ? (
          <div style={{ padding: 8 }}>
            {Array.from({ length: 5 }).map((_, i) => (
              <div
                key={i}
                style={{
                  height: 52,
                  marginBottom: 6,
                  borderRadius: 6,
                  background: 'var(--surface-2)',
                  opacity: 1 - i * 0.12,
                }}
              />
            ))}
          </div>
        ) : filteredGroups.length === 0 ? (
          <div style={{ padding: 24, textAlign: 'center', color: 'var(--text-3)', fontSize: 13 }}>
            {search ? '검색 결과가 없습니다' : '등록된 묶음이 없습니다'}
          </div>
        ) : (
          <div style={{ maxHeight: 'calc(100vh - 320px)', overflowY: 'auto' }}>
            {filteredGroups.map(group => {
              const active = group.id === selectedId;
              return (
                <button
                  key={group.id}
                  onClick={() => onSelect(group.id)}
                  style={{
                    display: 'block',
                    width: '100%',
                    textAlign: 'left',
                    padding: '10px 14px',
                    border: 0,
                    cursor: 'pointer',
                    background: active ? 'var(--surface-2)' : 'transparent',
                    borderLeft: active ? '3px solid var(--accent)' : '3px solid transparent',
                  }}
                >
                  <div style={{ fontWeight: 600, fontSize: 13 }}>{group.name}</div>
                  <div style={{ fontSize: 11, color: 'var(--text-3)', marginTop: 2 }}>
                    사이즈: {(group.sizes || []).join(', ')} · 재료{' '}
                    {(group.ingredients || []).length}개
                  </div>
                </button>
              );
            })}
          </div>
        )}
      </div>

      {showEditor && draft ? (
        <GroupEditor
          key={isNew ? 'new' : selectedId}
          draft={draft}
          setDraft={setDraft}
          allMeta={allMeta}
          unitPriceMap={unitPriceMap}
          isNew={isNew}
          saving={saving}
          onSave={onSave}
          readOnly={!canEdit}
          onDelete={!isNew && canEdit ? () => onAskDelete(selectedId) : null}
          onCancel={onCancel}
        />
      ) : (
        <div className="card" style={{ minHeight: 200, display: 'grid', placeItems: 'center' }}>
          <div style={{ textAlign: 'center', color: 'var(--text-3)' }}>
            <Icon.box style={{ width: 28, height: 28, opacity: 0.4, marginBottom: 8 }} />
            <div style={{ fontSize: 13 }}>묶음을 선택하거나 새로 추가하세요</div>
          </div>
        </div>
      )}
    </div>
  );
}
