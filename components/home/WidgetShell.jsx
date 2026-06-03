'use client';
import { Icon } from '@/components/icons';

/**
 * WidgetShell — 위젯 접기/펼치기 래퍼.
 *
 * 접힌 상태: 제목만 있는 slim 카드 + 펼치기 버튼
 * 펼친 상태: 자식 위젯 위에 우측 상단에 접기 버튼 오버레이
 *
 * @param {{ widgetKey, label, isCollapsed, onToggle, children }} props
 */
export function WidgetShell({ widgetKey, label, isCollapsed, onToggle, children }) {
  if (isCollapsed) {
    return (
      <div
        className="card"
        style={{
          padding: '10px 16px',
          display: 'flex',
          alignItems: 'center',
          gap: 8,
          minHeight: 44,
          cursor: 'pointer',
        }}
        onClick={() => onToggle(widgetKey)}
        title="클릭해서 펼치기"
      >
        <span style={{ fontSize: 13, fontWeight: 600, flex: 1, color: 'var(--text-2)' }}>
          {label}
        </span>
        <Icon.chevRight style={{ width: 14, height: 14, color: 'var(--text-3)' }} />
      </div>
    );
  }

  return (
    <div style={{ position: 'relative' }}>
      {children}
      <button
        onClick={() => onToggle(widgetKey)}
        title="접기"
        style={{
          position: 'absolute',
          top: 10,
          right: 12,
          background: 'none',
          border: 'none',
          cursor: 'pointer',
          padding: '2px 4px',
          borderRadius: 4,
          color: 'var(--text-4)',
          display: 'flex',
          alignItems: 'center',
          lineHeight: 1,
          zIndex: 1,
        }}
        onMouseEnter={e => { e.currentTarget.style.color = 'var(--text-2)'; }}
        onMouseLeave={e => { e.currentTarget.style.color = 'var(--text-4)'; }}
      >
        <Icon.chevDown style={{ width: 13, height: 13 }} />
      </button>
    </div>
  );
}
