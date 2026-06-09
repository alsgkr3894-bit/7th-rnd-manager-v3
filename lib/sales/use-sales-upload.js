'use client';
import { useEffect, useState } from 'react';
import { initDB } from '@/lib/db';
import { readExcelFile, readCsvFile } from '@/lib/excel';
import { showToast } from '@/components/Toast';
import { formatPeriodKor } from '@/lib/format';
import {
  validateSalesFile,
  classifyAndPrepare,
  saveSalesUpload,
  checkMonthExists,
  getUploadedFiles,
  deleteSalesFile,
  buildClassifierFromDB,
} from './index.js';

/**
 * useSalesUpload — 메뉴판매량 업로드 페이지의 상태와 액션 통합 hook.
 *
 * 반환:
 *   { ready, stage, error, preview, history,
 *     handleFile, handleConfirm, handleCancel, handleDeleteFile }
 *
 * stage: idle | parsing | preview | saving
 */
/**
 * 업로드 확인 시 DB에 저장할 meta·log 객체를 생성하는 순수 함수.
 * @param {object} preview
 * @param {string} [now] - ISO 타임스탬프 (테스트 시 고정값 주입 가능)
 */
function buildUploadArtifacts(preview, now = new Date().toISOString()) {
  const meta = {
    year: preview.period.year,
    month: preview.period.month,
    fileName: preview.fileName,
    uploadedAt: now,
    totalRows: preview.classifiedRows.length,
  };
  const log = {
    module: 'menu-sales',
    fileName: preview.fileName,
    uploadedAt: now,
    at: now,
    totalRows: preview.classifiedRows.length,
    validCount: preview.validRows.length,
    invalidCount: 0,
    year: preview.period.year,
    month: preview.period.month,
    summary: `${preview.classifiedRows.length}건 · 미매칭 ${preview.groupedIssues.length}그룹`,
  };
  return { meta, log };
}

export function useSalesUpload() {
  const [ready, setReady] = useState(false);
  const [stage, setStage] = useState('idle');
  const [error, setError] = useState(null);
  const [preview, setPreview] = useState(null);
  const [history, setHistory] = useState([]);

  useEffect(() => {
    (async () => {
      try {
        await initDB();
        setReady(true);
        await refreshHistory();
      } catch (err) {
        console.error('[upload] DB 초기화 실패:', err);
        showToast('DB 초기화에 실패했습니다.', 'err');
      }
    })();
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  async function refreshHistory() {
    try {
      const files = await getUploadedFiles();
      setHistory(files);
    } catch (err) {
      console.warn('[upload] 이력 조회 실패:', err);
    }
  }

  async function handleFile(file, fileError) {
    if (fileError) {
      showToast(fileError, 'err');
      return;
    }
    if (!file) return;

    setError(null);
    setStage('parsing');

    try {
      // 1. 파일 파싱 — rawRows는 2D 배열 (헤더 포함 원본 그대로)
      const ext = file.name.toLowerCase().slice(file.name.lastIndexOf('.'));
      const parsed =
        ext === '.csv'
          ? readCsvFile(await file.text())
          : await readExcelFile(await file.arrayBuffer());
      const rawRows = parsed.rawRows;

      // 2. 헤더/기간/행 검증
      const result = validateSalesFile(rawRows);
      if (!result.success) {
        setError({ reason: result.reason, invalidRows: result.invalidRows });
        setStage('idle');
        showToast('검증 실패: ' + result.reason, 'err');
        return;
      }

      // 3. 월 중복 사전 확인
      const dup = await checkMonthExists(result.period.year, result.period.month);
      if (dup) {
        setError({
          reason: `${formatPeriodKor(result.period)} 데이터가 이미 업로드되어 있습니다. 기존 데이터를 삭제한 뒤 다시 시도해주세요.`,
        });
        setStage('idle');
        showToast('이미 업로드된 월입니다.', 'err');
        return;
      }

      // 4. 분류 파이프라인 — DB 룰(사용자 추가) 우선 적용
      const classifier = await buildClassifierFromDB();
      const { classifiedRows, groupedIssues } = classifyAndPrepare(
        result.validRows,
        result.period.year,
        result.period.month,
        classifier
      );

      setPreview({
        period: result.period,
        validRows: result.validRows,
        classifiedRows,
        groupedIssues,
        fileName: file.name,
      });
      setStage('preview');
      showToast(`검증 완료 — ${result.summary.totalRows}건 처리됐어요`, 'ok');
    } catch (err) {
      console.error('[upload] 처리 실패:', err);
      setError({ reason: err.message || '파일 처리 중 오류가 발생했습니다.' });
      setStage('idle');
      showToast('업로드 처리 실패', 'err');
    }
  }

  async function handleConfirm() {
    if (!preview) return;
    setStage('saving');

    try {
      const { meta, log } = buildUploadArtifacts(preview);

      await saveSalesUpload({
        meta,
        classifiedRows: preview.classifiedRows,
        groupedIssues: preview.groupedIssues,
        log,
      });

      showToast(`${formatPeriodKor(meta)} 데이터 반영 완료`, 'ok');
      import('@/lib/work-log')
        .then(m =>
          m.logWork(
            'UPLOAD',
            `판매량 업로드: ${formatPeriodKor(meta)} (${meta?.totalRows ?? preview.classifiedRows?.length ?? ''}건)`
          )
        )
        .catch(() => {});
      setPreview(null);
      setStage('idle');
      await refreshHistory();
    } catch (err) {
      console.error('[upload] 저장 실패:', err);
      if (err.message === 'DUPLICATE_MONTH') {
        showToast('이미 업로드된 월입니다.', 'err');
      } else {
        showToast('저장에 실패했습니다.', 'err');
      }
      setStage('preview');
    }
  }

  function handleCancel() {
    setPreview(null);
    setError(null);
    setStage('idle');
  }

  async function handleDeleteFile(fileId, year, month) {
    try {
      await deleteSalesFile(fileId);
      showToast(`${formatPeriodKor({ year, month })} 데이터를 삭제했습니다`, 'ok');
      await refreshHistory();
    } catch (err) {
      console.error('[upload] 삭제 실패:', err);
      showToast('삭제 중 오류가 발생했습니다', 'err');
    }
  }

  return {
    ready,
    stage,
    error,
    preview,
    history,
    handleFile,
    handleConfirm,
    handleCancel,
    handleDeleteFile,
  };
}
