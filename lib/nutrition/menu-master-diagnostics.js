import { asDisplayText, asObjectArray } from '@/lib/ui/prop-guards';

function menuCodeOf(row) {
  return asDisplayText(row?.menuCode).trim();
}

export function buildNutritionMenuMasterDiagnostics({ menuRefs = [], menuMasters = [] } = {}) {
  const masterCodes = new Set(asObjectArray(menuMasters).map(menuCodeOf).filter(Boolean));
  const orphanMenuRefs = asObjectArray(menuRefs)
    .filter(row => {
      const menuCode = menuCodeOf(row);
      return menuCode && !masterCodes.has(menuCode);
    })
    .map(row => ({
      id: row.id ?? null,
      menuCode: menuCodeOf(row),
      menuName: asDisplayText(row.menuName, row.menuCode),
    }));

  return {
    orphanMenuRefs,
    orphanCount: orphanMenuRefs.length,
    hasOrphans: orphanMenuRefs.length > 0,
  };
}
