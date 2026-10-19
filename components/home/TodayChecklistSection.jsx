'use client';
import { useEffect, useState } from 'react';
import { todayKey } from '@/app/note/calendar/_calendar-utils';
import { useTodayChecklist } from '@/app/note/calendar/useTodayChecklist';

const noopLoad = async () => {};

/**
 * 홈 맨 위 "오늘 할 일" 카드에 붙는 캘린더의 "오늘 하루 체크리스트".
 * 같은 저장소(localStorage)를 읽고 쓰며, 체크하면 캘린더와 같은 방식으로 연구일지에도 기록된다
 * (useTodayChecklist 재사용). 서버 렌더와 날짜가 어긋나지 않게 마운트 뒤에 오늘 날짜를 정한다.
 */
export function TodayChecklistSection({ canEdit = false }) {
  const [today, setToday] = useState('');
  useEffect(() => {
    setToday(todayKey());
  }, []);
  if (!today) return null;
  return <ChecklistBody today={today} canEdit={canEdit} />;
}

function ChecklistBody({ today, canEdit }) {
  const { todayChecklist, checkInput, setCheckInput, addChecklistItem, toggleChecklistItem } =
    useTodayChecklist({ today, load: noopLoad, canEdit });
  const doneCount = todayChecklist.filter(item => item.done).length;
  return (
    <div
      className="todo-checklist"
      style={{ marginTop: 12, paddingTop: 12, borderTop: '1px solid var(--divider)' }}
    >
      <div
        style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'baseline', gap: 8 }}
      >
        <div style={{ fontSize: 13, fontWeight: 800 }}>오늘 하루 체크리스트</div>
        <div style={{ fontSize: 11, color: 'var(--text-4)' }}>
          {doneCount}/{todayChecklist.length} 완료
        </div>
      </div>
      {todayChecklist.length === 0 ? (
        <div style={{ fontSize: 12, color: 'var(--text-4)', padding: '6px 0' }}>
          등록된 체크 항목이 없습니다.
        </div>
      ) : (
        <div style={{ display: 'flex', flexDirection: 'column', gap: 4, margin: '8px 0' }}>
          {todayChecklist.map(item => (
            <label
              key={item.id}
              style={{
                display: 'flex',
                alignItems: 'center',
                gap: 8,
                fontSize: 13,
                cursor: canEdit ? 'pointer' : 'default',
                color: item.done ? 'var(--text-4)' : 'var(--text-2)',
              }}
            >
              <input
                type="checkbox"
                checked={item.done}
                onChange={() => toggleChecklistItem(item.id)}
                disabled={!canEdit}
                style={{ accentColor: 'var(--positive)' }}
              />
              <span style={{ textDecoration: item.done ? 'line-through' : 'none' }}>
                {item.text}
              </span>
            </label>
          ))}
        </div>
      )}
      {canEdit && (
        <form
          onSubmit={event => {
            event.preventDefault();
            addChecklistItem();
          }}
          style={{ display: 'flex', gap: 6 }}
        >
          <input
            className="form-input"
            value={checkInput}
            onChange={event => setCheckInput(event.target.value)}
            placeholder="오늘 할 일 입력"
            style={{ height: 32, fontSize: 12 }}
          />
          <button className="btn sm primary" type="submit" disabled={!checkInput.trim()}>
            추가
          </button>
        </form>
      )}
    </div>
  );
}
