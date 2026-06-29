'use client';

import { Icon } from '@/components/icons';
import { showToast } from '@/components/Toast';
import { downloadCsv } from '@/lib/download';
import { sampleNamesText } from '@/lib/sample';
import { printSampleRecordsReport } from '@/lib/sample/report-print';

export function SamplePageActions({
  filtered,
  batchMode,
  compareMode,
  selected,
  canEdit = false,
  onBatchDelete,
  onExitBatchMode,
  onExitCompareMode,
  onStartBatchMode,
  onStartCompareMode,
  onCreateSample,
}) {
  const rows = Array.isArray(filtered) ? filtered : [];
  const selectedCount = selected?.size || 0;

  function handleExport() {
    const headers = ['제목', '카테고리', '메뉴명', '업체', '테스트일', '별점', '설명', '태그'];
    const csvRows = rows.map(sample => [
      sample.title || '',
      sample.category || '',
      sampleNamesText(sample),
      sample.company || '',
      sample.testDate || '',
      sample.rating != null ? sample.rating : '',
      sample.description || '',
      sample.tags || '',
    ]);
    downloadCsv([headers, ...csvRows], '샘플기록.csv');
  }

  function handlePrintPdf() {
    if (rows.length === 0) {
      showToast('PDF로 출력할 샘플기록이 없어요', 'warn');
      return;
    }
    const opened = printSampleRecordsReport(rows, {
      title: '샘플기록 PDF 보고서',
      scopeLabel: '현재 필터 결과',
    });
    if (opened) showToast(`샘플기록 ${rows.length}건 PDF 출력 창을 열었어요`, 'ok', 1800);
  }

  return (
    <div className="sample-actions">
      {!batchMode && !compareMode && (
        <>
          <button className="btn" onClick={handleExport} disabled={rows.length === 0}>
            <Icon.download style={{ width: 14, height: 14 }} /> 엑셀로 내보내기
          </button>
          <button className="btn" onClick={handlePrintPdf} disabled={rows.length === 0}>
            <Icon.doc style={{ width: 14, height: 14 }} /> PDF 출력
          </button>
        </>
      )}
      {batchMode ? (
        <>
          <button
            className="btn sm"
            style={{ color: 'var(--negative)', fontWeight: 700 }}
            onClick={onBatchDelete}
            disabled={!canEdit}
          >
            선택 삭제 ({selectedCount})
          </button>
          <button className="btn sm" onClick={onExitBatchMode}>
            취소
          </button>
        </>
      ) : compareMode ? (
        <>
          <button className="btn sm" onClick={onExitCompareMode}>
            비교 취소
          </button>
        </>
      ) : (
        <>
          <button className="btn sm" onClick={onStartBatchMode} disabled={!canEdit}>
            선택
          </button>
          <button className="btn sm" onClick={onStartCompareMode}>
            비교
          </button>
          <button className="btn primary" onClick={onCreateSample} disabled={!canEdit}>
            <Icon.plus style={{ width: 14, height: 14 }} /> 새 샘플 작성
          </button>
        </>
      )}
    </div>
  );
}
