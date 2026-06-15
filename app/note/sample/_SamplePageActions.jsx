'use client';

import { Icon } from '@/components/icons';
import { downloadCsv, printCurrentPageWithDownloadDate } from '@/lib/download';
import { sampleNamesText } from '@/lib/sample';

export function SamplePageActions({
  filtered,
  batchMode,
  compareMode,
  selected,
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

  return (
    <div className="sample-actions">
      {!batchMode && !compareMode && (
        <>
          <button className="btn" onClick={handleExport} disabled={rows.length === 0}>
            <Icon.download style={{ width: 14, height: 14 }} /> 엑셀로 내보내기
          </button>
          <button
            style={{
              background: 'none',
              border: 'none',
              cursor: 'pointer',
              fontSize: 17,
              padding: '4px 6px',
              borderRadius: 8,
              color: 'var(--text-2)',
            }}
            onClick={() => printCurrentPageWithDownloadDate('샘플기록')}
            title="인쇄"
          >
            🖨
          </button>
        </>
      )}
      {batchMode ? (
        <>
          <button
            className="btn sm"
            style={{ color: 'var(--negative)', fontWeight: 700 }}
            onClick={onBatchDelete}
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
          <button className="btn sm" onClick={onStartBatchMode}>
            선택
          </button>
          <button className="btn sm" onClick={onStartCompareMode}>
            비교
          </button>
          <button className="btn primary" onClick={onCreateSample}>
            <Icon.plus style={{ width: 14, height: 14 }} /> 새 샘플 작성
          </button>
        </>
      )}
    </div>
  );
}
