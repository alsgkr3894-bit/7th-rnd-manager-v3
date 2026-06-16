import { SearchBox } from '@/components/ui/SearchBox';

function tabStyle(active) {
  return {
    padding: '8px 14px',
    border: 0,
    background: 'transparent',
    fontSize: 13,
    fontWeight: active ? 700 : 500,
    color: active ? 'var(--accent)' : 'var(--text-3)',
    borderBottom: active ? '2px solid var(--accent)' : '2px solid transparent',
    cursor: 'pointer',
    marginBottom: -1,
  };
}

export function OriginToolbar({
  search,
  onSearch,
  viewMode,
  onViewMode,
  onExportCsv,
  exportDisabled,
  hiddenCount,
  showHidden,
  onToggleHidden,
  onOpenMenuNameEdit,
  onOpenReorder,
  menuOrderCount,
  onResetOrder,
}) {
  return (
    <div style={{ marginTop: 16, display: 'flex', gap: 8, alignItems: 'center' }}>
      <SearchBox value={search} onChange={onSearch} placeholder="식자재명·메뉴명·원산지 검색" />
      <div style={{ display: 'flex', gap: 4, borderBottom: '1px solid var(--border)' }}>
        <button
          onClick={() => onViewMode('ingredient')}
          style={tabStyle(viewMode === 'ingredient')}
        >
          식자재별
        </button>
        <button onClick={() => onViewMode('menu')} style={tabStyle(viewMode === 'menu')}>
          메뉴별
        </button>
      </div>
      <div style={{ marginLeft: 'auto', display: 'flex', gap: 6, alignItems: 'center' }}>
        <button className="btn sm" onClick={onExportCsv} disabled={exportDisabled}>
          엑셀로 내보내기
        </button>
        {hiddenCount > 0 && (
          <button
            className={'btn sm' + (showHidden ? ' active' : '')}
            onClick={onToggleHidden}
            title="미표시대상으로 지정된 식자재 포함 여부"
          >
            {showHidden
              ? `미표시대상 ${hiddenCount}개 포함 중`
              : `미표시대상 ${hiddenCount}개 숨김`}
          </button>
        )}
        {viewMode === 'menu' && (
          <>
            <button className="btn sm" onClick={onOpenMenuNameEdit}>
              메뉴명 편집
            </button>
            <button className="btn sm" onClick={onOpenReorder}>
              메뉴 순서 변경
            </button>
            {menuOrderCount > 0 && (
              <button
                className="btn sm"
                onClick={onResetOrder}
                title="저장된 메뉴 순서를 지우고 기본(ㄱㄴㄷ) 순서로 복원"
              >
                순서 초기화
              </button>
            )}
          </>
        )}
      </div>
    </div>
  );
}
