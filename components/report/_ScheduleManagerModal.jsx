'use client';
import { useState } from 'react';
import { Icon } from '@/components/icons';
import { KIND_COLOR, KIND_LABEL } from '@/lib/report/constants';

export function ScheduleManagerModal({ onClose }) {
  const [schedules] = useState([]);

  return (
    <div className="modal-scrim">
      <div className="modal-schedule" onClick={e => e.stopPropagation()}
        role="dialog" aria-modal="true" aria-labelledby="schedule-modal-title">
        <div className="modal-head">
          <h3 id="schedule-modal-title">예약 설정</h3>
          <button className="modal-close" onClick={onClose}><Icon.x style={{width:20,height:20}}/></button>
        </div>
        <div className="modal-body">
          {schedules.length === 0 ? (
            <div className="empty-state" style={{padding:32}}>
              <Icon.gear style={{width:32,height:32,color:'var(--text-4)'}}/>
              <div className="empty-title">예약된 보고서가 없어요</div>
              <div className="empty-sub">새 예약을 추가하면 자동으로 생성돼요.</div>
            </div>
          ) : (
            <div className="schedule-list">
              {schedules.map(s => (
                <div key={s.id} className="schedule-row">
                  <div style={{flex:1}}>
                    <div className="schedule-name">
                      <span className="chip" style={{background:KIND_COLOR[s.kind]+'22', color:KIND_COLOR[s.kind]}}>
                        {KIND_LABEL[s.kind] || s.kind}
                      </span>
                      <span style={{marginLeft:8}}>{s.name}</span>
                    </div>
                    <div className="schedule-row-meta">{s.freq}</div>
                    <div className="schedule-row-recipients">다음 발송: {s.next}</div>
                  </div>
                  <div style={{display:'flex', gap:6}}>
                    <button className="btn sm">편집</button>
                    <button className="btn sm">삭제</button>
                  </div>
                </div>
              ))}
            </div>
          )}
          <button className="schedule-add" style={{marginTop:16}}>
            <Icon.plus style={{width:14,height:14}}/>새 예약 추가
          </button>
        </div>
      </div>
    </div>
  );
}
