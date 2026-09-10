'use client';
import { useRef, useState } from 'react';
import { Icon } from '@/components/icons';
import { showToast } from '@/components/Toast';
import { isSupportedImageFile, resizePhoto } from '@/lib/image/resize';
import { UPLOAD_MAX_MB, checkFileSize } from '@/lib/upload-policy';

/**
 * MenuMasterPhotoField — 메뉴마스터 완성 사진 단일 슬롯.
 * 식자재(lib/ingredient/photos.js)는 슬롯 3개(포장/상세/실물)를 쓰지만,
 * 메뉴는 보통 완성 사진 1장이면 충분해 단일 슬롯으로 시작한다.
 * 저장 형태: lib/image/resize.js와 동일한 base64 JPEG data URL.
 */
export function MenuMasterPhotoField({ photo, onChange }) {
  const fileRef = useRef(null);
  const [uploading, setUploading] = useState(false);
  const change = typeof onChange === 'function' ? onChange : () => {};

  async function handleFile(file) {
    if (!file) return;
    if (!isSupportedImageFile(file)) {
      showToast('지원하지 않는 이미지 형식입니다', 'warn');
      return;
    }
    const sizeErr = checkFileSize(file, UPLOAD_MAX_MB.photo);
    if (sizeErr) {
      showToast(sizeErr, 'warn');
      return;
    }
    setUploading(true);
    try {
      const resized = await resizePhoto(file);
      change(resized);
    } catch (err) {
      showToast(err?.message || '사진 처리에 실패했습니다', 'error');
    } finally {
      setUploading(false);
    }
  }

  function handleDrop(e) {
    e.preventDefault();
    handleFile(e.dataTransfer?.files?.[0]);
  }

  return (
    <div>
      <div
        style={{
          fontSize: 12,
          fontWeight: 700,
          color: 'var(--text-3)',
          marginBottom: 6,
        }}
      >
        사진
      </div>
      {photo?.data ? (
        <div style={{ position: 'relative', width: 120, height: 120 }}>
          <img
            src={photo.data}
            alt={photo.name || '메뉴 사진'}
            style={{
              width: '100%',
              height: '100%',
              objectFit: 'cover',
              borderRadius: 10,
              border: '1px solid var(--border)',
            }}
          />
          <button
            type="button"
            className="btn sm"
            onClick={() => change(null)}
            style={{
              position: 'absolute',
              top: 4,
              right: 4,
              padding: '2px 6px',
              background: 'var(--surface)',
            }}
            aria-label="사진 삭제"
          >
            <Icon.close style={{ width: 12, height: 12 }} />
          </button>
        </div>
      ) : (
        <div
          onClick={() => fileRef.current?.click()}
          onDrop={handleDrop}
          onDragOver={e => e.preventDefault()}
          style={{
            width: 120,
            height: 120,
            display: 'flex',
            flexDirection: 'column',
            alignItems: 'center',
            justifyContent: 'center',
            gap: 4,
            border: '1px dashed var(--border)',
            borderRadius: 10,
            cursor: 'pointer',
            color: 'var(--text-4)',
            fontSize: 11,
            background: 'var(--surface-2)',
          }}
        >
          <span style={{ fontSize: 20 }}>📷</span>
          {uploading ? '처리 중…' : '클릭 또는 드래그'}
        </div>
      )}
      <input
        ref={fileRef}
        type="file"
        accept="image/*"
        style={{ display: 'none' }}
        onChange={e => {
          handleFile(e.target.files?.[0]);
          e.target.value = '';
        }}
      />
    </div>
  );
}
