'use client';
import { SearchBox } from '@/components/ui/SearchBox';
import { monthLabel, safeMonth, shiftMonth, toDateLabel } from './journalDates';

function MonthEntrySummary({ entry }) {
  const journalText = [
    entry.journal?.testContent,
    entry.journal?.tasteEval,
    entry.journal?.nextAction,
  ]
    .map(value => String(value || '').trim())
    .filter(Boolean)[0];
  if (journalText) return <span>{journalText}</span>;
  if (entry.schedules.length > 0) return <span>{entry.schedules[0].title}</span>;
  return <span>{entry.notes[0]?.title || entry.notes[0]?.menuName || '기록 보기'}</span>;
}

export function JournalMonthList({
  month,
  entries,
  totalEntries,
  selectedDate,
  onMonthChange,
  onSelectDate,
  search,
  onSearch,
}) {
  return (
    <section className="card" style={{ padding: 18, marginTop: 16 }}>
      <div
        style={{
          display: 'flex',
          alignItems: 'center',
          justifyContent: 'space-between',
          gap: 10,
          flexWrap: 'wrap',
          marginBottom: 12,
        }}
      >
        <div>
          <div className="card-title">월별 목록</div>
          <div style={{ fontSize: 12, color: 'var(--text-3)', marginTop: 2 }}>
            {monthLabel(month)} · {entries.length}일 표시 / 전체 {totalEntries}일
          </div>
        </div>
        <div style={{ display: 'flex', gap: 6, alignItems: 'center', flexWrap: 'wrap' }}>
          <div style={{ width: 220, flex: '1 1 220px', minWidth: 0 }}>
            <SearchBox value={search} onChange={onSearch} placeholder="일지·노트·일정 검색" />
          </div>
          <button
            className="btn sm"
            type="button"
            onClick={() => onMonthChange(shiftMonth(month, -1))}
          >
            이전 달
          </button>
          <input
            className="form-input"
            type="month"
            value={safeMonth(month)}
            onChange={event => {
              if (event.target.value) onMonthChange(event.target.value);
            }}
            style={{ width: 132 }}
          />
          <button
            className="btn sm"
            type="button"
            onClick={() => onMonthChange(shiftMonth(month, 1))}
          >
            다음 달
          </button>
        </div>
      </div>

      {totalEntries === 0 ? (
        <div
          style={{
            border: '1px dashed var(--border)',
            borderRadius: 8,
            padding: '18px 14px',
            textAlign: 'center',
            color: 'var(--text-3)',
            fontSize: 13,
          }}
        >
          이 달에 저장된 연구일지나 일정이 없습니다.
        </div>
      ) : entries.length === 0 ? (
        <div
          style={{
            border: '1px dashed var(--border)',
            borderRadius: 8,
            padding: '18px 14px',
            textAlign: 'center',
            color: 'var(--text-3)',
            fontSize: 13,
          }}
        >
          검색 결과가 없습니다. 다른 키워드로 검색해보세요.
        </div>
      ) : (
        <div style={{ display: 'grid', gap: 8 }}>
          {entries.map(entry => {
            const selected = entry.date === selectedDate;
            return (
              <button
                key={entry.date}
                type="button"
                onClick={() => onSelectDate(entry.date)}
                style={{
                  display: 'grid',
                  gridTemplateColumns: '118px minmax(0, 1fr)',
                  gap: 12,
                  alignItems: 'center',
                  textAlign: 'left',
                  borderRadius: 8,
                  border: `1px solid ${selected ? 'var(--accent)' : 'var(--border)'}`,
                  background: selected ? 'var(--accent-soft)' : 'var(--surface)',
                  padding: '10px 12px',
                  cursor: 'pointer',
                  fontFamily: 'inherit',
                }}
              >
                <strong
                  style={{ fontSize: 13, color: selected ? 'var(--accent-text)' : 'var(--text-1)' }}
                >
                  {toDateLabel(entry.date)}
                </strong>
                <span style={{ minWidth: 0, display: 'grid', gap: 4 }}>
                  <span
                    style={{
                      display: 'flex',
                      gap: 6,
                      flexWrap: 'wrap',
                      alignItems: 'center',
                      fontSize: 11,
                      color: 'var(--text-3)',
                    }}
                  >
                    {entry.journal && <span className="chip">연구일지</span>}
                    {entry.notes.length > 0 && (
                      <span className="chip">노트 {entry.notes.length}</span>
                    )}
                    {entry.schedules.length > 0 && (
                      <span className="chip">일정 {entry.schedules.length}</span>
                    )}
                  </span>
                  <span
                    style={{
                      overflow: 'hidden',
                      textOverflow: 'ellipsis',
                      whiteSpace: 'nowrap',
                      color: 'var(--text-2)',
                      fontSize: 13,
                    }}
                  >
                    <MonthEntrySummary entry={entry} />
                  </span>
                </span>
              </button>
            );
          })}
        </div>
      )}
    </section>
  );
}
