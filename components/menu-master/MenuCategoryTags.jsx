'use client';

import { parseCategoryFromCode } from '@/lib/cost/menu-price/code';
import { CAT_TAG_STYLE, SUB_TAG_STYLE } from '@/lib/ui/colors';

export function CategoryTags({ menuCode }) {
  if (!menuCode) return null;

  const parts = menuCode.toUpperCase().split('-');
  const sub = parts[1];
  const subStyle = SUB_TAG_STYLE[sub];
  const { category } = parseCategoryFromCode(menuCode);
  const catKey = category?.split('/')[0];
  const catStyle = CAT_TAG_STYLE[catKey] || { bg: 'var(--surface-2)', color: 'var(--text-3)' };

  return (
    <div style={{ display: 'flex', gap: 4, flexWrap: 'wrap' }}>
      <span
        style={{
          fontSize: 11,
          fontWeight: 700,
          padding: '2px 7px',
          borderRadius: 999,
          background: catStyle.bg,
          color: catStyle.color,
        }}
      >
        {catKey || '—'}
      </span>
      {subStyle && subStyle.label !== catKey && (
        <span
          style={{
            fontSize: 11,
            fontWeight: 600,
            padding: '2px 7px',
            borderRadius: 999,
            background: subStyle.bg,
            color: subStyle.color,
          }}
        >
          {subStyle.label}
        </span>
      )}
    </div>
  );
}
