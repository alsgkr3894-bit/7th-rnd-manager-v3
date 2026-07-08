import { redirect } from 'next/navigation';

function appendParam(params, key, value) {
  if (Array.isArray(value)) {
    value.forEach(item => appendParam(params, key, item));
    return;
  }
  if (value == null) return;
  params.append(key, String(value));
}

export function buildSalesCompareHref(searchParams = {}) {
  const params = new URLSearchParams();
  Object.entries(searchParams || {}).forEach(([key, value]) => appendParam(params, key, value));
  params.set('view', 'compare');

  if (!params.has('year') && params.has('yearA')) params.set('year', params.get('yearA'));
  if (!params.has('month') && params.has('monthA')) params.set('month', params.get('monthA'));
  if (!params.has('cmpYear') && params.has('yearB')) params.set('cmpYear', params.get('yearB'));
  if (!params.has('cmpMonth') && params.has('monthB')) params.set('cmpMonth', params.get('monthB'));

  params.delete('yearA');
  params.delete('monthA');
  params.delete('yearB');
  params.delete('monthB');

  return `/report/sales?${params.toString()}`;
}

export default function Page({ searchParams }) {
  redirect(buildSalesCompareHref(searchParams));
}
