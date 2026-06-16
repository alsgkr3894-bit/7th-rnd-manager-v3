'use client';
/* eslint-disable @next/next/no-img-element */

export function SampleDetailPhotoPanel({
  photos,
  currentPhoto,
  currentPhotoIdx,
  title,
  names,
  scale,
  imgRef,
  setPhotoIdx,
}) {
  if (photos.length === 0) return null;

  return (
    <div
      style={{
        background: '#000',
        display: 'flex',
        flexDirection: 'column',
        alignItems: 'center',
        justifyContent: 'center',
        minHeight: 320,
        position: 'relative',
        overflow: 'hidden',
      }}
    >
      <img
        ref={imgRef}
        src={currentPhoto?.data}
        alt={`${names || title} 테스트 사진 ${currentPhotoIdx + 1}번 / 총 ${photos.length}장`}
        loading="lazy"
        style={{
          maxWidth: '100%',
          maxHeight: 480,
          objectFit: 'contain',
          touchAction: scale > 1 ? 'none' : 'auto',
          transformOrigin: 'center center',
          transition: 'transform 0.05s',
        }}
      />
      {photos.length > 1 && (
        <>
          <PhotoNavButton
            label="이전 사진"
            direction="prev"
            disabled={currentPhotoIdx === 0}
            onClick={() => setPhotoIdx(index => Math.max(0, index - 1))}
          />
          <PhotoNavButton
            label="다음 사진"
            direction="next"
            disabled={currentPhotoIdx === photos.length - 1}
            onClick={() => setPhotoIdx(index => Math.min(photos.length - 1, index + 1))}
          />
          <SamplePhotoThumbnails
            photos={photos}
            currentPhotoIdx={currentPhotoIdx}
            setPhotoIdx={setPhotoIdx}
          />
        </>
      )}
    </div>
  );
}

function PhotoNavButton({ label, direction, disabled, onClick }) {
  const isPrev = direction === 'prev';

  return (
    <button
      aria-label={label}
      onClick={onClick}
      disabled={disabled}
      style={{
        position: 'absolute',
        [isPrev ? 'left' : 'right']: 8,
        top: '50%',
        transform: 'translateY(-50%)',
        background: 'rgba(255,255,255,0.15)',
        border: 'none',
        borderRadius: 8,
        color: '#fff',
        width: 32,
        height: 32,
        cursor: 'pointer',
        fontSize: 18,
        opacity: disabled ? 0.3 : 1,
      }}
    >
      <span aria-hidden="true">{isPrev ? '‹' : '›'}</span>
    </button>
  );
}

function SamplePhotoThumbnails({ photos, currentPhotoIdx, setPhotoIdx }) {
  return (
    <div
      style={{
        display: 'flex',
        gap: 6,
        padding: '10px 12px',
        overflowX: 'auto',
        width: '100%',
        boxSizing: 'border-box',
      }}
    >
      {photos.map((photo, index) => (
        <button
          key={index}
          aria-label={`사진 ${index + 1}번${index === currentPhotoIdx ? ' (현재)' : ''}`}
          aria-pressed={index === currentPhotoIdx}
          onClick={() => setPhotoIdx(index)}
          style={{
            width: 52,
            height: 40,
            flexShrink: 0,
            borderRadius: 6,
            overflow: 'hidden',
            border: index === currentPhotoIdx ? '2px solid #fff' : '2px solid transparent',
            padding: 0,
            cursor: 'pointer',
            background: '#222',
          }}
        >
          <img src={photo.data} alt="" loading="lazy" />
        </button>
      ))}
    </div>
  );
}
