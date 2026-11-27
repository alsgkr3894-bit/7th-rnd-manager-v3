/**
 * lib/auth/password-policy.js — 비밀번호 규칙 (서버와 화면이 같은 값을 쓴다)
 *
 * 판정은 서버가 한다. 화면의 검사는 입력 안내용이다.
 */
export const PASSWORD_MIN_LENGTH = 4;
export const PASSWORD_MAX_LENGTH = 128;

/** @returns {string} 문제가 없으면 빈 문자열, 있으면 안내 문장 */
export function passwordProblem(password) {
  if (typeof password !== 'string' || password.length === 0) return '비밀번호를 입력하세요.';
  if (password.length < PASSWORD_MIN_LENGTH) {
    return `비밀번호는 ${PASSWORD_MIN_LENGTH}자 이상이어야 합니다.`;
  }
  if (password.length > PASSWORD_MAX_LENGTH) {
    return `비밀번호는 ${PASSWORD_MAX_LENGTH}자 이하여야 합니다.`;
  }
  return '';
}
