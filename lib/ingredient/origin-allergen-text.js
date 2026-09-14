import { allergensLabel, originLabel } from '@/lib/ingredient/manage-print/formatters';

/**
 * 원산지·알레르기 요약 텍스트 (식자재 목록 행 모델, 수정 창 상단 요약 박스가 공용으로 쓴다).
 * - "없음"/"비표기"로 명시된 경우는 그 문구를 그대로 보여준다.
 * - 아무 정보도 없고 명시도 안 됐으면(입력 전) 빈 문자열 — 표시 줄 자체를 숨기는 데 쓴다.
 * row(저장된 식자재 행)와 form(수정 창 입력 중인 폼 상태) 모두 origin/allergens 필드 모양이
 * 같아 그대로 통과한다.
 */
export function originText(r) {
  if (r.originHidden) return '비표기';
  if (r.originNone) return '없음';
  const label = originLabel(r);
  return label === '-' ? '' : label;
}

export function allergenText(r) {
  if (r.allergenNone) return '없음';
  const label = allergensLabel(r);
  return label === '-' ? '' : label;
}

/** 원산지 체크박스 상태를 그대로 이름으로 알려준다 — '없음'과 '비표기'는 서로 다른 값. */
export function originStateLabel(r) {
  if (r.originHidden) return '미표시대상(비표기)';
  if (r.originNone) return '원산지 없음';
  return originText(r) ? '표기' : '미입력';
}

export function allergenStateLabel(r) {
  if (r.allergenNone) return '알레르기 없음';
  return allergenText(r) ? '표기' : '미입력';
}
