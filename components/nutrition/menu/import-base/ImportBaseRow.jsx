'use client';
import MenuCodePicker from '@/components/ui/MenuCodePicker';
import { getMenuCodeBase } from '@/lib/menu-master/code-policy';
import { isPersonalPizzaMenu, normalizeNutritionCategory } from '@/lib/nutrition/menu-group';
import { asObjectArray, asRecord, noop } from '@/lib/ui/prop-guards';
import {
  CATEGORY_OPTIONS,
  CRUST_OPTIONS,
  NON_PIZZA_CATS,
  categoryForImportRow,
} from './importBaseRows';

const STATUS_CFG = {
  matched: { label: '매칭', color: '#16a34a', bg: '#dcfce7' },
  unmatched: { label: '미매칭', color: '#ea580c', bg: '#ffedd5' },
  skipped: { label: '건너뜀', color: '#6b7280', bg: '#f3f4f6' },
  dup: { label: '중복', color: '#b45309', bg: '#fef3c7' },
  exists: { label: '이미저장', color: '#6b7280', bg: '#f3f4f6' },
};

const selectStyle = {
  fontSize: 11,
  padding: '2px 4px',
  border: '1px solid var(--border)',
  borderRadius: 4,
  background: 'var(--surface)',
  color: 'var(--text-1)',
  cursor: 'pointer',
};

const fixedCrustStyle = {
  fontSize: 11,
  padding: '3px 8px',
  borderRadius: 10,
  background: 'var(--surface-2)',
  color: 'var(--text-3)',
  display: 'inline-block',
};

export const previewCellStyle = {
  padding: '5px 8px',
  borderBottom: '1px solid var(--divider)',
  verticalAlign: 'middle',
};

function StatusBadge({ status }) {
  const s = STATUS_CFG[status] || STATUS_CFG.unmatched;
  return (
    <span
      style={{
        fontSize: 11,
        fontWeight: 700,
        padding: '2px 7px',
        borderRadius: 10,
        color: s.color,
        background: s.bg,
        whiteSpace: 'nowrap',
      }}
    >
      {s.label}
    </span>
  );
}

function FmtNum({ v, unit }) {
  if (v === '' || v == null) return <span style={{ color: 'var(--text-4)' }}>–</span>;
  return (
    <span>
      {v}
      <span style={{ fontSize: 10, color: 'var(--text-4)', marginLeft: 1 }}>{unit}</span>
    </span>
  );
}

export function ImportBaseRow({ row = {}, idx, menuMasters, onToggle = noop, onUpdate = noop }) {
  const safeMenuMasters = asObjectArray(menuMasters);
  const values = asRecord(row.values);
  const disabled = row.status === 'skipped' || row.status === 'exists';
  const category = categoryForImportRow(row);
  const isSide = row.basis === 'serving' || NON_PIZZA_CATS.has(category);
  const isPersonal = !isSide && isPersonalPizzaMenu(row);

  function renderCrustCell() {
    if (disabled)
      return <span style={{ fontFamily: 'monospace', fontSize: 11 }}>{row.crustType || '–'}</span>;
    if (isSide) return <span style={fixedCrustStyle}>단품</span>;
    if (isPersonal) return <span style={fixedCrustStyle}>1인도우</span>;
    return (
      <select
        style={selectStyle}
        value={row.crustType || '석쇠L'}
        onChange={e => onUpdate(idx, { crustType: e.target.value })}
      >
        {CRUST_OPTIONS.map(c => (
          <option key={c} value={c}>
            {c}
          </option>
        ))}
      </select>
    );
  }

  return (
    <tr style={{ opacity: disabled || !row.include ? 0.4 : 1 }}>
      <td style={{ ...previewCellStyle, fontSize: 11, color: 'var(--text-3)', maxWidth: 130 }}>
        <div
          style={{ overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap' }}
          title={row.rawName}
        >
          {row.rawName}
        </div>
        {isSide && <div style={{ fontSize: 10, color: '#2563eb' }}>1회분 기준</div>}
        {row.skipReason && <div style={{ fontSize: 10, color: '#6b7280' }}>{row.skipReason}</div>}
        {row.dupNote && <div style={{ fontSize: 10, color: '#b45309' }}>{row.dupNote}</div>}
      </td>
      <td style={{ ...previewCellStyle, minWidth: 170 }}>
        {disabled ? (
          <div>
            {row.menuCode && (
              <span
                style={{
                  fontFamily: 'monospace',
                  fontSize: 11,
                  color: 'var(--accent-text)',
                  marginRight: 4,
                }}
              >
                {row.menuCode}
              </span>
            )}
            <span style={{ fontSize: 12, color: 'var(--text-2)' }}>{row.menuName}</span>
          </div>
        ) : (
          <MenuCodePicker
            menuMasters={safeMenuMasters}
            value={row.menuCode}
            mode="base"
            onChange={(code, meta) => {
              const m = code
                ? safeMenuMasters.find(m2 => {
                    return getMenuCodeBase(m2) === code;
                  })
                : null;
              onUpdate(idx, {
                menuCode: code,
                menuName: m?.menuName || row.baseName,
                category: normalizeNutritionCategory(
                  meta?.category || row.category || '',
                  category
                ),
                status: code ? 'matched' : 'unmatched',
                include: !!code,
              });
            }}
          />
        )}
      </td>
      <td style={{ ...previewCellStyle, minWidth: 90 }}>{renderCrustCell()}</td>
      <td style={{ ...previewCellStyle, minWidth: 90 }}>
        {disabled ? (
          <span style={{ fontSize: 11, color: 'var(--text-3)' }}>{category || '–'}</span>
        ) : (
          <select
            style={selectStyle}
            value={category}
            onChange={e => {
              const cat = e.target.value;
              const patch = { category: cat };
              if (cat === '피자') {
                patch.crustType = row.crustType || '석쇠L';
                patch.basis = undefined;
              } else if (NON_PIZZA_CATS.has(cat)) {
                patch.crustType = '석쇠L';
                patch.basis = 'serving';
              }
              onUpdate(idx, patch);
            }}
          >
            <option value="">–</option>
            {CATEGORY_OPTIONS.map(c => (
              <option key={c} value={c}>
                {c}
              </option>
            ))}
          </select>
        )}
      </td>
      <td style={previewCellStyle}>
        <FmtNum v={values.weight} unit="g" />
      </td>
      <td style={previewCellStyle}>
        <FmtNum v={values.kcal} unit="kcal" />
      </td>
      <td style={previewCellStyle}>
        <FmtNum v={values.sugar} unit="g" />
      </td>
      <td style={previewCellStyle}>
        <FmtNum v={values.protein} unit="g" />
      </td>
      <td style={previewCellStyle}>
        <FmtNum v={values.satFat} unit="g" />
      </td>
      <td style={previewCellStyle}>
        <FmtNum v={values.sodium} unit="mg" />
      </td>
      <td style={previewCellStyle}>
        <StatusBadge status={row.status} />
      </td>
      <td style={{ ...previewCellStyle, textAlign: 'center' }}>
        <input
          type="checkbox"
          checked={!!row.include}
          disabled={disabled}
          onChange={() => onToggle(idx)}
          style={{ cursor: disabled ? 'default' : 'pointer' }}
        />
      </td>
    </tr>
  );
}
