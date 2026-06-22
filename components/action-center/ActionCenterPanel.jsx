'use client';
import { useMemo, useState } from 'react';
import { useRouter } from 'next/navigation';
import {
  dismissAction,
  snoozeAction,
  undismissAction,
  getHiddenItems,
} from '@/lib/action-center/state';

const SEVERITY_STYLE = {
  critical: { bg: 'var(--negative-soft)', border: 'var(--negative)', icon: '🚨' },
  warn: { bg: 'var(--warn-soft)', border: 'var(--warn)', icon: '⚠️' },
  info: { bg: 'var(--accent-soft)', border: 'var(--accent)', icon: 'ℹ️' },
};

/**
 * ActionCenterPanel — 액션 항목 목록 UI
 *
 * @param {ActionItem[]} items - filterByState() 적용 후 항목
 * @param {ActionItem[]} allItems - 전체 항목 (숨김 항목 복원용)
 * @param {function} onRefresh - dismiss/snooze 후 상태 재로드 콜백
 * @param {boolean} [compact] - TopBar 팝오버 등 축소 모드
 */
export function ActionCenterPanel({ items = [], allItems = [], onRefresh, compact }) {
  const router = useRouter();
  const [showHidden, setShowHidden] = useState(false);
  const hiddenItems = useMemo(() => getHiddenItems(allItems), [allItems]);

  function handleDismiss(id, e) {
    e.stopPropagation();
    dismissAction(id);
    onRefresh?.();
  }

  function handleSnooze(id, duration, e) {
    e.stopPropagation();
    snoozeAction(id, duration);
    onRefresh?.();
  }

  function handleUndismiss(id) {
    undismissAction(id);
    onRefresh?.();
  }

  if (items.length === 0 && hiddenItems.length === 0) {
    return (
      <div
        style={{ padding: '24px 16px', textAlign: 'center', color: 'var(--text-3)', fontSize: 13 }}
      >
        <div style={{ fontSize: 24, marginBottom: 8 }}>✅</div>
        처리할 항목이 없습니다
      </div>
    );
  }

  return (
    <div style={{ display: 'flex', flexDirection: 'column', gap: compact ? 6 : 8 }}>
      {items.map(item => {
        const style = SEVERITY_STYLE[item.severity] || SEVERITY_STYLE.info;
        return (
          <div
            key={item.id}
            role={item.href ? 'button' : undefined}
            tabIndex={item.href ? 0 : undefined}
            style={{
              background: style.bg,
              borderLeft: `3px solid ${style.border}`,
              borderRadius: compact ? 6 : 8,
              padding: compact ? '8px 10px' : '12px 14px',
              cursor: item.href ? 'pointer' : 'default',
              display: 'flex',
              flexDirection: 'column',
              gap: 4,
            }}
            onClick={() => {
              if (item.href) router.push(item.href);
            }}
            onKeyDown={e => {
              if (item.href && (e.key === 'Enter' || e.key === ' ')) {
                e.preventDefault();
                router.push(item.href);
              }
            }}
          >
            <div style={{ display: 'flex', alignItems: 'flex-start', gap: 6 }}>
              <span style={{ fontSize: 14, flexShrink: 0, marginTop: 1 }}>{style.icon}</span>
              <div style={{ flex: 1, minWidth: 0 }}>
                <div style={{ fontWeight: 600, fontSize: compact ? 12 : 13, color: 'var(--text)' }}>
                  {item.title}
                </div>
                {!compact && item.desc && (
                  <div style={{ fontSize: 12, color: 'var(--text-2)', marginTop: 2 }}>
                    {item.desc}
                  </div>
                )}
                {item.dueHint && (
                  <div style={{ fontSize: 11, color: 'var(--text-3)', marginTop: 2 }}>
                    {item.dueHint}
                  </div>
                )}
              </div>
              <div
                style={{ display: 'flex', gap: 4, flexShrink: 0 }}
                onClick={e => e.stopPropagation()}
              >
                <button
                  className="btn"
                  style={{ fontSize: 10, padding: '2px 7px', opacity: 0.7 }}
                  title="나중에 (7일)"
                  onClick={e => handleSnooze(item.id, '7d', e)}
                >
                  나중에
                </button>
                <button
                  className="btn"
                  style={{ fontSize: 10, padding: '2px 7px', opacity: 0.7 }}
                  title="숨기기"
                  onClick={e => handleDismiss(item.id, e)}
                >
                  숨김
                </button>
              </div>
            </div>
          </div>
        );
      })}

      {hiddenItems.length > 0 && (
        <div style={{ marginTop: 4 }}>
          <button
            type="button"
            className="btn ghost"
            style={{ fontSize: 11, padding: '4px 0', color: 'var(--text-3)', textDecoration: 'underline', background: 'none', border: 'none' }}
            onClick={() => setShowHidden(v => !v)}
          >
            숨겨진 항목 {hiddenItems.length}개 {showHidden ? '접기' : '펼치기'}
          </button>
          {showHidden &&
            hiddenItems.map(item => (
              <div
                key={item.id}
                style={{
                  display: 'flex',
                  alignItems: 'center',
                  gap: 8,
                  padding: '6px 10px',
                  borderRadius: 6,
                  background: 'var(--surface-2)',
                  marginTop: 4,
                  fontSize: 12,
                  color: 'var(--text-2)',
                }}
              >
                <span style={{ flex: 1 }}>{item.title}</span>
                <button
                  className="btn"
                  style={{ fontSize: 10, padding: '2px 7px' }}
                  onClick={() => handleUndismiss(item.id)}
                >
                  숨김 해제
                </button>
              </div>
            ))}
        </div>
      )}
    </div>
  );
}
