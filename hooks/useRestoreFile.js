'use client';
import { useEffect, useRef, useState } from 'react';
import { showToast } from '@/components/Toast';
import { readBackupFile } from '@/lib/backup/read-file';
import { validateBackupPayload } from '@/lib/backup/validation';
import { UPLOAD_EXT, UPLOAD_MAX_MB, checkFileExt, checkFileSize } from '@/lib/upload-policy';

export function useRestoreFile({ onReset } = {}) {
  const [parsed, setParsed] = useState(null);
  const [reading, setReading] = useState(null); // { fileName, percent }
  // 가장 최근에 고른 파일만 반영한다
  const controllerRef = useRef(null);

  useEffect(() => () => controllerRef.current?.abort(), []);

  function cancelRead() {
    if (!controllerRef.current) return;
    controllerRef.current.abort();
    controllerRef.current = null;
    setReading(null);
    showToast('파일 읽기를 취소했어요', 'warn');
  }

  async function handleFile(e) {
    const file = e.target.files?.[0];
    if (!file) return;
    const extErr = checkFileExt(file, UPLOAD_EXT.backup);
    if (extErr) {
      showToast(extErr, 'error');
      return;
    }
    const sizeErr = checkFileSize(file, UPLOAD_MAX_MB.backup);
    if (sizeErr) {
      showToast(sizeErr, 'error');
      return;
    }
    setParsed(null);
    onReset?.();
    controllerRef.current?.abort();
    const controller = new AbortController();
    controllerRef.current = controller;
    setReading({ fileName: file.name, percent: null });
    try {
      const data = await readBackupFile(file, {
        signal: controller.signal,
        onProgress: percent => {
          if (controllerRef.current === controller) setReading({ fileName: file.name, percent });
        },
      });
      if (controllerRef.current !== controller) return;
      const { backup, summary } = validateBackupPayload(data);
      if (summary.versionMismatch) {
        showToast(
          `백업 파일 버전(${summary.version})이 현재(v3)와 다릅니다. 일부 데이터가 올바르게 복원되지 않을 수 있습니다.`,
          'warn',
          6000
        );
      }
      if (summary.unknownStores.length > 0) {
        showToast(
          `알 수 없는 store ${summary.unknownStores.length}개는 복원에서 건너뜁니다.`,
          'warn',
          6000
        );
      }
      if (summary.localStorageSummary?.invalidShape) {
        showToast(
          '백업의 설정값(localStorage) 섹션 형식이 맞지 않아 설정값 복원은 건너뜁니다.',
          'warn',
          6000
        );
      } else if (summary.localStorageSummary?.truncated) {
        showToast(
          '백업의 설정값 섹션이 커서 일부 키만 미리 검사했습니다. 허용된 설정값만 복원됩니다.',
          'warn',
          7000
        );
      }
      const failedStores = summary.failedStores;
      if (failedStores.length > 0) {
        showToast(
          `백업 생성 시 ${failedStores.length}개 store 오류 — 위험 승인 전까지 복원을 실행할 수 없습니다.`,
          'warn',
          8000
        );
      }
      setParsed({
        ...backup,
        _fileName: file.name,
        _summary: summary,
        _failedStores: failedStores,
      });
    } catch (err) {
      // 취소했거나 다른 파일을 골랐다
      if (controller.signal.aborted) return;
      console.error('[Restore] 파일 파싱 실패:', err);
      const detail = (err instanceof Error ? err.message : String(err || '')).trim();
      showToast(`백업 파일을 읽을 수 없습니다${detail ? `: ${detail}` : ''}`, 'error');
    } finally {
      if (controllerRef.current === controller) {
        controllerRef.current = null;
        setReading(null);
      }
    }
  }

  return { parsed, setParsed, handleFile, reading, cancelRead };
}
