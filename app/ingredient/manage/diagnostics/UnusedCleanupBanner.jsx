'use client';
import { useState } from 'react';
import { Icon } from '@/components/icons';
import { CleanupChip } from './CleanupChip';

function BulkTagDeleteButton({ count, onConfirm }) {
  const [confirming, setConfirming] = useState(false);
  if (confirming) {
    return (
      <span style={{ display: 'inline-flex', alignItems: 'center', gap: 4 }}>
        <span style={{ fontSize: 11, color: 'var(--negative)', fontWeight: 700 }}>
          태그 {count}개 전체 삭제?
        </span>
        <button
          className="btn sm"
          style={{
            background: 'var(--negative)',
            color: '#fff',
            border: 0,
            padding: '1px 6px',
            fontSize: 11,
          }}
          onClick={() => {
            setConfirming(false);
            onConfirm();
          }}
        >
          삭제
        </button>
        <button
          className="btn sm ghost"
          style={{ padding: '1px 4px', fontSize: 11 }}
          onClick={() => setConfirming(false)}
        >
          취소
        </button>
      </span>
    );
  }
  return (
    <button
      className="btn sm"
      style={{ marginLeft: 4, fontSize: 11 }}
      onClick={() => setConfirming(true)}
    >
      전체 삭제
    </button>
  );
}

export function UnusedCleanupBanner({
  unusedCategories,
  unusedTags,
  isAdmin,
  onRemoveCategory,
  onRemoveTag,
  onRemoveAllUnusedTags,
  onRenameCategory,
  onRenameTag,
}) {
  if (unusedCategories.length === 0 && unusedTags.length === 0) return null;
  return (
    <div
      className="info-banner"
      style={{
        marginBottom: 8,
        background: 'var(--surface-2)',
        borderColor: 'var(--border)',
      }}
    >
      <div className="info-banner-ico" style={{ background: 'var(--text-3)', color: '#fff' }}>
        <Icon.tag style={{ width: 16, height: 16 }} />
      </div>
      <div style={{ fontSize: 13, display: 'grid', gap: 4, flex: 1 }}>
        <div style={{ color: 'var(--text-2)' }}>
          <b>단종 전용 분류/태그</b> — 단종 식자재에만 남아있어 정리 후보입니다.
          {isAdmin && (
            <span style={{ fontSize: 11, color: 'var(--text-3)', marginLeft: 6 }}>
              칩의 ✎·✕로 이름변경/삭제
            </span>
          )}
        </div>
        {unusedCategories.length > 0 && (
          <div style={{ display: 'flex', flexWrap: 'wrap', gap: 4, alignItems: 'center' }}>
            <span style={{ fontSize: 11, color: 'var(--text-3)', marginRight: 2 }}>분류</span>
            {unusedCategories.map(c => (
              <CleanupChip
                key={c}
                label={c}
                isAdmin={isAdmin}
                onRemove={onRemoveCategory}
                onRename={onRenameCategory}
              />
            ))}
          </div>
        )}
        {unusedTags.length > 0 && (
          <div style={{ display: 'flex', flexWrap: 'wrap', gap: 4, alignItems: 'center' }}>
            <span style={{ fontSize: 11, color: 'var(--text-3)', marginRight: 2 }}>태그</span>
            {unusedTags.map(t => (
              <CleanupChip
                key={t}
                label={t}
                prefix="#"
                isAdmin={isAdmin}
                onRemove={onRemoveTag}
                onRename={onRenameTag}
              />
            ))}
            {isAdmin && unusedTags.length > 1 && onRemoveAllUnusedTags && (
              <BulkTagDeleteButton
                count={unusedTags.length}
                onConfirm={() => onRemoveAllUnusedTags(unusedTags)}
              />
            )}
          </div>
        )}
      </div>
    </div>
  );
}
