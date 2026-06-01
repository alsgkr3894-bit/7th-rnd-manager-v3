'use client';
import { Icon } from '@/components/icons';
import { EmptyState } from '@/components/ui/EmptyState';

/**
 * 이번 주 개발 일정 — 주간 스트립(일~토) + 일정 리스트.
 *
 * @param {{ data: { rangeLabel, days, events } | null, router }} props
 */
export function ScheduleWidget({ data, router }) {
  if (!data) return null;
  const { rangeLabel, days, events } = data;

  return (
    <div className="card">
      <div className="card-header">
        <div>
          <div className="card-title">이번 주 개발 일정</div>
          <div className="card-sub">{rangeLabel}</div>
        </div>
        <button className="link accent" onClick={() => router.push('/note/calendar')}>
          달력 <Icon.chevRight />
        </button>
      </div>

      <div className="week-strip">
        {days.map((d, i) => (
          <div key={i} className={`wk-day${d.today ? ' today' : ''}`}>
            <div className="wk-dow">{d.dow}</div>
            <div className="wk-num">{d.num}</div>
            <div className={`wk-dot${d.hasEvent ? '' : ' empty'}`} />
          </div>
        ))}
      </div>

      {events.length === 0 ? (
        <EmptyState
          icon={<Icon.doc style={{ width: 28, height: 28 }} />}
          title="이번 주 일정이 없어요"
          desc="달력에서 일정을 추가할 수 있어요"
          compact
        />
      ) : (
        <div className="sched-list">
          {events.slice(0, 5).map(ev => (
            <button key={ev.id} className="sched-row" onClick={() => router.push('/note/calendar')}>
              <div className="sched-date">
                <div className="sd-d">{ev.num}</div>
                <div className="sd-w">{ev.dow}</div>
              </div>
              <div className="sched-main">
                <span className="sched-title">{ev.title}</span>
                {ev.sub && <span className="sched-sub">{ev.sub}</span>}
              </div>
              <span className="tagchip" style={{ background: ev.color.bg, color: ev.color.text }}>{ev.type}</span>
            </button>
          ))}
        </div>
      )}
    </div>
  );
}
