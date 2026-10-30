/**
 * lib/ui/ime.js — 한글 등 IME 조합 중인 키 입력 판별 (순수)
 *
 * 한글은 마지막 글자가 '조합 중'일 때 Enter를 치면 조합을 확정하는 키가 먼저 오는데, 이 키 이벤트를
 * 그대로 "선택/확정"으로 처리하면 조합이 끝나면서 뒤늦게 오는 입력값이 방금 한 선택을 되돌린다.
 * 조합 중이면 true — 호출한 쪽은 그 키를 무시하고 조합이 끝난 뒤에 처리해야 한다.
 */
export function isImeComposing(event) {
  if (!event || typeof event !== 'object') return false;
  if (event.isComposing === true) return true;
  if (event.nativeEvent?.isComposing === true) return true;
  // 일부 브라우저는 조합 중 keydown에 isComposing 대신 keyCode 229만 준다
  return event.keyCode === 229 || event.nativeEvent?.keyCode === 229;
}
