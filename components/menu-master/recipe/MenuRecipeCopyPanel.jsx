'use client';

// MenuRecipeSection의 "다른 메뉴에서 복사" 드롭다운 — 순수 표시용.
// 검색/필터 상태는 MenuRecipeSection이 소유하고, 이 컴포넌트는 props로만 받는다.
export function MenuRecipeCopyPanel({ search, onSearchChange, menus, onPick, onCancel }) {
  return (
    <div
      style={{
        border: '1px solid var(--divider)',
        borderRadius: 6,
        background: 'var(--surface)',
        margin: '12px 14px 0',
        padding: '8px 10px',
      }}
    >
      <input
        autoFocus
        type="text"
        className="input sm"
        placeholder="메뉴명 / 코드 검색…"
        value={search}
        onChange={e => onSearchChange(e.target.value)}
        style={{ width: '100%', marginBottom: 6, fontSize: 12 }}
      />
      <div
        style={{
          maxHeight: 180,
          overflowY: 'auto',
          display: 'flex',
          flexDirection: 'column',
          gap: 2,
        }}
      >
        {menus.length === 0 ? (
          <div style={{ fontSize: 12, color: 'var(--text-3)', padding: '4px 0' }}>
            검색 결과 없음
          </div>
        ) : (
          menus.map(m => (
            <button
              key={m.menuCode}
              type="button"
              className="btn ghost"
              style={{
                textAlign: 'left',
                fontSize: 12,
                padding: '4px 8px',
                justifyContent: 'flex-start',
                width: '100%',
                whiteSpace: 'nowrap',
                overflow: 'hidden',
              }}
              onClick={() => onPick(m)}
            >
              <span
                style={{
                  fontFamily: 'monospace',
                  color: 'var(--text-3)',
                  fontSize: 11,
                  flexShrink: 0,
                  minWidth: 110,
                }}
              >
                {m.menuCode}
              </span>
              <span
                style={{
                  flex: 1,
                  overflow: 'hidden',
                  textOverflow: 'ellipsis',
                  minWidth: 0,
                }}
              >
                {m.menuName}
              </span>
              {m.size ? (
                <span
                  style={{ color: 'var(--text-4)', marginLeft: 8, fontSize: 11, flexShrink: 0 }}
                >
                  {m.size}
                </span>
              ) : null}
            </button>
          ))
        )}
      </div>
      <button
        type="button"
        className="btn ghost"
        style={{ marginTop: 6, fontSize: 11, color: 'var(--text-3)' }}
        onClick={onCancel}
      >
        취소
      </button>
    </div>
  );
}
