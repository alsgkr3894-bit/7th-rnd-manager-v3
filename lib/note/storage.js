/** localStorage에서 문자열 값을 읽는다. 실패하면 fallback 반환 */
export function tryLS(key, fallback) {
  try {
    return localStorage.getItem(key) ?? fallback;
  } catch {
    return fallback;
  }
}

/** localStorage에 문자열 값을 쓴다 */
export function setLS(key, val) {
  try {
    localStorage.setItem(key, val);
  } catch {}
}

/**
 * localStorage에서 JSON 값을 읽는다.
 * - 키가 없으면 null (정상)
 * - 값이 있으나 파싱 실패하면(손상된 데이터) console.warn 후 null
 *   → 임시저장 등 사용자 데이터가 조용히 사라지는 상황을 진단 가능하게 함
 */
export function getJSONLS(key) {
  let raw;
  try {
    raw = localStorage.getItem(key);
  } catch {
    return null;
  }
  if (!raw) return null;
  try {
    return JSON.parse(raw);
  } catch (err) {
    console.warn(`[note/storage] '${key}' 값 파싱 실패 — 손상된 데이터 무시:`, err.message);
    return null;
  }
}

/** localStorage에 JSON 직렬화하여 쓴다 */
export function setJSONLS(key, val) {
  try {
    localStorage.setItem(key, JSON.stringify(val));
  } catch {}
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
  try {
    localStorage.removeItem(key);
  } catch {}
}
