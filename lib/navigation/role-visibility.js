const EDIT_ONLY_HREFS = [
  '/note/write',
  '/note/sample/write',
  '/menu-sales/upload',
  '/settings/restore',
];

const VIEWER_FALLBACK_HREFS = {
  '/menu-sales/upload': '/menu-sales/rank-compare',
  '/note/write': '/note',
  '/note/sample/write': '/note/sample',
  '/settings/restore': '/settings/backup',
};

function baseHref(href) {
  const value = typeof href === 'string' ? href.trim() : '';
  if (!value) return '';
  return value.split('?')[0].split('#')[0];
}

export function isEditOnlyHref(href) {
  const base = baseHref(href);
  return EDIT_ONLY_HREFS.includes(base);
}

export function isRoleItemVisible(item, canEdit = false) {
  if (!item || typeof item !== 'object') return false;
  if (canEdit) return true;
  if (item?.requiresEdit) return false;
  return !isEditOnlyHref(item?.href);
}

export function getRoleSafeHref(href, canEdit = false) {
  if (canEdit || !isEditOnlyHref(href)) return typeof href === 'string' ? href : '';
  return VIEWER_FALLBACK_HREFS[baseHref(href)] || '';
}

export function filterRoleVisibleItems(items = [], canEdit = false) {
  return (Array.isArray(items) ? items : []).filter(item => isRoleItemVisible(item, canEdit));
}

export function filterRoleVisibleGroups(groups = [], canEdit = false, childKey = 'items') {
  return (Array.isArray(groups) ? groups : [])
    .map(group => {
      if (!isRoleItemVisible(group, canEdit)) return null;
      const children = Array.isArray(group?.[childKey])
        ? filterRoleVisibleItems(group[childKey], canEdit)
        : null;
      if (children && children.length === 0 && !group?.href) return null;
      return children ? { ...group, [childKey]: children } : group;
    })
    .filter(Boolean);
}
