'use client';
import { initDB } from '@/lib/db';
import { useDBLoad } from '@/hooks/useDBLoad';
import { getRefDiscontinued } from '@/lib/sales/store-user-rules';
import { buildIrregularMenuNameSet } from '@/lib/sales/irregular-menu';

const EMPTY_SET = new Set();

/**
 * 사용자가 판매량 보고서 순위표에서 단종 처리한 "비정규메뉴"(menu_master 미등록
 * 판매명) 이름 집합. reload()로 단종 처리 직후 즉시 재계산할 수 있다.
 * 실패해도 화면이 깨지면 안 되므로 실패 시 빈 Set으로 조용히 폴백한다.
 */
export function useIrregularMenuNames() {
  const { data, reload } = useDBLoad(
    () => initDB().then(getRefDiscontinued).then(buildIrregularMenuNameSet),
    { initialData: EMPTY_SET, onError: () => {} }
  );
  return { irregularNameSet: data || EMPTY_SET, reload };
}
