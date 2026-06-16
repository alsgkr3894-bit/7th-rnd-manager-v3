'use client';

import { Icon } from '@/components/icons';

export function IngredientPriceFileInfo({ fileInfo }) {
  if (!fileInfo) return null;

  return (
    <div
      style={{
        display: 'flex',
        alignItems: 'center',
        gap: 8,
        marginBottom: 4,
        fontSize: 12,
        color: 'var(--text-3)',
      }}
    >
      <Icon.doc style={{ width: 13, height: 13 }} />
      <span>
        기준 파일: <b style={{ color: 'var(--text-2)' }}>{fileInfo.name}</b>
        {fileInfo.date && <span style={{ marginLeft: 6 }}>({fileInfo.date})</span>}
      </span>
    </div>
  );
}
