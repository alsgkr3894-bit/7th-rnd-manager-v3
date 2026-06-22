'use client';
import { useState } from 'react';
import { Icon } from '@/components/icons';
import { getCategoryStyle } from '@/lib/ingredient';

function SummaryChip({ label, value, warn }) {
  return (
    <div
      style={{
        display: 'flex',
        flexDirection: 'column',
        alignItems: 'center',
        padding: '8px 14px',
        borderRadius: 10,
        background: warn && value > 0 ? 'var(--warn-soft, rgba(255,160,0,.1))' : 'var(--surface-2)',
        minWidth: 64,
      }}
    >
      <span
        style={{
          fontSize: 18,
          fontWeight: 700,
          color: warn && value > 0 ? 'var(--warn)' : 'var(--text-1)',
          lineHeight: 1.2,
        }}
      >
        {value}
      </span>
      <span style={{ fontSize: 11, color: 'var(--text-3)', marginTop: 2 }}>{label}</span>
    </div>
  );
}

function CleanupBadge() {
  return (
    <span
      style={{
        fontSize: 10,
        fontWeight: 600,
        color: 'var(--warn)',
        border: '1px solid var(--warn)',
        borderRadius: 4,
        padding: '1px 5px',
        marginLeft: 4,
        flexShrink: 0,
      }}
    >
      정리 후보
    </span>
  );
}

function RemoveButton({ onClick, title, disabled = false }) {
  return (
    <button
      type="button"
      onClick={onClick}
      title={title}
      disabled={disabled}
      style={{
        border: 0,
        background: 'transparent',
        cursor: disabled ? 'not-allowed' : 'pointer',
        color: 'inherit',
        opacity: disabled ? 0.25 : 0.5,
        display: 'inline-flex',
        padding: 2,
        borderRadius: 4,
        flexShrink: 0,
      }}
    >
      <Icon.close style={{ width: 11, height: 11 }} />
    </button>
  );
}

function SearchInput({ value, onChange, placeholder }) {
  return (
    <div style={{ position: 'relative' }}>
      <Icon.search
        style={{
          position: 'absolute',
          left: 8,
          top: '50%',
          transform: 'translateY(-50%)',
          width: 13,
          height: 13,
          color: 'var(--text-4)',
          pointerEvents: 'none',
        }}
      />
      <input
        className="input"
        value={value}
        onChange={e => onChange(e.target.value)}
        placeholder={placeholder}
        style={{ paddingLeft: 28, fontSize: 12, height: 30 }}
      />
    </div>
  );
}

