'use client';

import { ComboBox } from '@/components/ui/ComboBox';
import { CategoryTags } from '@/components/menu-master/MenuCategoryTags';
import { FieldError, FieldLabel } from '@/components/menu-master/MenuMasterFieldPrimitives';
import { isPizzaCategory, isSetCategory } from '@/lib/menu-master/category-policy';
import {
  PIZZA_SUB_CATEGORY_OPTIONS,
  parseCategoryFromCode,
  parseMenuCode,
  updateMenuCodeSubCategory,
} from '@/lib/cost/menu-price';

function defaultSizesFor(category) {
  if (isPizzaCategory(category) || isSetCategory(category)) return ['L', 'R'];
  return ['단일'];
}

function applyMenuCodeMetadata(code, setField) {
  const parsed = parseCategoryFromCode(code);
  if (parsed.category) setField('category', parsed.category);
  if (parsed.subCategory) setField('subCategory', parsed.subCategory);
  const parsedCode = parseMenuCode(code);
  if (parsedCode?.size) setField('size', parsedCode.size);
}

function menuCodeSubCode(menuCode) {
  const parts = String(menuCode || '')
    .trim()
    .toUpperCase()
    .split('-');
  return parts[0] === 'P' ? parts[1] || '' : '';
}

export function MenuCodeField({ value, error, setField, setErrors, autoFocus }) {
  return (
    <div>
      <FieldLabel>메뉴코드</FieldLabel>
      <input
        className="input"
        value={value}
        onChange={e => {
          const code = e.target.value.toUpperCase();
          setField('menuCode', code);
          applyMenuCodeMetadata(code, setField);
          setErrors(prev => ({ ...prev, menuCode: undefined }));
        }}
        placeholder="예) P-OR-005-L"
        style={{ fontFamily: 'monospace' }}
        aria-describedby={error ? 'menu-master-code-error' : undefined}
        autoFocus={autoFocus}
      />
      <FieldError id="menu-master-code-error">{error}</FieldError>
      <div style={{ marginTop: 6 }}>
        <CategoryTags menuCode={value} />
      </div>
    </div>
  );
}

export function MenuNameField({ value, error, setField, setErrors, autoFocus }) {
  return (
    <div>
      <FieldLabel>메뉴명</FieldLabel>
      <input
        className="input"
        value={value}
        onChange={e => {
          setField('menuName', e.target.value);
          setErrors(prev => ({ ...prev, menuName: undefined }));
        }}
        placeholder="예) 슈퍼콤비네이션"
        aria-describedby={error ? 'menu-master-name-error' : undefined}
        autoFocus={autoFocus}
      />
      <FieldError id="menu-master-name-error">{error}</FieldError>
    </div>
  );
}

export function CategoryAndSizeFields({ form, presetCategories, setField }) {
  const sizeDefaults = defaultSizesFor(form.category);
  const sizeOptions =
    form.size && !sizeDefaults.includes(form.size) ? [...sizeDefaults, form.size] : sizeDefaults;
  const subCode = menuCodeSubCode(form.menuCode);
  const isEditablePizzaSub = subCode && subCode !== 'ONE';
  const hasPresetPizzaSub = PIZZA_SUB_CATEGORY_OPTIONS.some(option => option.code === subCode);

  function onCategoryChange(newCategory) {
    setField('category', newCategory);
    if (!form.size) {
      const newDefaults = defaultSizesFor(newCategory);
      if (newDefaults[0]) setField('size', newDefaults[0]);
    }
  }

  function onPizzaSubChange(newSubCode) {
    const nextCode = updateMenuCodeSubCategory(form.menuCode, newSubCode);
    setField('menuCode', nextCode);
    applyMenuCodeMetadata(nextCode, setField);
  }

  return (
    <div
      style={{
        display: 'grid',
        gridTemplateColumns: 'repeat(auto-fit, minmax(160px, 1fr))',
        gap: 12,
      }}
    >
      <div>
        <FieldLabel>카테고리</FieldLabel>
        {presetCategories.length > 0 ? (
          <select
            className="input"
            value={form.category}
            onChange={e => onCategoryChange(e.target.value)}
          >
            {presetCategories.map(category => (
              <option key={category} value={category}>
                {category}
              </option>
            ))}
          </select>
        ) : (
          <input
            className="input"
            value={form.category}
            onChange={e => onCategoryChange(e.target.value)}
            placeholder="예) 탕수육 / 짜장 / 세트"
          />
        )}
      </div>
      <div>
        <FieldLabel>중분류</FieldLabel>
        {isEditablePizzaSub ? (
          <select
            className="input"
            value={subCode}
            onChange={e => onPizzaSubChange(e.target.value)}
          >
            {!hasPresetPizzaSub && <option value={subCode}>{subCode} 직접 코드</option>}
            {PIZZA_SUB_CATEGORY_OPTIONS.map(option => (
              <option key={option.code} value={option.code}>
                {option.code} {option.label}
              </option>
            ))}
          </select>
        ) : (
          <input
            className="input"
            value={form.subCategory || ''}
            onChange={e => setField('subCategory', e.target.value)}
            placeholder="예) 프리미엄 스페셜"
          />
        )}
      </div>
      <div>
        <FieldLabel>규격(사이즈)</FieldLabel>
        <ComboBox
          value={form.size}
          onChange={v => setField('size', v)}
          options={sizeOptions}
          placeholder="L / R / 단일"
          inputClassName="input"
        />
      </div>
    </div>
  );
}
