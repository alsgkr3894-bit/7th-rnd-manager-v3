import { Icon } from '@/components/icons';

export function SamplePhotoCard({
  photos,
  maxPhotos,
  fileInputRef,
  onDrop,
  onPaste,
  onFiles,
  onRemovePhoto,
  maxPhotoMb = 20,
  onCaptionChange,
  readOnly = false,
}) {
  return (
    <div className="card" onPaste={onPaste}>
      <div
        style={{
          display: 'flex',
          justifyContent: 'space-between',
          alignItems: 'center',
          marginBottom: 12,
        }}
      >
        <div className="card-title">사진</div>
        <span style={{ fontSize: 12, color: 'var(--text-3)' }}>
          {photos.length} / {maxPhotos}
        </span>
      </div>

      {!readOnly && photos.length < maxPhotos && (
        <div
          onDrop={onDrop}
          onDragOver={event => event.preventDefault()}
          onClick={() => fileInputRef.current?.click()}
          style={{
            border: '2px dashed var(--border)',
            borderRadius: 12,
            padding: '24px 16px',
            textAlign: 'center',
            cursor: 'pointer',
            color: 'var(--text-3)',
            marginBottom: 12,
            transition: 'border-color 160ms',
          }}
          onMouseEnter={event => (event.currentTarget.style.borderColor = 'var(--accent)')}
          onMouseLeave={event => (event.currentTarget.style.borderColor = 'var(--border)')}
        >
          <div style={{ fontSize: 28, marginBottom: 6 }}>📷</div>
          <div style={{ fontSize: 13, fontWeight: 600 }}>클릭하거나 사진을 끌어다 놓으세요</div>
          <div style={{ fontSize: 11, marginTop: 4 }}>JPG · PNG · HEIC · 최대 {maxPhotos}장</div>
          <div style={{ fontSize: 11, marginTop: 2 }}>Ctrl+V 붙여넣기 · {maxPhotoMb}MB 이하</div>
        </div>
      )}

      <input
        ref={fileInputRef}
        type="file"
        accept="image/*"
        multiple
        disabled={readOnly}
        style={{ display: 'none' }}
        onChange={event => {
          if (readOnly) return;
          onFiles(event.target.files);
          event.target.value = '';
        }}
      />

      {photos.length > 0 && (
        <div
          style={{
            display: 'grid',
            gridTemplateColumns: 'repeat(auto-fit, minmax(170px, 1fr))',
            gap: 10,
          }}
        >
          {photos.map((photo, index) => (
            <div
              key={index}
              style={{ borderRadius: 8, overflow: 'visible', background: 'transparent' }}
            >
              <div
                style={{
                  position: 'relative',
                  aspectRatio: '4/3',
                  borderRadius: 8,
                  overflow: 'hidden',
                  background: 'var(--surface-2)',
                }}
              >
                <img
                  src={photo.data}
                  alt={photo.name}
                  style={{ width: '100%', height: '100%', objectFit: 'contain' }}
                />
                <button
                  onClick={() => onRemovePhoto(index)}
                  disabled={readOnly}
                  style={{
                    position: 'absolute',
                    top: 4,
                    right: 4,
                    background: 'rgba(0,0,0,0.55)',
                    border: 'none',
                    borderRadius: '50%',
                    width: 22,
                    height: 22,
                    cursor: readOnly ? 'not-allowed' : 'pointer',
                    display: 'flex',
                    alignItems: 'center',
                    justifyContent: 'center',
                    padding: 0,
                  }}
                >
                  <Icon.close style={{ width: 11, height: 11, color: '#fff' }} />
                </button>
                {index === 0 && (
                  <span
                    style={{
                      position: 'absolute',
                      bottom: 4,
                      left: 4,
                      background: 'rgba(0,0,0,0.5)',
                      color: '#fff',
                      fontSize: 9,
                      padding: '1px 5px',
                      borderRadius: 4,
                      fontWeight: 700,
                    }}
                  >
                    대표
                  </span>
                )}
              </div>
              <input
                className="form-input"
                style={{ marginTop: 4, fontSize: 11, padding: '4px 8px' }}
                value={photo.caption || ''}
                onChange={event => onCaptionChange(index, event.target.value)}
                placeholder="캡션 (선택)"
                disabled={readOnly}
              />
            </div>
          ))}
          {!readOnly && photos.length < maxPhotos && (
            <button
              onClick={() => fileInputRef.current?.click()}
              style={{
                aspectRatio: '4/3',
                border: '1px dashed var(--border)',
                borderRadius: 8,
                background: 'var(--surface-2)',
                cursor: 'pointer',
                display: 'flex',
                flexDirection: 'column',
                alignItems: 'center',
                justifyContent: 'center',
                gap: 4,
                color: 'var(--text-3)',
              }}
            >
              <Icon.plus style={{ width: 18, height: 18 }} />
              <span style={{ fontSize: 11 }}>추가</span>
            </button>
          )}
        </div>
      )}
    </div>
  );
}
