'use client';
import { Icon } from '@/components/icons';
import {
  DEFAULT_SEARCH_PLACEHOLDER,
  getSearchBoxRightPadding,
  normalizeSearchBoxOnChange,
  normalizeSearchBoxPlaceholder,
  normalizeSearchBoxValue,
} from '@/lib/ui/search-box';

/**
 * SearchBox — 좌측 검색 아이콘 + 인풋
 *
 * @param {string}   value
 * @param {Function} onChange  - 새 문자열을 인자로 받음 (이벤트 아님)
 * @param {string}   [placeholder='제품명·제품코드 검색']
 */
export function SearchBox({ value, onChange, placeholder = DEFAULT_SEARCH_PLACEHOLDER }) {
  const safeValue = normalizeSearchBoxValue(value);
  const safePlaceholder = normalizeSearchBoxPlaceholder(placeholder);
  const notifyChange = normalizeSearchBoxOnChange(onChange);

  return (
    <div style={{ position: 'relative', marginBottom: 12 }}>
      <Icon.search
        style={{
          width: 14,
          height: 14,
          position: 'absolute',
          top: '50%',
          left: 12,
          transform: 'translateY(-50%)',
          color: 'var(--text-4)',
        }}
      />
      <input
        type="search"
        aria-label={safePlaceholder}
        placeholder={safePlaceholder}
        value={safeValue}
        onChange={e => notifyChange(e.target.value)}
        style={{
          width: '100%',
          padding: `8px ${getSearchBoxRightPadding(safeValue)}px 8px 32px`,
          borderRadius: 8,
          border: '1px solid var(--border)',
          background: 'var(--surface-2)',
          color: 'var(--text-1)',
          fontSize: 13,
        }}
      />
      {safeValue && (
        <button
          type="button"
          onClick={() => notifyChange('')}
          aria-label="검색어 지우기"
          style={{
            position: 'absolute',
            top: '50%',
            right: 10,
            transform: 'translateY(-50%)',
            border: 0,
            background: 'transparent',
            cursor: 'pointer',
            color: 'var(--text-4)',
            padding: 0,
            lineHeight: 1,
            display: 'flex',
          }}
        >
          <Icon.close style={{ width: 12, height: 12 }} />
        </button>
      )}
    </div>
  );
}
