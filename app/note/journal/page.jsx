'use client';
import { useState, useMemo } from 'react';
import { useRouter } from 'next/navigation';
import { Icon } from '@/components/icons';
import { PageHeader } from '@/components/ui/PageHeader';
import { useDBLoad } from '@/hooks/useDBLoad';
import { getAllNotes } from '@/lib/note';
import { buildJournalPrintHtml } from '@/lib/note/journal-print';
import { openPrintWindow } from '@/lib/print/window-print';
import { WebJournalCard } from '@/components/note/WebJournalCard';
import { todayLocalDate } from '@/lib/date/local-date';

const DAY_LABELS = ['일', '월', '화', '수', '목', '금', '토'];

function toDateLabel(dateStr) {
  const d = new Date(dateStr + 'T00:00:00');
  return `${dateStr} (${DAY_LABELS[d.getDay()]})`;
}

// ── 메인 페이지 ─────────────────────────────────────────────
export default function Page() {
  const router = useRouter();
  const [date, setDate] = useState(() => todayLocalDate());

  // date 변경은 re-fetch 없이 JS 필터만 하므로 deps 불필요
  const { data: notes = [], loading } = useDBLoad(() => getAllNotes(), {
    initialData: [],
    onError: console.error,
  });

  const dayNotes = useMemo(
    () =>
      notes
        .filter(n => (n.testDate || n.createdAt || '').slice(0, 10) === date)
        .sort((a, b) => (a.createdAt || '').localeCompare(b.createdAt || '')),
    [notes, date]
  );

  const datesWithNotes = useMemo(() => {
    const s = new Set();
    notes.forEach(n => {
      const d = (n.testDate || n.createdAt || '').slice(0, 10);
      if (d) s.add(d);
    });
    return [...s].sort().reverse();
  }, [notes]);

  function goPrev() {
    const idx = datesWithNotes.indexOf(date);
    if (idx < datesWithNotes.length - 1) setDate(datesWithNotes[idx + 1]);
  }
  function goNext() {
    const idx = datesWithNotes.indexOf(date);
    if (idx > 0) setDate(datesWithNotes[idx - 1]);
  }

  const hasPrev = datesWithNotes.indexOf(date) < datesWithNotes.length - 1;
  const hasNext = datesWithNotes.indexOf(date) > 0;
  const dateLabel = toDateLabel(date);

  return (
    <main className="main">
      <PageHeader
        breadcrumb={['메뉴개발노트', '연구일지']}
        title="연구일지"
        sub={loading ? '로딩 중…' : `${dateLabel} · ${dayNotes.length}건`}
        actions={
          <div style={{ display: 'flex', gap: 8, alignItems: 'center' }}>
            <button className="btn" onClick={goPrev} disabled={!hasPrev} title="이전 일자">
              <Icon.arrowUp style={{ width: 14, height: 14, transform: 'rotate(-90deg)' }} />
            </button>
            <input
              type="date"
              className="form-input"
              value={date}
              onChange={e => {
                if (e.target.value) setDate(e.target.value);
              }}
              style={{ width: 148 }}
            />
            <button className="btn" onClick={goNext} disabled={!hasNext} title="다음 일자">
              <Icon.arrowDown style={{ width: 14, height: 14, transform: 'rotate(-90deg)' }} />
            </button>
            {dayNotes.length > 0 && (
              <button
                className="btn primary"
                onClick={() =>
                  openPrintWindow(buildJournalPrintHtml(dateLabel, dayNotes), {
                    width: 800,
                    height: 900,
                  })
                }
              >
                <Icon.download style={{ width: 14, height: 14 }} /> PDF 출력
              </button>
            )}
          </div>
        }
      />

      {loading ? (
        <div style={{ display: 'flex', flexDirection: 'column', gap: 12, marginTop: 16 }}>
          {Array.from({ length: 4 }).map((_, i) => (
            <div
              key={i}
              className="card"
              style={{
                padding: 20,
                height: 100,
                background: 'var(--surface-2)',
                borderColor: 'transparent',
                opacity: 1 - i * 0.15,
              }}
            />
          ))}
        </div>
      ) : dayNotes.length === 0 ? (
        <div className="card" style={{ padding: '48px 24px', textAlign: 'center' }}>
          <div style={{ fontSize: 14, color: 'var(--text-3)', marginBottom: 12 }}>
            {date}에 작성된 테스트 노트가 없습니다.
          </div>
          <button className="btn primary" onClick={() => router.push('/note/write')}>
            <Icon.plus style={{ width: 14, height: 14 }} /> 노트 작성
          </button>
        </div>
      ) : (
        <div style={{ display: 'flex', flexDirection: 'column', gap: 16, marginTop: 16 }}>
          {dayNotes.map((note, idx) => (
            <WebJournalCard
              key={note.id}
              note={note}
              index={idx + 1}
              onEdit={() => router.push(`/note/${note.id}`)}
            />
          ))}
        </div>
      )}
    </main>
  );
}
