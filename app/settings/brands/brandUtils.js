export const EMPTY_FORM = {
  id: '',
  name: '',
  sub: '',
  logo: '',
  color: '#E1101F',
};

export function brandFormOf(brand = EMPTY_FORM) {
  return {
    id: brand.id || '',
    name: brand.name || '',
    sub: brand.sub || '',
    logo: brand.logo || '',
    color: brand.color || '#E1101F',
  };
}

export function countRows(stores) {
  return Object.values(stores || {}).reduce(
    (sum, rows) => sum + (Array.isArray(rows) ? rows.length : 0),
    0
  );
}
