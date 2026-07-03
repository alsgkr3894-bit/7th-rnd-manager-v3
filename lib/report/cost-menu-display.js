import { getMenuCodeBase } from '@/lib/menu-master/code-policy';

const GROUPABLE_SIZE_LABELS = new Set(['L', 'R']);

export function normalizeCostReportSize(value) {
  const label = String(value ?? '').trim();
  return label || '단일';
}

export function isCostReportGroupableSize(size) {
  return GROUPABLE_SIZE_LABELS.has(normalizeCostReportSize(size).toUpperCase());
}

export function stripCostReportSizeSuffix(menuName, size) {
  const name = String(menuName ?? '').trim();
  if (!name || !isCostReportGroupableSize(size)) return name;

  const label = normalizeCostReportSize(size);
  const upperName = name.toUpperCase();
  const upperLabel = label.toUpperCase();
  const suffixes = [
    ` (${upperLabel})`,
    `[${upperLabel}]`,
    ` [${upperLabel}]`,
    `（${upperLabel}）`,
    ` （${upperLabel}）`,
    `-${upperLabel}`,
    `_${upperLabel}`,
    `/${upperLabel}`,
    ` ${upperLabel}`,
  ];

  for (const suffix of suffixes) {
    if (!upperName.endsWith(suffix)) continue;
    const next = name.slice(0, name.length - suffix.length).trim();
    if (next) return next;
  }
  return name;
}

export function getCostReportMenuDisplayInfo(menu) {
  const size = normalizeCostReportSize(menu?.size);
  const code = String(menu?.menuCode ?? menu?.code ?? '').trim();
  const rawName = String(menu?.menuName ?? menu?.name ?? '').trim();
  const name = stripCostReportSizeSuffix(rawName, size) || rawName;
  const codeBase = isCostReportGroupableSize(size) ? getMenuCodeBase({ menuCode: code, size }) : '';
  return { name, size, codeBase };
}

export function groupCostMenusBySize(menus) {
  const map = new Map();
  for (const menu of Array.isArray(menus) ? menus : []) {
    const info = getCostReportMenuDisplayInfo(menu);
    const key = info.codeBase
      ? `code:${info.codeBase}`
      : `name:${info.name}||${menu?.category || menu?.catLabel || ''}`;
    if (!map.has(key)) {
      map.set(key, {
        key,
        name: info.name,
        codeBase: info.codeBase,
        sizes: {},
        single: null,
        entries: [],
      });
    }
    const group = map.get(key);
    if (info.name && (!group.name || info.name.length < group.name.length)) group.name = info.name;
    const sizeKey = info.size.toUpperCase();
    if (isCostReportGroupableSize(sizeKey)) group.sizes[sizeKey] = menu;
    else group.single = menu;
    group.entries.push(menu);
  }
  return [...map.values()];
}
