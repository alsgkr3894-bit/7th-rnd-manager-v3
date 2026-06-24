'use client';
import { useRef } from 'react';
import { Icon } from './icons';
import { OVERLAY_COLOR } from '@/lib/ui/styles';
import { useModalOrigin } from '@/hooks/useModalOrigin';

export const SHORTCUTS = [
  { key: 'N', desc: '새 테스트 노트 작성', requiresEdit: true },
  { key: 'Ctrl/⌘ K', desc: '커맨드 팔레트 열기' },
  { key: 'Ctrl/⌘ S', desc: '작성·편집 화면 저장', requiresEdit: true },
  { key: '/', desc: '페이지 내 검색창 포커스' },
  { key: 'D', desc: '다크모드 토글' },
  { key: '?', desc: '단축키 도움말 토글' },
  { key: 'Esc', desc: '모달/팔레트 닫기' },
  { key: 'G H', desc: '홈으로 이동' },
  { key: 'G N', desc: '노트 목록으로 이동' },
  { key: 'G C', desc: '원가 계산으로 이동' },
  { key: 'G R', desc: '보고서로 이동' },
  { key: 'G S', desc: '샘플 기록으로 이동' },
  { key: 'G I', desc: '식자재로 이동' },
  { key: 'G U', desc: '영양성분으로 이동' },
  { key: 'G B', desc: '보고서로 이동' },
  { key: 'G J', desc: '제때로 이동' },
];

export function ShortcutsHelp({ onClose, canEdit = false }) {
  const cardRef = useRef(null);
  const visibleShortcuts = SHORTCUTS.filter(shortcut => canEdit || !shortcut.requiresEdit);
  useModalOrigin(cardRef);

  return (
    <div
      role="presentation"
      style={{
        position: 'fixed',
        inset: 0,
        background: OVERLAY_COLOR,
        zIndex: 600,
        display: 'grid',
        placeItems: 'center',
        animation: 'fade 150ms ease',
      }}
      onClick={e => {
        if (e.target === e.currentTarget) onClose();
      }}
    >
      <div
        ref={cardRef}
        className="card modal-anim"
        role="dialog"
        aria-label="키보드 단축키"
        aria-modal="true"
        style={{ width: 'min(380px,92vw)', padding: '24px 28px' }}
      >
        <div
          style={{
            display: 'flex',
            alignItems: 'center',
            justifyContent: 'space-between',
            marginBottom: 16,
          }}
        >
          <div style={{ fontWeight: 800, fontSize: 16, color: 'var(--text-1)' }}>키보드 단축키</div>
          <button className="btn" style={{ padding: '4px 8px' }} onClick={onClose}>
            <Icon.close style={{ width: 15, height: 15 }} />
          </button>
        </div>
        <div style={{ display: 'flex', flexDirection: 'column', gap: 10 }}>
          {visibleShortcuts.map(s => (
            <div
              key={s.key}
              style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between' }}
            >
              <span style={{ fontSize: 13, color: 'var(--text-2)' }}>{s.desc}</span>
              <kbd
                style={{
                  fontSize: 12,
                  fontWeight: 700,
                  padding: '3px 10px',
                  borderRadius: 7,
                  background: 'var(--surface-2)',
                  border: '1px solid var(--border-strong)',
                  color: 'var(--text-1)',
                  fontFamily: 'inherit',
                  flexShrink: 0,
                }}
              >
                {s.key}
              </kbd>
            </div>
          ))}
        </div>
      </div>
    </div>
  );
}
