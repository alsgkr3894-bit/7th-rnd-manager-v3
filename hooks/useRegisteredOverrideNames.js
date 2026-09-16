'use client';
import { initDB } from '@/lib/db';
import { useDBLoad } from '@/hooks/useDBLoad';
import { getRefRegisteredOverrides } from '@/lib/sales/store-user-rules';
import { buildRegisteredOverrideNameSet } from '@/lib/sales/registered-override';

const EMPTY_SET = new Set();

/**
 * 사용자가 판매량 보고서 순위표 체크박스로 "미등록 아님"이라 해제한 판매명 집합.
 * reload()로 해제/복원 직후 즉시 재계산할 수 있다. 실패해도 화면이 깨지면 안 되므로
 * 실패 시 빈 Set으로 조용히 폴백한다.
 */
export function useRegisteredOverrideNames() {
  const { data, reload } = useDBLoad(
    () => initDB().then(getRefRegisteredOverrides).then(buildRegisteredOverrideNameSet),
    { initialData: EMPTY_SET, onError: () => {} }
  );
  return { registeredOverrideNameSet: data || EMPTY_SET, reload };
}
