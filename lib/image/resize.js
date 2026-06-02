/**
 * lib/image/resize.js — 이미지 리사이즈 유틸 (샘플·노트 공용)
 *
 * base64 JPEG 변환, 최대 1400px, 품질 0.78.
 * 반환: { data: string (data URL), name: string }
 */

const MAX_PX   = 1400;
const MAX_BYTES = 5 * 1024 * 1024; // 5MB

/** File → { data: base64 JPEG, name } */
export function resizePhoto(file) {
  return new Promise((resolve, reject) => {
    if (file.size > MAX_BYTES) {
      reject(new Error(`파일 크기가 5MB를 초과합니다 (${(file.size / 1024 / 1024).toFixed(1)}MB)`));
      return;
    }
    const img = new Image();
    const url = URL.createObjectURL(file);
    img.onload = () => {
      let w = img.width, h = img.height;
      if (w > MAX_PX || h > MAX_PX) {
        if (w > h) { h = Math.round(h * MAX_PX / w); w = MAX_PX; }
        else        { w = Math.round(w * MAX_PX / h); h = MAX_PX; }
      }
      const canvas = document.createElement('canvas');
      canvas.width = w; canvas.height = h;
      canvas.getContext('2d').drawImage(img, 0, 0, w, h);
      URL.revokeObjectURL(url);
      resolve({ data: canvas.toDataURL('image/jpeg', 0.78), name: file.name });
    };
    img.onerror = () => { URL.revokeObjectURL(url); reject(new Error('이미지 로드 실패')); };
    img.src = url;
  });
}

/** FileList | File[] → { data, name }[] (순서 보장) */
export async function resizePhotos(files) {
  const arr = Array.from(files);
  return Promise.all(arr.map(resizePhoto));
}
