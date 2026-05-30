'use client';
import { useState } from 'react';
import { showToast } from '@/components/Toast';
import { SCHEDULE_TYPES, SCHEDULE_COLORS } from '@/lib/note/schedules';
import { ModalFrame } from '@/components/ui/ModalFrame';

export function ScheduleModal({ initial, defaultDate, onSave, onClose, onDelete }) {
  const isEdit = !!initial?.id;
  const [title, setTitle] = useState(initial?.title || '');
  const [date,  setDate]  = useState(initial?.date  || defaultDate || '');
  const [time,  setTime]  = useState(initial?.time  || '');
  const [type,  setType]  = useState(initial?.type  || SCHEDULE_TYPES[0]);
  const [desc,  setDesc]  = useState(initial?.description || '');
  const [saving, setSaving] = useState(false);

  async function handleSubmit(e) {
    e.preventDefault();
    if (!title.trim()) { showToast('제목을 입력해주세요', 'err'); return; }
    if (!date) { showToast('날짜를 입력해주세요', 'err'); return; }
    setSaving(true);
    try {
      await onSave({ title, date, time, type, description: desc });
    } finally { setSaving(false); }
  }

  return (
    <ModalFrame
      title={isEdit ? '일정 편집' : '일정 추가'}
      onClose={onClose}
      width="min(480px,94vw)"
      zIndex={400}
      padding="22px 24px"
    >
      <form onSubmit={handleSubmit} style={{ display:'flex', flexDirection:'column', gap:13 }}>
        <div>
          <label style={{ fontSize:11, fontWeight:700, color:'var(--text-3)', display:'block', marginBottom:6 }}>유형</label>
          <div style={{ display:'flex', gap:6, flexWrap:'wrap' }}>
            {SCHEDULE_TYPES.map(t => {
              const c = SCHEDULE_COLORS[t];
              const on = type === t;
              return (
                <button key={t} type="button"
                  onClick={() => setType(t)}
                  style={{
                    padding:'5px 12px', borderRadius:99, fontSize:12, fontWeight:700,
                    border: `1.5px solid ${on ? c.border : 'var(--border)'}`,
                    background: on ? c.bg : 'var(--surface)',
                    color: on ? c.text : 'var(--text-3)',
                    cursor:'pointer', transition:'all 0.12s',
                  }}>
                  {t}
                </button>
              );
            })}
          </div>
        </div>

        <div>
          <label style={{ fontSize:11, fontWeight:700, color:'var(--text-3)', display:'block', marginBottom:5 }}>제목 *</label>
          <input className="form-input" value={title} onChange={e => setTitle(e.target.value)}
            placeholder="일정 제목" autoFocus/>
        </div>

        <div style={{ display:'grid', gridTemplateColumns:'1fr 1fr', gap:10 }}>
          <div>
            <label style={{ fontSize:11, fontWeight:700, color:'var(--text-3)', display:'block', marginBottom:5 }}>날짜 *</label>
            <input className="form-input" type="date" value={date} onChange={e => setDate(e.target.value)}/>
          </div>
          <div>
            <label style={{ fontSize:11, fontWeight:700, color:'var(--text-3)', display:'block', marginBottom:5 }}>시간 (선택)</label>
            <input className="form-input" type="time" value={time} onChange={e => setTime(e.target.value)}/>
          </div>
        </div>

        <div>
          <label style={{ fontSize:11, fontWeight:700, color:'var(--text-3)', display:'block', marginBottom:5 }}>메모 (선택)</label>
          <textarea className="form-input" rows={2} value={desc} onChange={e => setDesc(e.target.value)}
            placeholder="관련 내용, 준비사항 등" style={{ resize:'vertical' }}/>
        </div>

        <div style={{ display:'flex', gap:8, justifyContent:'space-between', marginTop:4 }}>
          <div>
            {isEdit && (
              <button type="button" className="btn" style={{ color:'var(--negative)', borderColor:'var(--negative)' }}
                onClick={onDelete}>삭제</button>
            )}
          </div>
          <div style={{ display:'flex', gap:8 }}>
            <button type="button" className="btn" onClick={onClose}>취소</button>
            <button type="submit" className="btn primary" disabled={saving}>
              {saving ? '저장 중…' : isEdit ? '수정' : '추가'}
            </button>
          </div>
        </div>
      </form>
    </ModalFrame>
  );
}
