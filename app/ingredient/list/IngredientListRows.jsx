'use client';
/* eslint-disable @next/next/no-img-element */
import { Icon } from '@/components/icons';
import { formatNumber, formatUnitPrice } from '@/lib/format';
import {
  getCategoryStyle,
  getPrimaryIngredientPhoto,
  countIngredientPhotos,
  INGREDIENT_PHOTO_SLOTS,
  normalizeIngredientPhotos,
  sortHashTags,
} from '@/lib/ingredient';
import { SCOPE_STYLES } from '@/lib/ingredient/constants';
import { ingredientName, originText, allergenText } from '@/lib/ingredient/print';

const INGREDIENT_LIST_COLS = 10;

export function ingredientRowKey(row, index = 0) {
  if (row?.id != null) return `id:${row.id}`;
  if (row?.productCode) return `code:${row.productCode}`;
  return `row:${ingredientName(row)}:${index}`;
}

export function IngredientRow({ r, rowKey, isExpanded, onToggle }) {
  const name = r.ingredientName || r.displayName || r.productName;
  const unit = r.baseUnitType || r.salesUnit || 'g';
  const unitPriceLabel = formatUnitPrice(r.unitPrice, unit);
  const tags = sortHashTags(r.tags || []);
  const photo = getPrimaryIngredientPhoto(r);
  const photoCount = countIngredientPhotos(r);
  const { color: scopeColor = 'var(--text-2)', bg: scopeBg = 'var(--surface-3)' } =
    SCOPE_STYLES[r.scope] || {};
  const toggle = () => onToggle?.(rowKey);
  const handleKeyDown = e => {
    if (e.key !== 'Enter' && e.key !== ' ') return;
    e.preventDefault();
    toggle();
  };

  return (
    <>
      <tr
        className={'ingredient-list-summary' + (isExpanded ? ' ingredient-list-summary-open' : '')}
        style={{ opacity: r.discontinued ? 0.55 : 1 }}
        onClick={toggle}
        onKeyDown={handleKeyDown}
        tabIndex={0}
        role="button"
        aria-expanded={isExpanded}
      >
        <td style={{ color: 'var(--text-3)', fontSize: 11 }}>
          <span style={{ display: 'inline-flex', alignItems: 'center', gap: 6, minWidth: 0 }}>
            <Icon.chevRight
              className="ingredient-list-chevron"
              style={{
                width: 13,
                height: 13,
                flexShrink: 0,
                transform: isExpanded ? 'rotate(90deg)' : undefined,
              }}
            />
            {r.isManual && !r.productCode ? (
              <span
                style={{
                  fontSize: 10,
                  padding: '1px 5px',
                  borderRadius: 3,
                  background: 'var(--surface-3)',
                  color: 'var(--text-3)',
                }}
              >
                수동
              </span>
            ) : (
              <span>{r.productCode || '-'}</span>
            )}
          </span>
        </td>
        <td style={{ width: 70 }}>
          {photo ? (
            <div style={{ position: 'relative', width: 72, height: 56 }}>
              <img
                src={photo.data}
                alt={photo.name || name}
                style={{
                  width: 72,
                  height: 56,
                  objectFit: 'contain',
                  borderRadius: 6,
                  border: '1px solid var(--border)',
                  background: 'var(--surface-2)',
                  display: 'block',
                }}
              />
              {photoCount > 1 && (
                <span
                  style={{
                    position: 'absolute',
                    right: -5,
                    bottom: -5,
                    minWidth: 17,
                    height: 17,
                    padding: '0 4px',
                    borderRadius: 999,
                    background: 'var(--accent)',
                    color: '#fff',
                    fontSize: 9,
                    fontWeight: 900,
                    display: 'grid',
                    placeItems: 'center',
                    border: '1px solid var(--surface)',
                  }}
                >
                  {photoCount}
                </span>
              )}
            </div>
          ) : (
            <span style={{ color: 'var(--text-4)', fontSize: 11 }}>—</span>
          )}
        </td>
        <td style={{ fontWeight: 600, fontSize: 13 }}>
          <span title={r.productName !== name ? `원본: ${r.productName}` : undefined}>{name}</span>
        </td>
        <td>
          {r.category ? (
            <span
              className="chip"
              style={{ ...getCategoryStyle(r.category), padding: '2px 8px', fontSize: 11 }}
            >
              {r.category}
            </span>
          ) : (
            <span style={{ color: 'var(--text-4)', fontSize: 11 }}>—</span>
          )}
        </td>
        <td>
          {tags.length > 0 ? (
            <div style={{ display: 'flex', gap: 3, flexWrap: 'wrap' }}>
              {tags.map(t => (
                <span
                  key={t}
                  style={{
                    padding: '1px 5px',
                    fontSize: 10,
                    fontWeight: 500,
                    borderRadius: 3,
                    background: 'var(--surface-2)',
                    color: 'var(--text-2)',
                  }}
                >
                  #{t}
                </span>
              ))}
            </div>
          ) : (
            <span style={{ color: 'var(--text-4)', fontSize: 11 }}>—</span>
          )}
        </td>
        <td>
          <span
            style={{
              padding: '2px 8px',
              fontSize: 11,
              fontWeight: 600,
              borderRadius: 6,
              background: scopeBg,
              color: scopeColor,
            }}
          >
            {r.scope || '-'}
          </span>
        </td>
        <td style={{ fontSize: 12, color: 'var(--text-2)' }}>{unit}</td>
        <td
          style={{
            textAlign: 'right',
            fontSize: 12,
            fontWeight: unitPriceLabel ? 600 : undefined,
            color: unitPriceLabel ? undefined : 'var(--text-4)',
          }}
        >
          {unitPriceLabel || '—'}
        </td>
        <td style={{ fontSize: 12, color: 'var(--text-2)' }}>{r.manufacturer || '-'}</td>
        <td>
          <span
            style={{
              display: 'flex',
              alignItems: 'center',
              gap: 5,
              fontSize: 12,
              fontWeight: 600,
              color: r.jetteLinked ? 'var(--positive)' : 'var(--warn)',
            }}
          >
            <span
              style={{
                width: 6,
                height: 6,
                borderRadius: '50%',
                flexShrink: 0,
                background: r.jetteLinked ? 'var(--positive)' : 'var(--warn)',
              }}
            />
            {r.jetteLinked ? '연동' : '미연동'}
          </span>
        </td>
      </tr>
      {isExpanded && (
        <tr className="ingredient-detail-row">
          <td colSpan={INGREDIENT_LIST_COLS}>
            <IngredientDetailPanel row={r} name={name} unitPriceLabel={unitPriceLabel} />
          </td>
        </tr>
      )}
    </>
  );
}

