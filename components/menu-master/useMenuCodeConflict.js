'use client';
import { useEffect, useMemo, useState } from 'react';
import { getAllMenuMaster } from '@/lib/menu-master/store';
import { findMenuCodeConflict } from '@/lib/menu-master/linked-code-plan';

/**
 * 메뉴마스터 코드 입력값이 다른 메뉴와 충돌하는지 저장 전에 미리 확인한다.
 * 모달이 열릴 때 전체 목록을 한 번만 읽고, 이후 입력마다 순수 계산만 한다.
 */
export function useMenuCodeConflict(menuCode, excludeId) {
  const [rows, setRows] = useState([]);
  useEffect(() => {
    let ignore = false;
    getAllMenuMaster().then(all => {
      if (!ignore) setRows(all);
    });
    return () => {
      ignore = true;
    };
  }, []);
  const conflict = useMemo(
    () => findMenuCodeConflict(rows, menuCode, excludeId),
    [rows, menuCode, excludeId]
  );
  return { rows, conflict };
}
