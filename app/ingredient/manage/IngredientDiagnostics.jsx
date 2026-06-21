'use client';
import { useState } from 'react';
import { Icon } from '@/components/icons';
import { rowLabel } from './_duplicate-diagnostics';

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

function CleanupChip({ label, prefix = '', onRemove, onRename, isAdmin }) {
  const [renaming, setRenaming] = useState(false);
  const [newName, setNewName] = useState('');
  const [confirmRemove, setConfirmRemove] = useState(false);

  function startRename() {
    setNewName(label);
    setRenaming(true);
    setConfirmRemove(false);
  }

  function cancelRename() {
    setRenaming(false);
    setNewName('');
  }

  function submitRename() {
    const trimmed = newName.trim();
    if (!trimmed || trimmed === label) {
      cancelRename();
      return;
    }
    onRename(label, trimmed);
    setRenaming(false);
    setNewName('');
  }

  if (renaming) {
    return (
      <span style={{ display: 'inline-flex', alignItems: 'center', gap: 3 }}>
        <input
          autoFocus
          value={newName}
          onChange={e => setNewName(e.target.value)}
          onKeyDown={e => {
            if (e.key === 'Enter') submitRename();
            if (e.key === 'Escape') cancelRename();
          }}
          style={{
            fontSize: 11,
            padding: '1px 6px',
            borderRadius: 4,
            border: '1px solid var(--primary)',
            width: Math.max(80, newName.length * 8),
            outline: 'none',
          }}
        />
        <button
          className="btn sm"
          style={{ padding: '1px 6px', fontSize: 11 }}
          onClick={submitRename}
        >
          확인
        </button>
        <button
          className="btn sm ghost"
          style={{ padding: '1px 4px', fontSize: 11 }}
          onClick={cancelRename}
        >
          취소
        </button>
      </span>
    );
  }

  if (confirmRemove) {
    return (
      <span
        style={{
          display: 'inline-flex',
          alignItems: 'center',
          gap: 3,
          background: 'var(--warn-soft)',
          borderRadius: 4,
          padding: '1px 6px',
          fontSize: 11,
        }}
      >
        <span style={{ color: 'var(--negative)', fontWeight: 700 }}>
          {prefix}
          {label} 삭제?
        </span>
        <button
          className="btn sm"
          style={{
            padding: '1px 6px',
            fontSize: 11,
            background: 'var(--negative)',
            color: '#fff',
            border: 0,
          }}
          onClick={() => {
            setConfirmRemove(false);
            onRemove(label);
          }}
        >
          삭제
        </button>
        <button
          className="btn sm ghost"
          style={{ padding: '1px 4px', fontSize: 11 }}
          onClick={() => setConfirmRemove(false)}
        >
          취소
        </button>
      </span>
    );
  }

  return (
    <span
      className="chip"
      style={{
        fontSize: 11,
        display: 'inline-flex',
        alignItems: 'center',
        gap: 3,
        paddingRight: 4,
      }}
    >
      {prefix}
      {label}
      {isAdmin && (
        <>
          <button
            title="이름 변경"
            style={{
              background: 'none',
              border: 'none',
              cursor: 'pointer',
              padding: '0 1px',
              lineHeight: 1,
              color: 'var(--text-3)',
            }}
            onClick={startRename}
          >
            <Icon.edit style={{ width: 10, height: 10 }} />
          </button>
          <button
            title="삭제"
            style={{
              background: 'none',
              border: 'none',
              cursor: 'pointer',
              padding: '0 1px',
              lineHeight: 1,
              color: 'var(--text-3)',
            }}
            onClick={() => setConfirmRemove(true)}
          >
            <Icon.close style={{ width: 10, height: 10 }} />
          </button>
        </>
      )}
    </span>
  );
}

function BrokenRefsBanner({ brokenRefs }) {
  if (brokenRefs.length === 0) return null;
  return (
    <div
      className="info-banner"
      style={{
        marginBottom: 8,
        background: 'var(--warn-soft)',
        borderColor: 'var(--warn-soft)',
      }}
    >
      <div className="info-banner-ico" style={{ background: 'var(--warn)', color: '#fff' }}>
        <Icon.alert style={{ width: 16, height: 16 }} />
      </div>
      <div style={{ fontSize: 13 }}>
        <b>복합 식자재 참조 오류 {brokenRefs.length}건</b> —{' '}
        {brokenRefs
          .slice(0, 3)
          .map(row => row.ingredientName)
          .join(', ')}
        {brokenRefs.length > 3 && ` 외 ${brokenRefs.length - 3}개`}가 존재하지 않는 코드를
        compositeOf로 참조합니다.
      </div>
    </div>
  );
}

