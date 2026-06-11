import { memo } from 'react';
import { Icon } from '@/components/icons';
import { formatNumber } from '@/lib/format';
import { countIngredientPhotos, getCategoryStyle, getPrimaryIngredientPhoto, sortHashTags } from '@/lib/ingredient';
import { SCOPE_STYLES } from '@/lib/ingredient/constants';
import { asDisplayText, asStringArray } from '@/lib/ui/prop-guards';

export const ManageRow = memo(function ManageRow({
  r: rawRow = {},
  deletePending,
  onEdit,
  onCopy,
  onDeleteStart,
  onDeleteCancel,
  onDeleteConfirm,
  onRestore,
  batchMode,
  isSelected,
  onToggleSelect,
}) {
  const r = rawRow && typeof rawRow === 'object' ? rawRow : {};
  const productCode = asDisplayText(r.productCode);
  const productName = asDisplayText(r.productName);
  const name = asDisplayText(r.ingredientName || r.displayName || productName, '-');
  const baseUnitType = asDisplayText(r.baseUnitType);
  const salesUnit = asDisplayText(r.salesUnit, '-');
  const baseQuantity = Number(r.baseQuantity);
  const unitLabel =
    Number.isFinite(baseQuantity) && baseQuantity > 0 && baseUnitType
      ? `${formatNumber(baseQuantity)}${baseUnitType}`
      : salesUnit;
  const tags = sortHashTags(asStringArray(r.tags));
  const temperature = asDisplayText(r.temperature, '-');
  const scope = asDisplayText(r.scope, '-');
  const category = asDisplayText(r.category);
  const manufacturer = asDisplayText(r.manufacturer, '-');
  const photo = getPrimaryIngredientPhoto(r);
  const photoCount = countIngredientPhotos(r);
  const priceWithTax = Number.isFinite(Number(r.priceWithTax)) ? Number(r.priceWithTax) : null;
  const originCount = Array.isArray(r.origin) ? r.origin.length : 0;
  const allergenCount = Array.isArray(r.allergens) ? r.allergens.length : 0;
  const handleEdit = typeof onEdit === 'function' ? onEdit : undefined;
  const handleCopy = typeof onCopy === 'function' ? onCopy : undefined;
  const handleDeleteStart = typeof onDeleteStart === 'function' ? onDeleteStart : undefined;
  const handleDeleteCancel = typeof onDeleteCancel === 'function' ? onDeleteCancel : undefined;
  const handleDeleteConfirm = typeof onDeleteConfirm === 'function' ? onDeleteConfirm : undefined;
  const handleRestore = typeof onRestore === 'function' ? onRestore : undefined;
  const toggleSelect = typeof onToggleSelect === 'function' ? onToggleSelect : undefined;
  // 일괄 삭제 대상은 단건 삭제와 동일 — productCode 없는 수동 항목만 (제때 연동 항목은 '숨김' 처리라 제외)
  const deletable = r.isManual && r.id != null && !productCode;

  return (
    <tr
      style={{
        opacity: r.excluded ? 0.5 : 1,
        background: isSelected ? 'var(--accent-soft)' : r.excluded ? 'var(--surface-2)' : undefined,
        cursor: batchMode && !deletable ? 'default' : 'pointer',
      }}
      onClick={
        batchMode ? (deletable && toggleSelect ? () => toggleSelect(r.id) : undefined) : handleEdit
      }
    >
      {batchMode && (
        <td style={{ width: 36, textAlign: 'center' }} onClick={e => e.stopPropagation()}>
          {deletable ? (
            <input
              type="checkbox"
              checked={Boolean(isSelected)}
              onChange={() => toggleSelect?.(r.id)}
              style={{ cursor: 'pointer', width: 15, height: 15 }}
            />
          ) : (
            <span
              style={{ color: 'var(--text-4)', fontSize: 11 }}
              title="제때 연동 항목은 일괄 삭제 대상이 아니에요"
            >
              –
            </span>
          )}
        </td>
      )}
      <td className="num" style={{ color: 'var(--text-3)', fontSize: 11 }}>
        <div style={{ display: 'flex', flexDirection: 'column', gap: 3, alignItems: 'flex-start' }}>
          <span>{productCode || (r.isManual ? '자체' : '-')}</span>
          <span
            style={{
              fontSize: 9,
              fontWeight: 700,
              padding: '1px 5px',
              borderRadius: 3,
              background: r.jetteLinked ? 'var(--positive-soft)' : 'var(--surface-3)',
              color: r.jetteLinked ? 'var(--positive)' : 'var(--text-3)',
            }}
          >
            {r.jetteLinked ? '연동' : '수동'}
          </span>
        </div>
      </td>
      <td style={{ width: 58 }}>
        {photo ? (
          <div style={{ position: 'relative', width: 44, height: 34 }}>
          <img
            src={photo.data}
            alt={photo.name || name}
            style={{
              width: 44,
              height: 34,
              objectFit: 'cover',
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
                  right: -4,
                  bottom: -4,
                  minWidth: 16,
                  height: 16,
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
        <span title={productName && productName !== name ? `원본: ${productName}` : undefined}>
          {name}
        </span>
        {r.discontinued && (
          <span
            style={{
              marginLeft: 6,
              fontSize: 10,
              fontWeight: 700,
              padding: '1px 5px',
              borderRadius: 3,
              background: 'var(--surface-3)',
              color: 'var(--text-3)',
            }}
          >
            단종
          </span>
        )}
        {originCount > 0 && (
          <span
            style={{
              marginLeft: 4,
              fontSize: 9,
              fontWeight: 700,
              padding: '1px 5px',
              borderRadius: 3,
              background: 'var(--positive-soft)',
              color: 'var(--positive)',
            }}
          >
            원산지
          </span>
        )}
        {allergenCount > 0 && (
          <span
            style={{
              marginLeft: 4,
              fontSize: 9,
              fontWeight: 700,
              padding: '1px 5px',
              borderRadius: 3,
              background: 'var(--warn-soft)',
              color: 'var(--warn)',
            }}
          >
            알레르기 {allergenCount}
          </span>
        )}
      </td>
      <td style={{ fontSize: 12, color: 'var(--text-2)' }}>{temperature}</td>
      <td style={{ fontSize: 12, color: 'var(--text-2)' }}>{unitLabel}</td>
      <td>
        <span
          style={{
            padding: '2px 7px',
            fontSize: 11,
            fontWeight: 600,
            borderRadius: 6,
            background: (SCOPE_STYLES[scope] || {}).bg || 'var(--surface-3)',
            color: (SCOPE_STYLES[scope] || {}).color || 'var(--text-2)',
          }}
        >
          {scope}
        </span>
      </td>
      <td className="num right" style={{ fontWeight: 600, fontSize: 12 }}>
        {priceWithTax != null ? (
          <>
            {formatNumber(priceWithTax)}
            <span className="unit">원</span>
          </>
        ) : (
          '-'
        )}
      </td>
      <td>
        {category ? (
          <span
            className="chip"
            style={{ ...getCategoryStyle(category), padding: '2px 8px', fontSize: 11 }}
          >
            {category}
          </span>
        ) : (
          <span
            className="chip"
            style={{
              background: 'var(--warn-soft)',
              color: 'var(--warn)',
              fontSize: 10,
              padding: '1px 6px',
            }}
          >
            미분류
          </span>
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
      <td style={{ fontSize: 12, color: 'var(--text-2)' }}>{manufacturer}</td>
      {/* 액션 셀 — 클릭이 행 편집과 충돌하지 않도록 stopPropagation */}
      <td style={{ textAlign: 'center' }} onClick={e => e.stopPropagation()}>
        {r.excluded ? (
          <button className="btn sm" style={{ fontSize: 11 }} onClick={handleRestore}>
            복원
          </button>
        ) : deletePending ? (
          <span style={{ display: 'flex', gap: 3 }}>
            <button
              className="btn sm"
              style={{ background: 'var(--negative)', color: '#fff', border: 'none', fontSize: 11 }}
              onClick={handleDeleteConfirm}
            >
              {r.isManual && !productCode ? '삭제' : '숨김'}
            </button>
            <button className="btn sm" style={{ fontSize: 11 }} onClick={handleDeleteCancel}>
              취소
            </button>
          </span>
        ) : (
          <span style={{ display: 'inline-flex', gap: 3 }}>
            {handleCopy && (
              <button
                className="btn sm"
                aria-label="복사해서 추가"
                title="이 항목을 복사해 새 식자재 추가"
                onClick={handleCopy}
                style={{ color: 'var(--text-3)' }}
              >
                <Icon.copy style={{ width: 13, height: 13 }} />
              </button>
            )}
            <button
              className="btn sm"
              aria-label="삭제"
              onClick={handleDeleteStart}
              style={{ color: 'var(--text-3)' }}
            >
              <Icon.trash style={{ width: 13, height: 13 }} />
            </button>
          </span>
        )}
      </td>
    </tr>
  );
});
