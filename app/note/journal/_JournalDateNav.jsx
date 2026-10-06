/**
 * app/note/journal/_JournalDateNav.jsx — 연구일지 헤더의 날짜 이동 부분
 *
 * 이전/다음 기록일·날짜 조회·빠른 날짜 입력(240502). _JournalHeaderActions.jsx에서 분리.
 */
'use client';
import { Icon } from '@/components/icons';

export function JournalDateNav({
  goPrev,
  hasPrev,
  goNext,
  hasNext,
  dateDraft,
  setDateDraft,
  applyDate,
  date,
  quickDateDraft,
  setQuickDateDraft,
  quickDateError,
  setQuickDateError,
  applyQuickDate,
}) {
  return (
    <>
      <button className="btn" onClick={goPrev} disabled={!hasPrev} title="이전 일자">
        <Icon.arrowUp style={{ width: 14, height: 14, transform: 'rotate(-90deg)' }} />
      </button>
      <input
        type="date"
        className="form-input"
        value={dateDraft}
        onChange={e => {
          if (e.target.value) setDateDraft(e.target.value);
        }}
        onKeyDown={e => {
          if (e.key === 'Enter') {
            e.preventDefault();
            applyDate();
          }
        }}
        style={{
          width: 'min(190px, 100%)',
          flex: '1 1 150px',
          minWidth: 0,
          minHeight: 40,
          fontSize: 16,
          fontWeight: 800,
          padding: '7px 10px',
        }}
      />
      <button
        className={'btn' + (dateDraft !== date ? ' primary' : '')}
        onClick={() => applyDate()}
        disabled={!dateDraft || dateDraft === date}
        title="입력한 날짜로 조회"
      >
        조회
      </button>
      <input
        className="form-input"
        value={quickDateDraft}
        onChange={event => {
          setQuickDateDraft(event.target.value);
          setQuickDateError(false);
        }}
        onKeyDown={event => {
          if (event.key === 'Enter') {
            event.preventDefault();
            applyQuickDate();
          }
        }}
        onBlur={() => applyQuickDate()}
        inputMode="numeric"
        placeholder="240502"
        title={quickDateError ? '날짜 확인' : '빠른 날짜 입력'}
        style={{
          width: 94,
          flex: '0 1 94px',
          minWidth: 0,
          minHeight: 40,
          fontSize: 13,
          borderColor: quickDateError ? 'var(--negative)' : undefined,
        }}
      />
      <button className="btn" onClick={goNext} disabled={!hasNext} title="다음 일자">
        <Icon.arrowDown style={{ width: 14, height: 14, transform: 'rotate(-90deg)' }} />
      </button>
    </>
  );
}
