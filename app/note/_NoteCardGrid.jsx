'use client';
import { useState } from 'react';
import { isUnifiedSampleRecord } from '@/lib/note/unified-records';
import { NoteIdeaGroupCard } from './_NoteIdeaGroupCard';
import { buildNoteIdeaGroups } from './noteIdeaGroups';

const NOTE_GROUP_MIME = 'application/x-rnd-note-group';

function groupNoteIds(group = {}) {
  return (group.notes || []).map(note => note.id).filter(id => id != null);
}

function parseDragPayload(event, fallback) {
  const raw = event.dataTransfer?.getData(NOTE_GROUP_MIME);
  if (!raw) return fallback;
  try {
    const payload = JSON.parse(raw);
    return {
      key: payload?.key || fallback?.key || '',
      ids: Array.isArray(payload?.ids) ? payload.ids : fallback?.ids || [],
    };
  } catch {
    return fallback;
  }
}

function groupHasSampleRecord(group = {}) {
  return (group.notes || []).some(note => isUnifiedSampleRecord(note));
}

export function NoteCardGrid({
  visible,
  filtered,
  sortBy,
  canEdit = false,
  batchMode,
  selected,
  pinnedIds,
  popIds,
  hlRe,
  onContextMenu,
  onToggleSelect,
  onOpen,
  onEdit,
  onDelete,
  onCopy,
  onStatusChange,
  onTypeChange,
  onNewVersion,
  onPin,
  onTagClick,
  onDropMerge,
  onUnmergeGroup,
  onLoadMore,
}) {
  const visibleLimit = Array.isArray(visible) ? visible.length : 0;
  const filteredCount = Array.isArray(filtered) ? filtered.length : 0;
  const allGroups = buildNoteIdeaGroups(filtered, filtered, { sortBy, pinnedIds });
  const groups = allGroups.slice(0, visibleLimit);
  const [dragGroup, setDragGroup] = useState(null);
  const [dropKey, setDropKey] = useState(null);
  const canDragMerge = canEdit && !batchMode && typeof onDropMerge === 'function';

  function handleDragStart(group, event) {
    if (!canDragMerge) return;
    const payload = { key: group.key, ids: groupNoteIds(group) };
    setDragGroup(payload);
    event.dataTransfer.effectAllowed = 'move';
    event.dataTransfer.setData(NOTE_GROUP_MIME, JSON.stringify(payload));
    event.dataTransfer.setData('text/plain', group.title || '');
  }

  function handleDragOver(group, event) {
    if (!canDragMerge || dragGroup?.key === group.key) return;
    event.preventDefault();
    event.dataTransfer.dropEffect = 'move';
    setDropKey(group.key);
  }

  function handleDragLeave(group, event) {
    if (event.currentTarget.contains(event.relatedTarget)) return;
    if (dropKey === group.key) setDropKey(null);
  }

  function handleDrop(group, event) {
    if (!canDragMerge) return;
    event.preventDefault();
    const source = parseDragPayload(event, dragGroup);
    setDropKey(null);
    setDragGroup(null);
    if (!source?.ids?.length || source.key === group.key) return;
    onDropMerge(source.ids, groupNoteIds(group));
  }

  return (
    <>
      <div
        style={{
          display: 'flex',
          justifyContent: 'flex-end',
          marginTop: 12,
          fontSize: 12,
          fontWeight: 800,
          color: 'var(--text-3)',
        }}
      >
        카드 {allGroups.length.toLocaleString('ko-KR')}개 · 저장된 노트{' '}
        {filteredCount.toLocaleString('ko-KR')}건
      </div>
      <div
        style={{
          display: 'grid',
          gridTemplateColumns: 'repeat(auto-fill,minmax(380px,1fr))',
          gap: 16,
          marginTop: 16,
        }}
      >
        {groups.map((group, i) => {
          const groupCanDragMerge = canDragMerge && !groupHasSampleRecord(group);
          return (
            <div
              key={group.key}
              className="stagger note-card-wrap"
              style={{ animationDelay: `${Math.min(i, 8) * 40}ms` }}
            >
              <NoteIdeaGroupCard
                group={group}
                draggable={groupCanDragMerge}
                isDragging={dragGroup?.key === group.key}
                isDropTarget={dropKey === group.key && dragGroup?.key !== group.key}
                canEdit={canEdit}
                batchMode={batchMode}
                selected={selected}
                pinnedIds={pinnedIds}
                popIds={popIds}
                hlRe={hlRe}
                onContextMenu={onContextMenu}
                onToggleSelect={onToggleSelect}
                onOpen={onOpen}
                onEdit={onEdit}
                onDelete={onDelete}
                onCopy={onCopy}
                onStatusChange={onStatusChange}
                onTypeChange={onTypeChange}
                onNewVersion={onNewVersion}
                onPin={onPin}
                onTagClick={onTagClick}
                onUnmergeGroup={onUnmergeGroup}
                onDragStartGroup={event => groupCanDragMerge && handleDragStart(group, event)}
                onDragOverGroup={event => groupCanDragMerge && handleDragOver(group, event)}
                onDragLeaveGroup={event => handleDragLeave(group, event)}
                onDropGroup={event => groupCanDragMerge && handleDrop(group, event)}
                onDragEndGroup={() => {
                  setDragGroup(null);
                  setDropKey(null);
                }}
              />
            </div>
          );
        })}
      </div>
      {groups.length < allGroups.length && (
        <button className="load-more-btn" onClick={onLoadMore}>
          더 보기 ({allGroups.length - groups.length}개 남음)
        </button>
      )}
    </>
  );
}
