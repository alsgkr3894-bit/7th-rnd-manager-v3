'use client';
import { Icon } from '@/components/icons';
import { EmptyState } from '@/components/ui/EmptyState';
import { asDisplayText, asObjectArray } from '@/lib/ui/prop-guards';

/**
 * 이번 주 개발 일정 — 주간 스트립(일~토) + 일정 리스트.
 *
 * @param {{ data: { rangeLabel, days, events } | null, router }} props
 */
export function ScheduleWidget({ data, router }) {
  if (!data) return null;
  const rangeLabel = asDisplayText(data.rangeLabel);
  const days = asObjectArray(data.days);
  const events = asObjectArray(data.events);
  const goCalendar = () => router?.push?.('/note/calendar');

  return (
    <div className="card">
      <div className="card-header">
        <div>
          <div className="card-title">이번 주 개발 일정</div>
          <div className="card-sub">{rangeLabel}</div>
        </div>
        <button className="link accent" onClick={goCalendar}>
          달력 <Icon.chevRight />
        </button>
      </div>

      <div className="week-strip">
        {days.map((d, i) => (
          <div key={i} className={`wk-day${d.today ? ' today' : ''}`}>
            <div className="wk-dow">{asDisplayText(d.dow)}</div>
            <div className="wk-num">{asDisplayText(d.num)}</div>
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
          {events.slice(0, 5).map((ev, index) => {
            const color = ev.color && typeof ev.color === 'object' ? ev.color : {};
            const title = asDisplayText(ev.title);
            const sub = asDisplayText(ev.sub);
            const type = asDisplayText(ev.type);
            return (
              <button key={ev.id ?? index} className="sched-row" onClick={goCalendar}>
                <div className="sched-date">
                  <div className="sd-d">{asDisplayText(ev.num)}</div>
                  <div className="sd-w">{asDisplayText(ev.dow)}</div>
                </div>
                <div className="sched-main">
                  <span className="sched-title">{title}</span>
                  {sub && <span className="sched-sub">{sub}</span>}
                </div>
                <span
                  className="tagchip"
                  style={{
                    background: asDisplayText(color.bg) || undefined,
                    color: asDisplayText(color.text) || undefined,
                  }}
                >
                  {type}
                </span>
              </button>
            );
          })}
        </div>
      )}
    </div>
  );
}
