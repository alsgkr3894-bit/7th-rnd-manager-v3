'use client';
import { useState } from 'react';
import { Icon } from '@/components/icons';

export function CollapsibleCard({
  title,
  subtitle,
  defaultOpen = false,
  open: controlledOpen,
  onOpenChange,
  children,
  bodyStyle,
  actions,
}) {
  const [internalOpen, setInternalOpen] = useState(defaultOpen);
  const controlled = typeof controlledOpen === 'boolean';
  const open = controlled ? controlledOpen : internalOpen;

  function setOpen(nextOpen) {
    if (!controlled) setInternalOpen(nextOpen);
    if (typeof onOpenChange === 'function') onOpenChange(nextOpen);
  }

  return (
    <div
      className="card"
      style={{
        borderColor: open ? 'color-mix(in srgb, var(--accent) 44%, var(--border))' : undefined,
        background: open ? 'var(--surface)' : 'var(--surface-2)',
        transition: 'border-color 180ms ease, background-color 180ms ease, box-shadow 180ms ease',
      }}
    >
      <button
        type="button"
        onClick={() => setOpen(!open)}
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
          <span
            className="card-title"
            style={{
              display: 'block',
              marginBottom: subtitle ? 3 : 0,
              color: open ? 'var(--accent-text)' : 'var(--text-1)',
              transition: 'color 160ms ease',
            }}
          >
            {title}
          </span>
          {subtitle && (
            <span style={{ display: 'block', fontSize: 12, color: 'var(--text-4)' }}>
              {subtitle}
            </span>
          )}
        </span>
        <span style={{ display: 'flex', alignItems: 'center', gap: 8, flexShrink: 0 }}>
          {actions}
          <span
            style={{
              fontSize: 12,
              fontWeight: 800,
              color: open ? 'var(--accent-text)' : 'var(--text-4)',
            }}
          >
            {open ? '접기' : '펼치기'}
          </span>
          <Icon.chevDown
            style={{
              width: 16,
              height: 16,
              color: open ? 'var(--accent-text)' : 'var(--text-4)',
              transform: open ? 'rotate(0deg)' : 'rotate(-90deg)',
              transition: 'transform 160ms ease',
            }}
          />
        </span>
      </button>
      <div
        aria-hidden={!open}
        inert={open ? undefined : ''}
        style={{
          display: 'grid',
          gridTemplateRows: open ? '1fr' : '0fr',
          opacity: open ? 1 : 0,
          transition: 'grid-template-rows 190ms cubic-bezier(0.2, 0.8, 0.2, 1), opacity 160ms ease',
          pointerEvents: open ? 'auto' : 'none',
        }}
      >
        <div style={{ minHeight: 0, overflow: 'hidden' }}>
          <div style={{ marginTop: 16, color: 'var(--text-2)', ...bodyStyle }}>{children}</div>
        </div>
      </div>
    </div>
  );
}
