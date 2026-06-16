'use client';
import { createPortal } from 'react-dom';
import { Icon } from '@/components/icons';

export function PlatformSettingsShell({ onClose, onSave, children }) {
  return createPortal(
    <div
      style={{
        position: 'fixed',
        inset: 0,
        background: 'rgba(0,0,0,.5)',
        display: 'grid',
        placeItems: 'center',
        zIndex: 300,
      }}
    >
      <div
        className="card"
        style={{
          width: 'min(680px,96vw)',
          height: 'min(560px,92vh)',
          display: 'flex',
          flexDirection: 'column',
          padding: 0,
          overflow: 'hidden',
        }}
      >
        <div
          style={{
            display: 'flex',
            justifyContent: 'space-between',
            alignItems: 'center',
            padding: '16px 20px',
            borderBottom: '1px solid var(--divider)',
            flexShrink: 0,
          }}
        >
          <span style={{ fontWeight: 700, fontSize: 15 }}>플랫폼 수수료 설정</span>
          <button type="button" className="btn" style={{ padding: '4px 8px' }} onClick={onClose}>
            <Icon.close style={{ width: 15, height: 15 }} />
          </button>
        </div>

        <div style={{ flex: 1, display: 'flex', overflow: 'hidden' }}>{children}</div>

        <div
          style={{
            display: 'flex',
            justifyContent: 'flex-end',
            gap: 8,
            padding: '12px 20px',
            borderTop: '1px solid var(--divider)',
            flexShrink: 0,
          }}
        >
          <button type="button" className="btn" onClick={onClose}>
            취소
          </button>
          <button type="button" className="btn primary" onClick={onSave}>
            저장
          </button>
        </div>
      </div>
    </div>,
    document.body
  );
}
