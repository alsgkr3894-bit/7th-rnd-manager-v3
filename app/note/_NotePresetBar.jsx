'use client';
import { useState, useRef } from 'react';

/**
 * Filter preset chips bar.
 * Props:
 *   presets        — array of { name, status, search, sort }
 *   hasActiveFilter — boolean — show "현재 필터 저장" button when true
 *   onApply(preset) — apply a saved preset
 *   onSave(name)    — save current filter under given name
 *   onDelete(idx)   — request deletion of preset at index (parent shows ConfirmDialog)
 */
export function NotePresetBar({ presets, hasActiveFilter, onApply, onSave, onDelete }) {
  const [savingPreset, setSavingPreset] = useState(false);
  const [presetName, setPresetName] = useState('');
  const presetInputRef = useRef(null);

  function handleSave() {
    const name = presetName.trim();
    if (!name) return;
    onSave(name);
    setPresetName('');
    setSavingPreset(false);
  }

  if (presets.length === 0 && !hasActiveFilter) return null;

  return (
    <div style={{ display: 'flex', gap: 6, flexWrap: 'wrap', alignItems: 'center', marginTop: 8 }}>
      {presets.map((p, i) => (
        <div key={i} style={{ display: 'flex', alignItems: 'center', gap: 0 }}>
          <button
            className="chip"
            style={{ borderRadius: '12px 0 0 12px', paddingRight: 8 }}
            onClick={() => onApply(p)}
            title={`상태: ${p.status} / 정렬: ${p.sort}`}
          >
            ★ {p.name}
          </button>
          <button
            className="chip"
            style={{
              borderRadius: '0 12px 12px 0',
              padding: '4px 8px',
              borderLeft: 'none',
              color: 'var(--text-4)',
            }}
            onClick={() => onDelete(i)}
            title="프리셋 삭제"
          >
            ×
          </button>
        </div>
      ))}

      {hasActiveFilter &&
        (savingPreset ? (
          <div style={{ display: 'flex', gap: 4, alignItems: 'center' }}>
            <input
              ref={presetInputRef}
              value={presetName}
              onChange={e => setPresetName(e.target.value)}
              onKeyDown={e => {
                if (e.key === 'Enter') handleSave();
                if (e.key === 'Escape') setSavingPreset(false);
              }}
              placeholder="프리셋 이름"
              autoFocus
              style={{
                fontSize: 12,
                padding: '4px 10px',
                borderRadius: 10,
                border: '1px solid var(--accent)',
                background: 'var(--surface)',
                color: 'var(--text-1)',
                outline: 'none',
                width: 120,
                fontFamily: 'inherit',
              }}
            />
            <button className="chip active" style={{ fontSize: 11 }} onClick={handleSave}>
              저장
            </button>
            <button
              className="chip"
              style={{ fontSize: 11 }}
              onClick={() => setSavingPreset(false)}
            >
              취소
            </button>
          </div>
        ) : (
          <button
            className="chip"
            style={{ fontSize: 11, color: 'var(--text-3)' }}
            onClick={() => setSavingPreset(true)}
          >
            + 현재 필터 저장
          </button>
        ))}
    </div>
  );
}
