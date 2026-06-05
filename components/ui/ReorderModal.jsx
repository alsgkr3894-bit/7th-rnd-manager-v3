'use client';
import { useRef, useState } from 'react';
import { ModalFrame } from '@/components/ui/ModalFrame';
import { Icon } from '@/components/icons';

/**
 * 순서 변경 모달 — 드래그로 항목을 이동하고 위/아래 버튼도 지원.
 * "적용"을 누르면 정렬된 key 배열을 onApply로 넘긴다.
 */
export function ReorderModal({ title, items, onApply, onClose }) {
  const [list, setList] = useState(() => items.map(it => ({ ...it })));
  const [draggingIdx, setDraggingIdx] = useState(null);
  const [overIdx, setOverIdx] = useState(null);
  const dragNode = useRef(null);

  /* ── 드래그 핸들러 ─────────────────────────────────── */
  function onDragStart(e, idx) {
    setDraggingIdx(idx);
    dragNode.current = idx;
    e.dataTransfer.effectAllowed = 'move';
    // 반투명 드래그 이미지 (기본 유지)
  }

  function onDragEnter(e, idx) {
    e.preventDefault();
    if (idx === draggingIdx) return;
    setOverIdx(idx);
  }

  function onDragOver(e) {
    e.preventDefault();
    e.dataTransfer.dropEffect = 'move';
  }

  function onDrop(e, idx) {
    e.preventDefault();
    if (draggingIdx === null || draggingIdx === idx) { reset(); return; }
    setList(prev => {
      const next = [...prev];
      const [item] = next.splice(draggingIdx, 1);
      next.splice(idx, 0, item);
      return next;
    });
    reset();
  }

  function onDragEnd() { reset(); }

  function reset() {
    setDraggingIdx(null);
    setOverIdx(null);
    dragNode.current = null;
  }

  /* ── 버튼 이동 ─────────────────────────────────────── */
  function move(idx, dir) {
    const j = idx + dir;
    if (j < 0 || j >= list.length) return;
    setList(prev => {
      const next = [...prev];
      [next[idx], next[j]] = [next[j], next[idx]];
      return next;
    });
  }

  function apply() { onApply(list.map(it => it.key)); onClose(); }

  return (
    <ModalFrame
      title={title}
      subtitle="드래그하거나 ▲▼ 버튼으로 순서를 바꾼 뒤 적용하세요."
      onClose={onClose}
      width="min(480px,95vw)"
    >
      <div style={{ display:'flex', flexDirection:'column', gap:4, maxHeight:'60vh', overflowY:'auto' }}>
        {list.map((it, idx) => {
          const isDragging = draggingIdx === idx;
          const isOver    = overIdx === idx && draggingIdx !== idx;
          return (
            <div
              key={it.key}
              draggable
              onDragStart={e => onDragStart(e, idx)}
              onDragEnter={e => onDragEnter(e, idx)}
              onDragOver={onDragOver}
              onDrop={e => onDrop(e, idx)}
              onDragEnd={onDragEnd}
              style={{
                display: 'flex', alignItems: 'center', gap: 8,
                padding: '8px 10px', borderRadius: 8,
                background: isOver ? 'var(--accent-soft)' : 'var(--surface-2)',
                border: `1px solid ${isOver ? 'var(--accent)' : 'var(--border)'}`,
                opacity: isDragging ? 0.4 : 1,
                cursor: 'grab',
                transition: 'background 120ms, border-color 120ms, opacity 120ms',
                userSelect: 'none',
              }}
            >
              {/* 드래그 핸들 아이콘 (⠿ dots) */}
              <span style={{ color:'var(--text-4)', flexShrink:0, display:'flex', alignItems:'center', cursor:'grab' }}>
                <svg width="14" height="14" viewBox="0 0 24 24" fill="currentColor">
                  <circle cx="9" cy="7" r="1.5"/><circle cx="15" cy="7" r="1.5"/>
                  <circle cx="9" cy="12" r="1.5"/><circle cx="15" cy="12" r="1.5"/>
                  <circle cx="9" cy="17" r="1.5"/><circle cx="15" cy="17" r="1.5"/>
                </svg>
              </span>
              <span style={{ width:22, textAlign:'center', fontSize:12, color:'var(--text-3)', fontWeight:700 }}>
                {idx + 1}
              </span>
              <span style={{ flex:1, fontSize:13, fontWeight:600, color:'var(--text-1)' }}>
                {it.label}
              </span>
              <button type="button" className="btn xs" aria-label="위로"
                disabled={idx === 0} onClick={() => move(idx, -1)}
                style={{ padding:'2px 6px', opacity: idx === 0 ? 0.3 : 1 }}>
                <Icon.arrowUp style={{ width:13, height:13 }} />
              </button>
              <button type="button" className="btn xs" aria-label="아래로"
                disabled={idx === list.length - 1} onClick={() => move(idx, 1)}
                style={{ padding:'2px 6px', opacity: idx === list.length - 1 ? 0.3 : 1 }}>
                <Icon.arrowDown style={{ width:13, height:13 }} />
              </button>
            </div>
          );
        })}
      </div>
      <div style={{ display:'flex', justifyContent:'flex-end', gap:8, marginTop:16 }}>
        <button type="button" className="btn" onClick={onClose}>취소</button>
        <button type="button" className="btn primary" onClick={apply}>적용</button>
      </div>
    </ModalFrame>
  );
}
