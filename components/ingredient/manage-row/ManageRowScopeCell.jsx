import { SCOPE_STYLES } from '@/lib/ingredient/constants';

export function ManageRowScopeCell({ scope }) {
  const style = SCOPE_STYLES[scope] || {};

  return (
    <td>
      <span
        style={{
          padding: '2px 7px',
          fontSize: 11,
          fontWeight: 600,
          borderRadius: 6,
          background: style.bg || 'var(--surface-3)',
          color: style.color || 'var(--text-2)',
        }}
      >
        {scope}
      </span>
    </td>
  );
}
