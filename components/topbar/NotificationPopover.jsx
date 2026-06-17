'use client';
import { useRouter } from 'next/navigation';
import { Icon } from '@/components/icons';

const meta = {
  alert: {
    bg: 'var(--negative-soft)',
    color: 'var(--negative)',
    ico: <Icon.alert style={{ width: 16, height: 16 }} />,
  },
  info: {
    bg: 'var(--accent-soft)',
    color: 'var(--accent-text)',
    ico: <Icon.upload style={{ width: 16, height: 16 }} />,
  },
  note: {
    bg: 'var(--note-ico-bg)',
    color: 'var(--note-ico-color)',
    ico: <Icon.beaker style={{ width: 16, height: 16 }} />,
  },
  ok: {
    bg: 'var(--positive-soft)',
    color: 'var(--positive)',
    ico: <Icon.check style={{ width: 16, height: 16 }} />,
  },
};

export function NotificationPopover({ notifRef, notifOpen, onToggle, notifs }) {
  const router = useRouter();

  return (
    <div className="notif-wrap" ref={notifRef}>
      <button
        className="icon-btn"
        aria-label={`알림${notifs.length > 0 ? ` (${notifs.length}건)` : ''}`}
        aria-haspopup="menu"
        aria-expanded={notifOpen}
        onClick={onToggle}
        style={{ position: 'relative' }}
      >
        <Icon.bell aria-hidden="true" style={{ width: 18, height: 18 }} />
        {notifs.length > 0 && <span className="notif-dot" aria-hidden="true"></span>}
      </button>
      {notifOpen && (
        <div className="notif-pop" role="region" aria-label="알림 목록" aria-live="polite">
          <div className="notif-head">
            <div className="notif-title">
              알림 {notifs.length > 0 && <span className="notif-count">{notifs.length}</span>}
            </div>
            <button className="link" onClick={onToggle}>
              모두 읽음
            </button>
          </div>
          <div className="notif-list">
            {notifs.length === 0 ? (
              <div
                style={{
                  padding: '24px 16px',
                  textAlign: 'center',
                  color: 'var(--text-3)',
                  fontSize: 13,
                }}
              >
                새 알림이 없습니다
              </div>
            ) : (
              notifs.map((n, i) => {
                const m = meta[n.kind];
                return (
                  <button
                    className="notif-item"
                    key={i}
                    onClick={() => {
                      if (n.href) {
                        router.push(n.href);
                        onToggle();
                      }
                    }}
                  >
                    <div className="notif-ico" style={{ background: m.bg, color: m.color }}>
                      {m.ico}
                    </div>
                    <div className="notif-body">
                      <div className="notif-row1">
                        <span className="notif-name">{n.title}</span>
                        <span className="notif-time">{n.time}</span>
                      </div>
                      <div className="notif-desc">{n.desc}</div>
                    </div>
                  </button>
                );
              })
            )}
          </div>
        </div>
      )}
    </div>
  );
}
