'use client';
import { useEffect, useRef } from 'react';
import { Icon } from '@/components/icons';
import { showToast } from '@/components/Toast';
import { isSupportedImageFile, resizePhoto } from '@/lib/image/resize';

const MAX_NOTE_PHOTOS = 8;

function clipboardImageFiles(clipboardData) {
  const itemFiles = Array.from(clipboardData?.items || [])
    .filter(item => item.kind === 'file' && String(item.type || '').startsWith('image/'))
    .map((item, index) => {
      const file = item.getAsFile();
      if (!file) return null;
      if (file.name) return file;
      return new File([file], `pasted-note-photo-${Date.now()}-${index + 1}.png`, {
        type: file.type || 'image/png',
      });
    })
    .filter(Boolean);
  if (itemFiles.length > 0) return itemFiles;
  return Array.from(clipboardData?.files || []).filter(file =>
    String(file?.type || '').startsWith('image/')
  );
}

/** 노트 사진 첨부 카드 (샘플기록과 동일한 base64 JPEG 방식) */
export function NotePhotoSection({ photos = [], onChange }) {
  const fileRef = useRef(null);
  const safePhotos = Array.isArray(photos)
    ? photos.filter(photo => photo && typeof photo === 'object')
    : [];
  const change = typeof onChange === 'function' ? onChange : () => {};

  async function addFiles(files) {
    const allFiles = files ? Array.from(files) : [];
    const imageFiles = allFiles.filter(isSupportedImageFile);
    const rejected = allFiles.length - imageFiles.length;
    if (rejected > 0) showToast('지원하지 않는 이미지 파일은 제외했어요', 'warn');

    const remaining = MAX_NOTE_PHOTOS - safePhotos.length;
    if (remaining <= 0) {
      showToast(`사진은 최대 ${MAX_NOTE_PHOTOS}장까지 추가할 수 있습니다`, 'warn');
      return;
    }
    const targets = imageFiles.slice(0, remaining);
    if (targets.length === 0) return;
    const settled = await Promise.allSettled(targets.map(file => resizePhoto(file)));
    const resized = [];
    const failed = [];
    const uploadedAt = new Date().toISOString();
    settled.forEach((result, index) => {
      if (result.status === 'fulfilled') resized.push({ ...result.value, caption: '', uploadedAt });
      else failed.push(targets[index].name);
    });
    if (resized.length) change([...safePhotos, ...resized]);
    if (failed.length) showToast(`사진 처리 실패: ${failed.join(', ')}`, 'warn');
  }

  function handlePaste(event) {
    const pastedFiles = clipboardImageFiles(event.clipboardData);
    if (pastedFiles.length === 0) return;
    event.preventDefault();
    addFiles(pastedFiles);
  }

  useEffect(() => {
    function handleDocumentPaste(event) {
      if (event.defaultPrevented) return;
      handlePaste(event);
    }
    document.addEventListener('paste', handleDocumentPaste);
    return () => document.removeEventListener('paste', handleDocumentPaste);
  });

  function removePhoto(idx) {
    change(safePhotos.filter((_, index) => index !== idx));
  }
  function setCaption(idx, value) {
    change(
      safePhotos.map((photo, index) => (index === idx ? { ...photo, caption: value } : photo))
    );
  }

  return (
    <div className="card" onPaste={handlePaste}>
      <div
        style={{
          display: 'flex',
          justifyContent: 'space-between',
          alignItems: 'center',
          marginBottom: 12,
        }}
      >
        <div className="card-title" style={{ margin: 0 }}>
          사진 첨부
          {safePhotos.length > 0 && (
            <span style={{ marginLeft: 8, fontSize: 12, fontWeight: 500, color: 'var(--text-3)' }}>
              {safePhotos.length}/{MAX_NOTE_PHOTOS}
            </span>
          )}
        </div>
        {safePhotos.length < MAX_NOTE_PHOTOS && (
          <button type="button" className="btn sm" onClick={() => fileRef.current?.click()}>
            <Icon.plus style={{ width: 12, height: 12 }} /> 사진 추가
          </button>
        )}
      </div>
      <input
        ref={fileRef}
        type="file"
        accept="image/*"
        multiple
        hidden
        onChange={event => {
          addFiles(event.target.files);
          event.target.value = '';
        }}
      />

      {safePhotos.length < MAX_NOTE_PHOTOS && (
        <div
          style={{
            border: '2px dashed var(--border)',
            borderRadius: 10,
            padding: '20px 16px',
            textAlign: 'center',
            fontSize: 13,
            color: 'var(--text-3)',
            cursor: 'pointer',
            marginBottom: safePhotos.length > 0 ? 12 : 0,
          }}
          onClick={() => fileRef.current?.click()}
          onDrop={event => {
            event.preventDefault();
            addFiles(event.dataTransfer.files);
          }}
          onDragOver={event => event.preventDefault()}
        >
          드래그하거나 클릭해 사진 추가 · Ctrl+V 붙여넣기 · 최대 {MAX_NOTE_PHOTOS}장 · 5MB 이하
        </div>
      )}

      {safePhotos.length > 0 && (
        <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: 10 }}>
          {safePhotos.map((photo, index) => (
            <div key={index} style={{ position: 'relative' }}>
              {index === 0 && (
                <span
                  style={{
                    position: 'absolute',
                    top: 6,
                    left: 6,
                    fontSize: 10,
                    fontWeight: 700,
                    padding: '1px 6px',
                    borderRadius: 999,
                    background: 'var(--accent)',
                    color: 'var(--surface)',
                    zIndex: 1,
                  }}
                >
                  대표
                </span>
              )}
              <button
                type="button"
                onClick={() => removePhoto(index)}
                aria-label={`${photo.caption || photo.name || '사진'} 삭제`}
                style={{
                  position: 'absolute',
                  top: 6,
                  right: 6,
                  width: 22,
                  height: 22,
                  borderRadius: '50%',
                  border: 'none',
                  background: 'rgba(0,0,0,.55)',
                  color: '#fff',
                  cursor: 'pointer',
                  display: 'flex',
                  alignItems: 'center',
                  justifyContent: 'center',
                  zIndex: 1,
                }}
              >
                <Icon.close style={{ width: 11, height: 11 }} />
              </button>
              <img
                src={photo.data}
                alt={photo.name}
                style={{
                  width: '100%',
                  aspectRatio: '4/3',
                  objectFit: 'cover',
                  borderRadius: 8,
                  display: 'block',
                }}
              />
              <input
                className="form-input"
                value={photo.caption}
                onChange={event => setCaption(index, event.target.value)}
                placeholder="캡션 (선택)"
                style={{ marginTop: 4, fontSize: 12 }}
              />
            </div>
          ))}
        </div>
      )}
    </div>
  );
}
