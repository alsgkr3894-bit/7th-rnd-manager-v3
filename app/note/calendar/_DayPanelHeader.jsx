'use client';
import { Icon } from '@/components/icons';
import { WEEKDAYS, isPast, isToday } from './_calendar-utils';

export function DayPanelHeader({ dateKey, today, notesCount, schedulesCount, onClose }) {
  const [y, m, d] = dateKey.split('-').map(Number);
  const hasValidDate = Number.isFinite(y) && Number.isFinite(m) && Number.isFinite(d);
  const future = dateKey && today && !isPast(dateKey, today) && !isToday(dateKey, today);
  const dow = hasValidDate ? new Date(y, m - 1, d).getDay() : 0;

  return (
    <div style={{ display: 'flex', alignItems: 'flex-start', gap: 8, marginBottom: 14 }}>
      <div style={{ flex: 1 }}>
        <div style={{ fontSize: 16, fontWeight: 800, letterSpacing: '-0.02em' }}>
          {hasValidDate ? `${m}월 ${d}일 (${WEEKDAYS[dow]})` : '날짜 없음'}
        </div>
        <div style={{ fontSize: 11, color: 'var(--text-3)', marginTop: 3 }}>
          {dateKey && today && isToday(dateKey, today) ? (
            <span style={{ color: 'var(--accent-text)', fontWeight: 700 }}>오늘</span>
          ) : future ? (
            <span style={{ color: 'var(--text-3)' }}>예정일</span>
          ) : (
            <span style={{ color: 'var(--text-4)' }}>
              {`테스트 ${notesCount}건 · 일정 ${schedulesCount}건`}
            </span>
          )}
        </div>
      </div>
      <button className="btn sm ghost xs" onClick={onClose}>
        <Icon.close style={{ width: 13, height: 13 }} />
      </button>
    </div>
  );
}
