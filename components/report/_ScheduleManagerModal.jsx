'use client';
import { useState } from 'react';
import { Icon } from '@/components/icons';
import { KIND_COLOR, KIND_LABEL } from '@/lib/report/constants';
import { asDisplayText, asObjectArray } from '@/lib/ui/prop-guards';

export function ScheduleManagerModal({ onClose }) {
  const [schedules] = useState([]);
  const safeSchedules = asObjectArray(schedules);
  const handleClose = typeof onClose === 'function' ? onClose : () => {};

  return (
    <div className="modal-scrim">
      <div
        className="modal-schedule"
        onClick={e => e.stopPropagation()}
        role="dialog"
        aria-modal="true"
        aria-labelledby="schedule-modal-title"
      >
        <div className="modal-head">
          <h3 id="schedule-modal-title">예약 설정</h3>
          <button className="modal-close" onClick={handleClose}>
            <Icon.x style={{ width: 20, height: 20 }} />
          </button>
        </div>
        <div className="modal-body">
          {safeSchedules.length === 0 ? (
            <div className="empty-state" style={{ padding: 32 }}>
              <Icon.gear style={{ width: 32, height: 32, color: 'var(--text-4)' }} />
              <div className="empty-title">예약된 보고서가 없어요</div>
              <div className="empty-sub">새 예약을 추가하면 자동으로 생성돼요.</div>
            </div>
          ) : (
            <div className="schedule-list">
              {safeSchedules.map((s, index) => {
                const kind = asDisplayText(s.kind);
                const color = KIND_COLOR[kind] || '#888';
                const label = KIND_LABEL[kind] || asDisplayText(kind, '보고서');
                const name = asDisplayText(s.name, '이름 없는 예약');
                const freq = asDisplayText(s.freq, '주기 미정');
                const next = asDisplayText(s.next, '—');

                return (
                  <div key={asDisplayText(s.id) || index} className="schedule-row">
                    <div style={{ flex: 1 }}>
                      <div className="schedule-name">
                        <span className="chip" style={{ background: color + '22', color }}>
                          {label}
                        </span>
                        <span style={{ marginLeft: 8 }}>{name}</span>
                      </div>
                      <div className="schedule-row-meta">{freq}</div>
                      <div className="schedule-row-recipients">다음 발송: {next}</div>
                    </div>
                    <div style={{ display: 'flex', gap: 6 }}>
                      <button className="btn sm">편집</button>
                      <button className="btn sm">삭제</button>
                    </div>
                  </div>
                );
              })}
            </div>
          )}
          <button className="schedule-add" style={{ marginTop: 16 }}>
            <Icon.plus style={{ width: 14, height: 14 }} />새 예약 추가
          </button>
        </div>
      </div>
    </div>
  );
}
