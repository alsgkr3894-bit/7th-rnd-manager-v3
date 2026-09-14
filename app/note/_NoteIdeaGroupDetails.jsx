'use client';

/**
 * app/note/_NoteIdeaGroupDetails.jsx — 아이디어 묶음 카드의 펼침(상세) 영역.
 * 최신 차수 요약 + 차수 목록(사진·평가·선택)을 보여준다.
 */
import { PhotoCarousel } from '@/components/note/PhotoCarousel';
import { formatFullDate } from '@/lib/note/utils';
import { collectLatestRoundNotePhotos } from './noteIdeaGroups';
import { highlightText } from './_NoteCard';
import { asText, ratingSummary, roundLabel } from './_noteIdeaGroupCardParts';

export function NoteIdeaGroupDetails({
  group,
  notes,
  latest,
  latestPreviewRows,
  selected,
  batchMode,
  hlRe,
  statusColor,
  openRound,
  handleRoundKeyDown,
  onPreviewPhoto,
  onContextMenu,
  latestRoundLabel,
  representativeLabel,
  representativeInlineLabel,
}) {
  return (
    <div
      style={{ padding: '12px 14px 14px', display: 'grid', gap: 10, flex: 1 }}
      onClick={event => event.stopPropagation()}
    >
      <div
        role="button"
        tabIndex={0}
        onClick={event => openRound(latest, event)}
        onKeyDown={event => handleRoundKeyDown(latest, event)}
        style={{
          display: 'grid',
          gap: 8,
          padding: '12px 13px',
          borderRadius: 8,
          background: statusColor.bg,
          border: `1px solid ${statusColor.color}40`,
          cursor: 'pointer',
        }}
      >
        <div style={{ display: 'flex', alignItems: 'center', gap: 8 }}>
          <strong style={{ fontSize: 12, color: statusColor.color }}>{latestRoundLabel}</strong>
          <span style={{ fontSize: 11, color: 'var(--text-3)', fontWeight: 800 }}>
            {representativeLabel}
          </span>
          <span style={{ marginLeft: 'auto', fontSize: 11, color: 'var(--text-4)' }}>
            {formatFullDate(latest.testDate)}
          </span>
        </div>
        {latestPreviewRows.length > 0 ? (
          <div style={{ display: 'grid', gap: 6 }}>
            {latestPreviewRows.map(([label, value]) => (
              <div
                key={label}
                style={{
                  display: 'grid',
                  gridTemplateColumns: '72px minmax(0,1fr)',
                  gap: 8,
                  fontSize: 12,
                  lineHeight: 1.55,
                  color: 'var(--text-2)',
                }}
              >
                <span style={{ color: 'var(--text-3)', fontWeight: 800 }}>{label}</span>
                <span
                  style={{
                    overflow: 'hidden',
                    textOverflow: 'ellipsis',
                    whiteSpace: 'nowrap',
                  }}
                >
                  {highlightText(value, hlRe)}
                </span>
              </div>
            ))}
          </div>
        ) : (
          <span style={{ fontSize: 12, color: 'var(--text-3)' }}>상세 기록 없음</span>
        )}
      </div>

      {notes.map((note, index) => {
        const checked = selected.has(note.id);
        const isLatest = note.id === latest.id;
        const roundPhotos = collectLatestRoundNotePhotos([note], 99);
        return (
          <div
            key={note.id}
            role="button"
            tabIndex={0}
            onClick={event => openRound(note, event)}
            onContextMenu={event => onContextMenu(note, event)}
            onKeyDown={event => handleRoundKeyDown(note, event)}
            style={{
              display: 'grid',
              gridTemplateColumns: batchMode ? '24px 64px minmax(0,1fr)' : '64px minmax(0,1fr)',
              gap: 9,
              alignItems: 'center',
              minHeight: 50,
              padding: '9px 10px',
              borderRadius: 8,
              border: `1px solid ${checked || isLatest ? statusColor.color : 'var(--border)'}`,
              background: checked
                ? 'var(--accent-soft)'
                : isLatest
                  ? statusColor.bg
                  : 'var(--surface)',
              cursor: 'pointer',
            }}
          >
            {batchMode && (
              <span
                style={{
                  width: 18,
                  height: 18,
                  borderRadius: 5,
                  display: 'inline-flex',
                  alignItems: 'center',
                  justifyContent: 'center',
                  border: `1px solid ${checked ? 'var(--accent)' : 'var(--border-strong)'}`,
                  fontSize: 12,
                  fontWeight: 900,
                  color: 'var(--accent)',
                }}
              >
                {checked ? '✓' : ''}
              </span>
            )}
            <span
              style={{
                justifySelf: 'start',
                display: 'inline-flex',
                alignItems: 'center',
                gap: 5,
                fontSize: 12,
                fontWeight: 900,
                color: isLatest ? statusColor.color : 'var(--accent)',
              }}
            >
              {roundLabel(note, index)}
              {isLatest && (
                <span style={{ fontSize: 10, color: 'var(--text-4)' }}>
                  {representativeInlineLabel}
                </span>
              )}
            </span>
            <span style={{ minWidth: 0, color: 'var(--text-2)', fontSize: 12 }}>
              <span style={{ display: 'flex', alignItems: 'center', gap: 6, marginBottom: 3 }}>
                <span style={{ color: 'var(--text-4)' }}>{formatFullDate(note.testDate)}</span>
                {ratingSummary(note) && (
                  <span style={{ color: 'var(--accent)', fontWeight: 800 }}>
                    {ratingSummary(note)}
                  </span>
                )}
              </span>
              <span
                style={{
                  display: 'block',
                  overflow: 'hidden',
                  textOverflow: 'ellipsis',
                  whiteSpace: 'nowrap',
                }}
              >
                {highlightText(asText(note.nextAction) || asText(note.testContent), hlRe) ||
                  '기록 보기'}
              </span>
            </span>
            {roundPhotos.length > 0 && (
              <div style={{ gridColumn: '1 / -1' }}>
                <PhotoCarousel
                  photos={roundPhotos}
                  title={`${group.title} ${roundLabel(note, index)}`}
                  height={92}
                  onPhotoClick={photo => onPreviewPhoto(photo)}
                />
              </div>
            )}
          </div>
        );
      })}
    </div>
  );
}
