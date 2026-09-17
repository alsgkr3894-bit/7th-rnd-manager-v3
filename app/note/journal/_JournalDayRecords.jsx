/**
 * app/note/journal/_JournalDayRecords.jsx — 선택한 날짜의 기록 카드 목록
 *
 * 노트/샘플/시장조사 통합 기록(dayNotes)이 없으면 빈 상태를, 있으면
 * WebJournalCard 목록을 그린다. 수정 클릭은 각 기록의 원본 화면으로 이동한다.
 */
'use client';
import { WebJournalCard } from '@/components/note/WebJournalCard';
import {
  isUnifiedMarketResearchRecord,
  isUnifiedSampleRecord,
  unifiedMarketResearchSourceId,
  unifiedSampleSourceId,
} from '@/lib/note/unified-records';

export function JournalLoadingSkeleton() {
  return (
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
  );
}

export function JournalDayRecords({ date, dayNotes, onPhotoClick, router }) {
  return (
    <div id="journal-day-records">
      {dayNotes.length === 0 ? (
        <div className="card" style={{ padding: '32px 24px', textAlign: 'center', marginTop: 16 }}>
          <div style={{ fontSize: 14, color: 'var(--text-3)' }}>
            {date}에 저장된 연구일지나 테스트 노트가 없습니다.
          </div>
        </div>
      ) : (
        <div style={{ display: 'flex', flexDirection: 'column', gap: 16, marginTop: 16 }}>
          {dayNotes.map((note, idx) => (
            <WebJournalCard
              key={note.id}
              note={note}
              index={idx + 1}
              onPhotoClick={onPhotoClick}
              onEdit={() => {
                if (isUnifiedSampleRecord(note)) {
                  router.push(`/note/sample/${unifiedSampleSourceId(note)}`);
                } else if (isUnifiedMarketResearchRecord(note)) {
                  router.push(`/note/market?edit=${unifiedMarketResearchSourceId(note)}`);
                } else {
                  router.push(`/note/${note.id}`);
                }
              }}
            />
          ))}
        </div>
      )}
    </div>
  );
}
