'use client';
import { useEffect, useMemo, useState } from 'react';
import { showToast } from '@/components/Toast';
import { ModalFrame } from '@/components/ui/ModalFrame';
import { UploadDropzone } from '@/components/ui/UploadDropzone';
import { NUTRITION_FIELDS, upsertTopping } from '@/lib/nutrition/values/store';
import {
  buildToppingImportRows,
  downloadToppingImportTemplate,
  parseToppingExcel,
  toToppingImportRecord,
} from '@/lib/nutrition/values/topping-import';
import { ALLERGEN_SEED } from '@/lib/nutrition/allergen/store';
import { parseErrorMsg } from '@/lib/upload-policy';
import { asObjectArray, asStringArray } from '@/lib/ui/prop-guards';

const STATUS = {
  ready: { label: '신규', color: '#2563eb', bg: '#dbeafe' },
  exists: { label: '업데이트', color: '#16a34a', bg: '#dcfce7' },
  dup: { label: '중복', color: '#b45309', bg: '#fef3c7' },
  invalid: { label: '확인필요', color: '#dc2626', bg: '#fee2e2' },
};

const PREVIEW_FIELDS = ['weight', 'kcal', 'sugar', 'protein', 'fat', 'satFat', 'sodium'];
const FIELD_BY_KEY = Object.fromEntries(NUTRITION_FIELDS.map(field => [field.key, field]));
const INPUT_STYLE = {
  width: '100%',
  minWidth: 0,
  border: '1px solid var(--border)',
  borderRadius: 8,
  padding: '7px 9px',
  background: 'var(--surface)',
  color: 'var(--text-1)',
  fontSize: 12,
  fontWeight: 700,
  outline: 'none',
};
const NUMERIC_INPUT_STYLE = {
  ...INPUT_STYLE,
  minWidth: 82,
  textAlign: 'right',
  fontVariantNumeric: 'tabular-nums',
};
const ALLERGEN_NAME_BY_CODE = Object.fromEntries(
  ALLERGEN_SEED.map(item => [asText(item.allergenCode), asText(item.allergenName)])
);

function asText(value) {
  return String(value ?? '')
    .normalize('NFKC')
    .trim();
}

function textKey(value) {
  return asText(value).replace(/\s+/g, '').toLowerCase();
}

function parseImportNumberInput(value) {
  if (value === '' || value == null) return '';
  const text = String(value)
    .replace(/[^\d.-]/g, '')
    .replace(/(?!^)-/g, '');
  if (!text || text === '-' || text === '.' || text === '-.') return '';
  const num = Number.parseFloat(text);
  return Number.isFinite(num) ? Math.max(0, num) : '';
}

function ingredientNameOf(ingredient) {
  return asText(ingredient?.ingredientName || ingredient?.displayName || ingredient?.productName);
}

function buildIngredientOptions(ingredients) {
  return asObjectArray(ingredients)
    .map((ingredient, index) => {
      const productCode = asText(ingredient?.productCode);
      const ingredientName = ingredientNameOf(ingredient);
      const label = [productCode, ingredientName].filter(Boolean).join(' | ');
      const allergens = asStringArray(ingredient?.allergens);
      return {
        key: productCode || `${ingredientName}-${index}`,
        productCode,
        ingredientName,
        allergens,
        allergenText: allergens.map(code => ALLERGEN_NAME_BY_CODE[code] || code).join(', '),
        label,
        labelKey: textKey(label),
        codeKey: textKey(productCode),
        nameKey: textKey(ingredientName),
      };
    })
    .filter(option => option.productCode || option.ingredientName);
}

function findIngredientOption(input, options) {
  const raw = asText(input);
  const key = textKey(raw);
  if (!key) return null;
  return (
    options.find(
      option =>
        key === option.labelKey ||
        key === option.codeKey ||
        key === option.nameKey ||
        raw === option.productCode ||
        raw === option.ingredientName
    ) || null
  );
}

function searchIngredientOptions(input, options, limit = 8) {
  const key = textKey(input);
  const safeOptions = Array.isArray(options) ? options : [];
  if (!key) return safeOptions.slice(0, limit);
  return safeOptions
    .filter(
      option =>
        option.labelKey.includes(key) ||
        option.codeKey.includes(key) ||
        option.nameKey.includes(key)
    )
    .slice(0, limit);
}

