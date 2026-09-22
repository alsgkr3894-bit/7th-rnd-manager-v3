import { useState, useEffect, useRef } from 'react';

const identity = v => v;

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
 *   - 저장: 복원 완료 후, 저장소와 다른 값으로 바뀌었을 때만 JSON.stringify → localStorage.setItem
 *   - 직렬화: JSON 기반 (string/number/boolean/null 모두 지원)
 *     기존 plain-string 데이터(JSON 미포함)도 파싱 실패 시 raw string으로 fallback
 *
 * @template T
 * @param {string} key - localStorage 키
 * @param {T} initialValue - SSR / 초기 렌더 기본값
 * @param {(v: unknown) => T} [normalize] - 저장소 복원값 정규화 함수
 * @returns {[T, (v: T) => void, boolean]}
 */
export function normalizeLocalStorageValue(value, fallback, normalize = identity) {
  try {
    return normalize(value);
  } catch {
    return fallback;
  }
}

export function useLocalStorage(key, initialValue, normalize = identity) {
  const [value, setValue] = useState(initialValue);
  const [hydrated, setHydrated] = useState(false);
  const initialRef = useRef(initialValue);
  const normalizeRef = useRef(normalize);
  // 저장소와 마지막으로 맞춘 값. 복원 직후 값·이미 저장한 값은 다시 쓰지 않는다.
  // 예전의 "첫 저장 1회 스킵" ref 방식은 StrictMode(dev)의 effect 2회 실행에서 두 번째
  // 실행이 복원 전 initialValue를 저장소에 써 버려, 같은 키를 같은 커밋에 마운트한 다른
  // 훅(홈의 경보 위젯·헬스체크·인사말)이 그 낡은 값을 복원하는 문제가 있었다.
  const syncedRef = useRef(initialValue);

  useEffect(() => {
    normalizeRef.current = normalize;
  }, [normalize]);

  // 마운트 후 1회 복원 (클라이언트 전용)
  useEffect(() => {
    let restored = initialRef.current;
    try {
      const raw = localStorage.getItem(key);
      if (raw !== null) {
        try {
          restored = normalizeLocalStorageValue(
            JSON.parse(raw),
            initialRef.current,
            normalizeRef.current
          );
        } catch {
          restored = normalizeLocalStorageValue(raw, initialRef.current, normalizeRef.current);
        }
      }
    } catch {}
    syncedRef.current = restored;
    setValue(restored);
    setHydrated(true);
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  // 복원이 끝난 뒤, 저장소와 다른 값으로 바뀌었을 때만 저장
  useEffect(() => {
    if (!hydrated || Object.is(value, syncedRef.current)) return;
    try {
      localStorage.setItem(
        key,
        JSON.stringify(normalizeLocalStorageValue(value, initialRef.current, normalizeRef.current))
      );
      syncedRef.current = value;
    } catch {}
  }, [key, value, hydrated]);

  return [value, setValue, hydrated];
}
