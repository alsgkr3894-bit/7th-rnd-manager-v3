/** localStorage에서 문자열 값을 읽는다. 실패하면 fallback 반환 */
export function tryLS(key, fallback) {
  try { return localStorage.getItem(key) ?? fallback; } catch { return fallback; }
}

/** localStorage에 문자열 값을 쓴다 */
export function setLS(key, val) {
  try { localStorage.setItem(key, val); } catch {}
}

/** localStorage에서 JSON 값을 읽는다. 파싱 실패 시 null 반환 */
export function getJSONLS(key) {
  try { const raw = localStorage.getItem(key); return raw ? JSON.parse(raw) : null; } catch { return null; }
}

/** localStorage에 JSON 직렬화하여 쓴다 */
export function setJSONLS(key, val) {
  try { localStorage.setItem(key, JSON.stringify(val)); } catch {}
}

/** localStorage에 JSON 형태의 임시 저장 데이터를 쓴다 */
export function saveDraft(key, form) {
  setJSONLS(key, form);
}

/** localStorage에서 임시 저장 데이터를 읽는다. 없으면 null */
export function loadDraft(key) {
  return getJSONLS(key);
}

/** localStorage에서 임시 저장 데이터를 삭제한다 */
export function clearDraft(key) {
  try { localStorage.removeItem(key); } catch {}
}
