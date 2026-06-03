'use client';
import { useState } from 'react';
import { ModalFrame } from '@/components/ui/ModalFrame';
import { Icon } from '@/components/icons';

/**
 * 순서 변경 모달 — 항목을 한 줄씩 나열하고 위/아래 버튼으로 이동한다.
 * "적용"을 누르면 정렬된 key 배열을 onApply로 넘긴다.
 *
 * @param {string} title
 * @param {{key:string,label:string}[]} items  초기 순서의 항목 목록
 * @param {(orderedKeys:string[])=>void} onApply
 * @param {()=>void} onClose
 */
export function ReorderModal({ title, items, onApply, onClose }) {
  const [list, setList] = useState(() => items.map(it => ({ ...it })));

  function move(idx, dir) {
    const j = idx + dir;
    if (j < 0 || j >= list.length) return;
    setList(prev => {
      const next = [...prev];
      [next[idx], next[j]] = [next[j], next[idx]];
      return next;
    });
  }

  function apply() {
    onApply(list.map(it => it.key));
    onClose();
  }

  return (
    <ModalFrame
      title={title}
      subtitle="위/아래 버튼으로 순서를 바꾼 뒤 적용하세요."
      onClose={onClose}
      width="min(440px,95vw)"
    >
      <div
        style={{
          display: 'flex',
          flexDirection: 'column',
          gap: 4,
          maxHeight: '60vh',
          overflowY: 'auto',
        }}
      >
        {list.map((it, idx) => (
          <div
            key={it.key}
            style={{
              display: 'flex',
              alignItems: 'center',
              gap: 8,
              padding: '8px 10px',
              borderRadius: 8,
              background: 'var(--surface-2)',
              border: '1px solid var(--border)',
            }}
          >
            <span
              style={{
                width: 24,
                textAlign: 'center',
                fontSize: 12,
                color: 'var(--text-3)',
                fontWeight: 700,
              }}
            >
              {idx + 1}
            </span>
            <span style={{ flex: 1, fontSize: 13, fontWeight: 600, color: 'var(--text-1)' }}>
              {it.label}
            </span>
            <button
              type="button"
              className="btn xs"
              aria-label="위로"
              disabled={idx === 0}
              onClick={() => move(idx, -1)}
              style={{ padding: '2px 6px', opacity: idx === 0 ? 0.35 : 1 }}
            >
              <Icon.arrowUp style={{ width: 14, height: 14 }} />
            </button>
            <button
              type="button"
              className="btn xs"
              aria-label="아래로"
              disabled={idx === list.length - 1}
              onClick={() => move(idx, 1)}
              style={{ padding: '2px 6px', opacity: idx === list.length - 1 ? 0.35 : 1 }}
            >
              <Icon.arrowDown style={{ width: 14, height: 14 }} />
            </button>
          </div>
        ))}
      </div>
      <div style={{ display: 'flex', justifyContent: 'flex-end', gap: 8, marginTop: 16 }}>
        <button type="button" className="btn" onClick={onClose}>
          취소
        </button>
        <button type="button" className="btn primary" onClick={apply}>
          적용
        </button>
      </div>
    </ModalFrame>
  );
}
