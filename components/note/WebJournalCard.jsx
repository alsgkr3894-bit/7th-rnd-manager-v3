'use client';
import { Icon } from '@/components/icons';
import { STATUS_COLORS } from '@/lib/note/constants';

function TwoColFields({ pairs }) {
  const filled = pairs.filter(([, v]) => v);
  if (!filled.length) return null;
  return (
    <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '0 20px' }}>
      {filled.map(([label, value]) => (
        <div key={label}>
          <div
            style={{
              fontSize: 11,
              fontWeight: 700,
              color: 'var(--text-3)',
              textTransform: 'uppercase',
              letterSpacing: '.04em',
              marginBottom: 4,
            }}
          >
            {label}
          </div>
          <div
            style={{
              fontSize: 13,
              lineHeight: 1.7,
              whiteSpace: 'pre-wrap',
              color: 'var(--text-1)',
            }}
          >
            {value}
          </div>
        </div>
      ))}
    </div>
  );
}

export function WebJournalCard({ note, index, onEdit }) {
  const statusStyle = STATUS_COLORS[note.status] || {};

  return (
    <div className="card" style={{ overflow: 'hidden', padding: 0 }}>
      {/* 헤더 */}
      <div
        style={{
          background: 'var(--surface-2)',
          borderBottom: '1px solid var(--divider)',
          padding: '10px 16px',
          display: 'flex',
          alignItems: 'center',
          gap: 10,
        }}
      >
        <span
          style={{
            fontSize: 12,
            fontWeight: 800,
            color: 'var(--text-3)',
            minWidth: 30,
          }}
        >
          No.{index}
        </span>
        <span style={{ fontWeight: 700, fontSize: 15, flex: 1 }}>
          {note.title || '(제목 없음)'}
        </span>
        <div style={{ display: 'flex', gap: 6, alignItems: 'center' }}>
          {note.noteType && (
            <span
              style={{
                fontSize: 11,
                fontWeight: 700,
                padding: '2px 8px',
                borderRadius: 999,
                background: 'var(--accent-soft)',
                color: 'var(--accent-text)',
              }}
            >
              {note.noteType}
            </span>
          )}
          {note.status && (
            <span
              style={{
                fontSize: 11,
                fontWeight: 600,
                padding: '2px 8px',
                borderRadius: 6,
                ...statusStyle,
              }}
            >
              {note.status}
            </span>
          )}
          <button className="btn sm" onClick={onEdit} title="수정">
            <Icon.edit style={{ width: 13, height: 13 }} />
          </button>
        </div>
      </div>

      {/* 메타 */}
      {(note.menuName || note.category) && (
        <div
          style={{
            padding: '6px 16px',
            fontSize: 13,
            color: 'var(--text-2)',
            display: 'flex',
            gap: 16,
            borderBottom: '1px solid var(--divider)',
          }}
        >
          {note.menuName && (
            <span>
              <b>메뉴:</b> {note.menuName}
            </span>
          )}
          {note.category && (
            <span>
              <b>구분:</b> {note.category}
            </span>
          )}
        </div>
      )}

      <div style={{ padding: '14px 16px', display: 'flex', flexDirection: 'column', gap: 12 }}>
        {/* 핵심 내용 */}
        {note.testContent && (
          <div>
            <div
              style={{
                fontSize: 11,
                fontWeight: 700,
                color: 'var(--text-3)',
                textTransform: 'uppercase',
                letterSpacing: '.04em',
                marginBottom: 6,
              }}
            >
              핵심 테스트 내용
            </div>
            <div
              style={{
                background: 'var(--surface-2)',
                borderRadius: 8,
                padding: '10px 14px',
                fontSize: 13,
                lineHeight: 1.75,
                whiteSpace: 'pre-wrap',
              }}
            >
              {note.testContent}
            </div>
          </div>
        )}

        {/* 2열 필드 */}
        <TwoColFields
          pairs={[
            ['사용 재료', note.materials],
            ['맛 평가', note.tasteEval],
            ['상무님 평가', note.managerEval],
            ['원가 검토', note.costNote],
            ['개선점', note.improvements],
            ['다음 액션', note.nextAction],
          ]}
        />

        {/* 사진 */}
        {note.photos?.length > 0 && (
          <div>
            <div
              style={{
                fontSize: 11,
                fontWeight: 700,
                color: 'var(--text-3)',
                textTransform: 'uppercase',
                letterSpacing: '.04em',
                marginBottom: 8,
              }}
            >
              사진 ({note.photos.length}장)
            </div>
            <div style={{ display: 'grid', gridTemplateColumns: 'repeat(3, 1fr)', gap: 8 }}>
              {note.photos.map((p, i) => (
                <div key={i}>
                  <img
                    src={p.data}
                    alt={p.caption || p.name}
                    style={{
                      width: '100%',
                      aspectRatio: '4/3',
                      objectFit: 'cover',
                      borderRadius: 6,
                      display: 'block',
                    }}
                  />
                  {p.caption && (
                    <div
                      style={{
                        fontSize: 11,
                        color: 'var(--text-3)',
                        marginTop: 3,
                        textAlign: 'center',
                      }}
                    >
                      {p.caption}
                    </div>
                  )}
                </div>
              ))}
            </div>
          </div>
        )}

        {/* 태그 */}
        {note.tags && (
          <div style={{ display: 'flex', flexWrap: 'wrap', gap: 6 }}>
            {note.tags
              .split(',')
              .map(t => t.trim())
              .filter(Boolean)
              .map(t => (
                <span
                  key={t}
                  style={{
                    fontSize: 11,
                    padding: '2px 8px',
                    borderRadius: 999,
                    background: 'var(--surface-2)',
                    color: 'var(--text-3)',
                  }}
                >
                  #{t}
                </span>
              ))}
          </div>
        )}
      </div>
    </div>
  );
}
