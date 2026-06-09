'use client';
import { PageHeader } from '@/components/ui/PageHeader';
import { useSalesUpload } from '@/lib/sales/use-sales-upload';
import { UploadStepBar } from '@/components/sales/UploadStepBar';
import { UploadDropzone } from '@/components/sales/UploadDropzone';
import { UploadPreview } from '@/components/sales/UploadPreview';
import { UploadHistory } from '@/components/sales/UploadHistory';
import { UploadErrorBanner } from '@/components/sales/UploadErrorBanner';

export default function Page() {
  const {
    ready,
    stage,
    error,
    preview,
    history,
    handleFile,
    handleConfirm,
    handleCancel,
    handleDeleteFile,
  } = useSalesUpload();
  const safePreview =
    preview && typeof preview === 'object' && !Array.isArray(preview) ? preview : null;
  const isPreviewStage = stage === 'preview' || stage === 'saving';
  const isDropzoneDisabled = !ready || stage === 'parsing' || (isPreviewStage && !safePreview);
  const busyText =
    stage === 'parsing'
      ? '검증 중...'
      : isPreviewStage && !safePreview
        ? '미리보기 준비 중...'
        : 'DB 초기화 중...';

  return (
    <main className="main">
      <PageHeader
        breadcrumb={['메뉴 판매량', '판매량 업로드']}
        title="메뉴판매량 업로드"
        sub="엑셀 / CSV 파일을 업로드하면 검증·미리보기·반영 순서로 처리해요. 자동 덮어쓰기는 하지 않아요."
      />

      <UploadStepBar stage={stage} />

      <UploadErrorBanner error={error} />

      {!isPreviewStage || !safePreview ? (
        <UploadDropzone onFile={handleFile} disabled={isDropzoneDisabled} busyText={busyText} />
      ) : (
        <UploadPreview
          period={safePreview.period}
          classifiedRows={safePreview.classifiedRows}
          groupedIssues={safePreview.groupedIssues}
          onCancel={handleCancel}
          onConfirm={handleConfirm}
          saving={stage === 'saving'}
        />
      )}

      <UploadHistory files={history} onDelete={handleDeleteFile} />
    </main>
  );
}