function resolveIngredientOption(
  input,
  options,
  { allowSingleMatch = false, allowFirst = false } = {}
) {
  const exact = findIngredientOption(input, options);
  if (exact) return exact;
  const matches = searchIngredientOptions(input, options);
  if (allowFirst) return matches[0] || null;
  if (allowSingleMatch && matches.length === 1) return matches[0];
  return null;
}

function ingredientInputValue(row) {
  if (!row.hasIngredientMatch) {
    if (row.productCode) return row.productCode;
    if (row.ingredientName && row.ingredientName !== row.toppingName) return row.ingredientName;
    return '';
  }
  return [row.productCode, row.ingredientName].filter(Boolean).join(' | ');
}

function ingredientAllergenText(row, options) {
  const option =
    findIngredientOption(row?.productCode, options) ||
    findIngredientOption(row?.ingredientName, options) ||
    findIngredientOption(ingredientInputValue(row), options);
  return option?.allergenText || '';
}

function StatusBadge({ status }) {
  const cfg = STATUS[status] || STATUS.invalid;
  return (
    <span
      style={{
        display: 'inline-flex',
        alignItems: 'center',
        borderRadius: 999,
        padding: '3px 8px',
        fontSize: 11,
        fontWeight: 800,
        color: cfg.color,
        background: cfg.bg,
        whiteSpace: 'nowrap',
      }}
    >
      {cfg.label}
    </span>
  );
}

function TextImportInput({ value, onChange, placeholder, mono = false }) {
  return (
    <input
      type="text"
      value={value || ''}
      placeholder={placeholder}
      onChange={event => onChange(event.target.value)}
      style={{
        ...INPUT_STYLE,
        fontFamily: mono ? 'ui-monospace, SFMono-Regular, Menlo, Consolas, monospace' : undefined,
      }}
    />
  );
}

function NumberImportInput({ value, unit, onChange }) {
  return (
    <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'flex-end', gap: 4 }}>
      <input
        type="number"
        min="0"
        step="0.01"
        value={value === '' || value == null ? '' : value}
        onChange={event => onChange(parseImportNumberInput(event.target.value))}
        style={NUMERIC_INPUT_STYLE}
      />
      {unit && <span style={{ minWidth: 18, fontSize: 10, color: 'var(--text-4)' }}>{unit}</span>}
    </div>
  );
}

function IngredientConnectInput({ row, index, options, onIngredientInput }) {
  const committedValue = ingredientInputValue(row);
  const [query, setQuery] = useState(committedValue);
  const [focused, setFocused] = useState(false);
  const [open, setOpen] = useState(false);
  const [composing, setComposing] = useState(false);
  const matches = useMemo(() => searchIngredientOptions(query, options), [query, options]);

  useEffect(() => {
    if (!focused) setQuery(committedValue);
  }, [committedValue, focused]);

  function commit(value, mode = 'blur') {
    const option = resolveIngredientOption(value, options, {
      allowSingleMatch: mode === 'blur',
      allowFirst: mode === 'enter',
    });
    const nextValue = option?.label || value;
    setQuery(nextValue);
    setOpen(false);
    onIngredientInput(index, nextValue);
  }

  return (
    <div style={{ position: 'relative' }}>
      <input
        type="text"
        value={query}
        placeholder="식자재 코드/명 검색"
        onFocus={() => {
          setFocused(true);
          setOpen(true);
        }}
        onBlur={() => {
          setFocused(false);
          commit(query, 'blur');
        }}
        onCompositionStart={() => setComposing(true)}
        onCompositionEnd={event => {
          setComposing(false);
          setQuery(event.currentTarget.value);
          setOpen(true);
        }}
        onChange={event => {
          setQuery(event.target.value);
          setOpen(true);
        }}
        onKeyDown={event => {
          if (composing) return;
          if (event.key === 'Enter') {
            event.preventDefault();
            commit(query, 'enter');
          }
          if (event.key === 'Escape') {
            setOpen(false);
          }
        }}
        style={INPUT_STYLE}
      />
      {open && focused && (
        <div
          role="listbox"
          style={{
            position: 'absolute',
            zIndex: 20,
            top: 'calc(100% + 4px)',
            left: 0,
            right: 0,
            maxHeight: 220,
            overflowY: 'auto',
            border: '1px solid var(--border)',
            borderRadius: 8,
            background: 'var(--surface)',
            boxShadow: 'var(--shadow-lg, 0 16px 36px rgba(15, 23, 42, .16))',
          }}
        >
          {matches.length ? (
            matches.map(option => (
              <button
                key={option.key}
                type="button"
                role="option"
                aria-selected="false"
                onMouseDown={event => {
                  event.preventDefault();
                  commit(option.label, 'select');
                }}
                style={{
                  display: 'grid',
                  width: '100%',
                  gap: 2,
                  border: 0,
                  borderBottom: '1px solid var(--divider)',
                  padding: '8px 10px',
                  background: 'var(--surface)',
                  color: 'var(--text-1)',
                  textAlign: 'left',
                  cursor: 'pointer',
                }}
              >
                <span style={{ fontSize: 12, fontWeight: 800 }}>
                  {option.ingredientName || option.productCode}
                </span>
                <span className="mono muted" style={{ fontSize: 11 }}>
                  {option.productCode || '코드 없음'}
                  {option.allergenText ? ` · ${option.allergenText}` : ''}
                </span>
              </button>
            ))
          ) : (
            <div style={{ padding: '9px 10px', fontSize: 12, color: 'var(--text-4)' }}>
              일치하는 식자재가 없습니다
            </div>
          )}
        </div>
      )}
    </div>
  );
}

