export function NoteDraftBanner({ onRestore, onIgnore }) {
  return (
    <div
      style={{
        background: 'var(--warn-soft)',
        color: 'var(--warn)',
        borderRadius: 10,
        padding: '10px 16px',
        fontSize: 13,
        marginTop: 8,
        display: 'flex',
        justifyContent: 'space-between',
        alignItems: 'center',
      }}
    >
      <span>저장되지 않은 임시저장이 있어요.</span>
      <div style={{ display: 'flex', gap: 8 }}>
        <button className="btn sm" onClick={onRestore}>
          불러오기
        </button>
        <button className="btn sm" onClick={onIgnore}>
          무시
        </button>
      </div>
    </div>
  );
}
