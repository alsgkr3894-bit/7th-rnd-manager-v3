'use client';
import { SearchBox } from '@/components/ui/SearchBox';

const VIEW_MODES = ['ingredient', 'menu'];

export function AllergenToolbar({
  search,
  viewMode,
  hasCustomOrder,
  onSearchChange,
  onViewModeChange,
  onEditMenuNames,
  onReorderMenu,
  onReorderAllergen,
  onResetOrder,
}) {
  return (
    <div style={{ marginTop: 16, display: 'flex', gap: 8, alignItems: 'center' }}>
      <SearchBox
        value={search}
        onChange={onSearchChange}
        placeholder="식자재명·메뉴명·알레르기 검색"
      />
      <div style={{ display: 'flex', gap: 4, borderBottom: '1px solid var(--border)' }}>
        {VIEW_MODES.map(mode => (
          <button
            key={mode}
            onClick={() => onViewModeChange(mode)}
            style={{
              padding: '8px 14px',
              border: 0,
              background: 'transparent',
              fontSize: 13,
              fontWeight: viewMode === mode ? 700 : 500,
              color: viewMode === mode ? 'var(--accent)' : 'var(--text-3)',
              borderBottom: viewMode === mode ? '2px solid var(--accent)' : '2px solid transparent',
              cursor: 'pointer',
              marginBottom: -1,
            }}
          >
            {mode === 'ingredient' ? '식자재별' : '메뉴별 매트릭스'}
          </button>
        ))}
      </div>
      {viewMode === 'menu' && (
        <div style={{ marginLeft: 'auto', display: 'flex', gap: 6 }}>
          <button className="btn sm" onClick={onEditMenuNames}>
            메뉴명 편집
          </button>
          <button className="btn sm" onClick={onReorderMenu}>
            메뉴 순서
          </button>
          <button className="btn sm" onClick={onReorderAllergen}>
            알레르기 순서
          </button>
          {hasCustomOrder && (
            <button
              className="btn sm"
              onClick={onResetOrder}
              title="저장된 메뉴·알레르기 순서를 지우고 기본 순서로 복원"
            >
              순서 초기화
            </button>
          )}
        </div>
      )}
    </div>
  );
}