function ProductCodeDupesBanner({
  productCodeDupes,
  dedupeConfirm,
  dedupeBusy,
  onDedupeConfirm,
  onDedupeCancel,
  onRepairProductCodeDuplicates,
}) {
  if (!productCodeDupes?.hasDuplicates) return null;
  return (
    <div
      className="info-banner"
      style={{
        marginBottom: 8,
        background: 'var(--warn-soft)',
        borderColor: 'var(--warn-soft)',
      }}
    >
      <div className="info-banner-ico" style={{ background: 'var(--warn)', color: '#fff' }}>
        <Icon.alert style={{ width: 16, height: 16 }} />
      </div>
      <div style={{ fontSize: 13, display: 'grid', gap: 8, flex: 1 }}>
        <div>
          <b>제품코드 중복 {productCodeDupes.groupCount}그룹</b> — 대표 식자재 1건에
          태그·알레르기·비어 있는 필드를 병합하고 나머지 행을 정리할 수 있습니다.
        </div>
        <div style={{ display: 'flex', flexWrap: 'wrap', gap: 6 }}>
          {productCodeDupes.groups.slice(0, 4).map(group => (
            <span
              key={group.key}
              className="chip"
              title={`병합 대상: ${group.removeNames.filter(Boolean).join(', ') || '-'}`}
            >
              {group.productCode} · 대표 {group.keepName || group.keepId} · 병합{' '}
              {group.removeIds.length}개
            </span>
          ))}
        </div>
        {dedupeConfirm && (
          <div style={{ display: 'flex', gap: 6, alignItems: 'center', flexWrap: 'wrap' }}>
            <span style={{ fontSize: 12, color: 'var(--negative)', fontWeight: 700 }}>
              최신 대표행만 남기고 {productCodeDupes.duplicateRows}개 중복 행을 정리할까요?
            </span>
            <button
              className="btn sm"
              style={{ background: 'var(--negative)', color: '#fff', border: 0 }}
              onClick={onRepairProductCodeDuplicates}
              disabled={dedupeBusy}
            >
              {dedupeBusy ? '정리 중…' : '정리'}
            </button>
            <button className="btn sm" onClick={onDedupeCancel}>
              취소
            </button>
          </div>
        )}
      </div>
      {!dedupeConfirm && (
        <button className="btn sm" onClick={onDedupeConfirm}>
          제품코드 중복 정리
        </button>
      )}
    </div>
  );
}

function UnusedCleanupBanner({
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

function DuplicateGroupsBanner({ duplicateGroupCount, duplicateDiagnostics }) {
  if (duplicateGroupCount === 0) return null;
  return (
    <div
      className="info-banner"
      style={{
        marginBottom: 8,
        background: 'var(--warn-soft)',
        borderColor: 'var(--warn-soft)',
      }}
    >
      <div className="info-banner-ico" style={{ background: 'var(--warn)', color: '#fff' }}>
        <Icon.alert style={{ width: 16, height: 16 }} />
      </div>
      <div style={{ fontSize: 13, display: 'grid', gap: 6 }}>
        <div>
          <b>중복 가능성 {duplicateGroupCount}그룹</b> — 제품코드·제때코드·표시명 기준으로 확인이
          필요합니다.
        </div>
        <div style={{ display: 'flex', flexWrap: 'wrap', gap: 6 }}>
          {duplicateDiagnostics.flatMap(check =>
            check.groups.slice(0, 3).map(group => (
              <span
                key={`${check.key}:${group.value}`}
                className="chip"
                title={group.rows.map(rowLabel).join(', ')}
              >
                {check.label} {group.value} · {group.rows.length}개
              </span>
            ))
          )}
        </div>
      </div>
    </div>
  );
}

export function IngredientDiagnostics({
  brokenRefs,
  productCodeDupes,
  duplicateGroupCount,
  duplicateDiagnostics,
  unusedCategories = [],
  unusedTags = [],
  dedupeConfirm,
  dedupeBusy,
  onDedupeConfirm,
  onDedupeCancel,
  onRepairProductCodeDuplicates,
  onRemoveCategory,
  onRemoveTag,
  onRemoveAllUnusedTags,
  onRenameCategory,
  onRenameTag,
  isAdmin = false,
}) {
  return (
    <>
      <BrokenRefsBanner brokenRefs={brokenRefs} />
      <ProductCodeDupesBanner
        productCodeDupes={productCodeDupes}
        dedupeConfirm={dedupeConfirm}
        dedupeBusy={dedupeBusy}
        onDedupeConfirm={onDedupeConfirm}
        onDedupeCancel={onDedupeCancel}
        onRepairProductCodeDuplicates={onRepairProductCodeDuplicates}
      />
      <UnusedCleanupBanner
        unusedCategories={unusedCategories}
        unusedTags={unusedTags}
        isAdmin={isAdmin}
        onRemoveCategory={onRemoveCategory}
        onRemoveTag={onRemoveTag}
        onRemoveAllUnusedTags={onRemoveAllUnusedTags}
        onRenameCategory={onRenameCategory}
        onRenameTag={onRenameTag}
      />
      <DuplicateGroupsBanner
        duplicateGroupCount={duplicateGroupCount}
        duplicateDiagnostics={duplicateDiagnostics}
      />
    </>
  );
}
