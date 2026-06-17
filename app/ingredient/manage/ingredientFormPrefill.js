/**
 * app/ingredient/manage/ingredientFormPrefill.js
 *
 * 신규 식자재 폼의 "마지막 사용 단위(localStorage)" 복원 판단 — 순수 함수.
 *
 * 배경: useLocalStorage는 하이드레이션-안전을 위해 마운트 직후(렌더 이후)에야
 *   저장값을 복원한다. 그 사이 사용자가 포장수량을 먼저 입력하면, 뒤늦게 도착한
 *   복원이 단위를 덮어써 "g로 입력했는데 개로 저장"되는 버그가 생긴다.
 *
 * 규칙: 폼이 아직 초기 상태(pristine) 그대로일 때만 기억된 단위를 적용한다.
 *   사용자가 단위든 수량이든 무엇이라도 건드렸으면(formJson ≠ pristineJson) 보존한다.
 */

/**
 * @param {{
 *   isNew: boolean,        // 신규 작성 폼인지 (편집·복사 폼이면 false)
 *   hydrated: boolean,     // localStorage 복원 완료 여부
 *   formJson: string,      // 현재 폼 상태의 JSON.stringify
 *   pristineJson: string,  // 초기 폼 상태의 JSON.stringify
 *   lastUnitType: string,  // 복원된 마지막 사용 단위 ('g' | '개')
 * }} params
 * @returns {string|null} 적용할 단위. 적용하지 않으면 null.
 */
export function pickRememberedUnit({ isNew, hydrated, formJson, pristineJson, lastUnitType }) {
  if (!isNew) return null; // 편집/복사 폼은 기존 값 유지
  if (!hydrated) return null; // 아직 복원 전
  if (!lastUnitType || lastUnitType === 'g') return null; // 기본값과 동일 → 변경 불필요
  if (formJson !== pristineJson) return null; // 사용자가 이미 입력/선택함 → 보존
  return lastUnitType;
}
