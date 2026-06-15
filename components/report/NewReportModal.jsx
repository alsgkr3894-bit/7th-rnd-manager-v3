'use client';

import { Icon } from '@/components/icons';
import { KIND_EMOJI, KIND_META } from '@/lib/report/constants';

const NEW_REPORT_KINDS = Object.values(KIND_META);

export function NewReportModal({ onClose, router }) {
  return (
    <div className="palette-scrim" onClick={onClose}>
      <div
        className="modal-box"
        style={{ maxWidth: 480, padding: 0, overflow: 'hidden' }}
        onClick={e => e.stopPropagation()}
      >
        <div style={{ padding: '20px 24px 16px', borderBottom: '1px solid var(--border)' }}>
          <div style={{ fontWeight: 800, fontSize: 16 }}>새 보고서 생성</div>
          <div style={{ fontSize: 12, color: 'var(--text-3)', marginTop: 4 }}>
            생성할 보고서 종류를 선택하세요
          </div>
        </div>
        <div style={{ padding: 12, display: 'flex', flexDirection: 'column', gap: 4 }}>
          {NEW_REPORT_KINDS.map(kind => (
            <button
              key={kind.id}
              onClick={() => {
                onClose();
                router.push(kind.href);
              }}
              style={{
                display: 'flex',
                alignItems: 'center',
                gap: 14,
                padding: '12px 14px',
                borderRadius: 12,
                textAlign: 'left',
                cursor: 'pointer',
                border: '1px solid transparent',
                background: 'transparent',
              }}
              className="company-drop-item"
            >
              <span
                style={{
                  width: 36,
                  height: 36,
                  borderRadius: 10,
                  background: kind.color + '1A',
                  color: kind.color,
                  display: 'grid',
                  placeItems: 'center',
                  flexShrink: 0,
                  fontSize: 18,
                }}
              >
                {KIND_EMOJI[kind.id] || '📄'}
              </span>
              <span style={{ flex: 1, minWidth: 0 }}>
                <span
                  style={{
                    display: 'block',
                    fontWeight: 700,
                    fontSize: 13,
                    color: 'var(--text-1)',
                  }}
                >
                  {kind.title}
                </span>
                <span
                  style={{ display: 'block', fontSize: 11, color: 'var(--text-3)', marginTop: 2 }}
                >
                  {kind.sub}
                </span>
              </span>
              <Icon.chevRight
                style={{ width: 14, height: 14, color: 'var(--text-4)', flexShrink: 0 }}
              />
            </button>
          ))}
        </div>
        <div
          style={{ padding: '12px 24px', borderTop: '1px solid var(--border)', textAlign: 'right' }}
        >
          <button className="btn" onClick={onClose}>
            취소
          </button>
        </div>
      </div>
    </div>
  );
}
