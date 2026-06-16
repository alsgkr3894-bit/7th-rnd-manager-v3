import { asDisplayText } from '@/lib/ui/prop-guards';

export const INITIAL_USER_RULE_FORM = {
  rawMenuName: '',
  category: '',
  groupName: '',
  detailName: '',
};

export function userRuleFormFromItem(rule) {
  return {
    rawMenuName: asDisplayText(rule?.rawMenuName || rule?.pattern),
    category: asDisplayText(rule?.category),
    groupName: asDisplayText(rule?.groupName),
    detailName: asDisplayText(rule?.detailName),
  };
}

export function isValidUserRuleForm(form) {
  return !!(form?.rawMenuName?.trim() && form?.category && form?.groupName?.trim());
}

export function filterUserRule(rule, query) {
  return (
    asDisplayText(rule?.rawMenuName || rule?.pattern)
      .toLowerCase()
      .includes(query) ||
    asDisplayText(rule?.category).toLowerCase().includes(query) ||
    asDisplayText(rule?.groupName).toLowerCase().includes(query) ||
    asDisplayText(rule?.detailName).toLowerCase().includes(query)
  );
}

export function valueForUserRuleSort(row, key) {
  if (key === 'pattern') return asDisplayText(row?.rawMenuName || row?.pattern);
  if (key === 'createdAt') return asDisplayText(row?.createdAt || row?.updatedAt);
  return asDisplayText(row?.[key]);
}

export function sortUserRules(rules, sortKey, sortDir) {
  const dir = sortDir === 'asc' ? 1 : -1;
  return [...(Array.isArray(rules) ? rules : [])].sort((a, b) => {
    const va = valueForUserRuleSort(a, sortKey);
    const vb = valueForUserRuleSort(b, sortKey);
    if (va == null && vb == null) return 0;
    if (va == null) return 1;
    if (vb == null) return -1;
    if (typeof va === 'number' && typeof vb === 'number') return (va - vb) * dir;
    return String(va).localeCompare(String(vb), 'ko') * dir;
  });
}

export function nextUserRuleSortState(current, key) {
  if (current.sortKey === key) {
    return {
      sortKey: current.sortKey,
      sortDir: current.sortDir === 'asc' ? 'desc' : 'asc',
    };
  }
  return { sortKey: key, sortDir: key === 'createdAt' ? 'desc' : 'asc' };
}
