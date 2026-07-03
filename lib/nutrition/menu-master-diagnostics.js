import { getMenuCodeBase } from '@/lib/menu-master/code-policy';
import { asDisplayText, asObjectArray } from '@/lib/ui/prop-guards';

function menuCodeOf(row) {
  return asDisplayText(row?.menuCode).trim();
}

function normalizeCodeKey(code) {
  return asDisplayText(code).trim().toUpperCase();
}

function addCode(codes, code) {
  const key = normalizeCodeKey(code);
  if (key) codes.add(key);
}

function buildMasterCodeSet(menuMasters) {
  const codes = new Set();
  for (const menu of asObjectArray(menuMasters)) {
    const fullCode = menuCodeOf(menu);
    addCode(codes, fullCode);
    addCode(codes, getMenuCodeBase(menu));
  }
  return codes;
}

export function buildNutritionMenuMasterDiagnostics({ menuRefs = [], menuMasters = [] } = {}) {
  const masterCodes = buildMasterCodeSet(menuMasters);
  const orphanMenuRefs = asObjectArray(menuRefs)
    .filter(row => {
      const menuCode = menuCodeOf(row);
      return menuCode && !masterCodes.has(normalizeCodeKey(menuCode));
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
