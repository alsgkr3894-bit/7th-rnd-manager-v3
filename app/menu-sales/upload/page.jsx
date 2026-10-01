'use client';
import { PageHeader } from '@/components/ui/PageHeader';
import { useSalesUpload } from '@/lib/sales/use-sales-upload';
import { UploadStepBar } from '@/components/sales/UploadStepBar';
import { UploadDropzone } from '@/components/sales/UploadDropzone';
import { UploadPreview } from '@/components/sales/UploadPreview';
import { RevenueFillPreview } from '@/components/sales/RevenueFillPreview';
import { UploadHistory } from '@/components/sales/UploadHistory';
import { UploadErrorBanner } from '@/components/sales/UploadErrorBanner';
import { useCurrentRole } from '@/hooks/useCurrentRole';

export default function Page() {
  const { isAdmin, ready: roleReady } = useCurrentRole();
  const canEdit = roleReady && isAdmin;
  const {
    ready,
    stage,
    error,
    preview,
    fillPreview,
    history,
    handleFile,
    handleConfirm,
    handleFillConfirm,
    handleCancel,
    handleDeleteFile,
  } = useSalesUpload({ canEdit });
  const safePreview =
    preview && typeof preview === 'object' && !Array.isArray(preview) ? preview : null;
  const isPreviewStage = stage === 'preview' || stage === 'saving';
  const isFillStage = (stage === 'fill-preview' || stage === 'fill-saving') && !!fillPreview;
  const isDropzoneDisabled =
    !canEdit || !ready || stage === 'parsing' || (isPreviewStage && !safePreview);
  const busyText =
    stage === 'parsing'
      ? '검증 중...'
      : isPreviewStage && !safePreview
        ? '미리보기 준비 중...'
        : 'DB 초기화 중...';

  function renderBody() {
    if (isFillStage) {
      return (
        <RevenueFillPreview
          period={fillPreview.period}
          fileName={fillPreview.fileName}
          revenueColumnName={fillPreview.revenueColumnName}
          rowCount={fillPreview.plan?.updates?.length}
          totalRevenue={fillPreview.plan?.totalRevenue}
          revenueWarningCount={fillPreview.revenueWarningCount}
          onCancel={handleCancel}
          onConfirm={handleFillConfirm}
          saving={stage === 'fill-saving'}
          canEdit={canEdit}
        />
      );
    }
    if (!isPreviewStage || !safePreview) {
      return (
        <UploadDropzone onFile={handleFile} disabled={isDropzoneDisabled} busyText={busyText} />
      );
    }
    return (
      <UploadPreview
        period={safePreview.period}
        headerColumns={safePreview.headerColumns}
        revenueSummary={safePreview.revenueSummary}
        revenueWarningRows={safePreview.revenueWarningRows}
        classifiedRows={safePreview.classifiedRows}
        groupedIssues={safePreview.groupedIssues}
        onCancel={handleCancel}
        onConfirm={handleConfirm}
        saving={stage === 'saving'}
        canEdit={canEdit}
      />
    );
  }

  return (
    <main className="main">
      <PageHeader
        breadcrumb={['메뉴 판매량', '판매량 업로드']}
        title="메뉴판매량 업로드"
        sub="엑셀 / CSV 파일을 업로드하면 검증·미리보기·반영 순서로 처리해요. 자동 덮어쓰기는 하지 않아요. 매출액이 비어 있는 달은 같은 엑셀을 다시 올리면 매출액만 채워요."
      />

      <UploadStepBar stage={stage} />

      <UploadErrorBanner error={error} />

      {renderBody()}

      <UploadHistory files={history} onDelete={handleDeleteFile} canEdit={canEdit} />
    </main>
  );
}
