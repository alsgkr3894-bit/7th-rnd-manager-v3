/**
 * lib/backup/read-file.js — 사용자가 고른 백업 파일을 확인하고 읽는다 (복원·파일 확인 공용)
 */
import { parseBackupBlob } from '@/lib/backup/file-format';
import { UPLOAD_EXT, UPLOAD_MAX_MB, checkFileExt, checkFileSize } from '@/lib/upload-policy';

/** 확장자·크기 문제가 있으면 안내 문구, 없으면 null */
export function backupFileError(file) {
  return checkFileExt(file, UPLOAD_EXT.backup) || checkFileSize(file, UPLOAD_MAX_MB.backup);
}

/** @returns {Promise<object>} 백업 객체. 형식 문제가 있으면 안내 문구를 담아 throw */
export async function readBackupFile(file) {
  const invalid = backupFileError(file);
  if (invalid) throw new Error(invalid);
  return parseBackupBlob(file);
}
