import Link from 'next/link';

function days(value) {
  return `${value}일`;
}

export function CalendarLeaveBalance({ balance }) {
  if (!balance) return null;
  return (
    <section
      className="card"
      aria-label="연차 잔여량"
      style={{ marginBottom: 14, padding: '16px 20px' }}
    >
      <div style={{ display: 'flex', flexWrap: 'wrap', gap: 12, alignItems: 'center' }}>
        <div style={{ marginRight: 'auto' }}>
          <div style={{ fontSize: 14, fontWeight: 800 }}>{balance.leaveYear}년차 연차</div>
          <div style={{ marginTop: 3, fontSize: 12, color: 'var(--text-3)' }}>
            사용기간 {balance.start} ~ {balance.end} · 남은 기간 {balance.daysRemaining}일
          </div>
        </div>
        <div style={{ display: 'flex', gap: 16, flexWrap: 'wrap', fontSize: 13 }}>
          <span>
            지급 <b>{days(balance.granted)}</b>
          </span>
          <span>
            차감 <b>{days(balance.used)}</b>
          </span>
          <span style={{ color: balance.remaining < 0 ? 'var(--negative)' : 'var(--accent-text)' }}>
            잔여 <b>{days(balance.remaining)}</b>
          </span>
        </div>
        <Link href="/settings/account" className="btn sm ghost" style={{ fontSize: 11 }}>
          연차 설정
        </Link>
      </div>
      {balance.remaining < 0 && (
        <div style={{ marginTop: 8, fontSize: 12, color: 'var(--negative)' }}>
          지급 연차를 {days(Math.abs(balance.remaining))} 초과해 등록했습니다.
        </div>
      )}
      <div style={{ marginTop: 8, fontSize: 11, color: 'var(--text-4)' }}>
        등록된 연차·반차는 기존 일정과 예정 일정까지 차감됩니다. 토·일요일은 차감하지 않습니다.
      </div>
      <details
        open
        style={{ marginTop: 12, borderTop: '1px solid var(--divider)', paddingTop: 10 }}
      >
        <summary style={{ cursor: 'pointer', fontSize: 13, fontWeight: 700 }}>
          {balance.leaveYear}년차 연차 사용내역 · {balance.entries.length}건
        </summary>
        {balance.entries.length === 0 ? (
          <div style={{ padding: '12px 0 2px', fontSize: 12, color: 'var(--text-3)' }}>
            이 기간에 등록된 연차·반차 일정이 없습니다.
          </div>
        ) : (
          <div style={{ maxHeight: 260, overflowY: 'auto', marginTop: 8 }}>
            {balance.entries.map((entry, index) => (
              <div
                key={`${entry.id ?? index}-${entry.start}`}
                style={{
                  display: 'flex',
                  flexWrap: 'wrap',
                  gap: '4px 12px',
                  alignItems: 'center',
                  padding: '8px 0',
                  borderBottom: '1px solid var(--divider)',
                  fontSize: 12,
                }}
              >
                <span style={{ minWidth: 180, color: 'var(--text-2)' }}>
                  {entry.start}
                  {entry.end !== entry.start ? ` ~ ${entry.end}` : ''}
                </span>
                <span style={{ flex: 1, minWidth: 120, fontWeight: 600 }}>{entry.title}</span>
                <span style={{ color: 'var(--text-3)' }}>
                  {entry.type} · {entry.status}
                </span>
                <b>
                  {days(entry.days)}
                  {entry.countedDates.length === 0 ? ' (주말 제외)' : ''}
                </b>
              </div>
            ))}
          </div>
        )}
      </details>
    </section>
  );
}
