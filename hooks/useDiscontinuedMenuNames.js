'use client';
import { initDB } from '@/lib/db';
import { useDBLoad } from '@/hooks/useDBLoad';
import { getAllMenuMaster } from '@/lib/menu-master';
import { buildDiscontinuedMenuNameSet } from '@/lib/menu-master/discontinued-lookup';

const EMPTY_SET = new Set();

/**
 * 판매량/보고서 화면에서 "단종" 배지를 표시하기 위한 메뉴마스터 단종 이름 집합.
 * 실패해도 화면이 깨지면 안 되므로 실패 시 빈 Set으로 조용히 폴백한다(배지만 안 뜸).
 */
export function useDiscontinuedMenuNames() {
  const { data } = useDBLoad(
    () => initDB().then(getAllMenuMaster).then(buildDiscontinuedMenuNameSet),
    { initialData: EMPTY_SET, onError: () => {} }
  );
  return data || EMPTY_SET;
}
