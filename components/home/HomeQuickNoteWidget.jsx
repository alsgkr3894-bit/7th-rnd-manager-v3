import { Icon } from '@/components/icons';

export function HomeQuickNoteWidget({
  quickNote,
  quickSaved,
  onQuickNoteChange,
  onSave,
  onOpenDraft,
}) {
  return (
    <div className="card quick-note">
      <div className="quick-note-ico">
        <Icon.beaker style={{ width: 18, height: 18 }} />
      </div>
      <input
        className="quick-note-input"
        placeholder="끝난 테스트 한 줄 메모를 입력하세요"
        value={quickNote}
        maxLength={200}
        onChange={event => onQuickNoteChange(event.target.value)}
        onKeyDown={event => {
          if (event.key === 'Enter') onSave();
        }}
      />
      <div className="quick-note-hint">
        {quickSaved ? (
          <span style={{ color: 'var(--positive)' }}>
            <Icon.check style={{ width: 14, height: 14, verticalAlign: '-2px' }} /> 저장됨
          </span>
        ) : (
          <span>
            <kbd>Enter</kbd>로 저장
          </span>
        )}
      </div>
      <button
        type="button"
        className="btn primary sm"
        disabled={!quickNote.trim()}
        onClick={onOpenDraft}
      >
        자세히
      </button>
    </div>
  );
}
