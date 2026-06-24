'use client';
import { useState } from 'react';
import { Icon } from '@/components/icons';

export function CollapsibleCard({
  title,
  subtitle,
  defaultOpen = false,
  children,
  bodyStyle,
  actions,
}) {
  const [open, setOpen] = useState(defaultOpen);

  return (
    <div className="card">
      <button
        type="button"
        onClick={() => setOpen(value => !value)}
        aria-expanded={open}
        style={{
          width: '100%',
          border: 0,
          background: 'transparent',
          padding: 0,
          margin: 0,
          display: 'flex',
          alignItems: 'center',
          justifyContent: 'space-between',
          gap: 12,
          color: 'inherit',
          fontFamily: 'inherit',
          textAlign: 'left',
          cursor: 'pointer',
        }}
      >
        <span style={{ minWidth: 0 }}>
          <span className="card-title" style={{ display: 'block', marginBottom: subtitle ? 3 : 0 }}>
            {title}
          </span>
          {subtitle && (
            <span style={{ display: 'block', fontSize: 12, color: 'var(--text-3)' }}>
              {subtitle}
            </span>
          )}
        </span>
        <span style={{ display: 'flex', alignItems: 'center', gap: 8, flexShrink: 0 }}>
          {actions}
          <span style={{ fontSize: 12, fontWeight: 800, color: 'var(--text-3)' }}>
            {open ? '접기' : '펼치기'}
          </span>
          <Icon.chevDown
            style={{
              width: 16,
              height: 16,
              color: 'var(--text-3)',
              transform: open ? 'rotate(0deg)' : 'rotate(-90deg)',
              transition: 'transform 160ms ease',
            }}
          />
        </span>
      </button>
      {open && <div style={{ marginTop: 16, ...bodyStyle }}>{children}</div>}
    </div>
  );
}
