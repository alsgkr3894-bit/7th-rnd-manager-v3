import { STATUS_COLORS } from '@/lib/note';
import { noteDisplayTitle } from '@/lib/note/display';

export function ChainTimeline({ chain, currentId, onNavigate }) {
  if (!chain || chain.length < 2) return null;
  const menuStatus = chain[chain.length - 1]?.status || '테스트';

  return (
    <div className="card" style={{ marginTop: 24 }}>
      <div className="card-title" style={{ marginBottom: 12 }}>
        버전 체인
      </div>
      <div style={{ display: 'flex', alignItems: 'center', overflowX: 'auto', paddingBottom: 4 }}>
        {chain.map((note, index) => (
          <TimelineItem
            key={note.id}
            note={note}
            menuStatus={menuStatus}
            isCurrent={note.id === currentId}
            showConnector={index > 0}
            onNavigate={onNavigate}
          />
        ))}
      </div>
    </div>
  );
}

function TimelineItem({ note, menuStatus, isCurrent, showConnector, onNavigate }) {
  const statusColor = STATUS_COLORS[menuStatus] || {};
  const title = noteDisplayTitle(note);

  return (
    <div style={{ display: 'flex', alignItems: 'center', flexShrink: 0 }}>
      {showConnector && (
        <div style={{ width: 28, height: 2, background: 'var(--border)', flexShrink: 0 }} />
      )}
      <button
        onClick={() => !isCurrent && onNavigate(note.id)}
        disabled={isCurrent}
        style={{
          flexShrink: 0,
          minWidth: 130,
          padding: '8px 12px',
          borderRadius: 10,
          border: isCurrent
            ? `2px solid ${statusColor.color || 'var(--accent)'}`
            : '1px solid var(--border)',
          background: isCurrent ? statusColor.bg || 'var(--accent-soft)' : 'var(--surface)',
          cursor: isCurrent ? 'default' : 'pointer',
          textAlign: 'left',
          opacity: isCurrent ? 1 : 0.85,
        }}
      >
        <div
          style={{
            fontSize: 10,
            color: statusColor.color || 'var(--text-3)',
            fontWeight: 700,
            marginBottom: 3,
            display: 'flex',
            alignItems: 'center',
            gap: 4,
          }}
        >
          {menuStatus}
          {isCurrent && (
            <span
              style={{
                background: 'var(--accent)',
                color: '#fff',
                borderRadius: 4,
                padding: '0 4px',
                fontSize: 9,
              }}
            >
              현재
            </span>
          )}
        </div>
        <div
          style={{
            fontSize: 12,
            fontWeight: 600,
            color: 'var(--text-1)',
            overflow: 'hidden',
            textOverflow: 'ellipsis',
            whiteSpace: 'nowrap',
            maxWidth: 150,
          }}
        >
          {title}
        </div>
        <div style={{ fontSize: 10, color: 'var(--text-3)', marginTop: 3 }}>
          {note.testDate || (note.createdAt ? note.createdAt.slice(0, 10) : '')}
        </div>
      </button>
    </div>
  );
}
