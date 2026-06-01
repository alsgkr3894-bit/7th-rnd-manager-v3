import { useState, useEffect, useRef } from 'react';

/**
 * 하이드레이션-안전 localStorage state 훅.
 *
 * 사용처:
 *   const [value, setValue] = useLocalStorage(key, initialValue);
 *
 * 동작:
 *   - SSR/하이드레이션 안전: 초기값은 항상 initialValue → 마운트 후 복원
 *     (useState 초기값에서 localStorage를 읽으면 서버값 ≠ 클라이언트값 → 하이드레이션 경고)
 *   - 복원: 마운트 후 1회 localStorage.getItem → JSON 역직렬화
 *   - 저장: 값 변경 시 JSON.stringify → localStorage.setItem (첫 마운트 저장 스킵)
 *   - 직렬화: JSON 기반 (string/number/boolean/null 모두 지원)
 *     기존 plain-string 데이터(JSON 미포함)도 파싱 실패 시 raw string으로 fallback
 *
 * @template T
 * @param {string} key - localStorage 키
 * @param {T} initialValue - SSR / 초기 렌더 기본값
 * @returns {[T, (v: T) => void]}
 */
export function useLocalStorage(key, initialValue) {
  const [value, setValue] = useState(initialValue);
  // 첫 마운트 저장 스킵 — 복원 전에 initialValue가 저장되지 않도록
  const isFirstSave = useRef(true);

  // 마운트 후 1회 복원 (클라이언트 전용)
  useEffect(() => {
    try {
      const raw = localStorage.getItem(key);
      if (raw !== null) {
        try { setValue(JSON.parse(raw)); } catch { setValue(raw); }
      }
    } catch {}
  // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  // 값 변경 시 저장 (첫 마운트 스킵)
  useEffect(() => {
    if (isFirstSave.current) { isFirstSave.current = false; return; }
    try { localStorage.setItem(key, JSON.stringify(value)); } catch {}
  }, [key, value]);

  return [value, setValue];
}
