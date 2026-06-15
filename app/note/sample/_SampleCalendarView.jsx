'use client';

import { RATING_COLOR, sampleNamesText } from '@/lib/sample';
import { formatDate } from '@/lib/format';

export function SampleCalendarView({
  days,
  calMonth,
  samplesByDate,
  today,
  onPrevMonth,
  onNextMonth,
  onOpenSample,
}) {
  return (
    <div className="tab-content-enter">
      <div style={{ display: 'flex', alignItems: 'center', gap: 12, marginBottom: 12 }}>
        <button className="btn sm" onClick={onPrevMonth}>
          ‹
        </button>
        <div
          style={{
            fontWeight: 800,
            fontSize: 15,
            color: 'var(--text-1)',
            minWidth: 100,
            textAlign: 'center',
          }}
        >
          {calMonth.getFullYear()}년 {calMonth.getMonth() + 1}월
        </div>
        <button className="btn sm" onClick={onNextMonth}>
          ›
        </button>
      </div>

      <div className="cal-grid" style={{ marginBottom: 4 }}>
        {['일', '월', '화', '수', '목', '금', '토'].map(day => (
          <div
            key={day}
            style={{
              textAlign: 'center',
              fontSize: 11,
              fontWeight: 700,
              color: 'var(--text-3)',
              padding: '4px 0',
            }}
          >
            {day}
          </div>
        ))}
      </div>

      <div className="cal-grid">
        {days.map(({ date, cur }, index) => {
          const ymd = formatDate(date);
          const daySamples = samplesByDate[ymd] || [];
          const isToday = ymd === today;
          return (
            <div
              key={index}
              className={'cal-cell' + (!cur ? ' other-month' : '') + (isToday ? ' today' : '')}
              style={{ cursor: daySamples.length > 0 ? 'pointer' : 'default' }}
              onClick={() => {
                if (daySamples.length > 0) onOpenSample(daySamples[0]);
              }}
            >
              <span style={{ fontSize: 12, fontWeight: isToday ? 800 : 400 }}>
                {date.getDate()}
              </span>
              <div style={{ display: 'flex', flexDirection: 'column', gap: 2, marginTop: 4 }}>
                {daySamples.slice(0, 3).map(sample => (
                  <button
                    key={sample.id}
                    onClick={event => {
                      event.stopPropagation();
                      onOpenSample(sample);
                    }}
                    title={sampleNamesText(sample) || sample.title}
                    style={{
                      fontSize: 10,
                      fontWeight: 600,
                      padding: '1px 5px',
                      borderRadius: 4,
                      background: 'var(--surface-2)',
                      color: 'var(--text-2)',
                      border: 'none',
                      borderLeft: `3px solid ${RATING_COLOR?.[sample.rating] || 'var(--accent)'}`,
                      overflow: 'hidden',
                      textOverflow: 'ellipsis',
                      whiteSpace: 'nowrap',
                      textAlign: 'left',
                      width: '100%',
                      cursor: 'pointer',
                    }}
                  >
                    {sampleNamesText(sample) || sample.title}
                  </button>
                ))}
                {daySamples.length > 3 && (
                  <span style={{ fontSize: 9, color: 'var(--text-3)' }}>
                    +{daySamples.length - 3}
                  </span>
                )}
              </div>
            </div>
          );
        })}
      </div>
    </div>
  );
}
