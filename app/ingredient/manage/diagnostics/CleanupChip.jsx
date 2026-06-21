'use client';
import { useState } from 'react';
import { Icon } from '@/components/icons';

export function CleanupChip({ label, prefix = '', onRemove, onRename, isAdmin }) {
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
