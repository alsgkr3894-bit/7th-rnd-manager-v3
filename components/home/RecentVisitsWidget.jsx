'use client';
import React, { useState, useEffect } from 'react';
import Link from 'next/link';
import { Icon } from '@/components/icons';
import { getRecentPaletteItems } from '@/lib/palette-recent';

/**
 * 최근 방문 위젯
 * CommandPalette가 localStorage[KEYS.PALETTE_RECENT]에 저장한
 * { href, label, kind }[] 목록을 읽어 링크 pill 형태로 표시한다.
 */
const RecentVisitsWidget = React.memo(function RecentVisitsWidget() {
  const [recent, setRecent] = useState([]);

  useEffect(() => {
    setRecent(getRecentPaletteItems());
  }, []);

  if (!recent.length) return null;

  return (
    <div
      className="card"
      style={{
        padding: '14px 18px',
        marginBottom: 4,
        animation: 'slide-up 300ms 60ms cubic-bezier(0.2,0.8,0.2,1) both',
      }}
    >
      <div
        style={{
          fontWeight: 700,
          fontSize: 12,
          color: 'var(--text-3)',
          letterSpacing: '0.05em',
          textTransform: 'uppercase',
          marginBottom: 10,
        }}
      >
        최근 방문
      </div>
      <div style={{ display: 'flex', gap: 8, flexWrap: 'wrap' }}>
        {recent.map((p, index) => (
          <Link
            key={p.href || index}
            href={p.href}
            style={{
              display: 'inline-flex',
              alignItems: 'center',
              gap: 5,
              fontSize: 12,
              color: 'var(--accent)',
              background: 'var(--accent-soft)',
              borderRadius: 20,
              padding: '4px 10px',
              textDecoration: 'none',
              fontWeight: 600,
              border: '1px solid var(--accent-soft)',
            }}
          >
            <Icon.chevRight style={{ width: 10, height: 10, opacity: 0.6 }} />
            {p.label}
          </Link>
        ))}
      </div>
    </div>
  );
});

export default RecentVisitsWidget;
