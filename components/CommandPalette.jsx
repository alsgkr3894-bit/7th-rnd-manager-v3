'use client';
import { useState, useEffect, useRef } from 'react';
import { useRouter } from 'next/navigation';
import { Icon } from './icons';
import { usePaletteItems, STATUS_ICON, isPaletteItemVisibleForRole } from '@/hooks/usePaletteItems';
import {
  getFavoritePaletteItems,
  getRecentPaletteItems,
  isFavoritePaletteItem,
  saveRecentPaletteItem,
  toggleFavoritePaletteItem,
} from '@/lib/palette-recent';
import { useDebounce } from '@/hooks/useDebounce';
import { asDisplayText, asObjectArray } from '@/lib/ui/prop-guards';
import { formatRelative } from '@/lib/format';

function getRecent() {
  return getRecentPaletteItems();
}
function saveRecent(item) {
  saveRecentPaletteItem(item);
}

function workLogHref(log) {
  const type = asDisplayText(log?.type);
  const ref = asDisplayText(log?.ref);
  if (type.startsWith('NOTE')) return ref ? `/note/${ref}` : '/note';
  if (type.startsWith('SAMPLE')) return ref ? `/note/sample/${ref}` : '/note/sample';
  if (type === 'INGREDIENT_SAVE') return '/ingredient/manage';
  if (type === 'RECIPE_SAVE') return '/cost/recipe';
  if (type === 'ORIGIN_SAVE') return '/nutrition/origin';
  if (type === 'BACKUP') return '/settings/backup';
  if (type === 'RESTORE') return '/settings/restore';
  if (type === 'UPLOAD') return '/menu-sales/upload';
  if (type === 'SECURITY') return '/settings/account';
  return '/note/calendar';
}

function mapWorkLogs(logs, types = {}) {
  return asObjectArray(logs)
    .filter(log => asDisplayText(log.summary))
    .sort((a, b) => asDisplayText(b.at).localeCompare(asDisplayText(a.at)))
    .slice(0, 5)
    .map(log => {
      const type = asDisplayText(log.type, 'OTHER');
      const typeMeta = types[type] || types.OTHER || {};
      const label = asDisplayText(typeMeta.label, '최근 작업');
      const summary = asDisplayText(log.summary);
      return {
        kind: 'work',
        label,
        sub: summary,
        href: workLogHref(log),
        at: asDisplayText(log.at),
      };
    });
}

