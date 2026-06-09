/**
 * lib/image/resize.js — 이미지 리사이즈 유틸 (샘플·노트 공용)
 *
 * base64 JPEG 변환, 최대 1400px, 품질 0.78.
 * 반환: { data: string (data URL), name: string }
 */

const MAX_PX = 1400;
const MAX_BYTES = 5 * 1024 * 1024; // 5MB
const SVG_MIME = 'image/svg+xml';
const SUPPORTED_EXTENSIONS = ['.jpg', '.jpeg', '.png', '.gif', '.webp', '.bmp', '.heic', '.heif'];

function hasSupportedImageExtension(name) {
  const lowerName = String(name || '').toLowerCase();
  return SUPPORTED_EXTENSIONS.some(ext => lowerName.endsWith(ext));
}

export function isSupportedImageFile(file) {
  if (typeof File === 'undefined' || !(file instanceof File)) return false;
  const type = String(file.type || '').toLowerCase();
  const name = String(file.name || '').toLowerCase();
  if (type === SVG_MIME || name.endsWith('.svg')) return false;
  return type.startsWith('image/') || hasSupportedImageExtension(name);
}

export function imageFileError(file) {
  if (typeof File === 'undefined' || !(file instanceof File))
    return '파일 형식이 올바르지 않습니다';
  if (!isSupportedImageFile(file)) return '지원하지 않는 이미지 형식입니다';
  if (file.size > MAX_BYTES) {
    return `파일 크기가 5MB를 초과합니다 (${(file.size / 1024 / 1024).toFixed(1)}MB)`;
  }
  return '';
}

/** File → { data: base64 JPEG, name } */
export function resizePhoto(file) {
  return new Promise((resolve, reject) => {
    const error = imageFileError(file);
    if (error) {
      reject(new Error(error));
      return;
    }
    const img = new Image();
    const url = URL.createObjectURL(file);
    img.onload = () => {
      let w = img.width,
        h = img.height;
      if (w > MAX_PX || h > MAX_PX) {
        if (w > h) {
          h = Math.round((h * MAX_PX) / w);
          w = MAX_PX;
        } else {
          w = Math.round((w * MAX_PX) / h);
          h = MAX_PX;
        }
      }
      const canvas = document.createElement('canvas');
      canvas.width = w;
      canvas.height = h;
      canvas.getContext('2d').drawImage(img, 0, 0, w, h);
      URL.revokeObjectURL(url);
      resolve({ data: canvas.toDataURL('image/jpeg', 0.78), name: file.name });
    };
    img.onerror = () => {
      URL.revokeObjectURL(url);
      reject(new Error('이미지 로드 실패'));
    };
    img.src = url;
  });
}

/** FileList | File[] → { data, name }[] (순서 보장) */
export async function resizePhotos(files) {
  const arr = files ? Array.from(files) : [];
  return Promise.all(arr.map(resizePhoto));
}
