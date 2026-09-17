'use client';
import { Icon } from '../icons';
import { STATUS_ICON } from '@/hooks/usePaletteItems';
import { isFavoritePaletteItem } from '@/lib/palette-recent';

const SMALL_ICON = { width: 14, height: 14 };

/** 행 우측 즐겨찾기 토글(★) */
export function PaletteFavoriteToggle({ item, favorites, onToggle }) {
  const favorite = isFavoritePaletteItem(item, favorites);
  const I = favorite ? Icon.starFill : Icon.star;
  return (
    <span
      className="palette-fav-toggle"
      title={favorite ? '즐겨찾기 해제' : '즐겨찾기 추가'}
      aria-label={favorite ? '즐겨찾기 해제' : '즐겨찾기 추가'}
      onClick={event => onToggle(event, item)}
    >
      <I style={SMALL_ICON} />
    </span>
  );
}

/** 그룹 결과 행의 종류별 아이콘 */
export function PaletteKindIcon({ kind, item }) {
  if (kind === 'sample') return item.hasPhoto ? '📷' : '🧪';
  if (kind === 'note') return STATUS_ICON[item.status] || '📝';
  if (kind === 'ingredient') return <Icon.tag style={SMALL_ICON} />;
  if (kind === 'menu') return <Icon.chevRight style={SMALL_ICON} />;
  if (kind === 'work') return <Icon.note style={SMALL_ICON} />;
  if (kind === 'nav') {
    const I = Icon[item.icon] || Icon.chevRight;
    return <I style={SMALL_ICON} />;
  }
  return <Icon.plus style={SMALL_ICON} />;
}
