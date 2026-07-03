'use client';
import MenuCodePicker from '@/components/ui/MenuCodePicker';
import { getMenuCodeBase } from '@/lib/menu-master/code-policy';
import { SERVING_CRUST_TYPE } from '@/lib/nutrition/crust-config';
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
  padding: '8px 10px',
  borderBottom: '1px solid var(--divider)',
  verticalAlign: 'middle',
  color: 'var(--text-1)',
};

const MATCH_SOURCE_LABEL = {
  code: '코드 매칭',
  saved: '저장된 매칭',
  name: '이름 매칭',
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
    <span style={{ color: 'var(--text-1)', fontWeight: 600 }}>
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
  const rowBg =
    row.status === 'unmatched'
      ? 'color-mix(in srgb, #ffedd5 55%, var(--surface))'
      : row.status === 'exists'
        ? 'color-mix(in srgb, var(--surface-2) 70%, var(--surface))'
        : row.matchSource === 'saved'
          ? 'color-mix(in srgb, var(--accent-soft) 35%, var(--surface))'
          : !row.include
            ? 'color-mix(in srgb, var(--surface-2) 72%, var(--surface))'
            : undefined;

  function renderCrustCell() {
    if (disabled)
      return <span style={{ fontFamily: 'monospace', fontSize: 11 }}>{row.crustType || '–'}</span>;
    if (isSide) return <span style={fixedCrustStyle}>{SERVING_CRUST_TYPE}</span>;
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
    <tr style={{ background: rowBg }}>
      <td style={{ ...previewCellStyle, fontSize: 12, maxWidth: 240 }}>
        <div
          style={{
            overflow: 'hidden',
            textOverflow: 'ellipsis',
            whiteSpace: 'normal',
            lineHeight: 1.35,
            fontWeight: 700,
          }}
          title={row.rawName}
        >
          {row.rawName}
        </div>
        {row.rawCode && (
          <div style={{ fontSize: 11, color: 'var(--text-3)', marginTop: 2 }}>
            코드 {row.rawCode}
          </div>
        )}
        {isSide && <div style={{ fontSize: 10, color: '#2563eb' }}>1회분 기준</div>}
        {row.skipReason && <div style={{ fontSize: 10, color: '#6b7280' }}>{row.skipReason}</div>}
        {row.dupNote && <div style={{ fontSize: 10, color: '#b45309' }}>{row.dupNote}</div>}
      </td>
      <td style={{ ...previewCellStyle, minWidth: 300 }}>
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
            <span style={{ fontSize: 13, color: 'var(--text-1)', fontWeight: 700 }}>
              {row.menuName}
            </span>
          </div>
        ) : (
          <MenuCodePicker
            menuMasters={safeMenuMasters}
            value={row.menuCode}
            mode="base"
            dropdownMinWidth={460}
            dropdownMaxHeight={380}
            style={{ minWidth: 320, width: '100%' }}
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
                patch.crustType = CRUST_OPTIONS.includes(row.crustType) ? row.crustType : '석쇠L';
                patch.basis = undefined;
              } else if (NON_PIZZA_CATS.has(cat)) {
                patch.crustType = SERVING_CRUST_TYPE;
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
        {row.matchSource && (
          <div style={{ fontSize: 10, color: 'var(--text-3)', marginTop: 3 }}>
            {MATCH_SOURCE_LABEL[row.matchSource] || row.matchSource}
          </div>
        )}
      </td>
      <td style={{ ...previewCellStyle, textAlign: 'center' }}>
        <input
          type="checkbox"
          checked={!!row.include}
          disabled={disabled}
          onChange={() => onToggle(idx)}
          style={{ cursor: disabled ? 'default' : 'pointer', transform: 'scale(1.15)' }}
        />
      </td>
    </tr>
  );
}
