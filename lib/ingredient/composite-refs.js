/**
 * lib/ingredient/composite-refs.js — compositeOf(복합 재료) 참조 코드 검증
 *
 * cost_ingredients의 compositeOf 배열이 가리키는 productCode가 실제로 존재하는지
 * 베스트-에포트로 검증한다. store.js에서 re-export되어 기존 import 경로를 보존한다.
 */
import { getAll, hasStore } from '@/lib/db';

/**
 * compositeOf 중 existingCodes(정규화된 Set)에 없는 코드를 반환.
 * @param {string[]} compositeOf
 * @param {Set<string>} existingCodes - 소문자·trim 정규화된 productCode Set
 * @returns {string[]}
 */
export function findMissingRefs(compositeOf, existingCodes) {
  if (!Array.isArray(compositeOf) || compositeOf.length === 0) return [];
  return compositeOf.filter(c => {
    const key = String(c).trim().toLowerCase();
    return key !== '' && !existingCodes.has(key);
  });
}

/**
 * cost_ingredients에서 compositeOf 배열의 productCode 참조를 베스트-에포트로 검증.
 *
 * - store가 없으면 { ok: true, missing: [] } (non-blocking 보장).
 * - compositeOf가 비어 있거나 없으면 즉시 { ok: true, missing: [] }.
 * - throw하지 않는다 — 예외가 발생해도 { ok: true, missing: [] } 를 반환.
 *
 * UI(등록 모달 등)에서 저장 전 경고를 표시할 때 사용:
 *   const { ok, missing } = await validateCompositeRefs(compositeOf);
 *   if (!ok) showWarn(`참조 코드 없음: ${missing.join(', ')}`);
 *
 * @param {string[] | null | undefined} compositeOf
 * @param {Set<string> | null} [existingCodesSet] - 호출자가 이미 보유한 정규화된 productCode Set.
 *   전달하면 cost_ingredients 전체 조회(getAll)를 건너뛴다 (반복 호출 시 성능 개선).
 *   소문자·trim 정규화된 코드여야 한다.
 * @returns {Promise<{ ok: boolean, missing: string[] }>}
 */
export async function validateCompositeRefs(compositeOf, existingCodesSet = null) {
  try {
    if (!Array.isArray(compositeOf) || compositeOf.length === 0) return { ok: true, missing: [] };
    let existingCodes = existingCodesSet;
    if (!(existingCodes instanceof Set)) {
      if (!hasStore('cost_ingredients')) return { ok: true, missing: [] };
      const all = await getAll('cost_ingredients');
      existingCodes = new Set(
        all.filter(r => r.productCode).map(r => String(r.productCode).trim().toLowerCase())
      );
    }
    const missing = findMissingRefs(compositeOf, existingCodes);
    return { ok: missing.length === 0, missing };
  } catch {
    return { ok: true, missing: [] };
  }
}
