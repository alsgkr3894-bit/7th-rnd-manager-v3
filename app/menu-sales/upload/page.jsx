'use client';
import { useEffect, useState } from 'react';
import { PageHeader } from '@/components/ui/PageHeader';
import { showToast } from '@/components/Toast';
import { initDB } from '@/lib/db';
import { readExcelFile, readCsvFile } from '@/lib/excel';
import {
  validateSalesFile,
  classifyAndPrepare,
  saveSalesUpload,
  checkMonthExists,
  getUploadedFiles,
} from '@/lib/sales';
import { UploadStepBar } from '@/components/sales/UploadStepBar';
import { UploadDropzone } from '@/components/sales/UploadDropzone';
import { UploadPreview } from '@/components/sales/UploadPreview';
import { UploadHistory } from '@/components/sales/UploadHistory';
import { UploadErrorBanner } from '@/components/sales/UploadErrorBanner';

export default function Page() {
  const [ready, setReady] = useState(false);
  const [stage, setStage] = useState('idle'); // idle | parsing | preview | saving
  const [error, setError] = useState(null);
  const [preview, setPreview] = useState(null);
  const [history, setHistory] = useState([]);

  useEffect(() => {
    (async () => {
      try {
        await initDB();
        setReady(true);
        refreshHistory();
      } catch (err) {
        console.error('[upload] DB 초기화 실패:', err);
        showToast('DB 초기화에 실패했습니다.', 'err');
      }
    })();
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
    if (fileError) { showToast(fileError, 'err'); return; }
    if (!file) return;

    setError(null);
    setStage('parsing');

    try {
      // 1. 파일 파싱 (xlsx | csv) — rawRows는 2D 배열 (헤더 포함 원본 그대로)
      const ext = file.name.toLowerCase().slice(file.name.lastIndexOf('.'));
      let parsed;
      if (ext === '.csv') {
        const text = await file.text();
        parsed = readCsvFile(text);
      } else {
        const buf = await file.arrayBuffer();
        parsed = await readExcelFile(buf);
      }
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
          reason: `${result.period.year}년 ${result.period.month}월 데이터가 이미 업로드되어 있습니다. 기존 데이터를 삭제한 뒤 다시 시도해주세요.`,
        });
        setStage('idle');
        showToast('이미 업로드된 월입니다.', 'err');
        return;
      }

      // 4. 분류 파이프라인 (정규화 → 별칭 → 룰 → 상태)
      const { classifiedRows, groupedIssues } =
        classifyAndPrepare(result.validRows, result.period.year, result.period.month);

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
      const now = new Date().toISOString();
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

      await saveSalesUpload({
        meta,
        classifiedRows: preview.classifiedRows,
        groupedIssues: preview.groupedIssues,
        log,
      });

      showToast(`${meta.year}년 ${meta.month}월 데이터 반영 완료`, 'ok');
      setPreview(null);
      setStage('idle');
      refreshHistory();
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

  return (
    <main className="main">
      <PageHeader
        breadcrumb={['메뉴 판매량', '판매량 업로드']}
        title="메뉴판매량 업로드"
        sub="엑셀 / CSV 파일을 업로드하면 검증·미리보기·반영 순서로 처리해요. 자동 덮어쓰기는 하지 않아요."
      />

      <UploadStepBar stage={stage} />

      <UploadErrorBanner error={error} />

      {stage !== 'preview' && stage !== 'saving' ? (
        <UploadDropzone
          onFile={handleFile}
          disabled={!ready || stage === 'parsing'}
          busyText={stage === 'parsing' ? '검증 중...' : 'DB 초기화 중...'}
        />
      ) : (
        <UploadPreview
          period={preview.period}
          classifiedRows={preview.classifiedRows}
          groupedIssues={preview.groupedIssues}
          onCancel={handleCancel}
          onConfirm={handleConfirm}
          saving={stage === 'saving'}
        />
      )}

      <UploadHistory files={history} />
    </main>
  );
}
