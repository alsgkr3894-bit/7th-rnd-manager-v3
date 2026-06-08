'use client';
import { useState } from 'react';
import { ModalFrame } from '@/components/ui/ModalFrame';

/**
 * 출력용 메뉴명 편집 모달.
 * menus: [{ menuCode, menuName }]  — 원래 이름
 * overrides: { [menuCode]: string } — 현재 저장된 override
 * onApply(newOverrides) — 변경 후 전체 map 전달
 */
export function MenuNameEditModal({ menus, overrides, onApply, onClose }) {
  const [vals, setVals] = useState(() => {
    const m = {};
    for (const { menuCode } of menus) {
      m[menuCode] = overrides[menuCode] ?? '';
    }
    return m;
  });

  function apply() {
    const next = { ...overrides };
    for (const { menuCode } of menus) {
      const v = (vals[menuCode] || '').trim();
      if (v) next[menuCode] = v;
      else delete next[menuCode];
    }
    onApply(next);
    onClose();
  }

  function resetAll() {
    setVals(prev => {
      const cleared = {};
      for (const k of Object.keys(prev)) cleared[k] = '';
      return cleared;
    });
  }

  return (
    <ModalFrame
      title="출력용 메뉴명 편집"
      subtitle="출력·표시에만 반영됩니다. 비우면 원래 이름으로 복원됩니다."
      onClose={onClose}
      width="min(560px, 95vw)"
    >
      <div style={{ display: 'flex', flexDirection: 'column', gap: 6, maxHeight: '60vh', overflowY: 'auto' }}>
        {menus.map(({ menuCode, menuName }) => (
          <div
            key={menuCode}
            style={{
              display: 'grid',
              gridTemplateColumns: '1fr 1fr',
              gap: 8,
              alignItems: 'center',
              padding: '6px 10px',
              borderRadius: 8,
              background: 'var(--surface-2)',
              border: '1px solid var(--border)',
            }}
          >
            <span style={{ fontSize: 13, color: 'var(--text-3)', overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap' }}>
              {menuName}
            </span>
            <input
              type="text"
              value={vals[menuCode] ?? ''}
              onChange={e => setVals(prev => ({ ...prev, [menuCode]: e.target.value }))}
              placeholder={menuName}
              style={{
                fontSize: 13,
                padding: '5px 8px',
                border: '1px solid var(--border)',
                borderRadius: 6,
                background: 'var(--surface)',
                color: 'var(--text-1)',
                width: '100%',
                boxSizing: 'border-box',
              }}
            />
          </div>
        ))}
      </div>
      <div style={{ display: 'flex', justifyContent: 'space-between', gap: 8, marginTop: 16 }}>
        <button type="button" className="btn sm" onClick={resetAll}>전체 초기화</button>
        <div style={{ display: 'flex', gap: 8 }}>
          <button type="button" className="btn" onClick={onClose}>취소</button>
          <button type="button" className="btn primary" onClick={apply}>적용</button>
        </div>
      </div>
    </ModalFrame>
  );
}