export function IngredientSettingsPanel({
  mainCats,
  categoryCounts,
  hashTags,
  tagCounts,
  uncategorized = 0,
  discontinuedCount = 0,
  onRemoveRequest,
  canEdit = false,
}) {
  const [catSearch, setCatSearch] = useState('');
  const [tagSearch, setTagSearch] = useState('');

  const filteredCats = catSearch
    ? mainCats.filter(c => c.toLowerCase().includes(catSearch.toLowerCase()))
    : mainCats;

  const filteredTags = tagSearch
    ? hashTags.filter(t => t.toLowerCase().includes(tagSearch.toLowerCase()))
    : hashTags;

  return (
    <div
      className="card"
      style={{ padding: '18px 20px', display: 'flex', flexDirection: 'column', gap: 20 }}
    >
      {/* 요약 */}
      <div>
        <div
          style={{
            fontSize: 12,
            fontWeight: 700,
            color: 'var(--text-3)',
            marginBottom: 10,
            textTransform: 'uppercase',
            letterSpacing: '0.05em',
          }}
        >
          현황 요약
        </div>
        <div style={{ display: 'flex', gap: 8, flexWrap: 'wrap' }}>
          <SummaryChip label="분류" value={mainCats.length} />
          <SummaryChip label="태그" value={hashTags.length} />
          <SummaryChip label="미분류" value={uncategorized} warn />
          <SummaryChip label="단종" value={discontinuedCount} />
        </div>
      </div>

      {/* 분류 섹션 */}
      <div style={{ borderTop: '1px solid var(--divider)', paddingTop: 16 }}>
        <div
          style={{
            display: 'flex',
            alignItems: 'center',
            justifyContent: 'space-between',
            marginBottom: 10,
            gap: 12,
          }}
        >
          <div style={{ fontSize: 13, fontWeight: 700 }}>
            분류{' '}
            <span style={{ fontSize: 11, fontWeight: 400, color: 'var(--text-3)' }}>
              ({mainCats.length})
            </span>
          </div>
          {mainCats.length > 6 && (
            <SearchInput value={catSearch} onChange={setCatSearch} placeholder="분류 검색" />
          )}
        </div>
        {mainCats.length === 0 ? (
          <div style={{ fontSize: 13, color: 'var(--text-3)' }}>등록된 분류가 없습니다</div>
        ) : filteredCats.length === 0 ? (
          <div style={{ fontSize: 12, color: 'var(--text-4)' }}>
            &ldquo;{catSearch}&rdquo; 와 일치하는 분류가 없습니다
          </div>
        ) : (
          <div style={{ display: 'flex', flexWrap: 'wrap', gap: 8 }}>
            {filteredCats.map(category => {
              const count = categoryCounts.get(category) || 0;
              return (
                <span
                  key={category}
                  style={{
                    display: 'inline-flex',
                    alignItems: 'center',
                    gap: 4,
                    padding: '4px 6px 4px 10px',
                    borderRadius: 8,
                    border: '1px solid var(--border)',
                    fontSize: 13,
                    fontWeight: 600,
                    ...getCategoryStyle(category),
                  }}
                >
                  {category}
                  <span style={{ fontSize: 11, opacity: 0.7 }}>{count}</span>
                  {count === 0 && <CleanupBadge />}
                  <RemoveButton
                    onClick={() => onRemoveRequest({ type: 'cat', value: category })}
                    title="분류 삭제"
                    disabled={!canEdit}
                  />
                </span>
              );
            })}
          </div>
        )}
      </div>

      {/* 태그 섹션 */}
      <div style={{ borderTop: '1px solid var(--divider)', paddingTop: 16 }}>
        <div
          style={{
            display: 'flex',
            alignItems: 'center',
            justifyContent: 'space-between',
            marginBottom: 10,
            gap: 12,
          }}
        >
          <div style={{ fontSize: 13, fontWeight: 700 }}>
            #태그{' '}
            <span style={{ fontSize: 11, fontWeight: 400, color: 'var(--text-3)' }}>
              ({hashTags.length})
            </span>
          </div>
          {hashTags.length > 6 && (
            <SearchInput value={tagSearch} onChange={setTagSearch} placeholder="태그 검색" />
          )}
        </div>
        {hashTags.length === 0 ? (
          <div style={{ fontSize: 13, color: 'var(--text-3)' }}>등록된 태그가 없습니다</div>
        ) : filteredTags.length === 0 ? (
          <div style={{ fontSize: 12, color: 'var(--text-4)' }}>
            &ldquo;{tagSearch}&rdquo; 와 일치하는 태그가 없습니다
          </div>
        ) : (
          <div style={{ display: 'flex', flexWrap: 'wrap', gap: 8 }}>
            {filteredTags.map(tag => {
              const count = tagCounts.get(tag) || 0;
              return (
                <span
                  key={tag}
                  style={{
                    display: 'inline-flex',
                    alignItems: 'center',
                    gap: 4,
                    padding: '4px 6px 4px 10px',
                    borderRadius: 8,
                    background: 'var(--surface-2)',
                    color: 'var(--text-2)',
                    fontSize: 13,
                    fontWeight: 500,
                  }}
                >
                  #{tag}
                  <span style={{ fontSize: 11, opacity: 0.7 }}>{count}</span>
                  {count === 0 && <CleanupBadge />}
                  <RemoveButton
                    onClick={() => onRemoveRequest({ type: 'tag', value: tag })}
                    title="태그 삭제"
                    disabled={!canEdit}
                  />
                </span>
              );
            })}
          </div>
        )}
      </div>

      <div
        style={{
          fontSize: 11,
          color: 'var(--text-4)',
          borderTop: '1px solid var(--divider)',
          paddingTop: 12,
        }}
      >
        ※ 삭제 시 해당 분류/태그가 모든 식자재에서 제거됩니다(식자재 자체는 유지).
      </div>
    </div>
  );
}
