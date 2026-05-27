/**
 * ManagedProducts 공통 상수
 */

export const TYPE_OPTIONS = [
  { value: 'exclusive',       label: '전용상품' },
  { value: 'generic',         label: '범용상품' },
  { value: 'generic-managed', label: '범용관리' },
];

export const TYPE_LABEL = {
  exclusive:         '전용',
  generic:           '범용',
  'generic-managed': '범용관리',
};

export const inputStyle = {
  padding:'6px 10px', borderRadius:6,
  border:'1px solid var(--border)', background:'var(--surface-2)',
  color:'var(--text-1)', fontSize:13,
};
