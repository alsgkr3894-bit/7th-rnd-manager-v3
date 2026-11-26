/**
 * lib/backup/read-file.js — 사용자가 고른 백업 파일을 확인하고 읽는다 (복원·파일 확인 공용)
 *
 * 수백 MB 파일을 읽는 동안 화면이 멈추지 않게 별도 스레드에서 읽는다.
 */
import { parseBackupBlob } from '@/lib/backup/file-format';
import { createBackupReceiver } from '@/lib/backup/transfer';
import { UPLOAD_EXT, UPLOAD_MAX_MB, checkFileExt, checkFileSize } from '@/lib/upload-policy';
import { runInWorker } from '@/lib/worker/run-in-worker';

const READ_TIMEOUT_MS = 10 * 60 * 1000;

/** 확장자·크기 문제가 있으면 안내 문구, 없으면 null */
export function backupFileError(file) {
  return checkFileExt(file, UPLOAD_EXT.backup) || checkFileSize(file, UPLOAD_MAX_MB.backup);
}

/**
 * @param {File} file
 * @param {{ signal?: AbortSignal, onProgress?: (percent: number) => void }} [options]
 * @returns {Promise<object>} 백업 객체. 형식 문제가 있으면 안내 문구를 담아 throw,
 *   취소하면 name이 'AbortError'인 오류를 던진다.
 */
export async function readBackupFile(file, { signal, onProgress } = {}) {
  const invalid = backupFileError(file);
  if (invalid) throw new Error(invalid);
  const receiver = createBackupReceiver();
  const whole = await runInWorker({
    createWorker: () =>
      new Worker(new URL('./parse.worker.js', import.meta.url), { type: 'module' }),
    message: { blob: file },
    timeoutMs: READ_TIMEOUT_MS,
    signal,
    onProgress,
    onChunk: message => receiver.accept(message),
    fallback: () => parseBackupBlob(file, undefined, onProgress),
  });
  return receiver.result(whole);
}
