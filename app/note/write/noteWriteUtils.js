/**
 * app/note/write/noteWriteUtils.js — 노트 작성 화면 저장/검증에 쓰이는 순수 헬퍼
 */
import { SAMPLE_RECORD_TYPES } from '@/lib/sample';

/**
 * 샘플기록 저장/취소 시 이동 경로 계산에 쓰는 recordType 결정 (form > 유형 매핑 > 기본값)
 * fallbackRecordType은 호출부에서 SAMPLE_RECORD_TYPE_BY_WRITE_TYPE[writeType]로 넘긴다
 * (writeTypes.js는 jsx 컴포넌트를 재수출하므로 이 순수 helper 파일은 직접 import하지 않는다).
 */
export function resolveSampleRecordType(sampleForm, fallbackRecordType) {
  return sampleForm?.recordType || fallbackRecordType || SAMPLE_RECORD_TYPES.SAMPLE_TEST;
}

/** 샘플기록 폼 저장 가능 여부 (제목 필수) */
export function isSampleFormValid(sampleForm) {
  return Boolean(sampleForm?.title?.trim());
}

/** 메뉴개발노트 폼 저장 가능 여부 (제목/코드 중 하나 + 테스트 내용 필수) */
export function isNoteFormValid(form) {
  const hasTitle = Boolean((form?.title || form?.menuName || form?.menuCode || '').trim());
  const hasContent = Boolean(form?.testContent?.trim());
  return hasTitle && hasContent;
}
