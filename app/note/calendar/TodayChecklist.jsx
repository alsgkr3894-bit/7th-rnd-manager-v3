import { Icon } from '@/components/icons';

export function TodayChecklist({
  dateKey,
  items,
  input,
  canEdit = false,
  onInput,
  onAdd,
  onToggle,
  onRemove,
}) {
  const doneCount = items.filter(item => item.done).length;
  return (
    <div className="card" style={{ padding: '14px 16px', marginBottom: 14 }}>
      <div
        style={{
          display: 'flex',
          justifyContent: 'space-between',
          alignItems: 'center',
          gap: 12,
          marginBottom: 10,
          flexWrap: 'wrap',
        }}
      >
        <div>
          <div style={{ fontSize: 14, fontWeight: 800 }}>오늘 하루 체크리스트</div>
          <div style={{ fontSize: 11, color: 'var(--text-4)', marginTop: 2 }}>
            {dateKey} · {doneCount}/{items.length} 완료
          </div>
        </div>
        <form
          onSubmit={event => {
            event.preventDefault();
            onAdd();
          }}
          style={{ display: 'flex', gap: 6, minWidth: 260, flex: '0 1 360px' }}
        >
          <input
            className="form-input"
            value={input}
            onChange={event => onInput(event.target.value)}
            placeholder="오늘 할 일 입력"
            disabled={!canEdit}
            style={{ height: 34, fontSize: 12 }}
          />
          <button className="btn sm primary" type="submit" disabled={!canEdit || !input.trim()}>
            <Icon.plus style={{ width: 13, height: 13 }} />
            추가
          </button>
        </form>
      </div>
      {items.length === 0 ? (
        <div style={{ fontSize: 12, color: 'var(--text-4)', padding: '4px 0' }}>
          등록된 체크 항목이 없습니다.
        </div>
      ) : (
        <div style={{ display: 'flex', gap: 6, flexWrap: 'wrap' }}>
          {items.map(item => (
            <span
              key={item.id}
              style={{
                display: 'inline-flex',
                alignItems: 'center',
                gap: 6,
                padding: '5px 8px',
                borderRadius: 8,
                background: item.done ? 'var(--positive-soft)' : 'var(--surface-2)',
                color: item.done ? 'var(--positive)' : 'var(--text-2)',
                fontSize: 12,
                fontWeight: 600,
              }}
            >
              <input
                type="checkbox"
                checked={item.done}
                onChange={() => onToggle(item.id)}
                disabled={!canEdit}
                style={{ accentColor: 'var(--positive)' }}
              />
              <span style={{ textDecoration: item.done ? 'line-through' : 'none' }}>
                {item.text}
              </span>
              <button
                type="button"
                onClick={() => onRemove(item.id)}
                aria-label="체크 항목 삭제"
                disabled={!canEdit}
                style={{
                  border: 0,
                  background: 'transparent',
                  color: 'inherit',
                  cursor: canEdit ? 'pointer' : 'not-allowed',
                  display: 'inline-flex',
                  padding: 0,
                  opacity: 0.65,
                }}
              >
                <Icon.close style={{ width: 12, height: 12 }} />
              </button>
            </span>
          ))}
        </div>
      )}
    </div>
  );
}
