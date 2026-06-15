'use client';

import { CategoryTags } from '@/components/menu-master/MenuCategoryTags';
import { FieldError, FieldLabel } from '@/components/menu-master/MenuMasterFieldPrimitives';

export function MenuCodeField({ row, isNew, value, error, setField, setErrors }) {
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

export function MenuNameField({ value, error, setField, setErrors }) {
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

export function CategoryAndSizeFields({ form, presetCategories, setField }) {
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
