'use client';
import { UploadDropzone as UiDropzone } from '@/components/ui/UploadDropzone';

const SALES_RULES = [
  { type: 'ok', text: '필수 헤더: 메뉴명 / 판매량(개)' },
  { type: 'ok', text: '판매 기간: 월 전체 (YYYY-MM-01 ~ YYYY-MM-말일)' },
  { type: 'warn', text: '업로드 즉시 반영 안 함 — 미리보기 단계를 거쳐요' },
];

export function UploadDropzone({
  onFile,
  disabled = false,
  busyText = '처리 중...',
  showSpinner = true,
}) {
  return (
    <UiDropzone
      onFile={onFile}
      accept={['.xlsx', '.xls', '.csv']}
      maxSizeMB={20}
      title="엑셀(.xlsx) 또는 CSV 파일을 끌어다 놓으세요"
      rules={SALES_RULES}
      disabled={disabled}
      busyText={busyText}
      showSpinner={showSpinner}
    />
  );
}
