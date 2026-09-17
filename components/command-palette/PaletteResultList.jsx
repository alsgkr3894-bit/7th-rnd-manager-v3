'use client';
import { Icon } from '../icons';
import { asDisplayText } from '@/lib/ui/prop-guards';
import { formatRelative } from '@/lib/format';
import { PALETTE_GROUPS, PALETTE_ICON_STYLE } from './paletteUtils';
import { PaletteFavoriteToggle, PaletteKindIcon } from './PaletteRowParts';

const ICO_STYLE = PALETTE_ICON_STYLE;

/**
 * 결과 목록 — 즐겨찾기 → 최근 작업 → 최근 방문 → 그룹 결과 순.
 * flatIdx는 렌더 순서대로 증가하며 useCommandPaletteState의 navItems 인덱스와 일치해야 한다.
 */
export function PaletteResultList({ palette }) {
  const {
    activeIdx,
    setActiveIdx,
    isSearching,
    filtered,
    safeFavorites,
    safeWorkItems,
    safeRecent,
    favoriteHrefSet,
    pick,
    toggleFavorite,
  } = palette;
  let flatIdx = 0;

  const rowClass = fi => 'palette-row' + (fi === activeIdx ? ' palette-row-active' : '');
  const favToggle = item => (
    <PaletteFavoriteToggle item={item} favorites={safeFavorites} onToggle={toggleFavorite} />
  );

  return (
    <div className="palette-results" id="palette-results" role="menu" aria-label="검색 결과">
      {!isSearching && safeFavorites.length > 0 && (
        <div>
          <div className="palette-group">즐겨찾기</div>
          {safeFavorites.map(r => {
            const fi = flatIdx++;
            const kind = asDisplayText(r.kind, 'nav');
            const href = asDisplayText(r.href);
            const label = asDisplayText(r.label);
            const subText = asDisplayText(r.sub);
            const { bg, color } = ICO_STYLE[kind] || ICO_STYLE.nav;
            return (
              <button
                key={'favorite-' + href}
                role="menuitem"
                className={rowClass(fi)}
                onMouseEnter={() => setActiveIdx(fi)}
                onClick={() => pick(r)}
              >
                <div className="palette-row-ico" style={{ background: bg, color, fontSize: 13 }}>
                  <Icon.starFill style={{ width: 14, height: 14 }} />
                </div>
                <div style={{ flex: 1, minWidth: 0 }}>
                  <span className="palette-row-label">{label}</span>
                  {subText && <span className="palette-row-sub">{subText}</span>}
                </div>
                {favToggle(r)}
              </button>
            );
          })}
        </div>
      )}

      {!isSearching && safeWorkItems.length > 0 && (
        <div>
          <div className="palette-group">최근 작업</div>
          {safeWorkItems.map(r => {
            const fi = flatIdx++;
            const href = asDisplayText(r.href);
            const label = asDisplayText(r.label);
            const subText = asDisplayText(r.sub);
            const active = favoriteHrefSet.has(href);
            return (
              <button
                key={'work-' + href + '-' + asDisplayText(r.at)}
                role="menuitem"
                className={rowClass(fi)}
                onMouseEnter={() => setActiveIdx(fi)}
                onClick={() => pick(r)}
              >
                <div
                  className="palette-row-ico"
                  style={{
                    background: active ? 'var(--accent-soft)' : ICO_STYLE.work.bg,
                    color: active ? 'var(--accent-text)' : ICO_STYLE.work.color,
                    fontSize: 13,
                  }}
                >
                  <Icon.note style={{ width: 14, height: 14 }} />
                </div>
                <div style={{ flex: 1, minWidth: 0 }}>
                  <span className="palette-row-label">{label}</span>
                  {subText && <span className="palette-row-sub">{subText}</span>}
                </div>
                <span className="palette-recent-time">{r.at ? formatRelative(r.at) : href}</span>
                {favToggle(r)}
              </button>
            );
          })}
        </div>
      )}

      {/* 최근 방문 — 검색어 없을 때만 */}
      {!isSearching && safeRecent.length > 0 && (
        <div>
          <div className="palette-group">최근 방문</div>
          {safeRecent.map(r => {
            const fi = flatIdx++;
            const kind = asDisplayText(r.kind, 'nav');
            const href = asDisplayText(r.href);
            const label = asDisplayText(r.label);
            const { bg, color } = ICO_STYLE[kind] || ICO_STYLE.menu;
            return (
              <button
                key={'recent-' + href}
                role="menuitem"
                className={rowClass(fi)}
                onMouseEnter={() => setActiveIdx(fi)}
                onClick={() => pick(r)}
              >
                <div className="palette-row-ico" style={{ background: bg, color, fontSize: 13 }}>
                  <Icon.chevRight style={{ width: 14, height: 14 }} />
                </div>
                <span className="palette-row-label">{label}</span>
                <span className="palette-recent-time">{href}</span>
                {favToggle(r)}
              </button>
            );
          })}
        </div>
      )}
      {isSearching && filtered.length === 0 ? (
        <div className="palette-empty">검색 결과 없음</div>
      ) : (
        PALETTE_GROUPS.map(({ kind, label }) => {
          const rows = filtered.filter(x => x.kind === kind);
          if (!rows.length) return null;
          const { bg, color } = ICO_STYLE[kind] || ICO_STYLE.menu;
          return (
            <div key={kind}>
              <div className="palette-group">{label}</div>
              {rows.map(r => {
                const fi = flatIdx++;
                const labelText = asDisplayText(r.label);
                const subText = asDisplayText(r.sub);
                return (
                  <button
                    key={asDisplayText(r.href) + labelText}
                    role="menuitem"
                    className={rowClass(fi)}
                    onMouseEnter={() => setActiveIdx(fi)}
                    onClick={() => pick(r)}
                  >
                    <div
                      className="palette-row-ico"
                      style={{ background: bg, color, fontSize: 13 }}
                    >
                      <PaletteKindIcon kind={kind} item={r} />
                    </div>
                    <div style={{ flex: 1, minWidth: 0 }}>
                      <span className="palette-row-label">{labelText}</span>
                      {subText && <span className="palette-row-sub">{subText}</span>}
                    </div>
                    {favToggle(r)}
                  </button>
                );
              })}
            </div>
          );
        })
      )}
    </div>
  );
}
