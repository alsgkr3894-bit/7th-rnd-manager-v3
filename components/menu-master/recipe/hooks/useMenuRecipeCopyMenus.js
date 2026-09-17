import { useMemo } from 'react';

// "다른 메뉴에서 복사" 드롭다운에 보여줄 후보 메뉴 목록(자기 자신 제외, 검색어 필터, 40개 제한).
export function useMenuRecipeCopyMenus({ allMenuItems, copySearch, menuCode }) {
  return useMemo(() => {
    const q = copySearch.trim().toLowerCase();
    const self = String(menuCode || '').trim();
    const list = allMenuItems.filter(m => String(m.menuCode || '').trim() !== self);
    if (!q) return list.slice(0, 40);
    return list
      .filter(
        m =>
          (m.menuName || '').toLowerCase().includes(q) ||
          (m.menuCode || '').toLowerCase().includes(q)
      )
      .slice(0, 40);
  }, [allMenuItems, copySearch, menuCode]);
}
