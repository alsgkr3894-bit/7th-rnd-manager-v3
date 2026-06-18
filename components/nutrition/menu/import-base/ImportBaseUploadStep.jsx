'use client';
import { ModalFrame } from '@/components/ui/ModalFrame';
import { UploadDropzone } from '@/components/ui/UploadDropzone';

export function ImportBaseUploadStep({ onClose, onFile }) {
  return (
    <ModalFrame
      title="베이스 영양성분 엑셀 가져오기"
      onClose={onClose}
      width="min(480px,95vw)"
      zIndex={300}
      padding="24px 28px"
    >
      <div style={{ fontSize: 13, color: 'var(--text-3)', marginBottom: 16, lineHeight: 1.7 }}>
        연구기관 분석 엑셀 파일을 업로드하면 베이스 영양성분에 일괄 저장됩니다.
        <br />
        <span style={{ fontSize: 12, color: 'var(--text-4)' }}>
          ※ 여러 시트(피자·사이드) 지원 | 피자=100g 기준, 사이드=1회분 기준 | 총중량 열 인식 | 지원
          형식: .xlsx, .xls
        </span>
      </div>
      <UploadDropzone
        accept={['.xlsx', '.xls']}
        title="엑셀 파일을 드래그하거나 클릭하여 선택"
        onFile={onFile}
      />
      <div style={{ display: 'flex', justifyContent: 'flex-end', marginTop: 16 }}>
        <button className="btn" onClick={onClose}>
          취소
        </button>
      </div>
    </ModalFrame>
  );
}
