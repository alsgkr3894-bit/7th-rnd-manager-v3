'use client';
import { useEffect, useState } from 'react';
import { createPortal } from 'react-dom';
import { Icon } from '@/components/icons';

export function NotePhotoLightbox({ photo, title = '사진 보기', onClose }) {
  const [mounted, setMounted] = useState(false);

  useEffect(() => {
    setMounted(true);
  }, []);

  useEffect(() => {
    if (!photo) return undefined;
    function handleKeyDown(event) {
      if (event.key === 'Escape') onClose?.();
    }
    window.addEventListener('keydown', handleKeyDown);
    return () => window.removeEventListener('keydown', handleKeyDown);
  }, [photo, onClose]);

  if (!mounted || !photo?.data) return null;

  const displayTitle = String(title || photo.caption || '사진 보기').trim() || '사진 보기';

  return createPortal(
    <div
      role="dialog"
      aria-modal="true"
      aria-label="사진 크게 보기"
      onClick={event => {
        event.stopPropagation();
        onClose?.();
      }}
      style={{
        position: 'fixed',
        inset: 0,
        zIndex: 260,
        background: 'rgba(15, 23, 42, 0.82)',
        display: 'grid',
        placeItems: 'center',
        padding: 24,
        cursor: 'zoom-out',
      }}
    >
      <div
        className="card"
        onClick={event => event.stopPropagation()}
        style={{
          width: 'min(1040px, 96vw)',
          maxHeight: '94vh',
          padding: 14,
          display: 'grid',
          gap: 10,
          background: 'var(--surface)',
          cursor: 'default',
        }}
      >
        <div style={{ display: 'flex', alignItems: 'center', gap: 10 }}>
          <div style={{ minWidth: 0, flex: 1 }}>
            <div
              style={{
                fontSize: 14,
                fontWeight: 800,
                color: 'var(--text-1)',
                overflow: 'hidden',
                textOverflow: 'ellipsis',
                whiteSpace: 'nowrap',
              }}
            >
              {displayTitle}
            </div>
          </div>
          <button
            type="button"
            className="btn"
            onClick={event => {
              event.stopPropagation();
              onClose?.();
            }}
            aria-label="사진 닫기"
          >
            <Icon.close style={{ width: 16, height: 16 }} />
          </button>
        </div>
        <img
          src={photo.data}
          alt={displayTitle}
          style={{
            width: '100%',
            maxHeight: '82vh',
            objectFit: 'contain',
            borderRadius: 8,
            background: 'var(--surface-2)',
            border: '1px solid var(--border)',
          }}
        />
      </div>
    </div>,
    document.body
  );
}