function ToppingPreviewTable({ rows, ingredientOptions, onToggle, onPatchRow, onIngredientInput }) {
  return (
    <div
      style={{
        maxHeight: '58vh',
        overflow: 'auto',
        border: '1px solid var(--border)',
        borderRadius: 8,
      }}
    >
      <table style={{ width: '100%', minWidth: 1440, borderCollapse: 'collapse', fontSize: 13 }}>
        <thead>
          <tr>
            {[
              '포함',
              '상태',
              '추가토핑',
              '식자재 연결',
              '알레르기',
              ...PREVIEW_FIELDS.map(key => FIELD_BY_KEY[key]?.label || key),
            ].map((label, index) => (
              <th
                key={`${label}-${index}`}
                style={{
                  position: 'sticky',
                  top: 0,
                  zIndex: 1,
                  padding: '9px 10px',
                  background: 'var(--surface-2)',
                  borderBottom: '1px solid var(--border)',
                  color: 'var(--text-2)',
                  textAlign: index >= 5 ? 'right' : 'left',
                  whiteSpace: 'nowrap',
                }}
              >
                {label}
              </th>
            ))}
          </tr>
        </thead>
        <tbody>
          {rows.map((row, index) => (
            <tr
              key={`${row.toppingCode || row.toppingName || 'row'}-${index}`}
              style={{
                background:
                  row.status === 'invalid'
                    ? 'color-mix(in srgb, #fee2e2 48%, var(--surface))'
                    : row.status === 'exists'
                      ? 'color-mix(in srgb, #dcfce7 35%, var(--surface))'
                      : undefined,
              }}
            >
              <td style={{ padding: '8px 10px', borderBottom: '1px solid var(--divider)' }}>
                <input
                  type="checkbox"
                  checked={!!row.include}
                  disabled={row.status === 'invalid'}
                  onChange={() => onToggle(index)}
                  style={{ transform: 'scale(1.15)' }}
                />
              </td>
              <td style={{ padding: '8px 10px', borderBottom: '1px solid var(--divider)' }}>
                <StatusBadge status={row.status} />
                {row.sourceRow && (
                  <div style={{ marginTop: 3, fontSize: 10, color: 'var(--text-4)' }}>
                    {row.sourceSheet ? `${row.sourceSheet} ` : ''}
                    {row.sourceRow}행
                  </div>
                )}
              </td>
              <td style={{ padding: '8px 10px', borderBottom: '1px solid var(--divider)' }}>
                <div style={{ display: 'grid', gap: 5, minWidth: 170 }}>
                  <TextImportInput
                    value={row.toppingName}
                    placeholder="추가토핑명"
                    onChange={value => onPatchRow(index, { toppingName: value })}
                  />
                  <TextImportInput
                    value={row.toppingCode}
                    placeholder="코드 없으면 자동 생성"
                    mono
                    onChange={value => onPatchRow(index, { toppingCode: value })}
                  />
                </div>
              </td>
              <td style={{ padding: '8px 10px', borderBottom: '1px solid var(--divider)' }}>
                <div style={{ display: 'grid', gap: 5, minWidth: 220 }}>
                  <IngredientConnectInput
                    row={row}
                    index={index}
                    options={ingredientOptions}
                    onIngredientInput={onIngredientInput}
                  />
                  <div
                    className="mono"
                    style={{
                      fontSize: 11,
                      color: row.hasIngredientMatch ? '#16a34a' : 'var(--text-4)',
                    }}
                  >
                    {row.hasIngredientMatch ? '연결됨' : row.productCode ? '일치 없음' : '미연결'}
                  </div>
                </div>
              </td>
              <td
                style={{
                  padding: '8px 10px',
                  borderBottom: '1px solid var(--divider)',
                  minWidth: 160,
                }}
              >
                <span style={{ fontSize: 12, fontWeight: 700, color: 'var(--text-2)' }}>
                  {ingredientAllergenText(row, ingredientOptions) || '-'}
                </span>
              </td>
              {PREVIEW_FIELDS.map(key => (
                <td
                  key={key}
                  style={{
                    padding: '8px 10px',
                    borderBottom: '1px solid var(--divider)',
                    textAlign: 'right',
                    whiteSpace: 'nowrap',
                  }}
                >
                  <NumberImportInput
                    value={row.values?.[key]}
                    unit={FIELD_BY_KEY[key]?.unit || ''}
                    onChange={value =>
                      onPatchRow(index, {
                        values: {
                          ...row.values,
                          [key]: value,
                        },
                      })
                    }
                  />
                </td>
              ))}
            </tr>
          ))}
        </tbody>
      </table>
    </div>
  );
}

