'use client';

import { CategoryTags } from '@/components/menu-master/MenuCategoryTags';
import { MenuRecipeSection } from '@/components/menu-master/MenuRecipeSection';

export function MenuMasterEditFields({
  row,
  isNew,
  form,
  errors,
  setField,
  setErrors,
  defaultPrice,
  presetCategories,
  onRecipeSaved,
}) {
  return (
    <div style={{ display: 'flex', flexDirection: 'column', gap: 12 }}>
      <MenuCodeField
        row={row}
        isNew={isNew}
        value={form.menuCode}
        error={errors.menuCode}
        setField={setField}
        setErrors={setErrors}
      />

      <MenuNameField
        value={form.menuName}
        error={errors.menuName}
        setField={setField}
        setErrors={setErrors}
      />

      <CategoryAndSizeFields form={form} presetCategories={presetCategories} setField={setField} />

      <PriceField
        value={form.price}
        error={errors.price}
        defaultPrice={defaultPrice}
        setField={setField}
      />

      <StatusField value={form.status} setField={setField} />

      <NoteField value={form.note} setField={setField} />

      <OriginAllergenExcludeField value={form.excludeFromOrigin} setField={setField} />

      {!isNew && form.menuCode && form.category && (
        <div style={{ borderTop: '1px solid var(--divider)', paddingTop: 12 }}>
          <MenuRecipeSection
            menuCode={form.menuCode}
            menuName={form.menuName}
            category={form.category}
            size={form.size || '단일'}
            sellingPrice={form.price}
            onSaved={onRecipeSaved}
          />
        </div>
      )}
    </div>
  );
}

function FieldLabel({ children }) {
  return (
    <label style={{ fontSize: 12, color: 'var(--text-3)', display: 'block', marginBottom: 4 }}>
      {children}
    </label>
  );
}

function FieldError({ id, children }) {
  if (!children) return null;
  return (
    <div id={id} role="alert" style={{ fontSize: 11, color: 'var(--negative)', marginTop: 4 }}>
      {children}
    </div>
  );
}

function MenuCodeField({ row, isNew, value, error, setField, setErrors }) {
  return (
    <div>
      <FieldLabel>메뉴코드</FieldLabel>
      {isNew ? (
        <>
          <input
            className="input"
            value={value}
            onChange={e => {
              setField('menuCode', e.target.value.toUpperCase());
              setErrors(prev => ({ ...prev, menuCode: undefined }));
            }}
            placeholder="예) P-OR-005-L"
            style={{ fontFamily: 'monospace' }}
            aria-describedby={error ? 'menu-master-code-error' : undefined}
          />
          <FieldError id="menu-master-code-error">{error}</FieldError>
          <div style={{ marginTop: 6 }}>
            <CategoryTags menuCode={value} />
          </div>
        </>
      ) : (
        <div
          style={{
            padding: '8px 12px',
            background: 'var(--surface-2)',
            borderRadius: 8,
            display: 'flex',
            alignItems: 'center',
            gap: 10,
          }}
        >
          <span style={{ fontFamily: 'monospace', fontWeight: 700, color: 'var(--accent-text)' }}>
            {row.menuCode}
          </span>
          <CategoryTags menuCode={row.menuCode} />
        </div>
      )}
    </div>
  );
}

function MenuNameField({ value, error, setField, setErrors }) {
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
      />
      <FieldError id="menu-master-name-error">{error}</FieldError>
    </div>
  );
}

function CategoryAndSizeFields({ form, presetCategories, setField }) {
  return (
    <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: 12 }}>
      <div>
        <FieldLabel>카테고리</FieldLabel>
        {presetCategories.length > 0 ? (
          <select
            className="input"
            value={form.category}
            onChange={e => setField('category', e.target.value)}
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
            onChange={e => setField('category', e.target.value)}
            placeholder="예) 탕수육 / 짜장 / 세트"
          />
        )}
      </div>
      <div>
        <FieldLabel>규격(사이즈)</FieldLabel>
        <input
          className="input"
          value={form.size}
          onChange={e => setField('size', e.target.value)}
          placeholder="L / R / 단일"
        />
      </div>
    </div>
  );
}

function PriceField({ value, error, defaultPrice, setField }) {
  return (
    <div>
      <FieldLabel>
        판매가 (부가세 포함)
        {defaultPrice && (
          <span style={{ marginLeft: 8, color: 'var(--text-4)' }}>
            기본가 {defaultPrice.toLocaleString()}원
          </span>
        )}
      </FieldLabel>
      <div style={{ display: 'flex', gap: 8, alignItems: 'center' }}>
        <input
          className="input"
          type="number"
          min="0"
          value={value}
          aria-describedby={error ? 'menu-master-price-error' : undefined}
          onChange={e => setField('price', e.target.value)}
          placeholder={defaultPrice ? String(defaultPrice) : '직접 입력'}
          style={{ flex: 1 }}
        />
        <span style={{ fontSize: 13, color: 'var(--text-3)' }}>원</span>
        {defaultPrice && !value && (
          <button className="btn sm" onClick={() => setField('price', String(defaultPrice))}>
            기본가 적용
          </button>
        )}
      </div>
      {error && (
        <div
          id="menu-master-price-error"
          style={{ marginTop: 6, fontSize: 12, color: 'var(--danger)' }}
        >
          {error}
        </div>
      )}
    </div>
  );
}

function StatusField({ value, setField }) {
  return (
    <div>
      <FieldLabel>상태</FieldLabel>
      <select className="input" value={value} onChange={e => setField('status', e.target.value)}>
        <option value="active">활성</option>
        <option value="discontinued">단종</option>
        <option value="test">테스트</option>
      </select>
    </div>
  );
}

function NoteField({ value, setField }) {
  return (
    <div>
      <FieldLabel>비고</FieldLabel>
      <input
        className="input"
        value={value}
        onChange={e => setField('note', e.target.value)}
        placeholder="선택 입력"
      />
    </div>
  );
}

function OriginAllergenExcludeField({ value, setField }) {
  return (
    <div style={{ borderTop: '1px solid var(--divider)', paddingTop: 12 }}>
      <label
        style={{
          display: 'inline-flex',
          alignItems: 'center',
          gap: 8,
          cursor: 'pointer',
          fontSize: 13,
        }}
      >
        <input
          type="checkbox"
          checked={value}
          onChange={e => setField('excludeFromOrigin', e.target.checked)}
          style={{ accentColor: 'var(--warn)', width: 15, height: 15 }}
        />
        <span style={{ fontWeight: 600 }}>원산지·알레르기 출력에서 제외</span>
        <span style={{ fontSize: 11, color: 'var(--text-3)' }}>
          (패밀리박스·하프앤하프 등 공통 구성품이 겹치는 메뉴)
        </span>
      </label>
    </div>
  );
}
