'use client';
import { createPortal } from 'react-dom';
import { Icon } from '@/components/icons';
import { useModalShell } from '@/hooks/useModalShell';
import { OVERLAY_COLOR } from '@/lib/ui/styles';

export function MarketPhotoLightbox({ photo, onClose }) {
  const { containerRef, isClosing, close } = useModalShell(onClose);
  if (!photo) return null;

  return createPortal(
    <div
      style={{
        position: 'fixed',
        inset: 0,
        background: OVERLAY_COLOR,
        display: 'grid',
        placeItems: 'center',
        zIndex: 400,
        padding: 24,
      }}
      onClick={close}
    >
      <div
        ref={containerRef}
        role="dialog"
        aria-modal="true"
        aria-label="사진 크게 보기"
        className={'modal-anim' + (isClosing ? ' modal-exit' : '')}
        style={{ maxWidth: '92vw', maxHeight: '92vh', display: 'grid', gap: 10 }}
        onClick={event => event.stopPropagation()}
      >
        <div style={{ display: 'flex', justifyContent: 'flex-end' }}>
          <button
            type="button"
            className="btn"
            style={{ padding: '4px 8px' }}
            onClick={close}
            aria-label="닫기"
          >
            <Icon.close style={{ width: 16, height: 16 }} />
          </button>
        </div>
        <img
          src={photo.data}
          alt={photo.caption || photo.name || '시장조사 사진'}
          style={{
            maxWidth: '92vw',
            maxHeight: '80vh',
            objectFit: 'contain',
            borderRadius: 8,
            display: 'block',
            margin: '0 auto',
          }}
        />
        {photo.caption && (
          <div style={{ color: '#fff', textAlign: 'center', fontSize: 13 }}>{photo.caption}</div>
        )}
      </div>
    </div>,
    document.body
  );
}