export function ToppingImportModal({ toppings, ingredients, onClose, onRefresh }) {
  const safeToppings = asObjectArray(toppings);
  const safeIngredients = asObjectArray(ingredients);
  const ingredientOptions = buildIngredientOptions(safeIngredients);
  const [step, setStep] = useState('upload');
  const [rows, setRows] = useState([]);
  const [saving, setSaving] = useState(false);

  function rebuildRows(nextRows) {
    return buildToppingImportRows({
      rawRows: nextRows,
      toppings: safeToppings,
      ingredients: safeIngredients,
    }).map((row, index) => {
      const previous = nextRows[index] || {};
      const wasInvalid = previous.status === 'invalid';
      return {
        ...row,
        include: row.status === 'invalid' ? false : wasInvalid ? true : previous.include !== false,
      };
    });
  }

  function patchRow(index, patch) {
    setRows(prev =>
      rebuildRows(
        prev.map((row, rowIndex) => {
          if (rowIndex !== index) return row;
          return {
            ...row,
            ...patch,
            values: patch.values ? { ...row.values, ...patch.values } : row.values,
          };
        })
      )
    );
  }

  function handleIngredientInput(index, value) {
    const option = findIngredientOption(value, ingredientOptions);
    patchRow(
      index,
      option
        ? {
            productCode: option.productCode,
            ingredientName: option.ingredientName,
          }
        : {
            productCode: value,
            ingredientName: '',
          }
    );
  }

  async function handleFile(file, error) {
    if (error) {
      showToast(error, 'error');
      return;
    }
    if (!file) return;
    try {
      const buffer = await file.arrayBuffer();
      const rawRows = await parseToppingExcel(buffer);
      setRows(
        buildToppingImportRows({
          rawRows,
          toppings: safeToppings,
          ingredients: safeIngredients,
        })
      );
      setStep('preview');
    } catch (err) {
      showToast(parseErrorMsg(err), 'error');
    }
  }

  async function handleTemplateDownload() {
    try {
      await downloadToppingImportTemplate(safeIngredients);
    } catch (err) {
      showToast(`양식 다운로드 실패: ${err?.message || err}`, 'error');
    }
  }

  function toggleRow(index) {
    setRows(prev =>
      prev.map((row, rowIndex) =>
        rowIndex === index && row.status !== 'invalid' ? { ...row, include: !row.include } : row
      )
    );
  }

  async function saveRows() {
    const selected = rows.filter(row => row.include && row.status !== 'invalid');
    if (!selected.length) {
      showToast('저장할 추가토핑이 없어요', 'warn');
      return;
    }
    setSaving(true);
    try {
      const now = Date.now();
      for (let index = 0; index < selected.length; index += 1) {
        await upsertTopping(toToppingImportRecord(selected[index], index, now));
      }
      showToast(`${selected.length}건 저장 완료`, 'ok');
      await onRefresh?.();
      onClose?.();
    } catch (err) {
      showToast(`저장 실패: ${err?.message || err}`, 'error');
    } finally {
      setSaving(false);
    }
  }

  const included = rows.filter(row => row.include && row.status !== 'invalid').length;
  const counts = rows.reduce(
    (acc, row) => ({ ...acc, [row.status]: (acc[row.status] || 0) + 1 }),
    {}
  );

  return (
    <ModalFrame
      title={step === 'upload' ? '추가토핑 엑셀 가져오기' : '추가토핑 엑셀 미리보기'}
      onClose={onClose}
      width={step === 'upload' ? 'min(720px, 96vw)' : 'min(1120px, 98vw)'}
      zIndex={320}
      padding="20px 24px"
    >
      {step === 'upload' ? (
        <>
          <div style={{ display: 'flex', justifyContent: 'flex-end', marginBottom: 12 }}>
            <button className="btn sm" type="button" onClick={handleTemplateDownload}>
              양식 다운로드
            </button>
          </div>
          <UploadDropzone
            onFile={handleFile}
            accept={['.xlsx', '.xls', '.csv']}
            title="추가토핑 영양성분 엑셀을 넣으세요"
            subText="양식의 식자재코드를 넣으면 식자재 관리의 알레르기/원산지 정보와 연결됩니다."
            rules={[
              {
                type: 'ok',
                text: '양식 파일에는 입력 시트와 현재 식자재코드 목록 시트가 함께 들어갑니다.',
              },
              {
                type: 'ok',
                text: '식자재코드는 공백·대소문자 차이가 있어도 가능한 범위에서 연결합니다.',
              },
              { type: 'warn', text: '추가토핑명은 반드시 필요합니다.' },
            ]}
          />
        </>
      ) : (
        <>
          <div
            style={{
              display: 'flex',
              justifyContent: 'space-between',
              gap: 12,
              alignItems: 'center',
              marginBottom: 12,
              flexWrap: 'wrap',
            }}
          >
            <div style={{ fontSize: 12, color: 'var(--text-3)' }}>
              신규 <b style={{ color: 'var(--text-1)' }}>{counts.ready || 0}</b>건 · 업데이트{' '}
              <b style={{ color: 'var(--text-1)' }}>{counts.exists || 0}</b>건 · 확인필요{' '}
              <b style={{ color: 'var(--text-1)' }}>{counts.invalid || 0}</b>건
            </div>
            <div style={{ fontSize: 12, color: 'var(--text-2)' }}>
              저장 대상 <b style={{ color: 'var(--text-1)' }}>{included}</b>건
            </div>
          </div>
          <ToppingPreviewTable
            rows={rows}
            ingredientOptions={ingredientOptions}
            onToggle={toggleRow}
            onPatchRow={patchRow}
            onIngredientInput={handleIngredientInput}
          />
          <div style={{ display: 'flex', gap: 8, justifyContent: 'flex-end', marginTop: 16 }}>
            <button
              className="btn"
              type="button"
              onClick={() => setStep('upload')}
              disabled={saving}
            >
              다시 선택
            </button>
            <button
              className="btn primary"
              type="button"
              onClick={saveRows}
              disabled={saving || included === 0}
            >
              {saving ? '저장 중...' : `${included}건 저장`}
            </button>
          </div>
        </>
      )}
    </ModalFrame>
  );
}
