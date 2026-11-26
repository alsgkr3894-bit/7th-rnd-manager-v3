/**
 * lib/image/resize.js — 이미지 리사이즈 유틸 (샘플·노트 공용)
 *
 * base64 JPEG 변환, 최대 1400px, 품질 0.78.
 * 반환: { data: string (data URL), name: string }
 *
 * 원본을 펼치는 데 사진 한 장에 수백 MB가 들 수 있어, 앱 전체에서 동시에 두 장까지만 변환하고
 * 지나치게 큰 해상도는 그리기 전에 거부한다.
 */

import { UPLOAD_MAX_MB } from '@/lib/upload-policy';

const MAX_PX = 1400;
export const MAX_PHOTO_PIXELS = 64_000_000;
export const RESIZE_CONCURRENCY = 2;
export const RESIZE_TIMEOUT_MS = 60_000;
const MAX_BYTES = UPLOAD_MAX_MB.photo * 1024 * 1024;
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
    return `파일 크기가 ${UPLOAD_MAX_MB.photo}MB를 초과합니다 (${(file.size / 1024 / 1024).toFixed(
      1
    )}MB)`;
  }
  return '';
}

function abortError() {
  const error = new Error('사진 처리를 취소했습니다');
  error.name = 'AbortError';
  return error;
}

function drawResized(img, name) {
  const sourceWidth = img.naturalWidth || img.width;
  const sourceHeight = img.naturalHeight || img.height;
  if (!sourceWidth || !sourceHeight) throw new Error('이미지 크기를 읽지 못했습니다');
  if (sourceWidth * sourceHeight > MAX_PHOTO_PIXELS) {
    throw new Error(
      `사진 해상도가 너무 큽니다 (${sourceWidth}×${sourceHeight}, 최대 ${MAX_PHOTO_PIXELS / 10000}만 화소)`
    );
  }
  let w = sourceWidth,
    h = sourceHeight;
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
  try {
    const context = canvas.getContext('2d');
    if (!context) throw new Error('이 브라우저에서 사진을 변환하지 못했습니다');
    context.drawImage(img, 0, 0, w, h);
    const data = canvas.toDataURL('image/jpeg', 0.78);
    if (!data.startsWith('data:image/jpeg')) {
      throw new Error('이 브라우저에서 사진을 변환하지 못했습니다');
    }
    return { data, name };
  } finally {
    // 다음 사진을 펼치기 전에 캔버스 메모리를 돌려준다
    canvas.width = 0;
    canvas.height = 0;
  }
}

/** 한 장 변환. 성공·실패·취소·시간 초과 어느 경우든 반드시 끝나고 임시 URL을 해제한다. */
function convert(file, signal) {
  return new Promise((resolve, reject) => {
    const img = new Image();
    const url = URL.createObjectURL(file);
    let settled = false;
    let timer = null;
    const onAbort = () => finish(reject, abortError());
    function finish(settle, value) {
      if (settled) return;
      settled = true;
      clearTimeout(timer);
      signal?.removeEventListener('abort', onAbort);
      img.onload = null;
      img.onerror = null;
      URL.revokeObjectURL(url);
      settle(value);
    }
    timer = setTimeout(
      () => finish(reject, new Error('사진 처리 시간이 초과됐습니다')),
      RESIZE_TIMEOUT_MS
    );
    signal?.addEventListener('abort', onAbort, { once: true });
    img.onload = () => {
      try {
        finish(resolve, drawResized(img, file.name));
      } catch (error) {
        finish(reject, error);
      }
    };
    img.onerror = () => finish(reject, new Error('이미지 로드 실패'));
    img.src = url;
  });
}

let active = 0;
const waiting = [];

function startWaiting() {
  while (active < RESIZE_CONCURRENCY && waiting.length > 0) waiting.shift()();
}

/** 차례가 오면 실행한다. 기다리는 동안 취소되면 실행하지 않는다. */
function inTurn(work, signal) {
  return new Promise((resolve, reject) => {
    if (signal?.aborted) {
      reject(abortError());
      return;
    }
    const cancelWaiting = () => {
      const index = waiting.indexOf(start);
      if (index >= 0) waiting.splice(index, 1);
      reject(abortError());
    };
    function start() {
      signal?.removeEventListener('abort', cancelWaiting);
      active += 1;
      work()
        .then(resolve, reject)
        .finally(() => {
          active -= 1;
          startWaiting();
        });
    }
    signal?.addEventListener('abort', cancelWaiting, { once: true });
    waiting.push(start);
    startWaiting();
  });
}

/**
 * File → { data: base64 JPEG, name }
 * @param {File} file
 * @param {{ signal?: AbortSignal }} [options]
 */
export function resizePhoto(file, options) {
  const error = imageFileError(file);
  if (error) return Promise.reject(new Error(error));
  const signal = options?.signal;
  return inTurn(() => convert(file, signal), signal);
}

/** FileList | File[] → { data, name }[] (순서 보장) */
export async function resizePhotos(files, options) {
  const arr = files ? Array.from(files) : [];
  return Promise.all(arr.map(file => resizePhoto(file, options)));
}
