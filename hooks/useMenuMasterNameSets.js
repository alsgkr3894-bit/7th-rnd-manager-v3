'use client';
import { initDB } from '@/lib/db';
import { useDBLoad } from '@/hooks/useDBLoad';
import { getAllMenuMaster } from '@/lib/menu-master';
import {
  buildDiscontinuedMenuNameSet,
  buildMenuMasterNameSet,
} from '@/lib/menu-master/discontinued-lookup';

const EMPTY = { discontinuedNameSet: new Set(), menuMasterNameSet: new Set() };

/**
 * 판매량 보고서 화면에서 menu_master 이름 집합 두 개(단종된 이름 / 전체 이름)를
 * 한 번의 getAllMenuMaster() 조회로 함께 계산한다 — useDiscontinuedMenuNames와 별도로
 * 이 훅을 다시 쓰면 menu_master를 두 번 읽게 되므로, 둘 다 필요한 화면에서만 쓴다.
 * 실패해도 화면이 깨지면 안 되므로 실패 시 빈 Set들로 조용히 폴백한다.
 */
export function useMenuMasterNameSets() {
  const { data, reload } = useDBLoad(
    () =>
      initDB()
        .then(getAllMenuMaster)
        .then(rows => ({
          discontinuedNameSet: buildDiscontinuedMenuNameSet(rows),
          menuMasterNameSet: buildMenuMasterNameSet(rows),
        })),
    { initialData: EMPTY, onError: () => {} }
  );
  return { ...(data || EMPTY), reload };
}