export default function CommandPalette({ open, onClose, canEdit = false }) {
  const [q, setQ] = useState('');
  const [activeIdx, setActiveIdx] = useState(0);
  const [recent, setRecent] = useState([]);
  const [favorites, setFavorites] = useState([]);
  const [workItems, setWorkItems] = useState([]);
  const inputRef = useRef(null);
  const focusTimerRef = useRef(null);
  const router = useRouter();
  const allItems = usePaletteItems(open, { canEdit });
  const debouncedQ = useDebounce(q, 150);

  useEffect(() => {
    if (!open) return;
    setQ('');
    setActiveIdx(0);
    setRecent(getRecent());
    setFavorites(getFavoritePaletteItems());
    setWorkItems([]);
    import('@/lib/work-log')
      .then(({ getAllWorkLogs, WORK_LOG_TYPES }) =>
        getAllWorkLogs().then(logs => {
          setWorkItems(mapWorkLogs(logs, WORK_LOG_TYPES));
        })
      )
      .catch(() => {
        setWorkItems([]);
      });
    if (focusTimerRef.current) clearTimeout(focusTimerRef.current);
    focusTimerRef.current = setTimeout(() => {
      inputRef.current?.focus();
      focusTimerRef.current = null;
    }, 30);
    return () => {
      if (focusTimerRef.current) {
        clearTimeout(focusTimerRef.current);
        focusTimerRef.current = null;
      }
    };
  }, [open]);

  useEffect(() => {
    const handleKeyDown = e => {
      if ((e.metaKey || e.ctrlKey) && e.key.toLowerCase() === 'k') e.preventDefault();
      if (e.key === 'Escape' && open) onClose?.();
    };
    window.addEventListener('keydown', handleKeyDown);
    return () => window.removeEventListener('keydown', handleKeyDown);
  }, [open, onClose]);

  if (!open) return null;

  const safeAllItems = asObjectArray(allItems).filter(
    item => asDisplayText(item.href) && asDisplayText(item.label)
  );
  const safeRecent = asObjectArray(recent).filter(
    item =>
      asDisplayText(item.href) &&
      asDisplayText(item.label) &&
      isPaletteItemVisibleForRole(item, canEdit)
  );
  const safeFavorites = asObjectArray(favorites).filter(
    item =>
      asDisplayText(item.href) &&
      asDisplayText(item.label) &&
      isPaletteItemVisibleForRole(item, canEdit)
  );
  const safeWorkItems = asObjectArray(workItems).filter(
    item =>
      asDisplayText(item.href) &&
      asDisplayText(item.label) &&
      isPaletteItemVisibleForRole(item, canEdit)
  );
  const norm = s => asDisplayText(s).toLowerCase().replace(/\s+/g, '');
  const isSearching = debouncedQ.trim().length > 0;
  const searchableItems = [...safeAllItems, ...safeWorkItems];
  const filtered = isSearching
    ? searchableItems.filter(
        x =>
          norm(x.label).includes(norm(debouncedQ)) ||
          (x.sub && norm(x.sub).includes(norm(debouncedQ)))
      )
    : safeAllItems.slice(0, 9);

  const GROUPS = [
    { kind: 'sample', label: '샘플기록' },
    { kind: 'note', label: '메뉴개발 노트' },
    { kind: 'ingredient', label: '식자재' },
    { kind: 'menu', label: '메뉴' },
    { kind: 'action', label: '빠른 작업' },
    { kind: 'work', label: '최근 작업' },
    { kind: 'nav', label: '자주 쓰는 이동' },
  ];

  const ICO_STYLE = {
    sample: { bg: 'var(--sample-ico-bg)', color: 'var(--sample-ico-color)' },
    note: { bg: 'var(--warn-soft)', color: 'var(--warn)' },
    ingredient: { bg: 'var(--positive-soft)', color: 'var(--positive)' },
    menu: { bg: 'var(--accent-soft)', color: 'var(--accent-text)' },
    action: { bg: 'var(--note-ico-bg)', color: 'var(--note-ico-color)' },
    work: { bg: 'var(--surface-2)', color: 'var(--text-2)' },
    nav: { bg: 'var(--accent-soft)', color: 'var(--accent-text)' },
  };

  // 키보드 네비게이션 대상 — 실제 렌더 순서와 동일하게 평탄화한다.
  // 그룹 결과는 GROUPS 순서로 재정렬되므로 filtered 배열 순서와 다르다 →
  // activeIdx/Enter가 강조 항목과 어긋나지 않도록 같은 순서로 맞춘다.
  const groupedFiltered = GROUPS.flatMap(({ kind }) => filtered.filter(x => x.kind === kind));
  const navItems = isSearching
    ? groupedFiltered
    : [...safeFavorites, ...safeWorkItems, ...safeRecent, ...groupedFiltered];
  const favoriteHrefSet = new Set(safeFavorites.map(item => asDisplayText(item.href)));

  const pick = item => {
    const href = asDisplayText(item?.href);
    const label = asDisplayText(item?.label, href);
    if (!href) return;
    saveRecent({ ...item, href, label, kind: asDisplayText(item?.kind, 'nav') });
    onClose?.();
    router.push(href);
  };

  const toggleFavorite = (event, item) => {
    event.stopPropagation();
    const updated = toggleFavoritePaletteItem(item);
    setFavorites(updated);
  };

  const renderFavoriteToggle = item => {
    const favorite = isFavoritePaletteItem(item, safeFavorites);
    const I = favorite ? Icon.starFill : Icon.star;
    return (
      <span
        className="palette-fav-toggle"
        title={favorite ? '즐겨찾기 해제' : '즐겨찾기 추가'}
        aria-label={favorite ? '즐겨찾기 해제' : '즐겨찾기 추가'}
        onClick={event => toggleFavorite(event, item)}
      >
        <I style={{ width: 14, height: 14 }} />
      </span>
    );
  };

  function handleKey(e) {
    if (e.key === 'ArrowDown') {
      e.preventDefault();
      setActiveIdx(i => Math.min(i + 1, navItems.length - 1));
    } else if (e.key === 'ArrowUp') {
      e.preventDefault();
      setActiveIdx(i => Math.max(i - 1, 0));
    } else if (e.key === 'Escape') onClose();
    else if (e.key === 'Enter' && navItems[activeIdx]) pick(navItems[activeIdx]);
  }

  let flatIdx = 0;

  return (
    <div className="palette-scrim" role="presentation" onClick={onClose}>
      <div
        className="palette"
        role="dialog"
        aria-label="통합 검색"
        aria-modal="true"
        onClick={e => e.stopPropagation()}
      >
        <div className="palette-input">
          <Icon.search style={{ width: 18, height: 18, color: 'var(--text-3)' }} />
          <input
            ref={inputRef}
            value={q}
            onChange={e => {
              setQ(e.target.value);
              setActiveIdx(0);
            }}
            onKeyDown={handleKey}
            placeholder="메뉴, 재료, 보고서, 노트, 작업 검색"
            aria-label="검색어 입력"
            aria-controls="palette-results"
          />
          <kbd>ESC</kbd>
        </div>

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
                    className={'palette-row' + (fi === activeIdx ? ' palette-row-active' : '')}
                    onMouseEnter={() => setActiveIdx(fi)}
                    onClick={() => pick(r)}
                  >
                    <div
                      className="palette-row-ico"
                      style={{ background: bg, color, fontSize: 13 }}
                    >
                      <Icon.starFill style={{ width: 14, height: 14 }} />
                    </div>
                    <div style={{ flex: 1, minWidth: 0 }}>
                      <span className="palette-row-label">{label}</span>
                      {subText && <span className="palette-row-sub">{subText}</span>}
                    </div>
                    {renderFavoriteToggle(r)}
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
                    className={'palette-row' + (fi === activeIdx ? ' palette-row-active' : '')}
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
                    <span className="palette-recent-time">
                      {r.at ? formatRelative(r.at) : href}
                    </span>
                    {renderFavoriteToggle(r)}
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
                    className={'palette-row' + (fi === activeIdx ? ' palette-row-active' : '')}
                    onMouseEnter={() => setActiveIdx(fi)}
                    onClick={() => pick(r)}
                  >
                    <div
                      className="palette-row-ico"
                      style={{ background: bg, color, fontSize: 13 }}
                    >
                      <Icon.chevRight style={{ width: 14, height: 14 }} />
                    </div>
                    <span className="palette-row-label">{label}</span>
                    <span className="palette-recent-time">{href}</span>
                    {renderFavoriteToggle(r)}
                  </button>
                );
              })}
            </div>
          )}
          {isSearching && filtered.length === 0 ? (
            <div className="palette-empty">검색 결과 없음</div>
          ) : (
            GROUPS.map(({ kind, label }) => {
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
                        className={'palette-row' + (fi === activeIdx ? ' palette-row-active' : '')}
                        onMouseEnter={() => setActiveIdx(fi)}
                        onClick={() => pick(r)}
                      >
                        <div
                          className="palette-row-ico"
                          style={{ background: bg, color, fontSize: 13 }}
                        >
                          {kind === 'sample' ? (
                            r.hasPhoto ? (
                              '📷'
                            ) : (
                              '🧪'
                            )
                          ) : kind === 'note' ? (
                            STATUS_ICON[r.status] || '📝'
                          ) : kind === 'ingredient' ? (
                            <Icon.tag style={{ width: 14, height: 14 }} />
                          ) : kind === 'menu' ? (
                            <Icon.chevRight style={{ width: 14, height: 14 }} />
                          ) : kind === 'work' ? (
                            <Icon.note style={{ width: 14, height: 14 }} />
                          ) : kind === 'nav' ? (
                            (() => {
                              const I = Icon[r.icon] || Icon.chevRight;
                              return <I style={{ width: 14, height: 14 }} />;
                            })()
                          ) : (
                            <Icon.plus style={{ width: 14, height: 14 }} />
                          )}
                        </div>
                        <div style={{ flex: 1, minWidth: 0 }}>
                          <span className="palette-row-label">{labelText}</span>
                          {subText && <span className="palette-row-sub">{subText}</span>}
                        </div>
                        {renderFavoriteToggle(r)}
                      </button>
                    );
                  })}
                </div>
              );
            })
          )}
        </div>

        <div className="palette-foot">
          <span>
            <kbd>↑↓</kbd> 이동
          </span>
          <span>
            <kbd>↵</kbd> 선택
          </span>
          <span>
            <kbd>esc</kbd> 닫기
          </span>
        </div>
      </div>
    </div>
  );
}
