import { MODULE_GROUPS } from '@/lib/db';

export const restoreModuleChipStyle = active => ({
  display: 'inline-block',
  padding: '2px 10px',
  borderRadius: 99,
  fontSize: 12,
  fontWeight: 700,
  background: active ? 'var(--accent-soft)' : 'var(--surface-2)',
  color: active ? 'var(--accent-text)' : 'var(--text-3)',
});

export function restoreModuleLabel(moduleKey) {
  return MODULE_GROUPS[moduleKey]?.label || moduleKey;
}

export function RestoreModuleChip({ moduleKey, active = true, children }) {
  return <span style={restoreModuleChipStyle(active)}>{children ?? restoreModuleLabel(moduleKey)}</span>;
}