function IngredientDetailPanel({ row, name, unitPriceLabel }) {
  const tags = sortHashTags(row.tags || []);
  const photos = normalizeIngredientPhotos(row.photos, row.photo);
  const unit = row.baseUnitType || row.salesUnit || '-';
  const baseQuantity =
    row.baseQuantity != null && row.baseQuantity !== ''
      ? `${formatNumber(row.baseQuantity)}${row.baseUnitType || ''}`
      : '-';
  const origin = originText(row) || (row.originHidden ? '미표시대상' : '-');
  const allergens = allergenText(row) || '-';
  const status = row.discontinued
    ? '단종'
    : row.excluded
      ? '숨김'
      : row.jetteLinked
        ? '제때 연동'
        : '미연동';

  return (
    <div className="ingredient-detail-panel">
      <aside className="ingredient-detail-media">
        <div className="ingredient-detail-photo-grid">
          {INGREDIENT_PHOTO_SLOTS.map(slot => {
            const photo = photos[slot.key];
            return (
              <div key={slot.key} className="ingredient-detail-photo-card">
                <div className="ingredient-detail-photo-label">{slot.label}</div>
                <div className="ingredient-detail-photo">
                  {photo ? (
                    <img src={photo.data} alt={photo.name || `${name || '식자재'} ${slot.label}`} />
                  ) : (
                    <span>사진 없음</span>
                  )}
                </div>
                <div className="ingredient-detail-media-caption">
                  <span>{photo?.name || slot.hint}</span>
                </div>
              </div>
            );
          })}
        </div>
      </aside>
      <div className="ingredient-detail-info">
        <div className="ingredient-detail-header">
          <div>
            <div className="ingredient-detail-title">{name || '이름 없음'}</div>
            <div className="ingredient-detail-sub">
              {row.productName && row.productName !== name
                ? `원본명: ${row.productName}`
                : '식자재 상세 정보'}
            </div>
          </div>
          <div className="ingredient-detail-badges">
            {row.category && <span>{row.category}</span>}
            {row.scope && <span>{row.scope}</span>}
            <span className={row.jetteLinked ? 'ok' : 'warn'}>{status}</span>
          </div>
        </div>
        <div className="ingredient-detail-sections">
          <DetailSection title="기본 정보">
            <DetailItem label="제품코드" value={row.productCode || '수동 등록'} />
            <DetailItem label="제조사" value={row.manufacturer || '-'} />
            <DetailItem label="보관온도" value={row.temperature || '-'} />
            <DetailItem label="상태" value={status} />
          </DetailSection>
          <DetailSection title="가격·단위">
            <DetailItem label="단위" value={unit} />
            <DetailItem label="포장단위" value={baseQuantity} />
            <DetailItem label="단가" value={unitPriceLabel || '-'} />
            <DetailItem label="과세구분" value={row.taxType || '-'} />
          </DetailSection>
          <DetailSection title="표시 정보" wide>
            <DetailItem label="원산지" value={origin} wide />
            <DetailItem label="알레르기" value={allergens} wide />
            <DetailItem
              label="태그"
              value={
                tags.length > 0 ? (
                  <div className="ingredient-detail-tags">
                    {tags.map(tag => (
                      <span key={tag}>#{tag}</span>
                    ))}
                  </div>
                ) : (
                  '-'
                )
              }
              wide
            />
          </DetailSection>
          <DetailSection title="비고" wide>
            <DetailItem label="메모" value={row.note || '-'} wide />
          </DetailSection>
        </div>
      </div>
    </div>
  );
}

function DetailSection({ title, children, wide = false }) {
  return (
    <section className={wide ? 'ingredient-detail-section wide' : 'ingredient-detail-section'}>
      <div className="ingredient-detail-section-title">{title}</div>
      <dl className="ingredient-detail-grid">{children}</dl>
    </section>
  );
}

function DetailItem({ label, value, wide = false }) {
  return (
    <div className={wide ? 'ingredient-detail-item wide' : 'ingredient-detail-item'}>
      <dt>{label}</dt>
      <dd>{value}</dd>
    </div>
  );
}
