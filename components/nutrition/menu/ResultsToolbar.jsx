'use client';

/** 영양성분 결과 탭의 필터 툴바 — 메뉴 select · 기본/파생 chip · 누락만 · 내보내기. */
export function ResultsToolbar({
  filterMenu,
  onFilterMenu,
  menuNames,
  filterDerived,
  onFilterDerived,
  missingOnly,
  onToggleMissingOnly,
  onExportCsv,
  exportDisabled,
}) {
  return (
    <div style={{ display: 'flex', gap: 8, marginBottom: 16, flexWrap: 'wrap' }}>
      <select
        className="input"
        style={{ width: 160 }}
        value={filterMenu}
        onChange={e => onFilterMenu(e.target.value)}
      >
        {menuNames.map((n, index) => (
          <option key={`${n || 'menu'}-${index}`} value={n}>
            {n}
          </option>
        ))}
      </select>
      {['전체', '기본', '파생'].map(v => (
        <button
          key={v}
          className={'chip ' + (filterDerived === v ? 'active' : '')}
          onClick={() => onFilterDerived(v)}
        >
          {v}
        </button>
      ))}
      <button className={'chip ' + (missingOnly ? 'active' : '')} onClick={onToggleMissingOnly}>
        입력 누락만
      </button>
      <button className="btn sm" onClick={onExportCsv} disabled={exportDisabled}>
        엑셀로 내보내기
      </button>
      <span
        style={{
          marginLeft: 'auto',
          alignSelf: 'center',
          fontSize: 11,
          fontWeight: 700,
          color: 'var(--accent-text)',
          background: 'var(--accent-soft)',
          padding: '3px 10px',
          borderRadius: 12,
        }}
      >
        100g 기준
      </span>
    </div>
  );
}
