'use client';

import { useEffect, useState } from 'react';
import { Icon } from '@/components/icons';
import { asDisplayText, asObjectArray } from '@/lib/ui/prop-guards';

export function PhotoCarousel({
  photos = [],
  title = '사진',
  height = 132,
  placeholderSize = 28,
  onPhotoClick,
  showCount = true,
  rounded = 8,
}) {
  const safePhotos = asObjectArray(photos).filter(photo => asDisplayText(photo.data));
  const [index, setIndex] = useState(0);
  const count = safePhotos.length;
  const currentIndex = count > 0 ? Math.min(index, count - 1) : 0;
  const current = safePhotos[currentIndex] || null;
  const clickable = typeof onPhotoClick === 'function' && current;
  const firstPhotoData = safePhotos[0]?.data || '';

  useEffect(() => {
    setIndex(0);
  }, [count, firstPhotoData]);

  function move(delta, event) {
    event?.stopPropagation();
    if (count <= 1) return;
    setIndex(value => (value + delta + count) % count);
  }

  function openPhoto(event) {
    if (!clickable) return;
    event.stopPropagation();
    onPhotoClick(current, currentIndex);
  }

  return (
    <div
      style={{
        position: 'relative',
        height,
        minHeight: height,
        borderRadius: rounded,
        overflow: 'hidden',
        border: '1px solid var(--border)',
        background: 'var(--surface-2)',
        display: 'grid',
        placeItems: 'center',
      }}
      onClick={openPhoto}
    >
      {current ? (
        <img
          src={current.data}
          alt={current.caption || current.name || title}
          draggable={false}
          loading="lazy"
          style={{
            width: '100%',
            height: '100%',
            objectFit: 'contain',
            display: 'block',
            cursor: clickable ? 'zoom-in' : 'inherit',
          }}
        />
      ) : (
        <Icon.note
          aria-hidden="true"
          style={{
            width: placeholderSize,
            height: placeholderSize,
            opacity: 0.35,
            color: 'var(--text-4)',
          }}
        />
      )}

      {showCount && count > 1 && (
        <span
          style={{
            position: 'absolute',
            top: 7,
            right: 7,
            padding: '2px 7px',
            borderRadius: 999,
            background: 'rgba(0,0,0,0.58)',
            color: '#fff',
            fontSize: 10,
            fontWeight: 900,
            lineHeight: 1.2,
          }}
        >
          {currentIndex + 1}/{count}
        </span>
      )}

      {count > 1 && (
        <>
          <button
            type="button"
            aria-label="이전 사진"
            onClick={event => move(-1, event)}
            style={navButtonStyle('left')}
          >
            <Icon.chevLeft style={{ width: 15, height: 15 }} />
          </button>
          <button
            type="button"
            aria-label="다음 사진"
            onClick={event => move(1, event)}
            style={navButtonStyle('right')}
          >
            <Icon.chevRight style={{ width: 15, height: 15 }} />
          </button>
        </>
      )}
    </div>
  );
}

function navButtonStyle(side) {
  return {
    position: 'absolute',
    top: '50%',
    [side]: 6,
    transform: 'translateY(-50%)',
    width: 28,
    height: 28,
    borderRadius: '50%',
    border: '1px solid rgba(255,255,255,0.55)',
    background: 'rgba(0,0,0,0.52)',
    color: '#fff',
    display: 'inline-flex',
    alignItems: 'center',
    justifyContent: 'center',
    padding: 0,
    cursor: 'pointer',
    zIndex: 2,
  };
}
