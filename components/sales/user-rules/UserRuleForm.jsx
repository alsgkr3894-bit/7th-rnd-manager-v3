'use client';

import { useEffect } from 'react';
import { ComboBox } from '@/components/ui/ComboBox';
import { CATEGORY_INPUT_OPTIONS as CATEGORY_OPTIONS } from '@/lib/sales';
import { asDisplayText } from '@/lib/ui/prop-guards';
import { inputStyle } from '../shared/SectionUtils';
import { INITIAL_USER_RULE_FORM } from './userRulesUtils';

const EMPTY_NAME_OPTIONS = { groupNames: [], detailNames: [], byCategory: {} };

export function UserRuleForm({
  form,
  setForm,
  onCancel,
  onSubmit,
  busy,
  submitLabel = '추가',
  nameOpts = EMPTY_NAME_OPTIONS,
  isMain = true,
}) {
  const safeForm = form && typeof form === 'object' ? form : INITIAL_USER_RULE_FORM;
  const safeNameOpts = nameOpts && typeof nameOpts === 'object' ? nameOpts : EMPTY_NAME_OPTIONS;
  const updateForm = typeof setForm === 'function' ? setForm : () => {};
  const handleCancel = typeof onCancel === 'function' ? onCancel : undefined;
  const handleSubmit = typeof onSubmit === 'function' ? onSubmit : undefined;
  const rawMenuName = asDisplayText(safeForm.rawMenuName);
  const category = asDisplayText(safeForm.category);
  const groupName = asDisplayText(safeForm.groupName);
  const detailName = asDisplayText(safeForm.detailName);

  useEffect(() => {
    if (isMain && !category && CATEGORY_OPTIONS.length > 0) {
      updateForm(current => ({
        ...(current && typeof current === 'object' ? current : INITIAL_USER_RULE_FORM),
        category: CATEGORY_OPTIONS[0],
      }));
    }
  }, [isMain]); // eslint-disable-line react-hooks/exhaustive-deps

  const catOpts = safeNameOpts.byCategory?.[category] || EMPTY_NAME_OPTIONS;

  return (
    <div
      style={{
        display: 'grid',
        gridTemplateColumns:
          'minmax(0,1.5fr) minmax(80px,140px) minmax(0,1fr) minmax(0,1fr) auto auto',
        gap: 8,
      }}
    >
      <input
        value={rawMenuName}
        onChange={event => updateForm({ ...safeForm, rawMenuName: event.target.value })}
        placeholder="패턴 (정규화 후)"
        style={inputStyle}
      />
      {isMain ? (
        <select
          value={category}
          onChange={event => updateForm({ ...safeForm, category: event.target.value })}
          style={inputStyle}
        >
          {CATEGORY_OPTIONS.map(option => (
            <option key={option} value={option}>
              {option}
            </option>
          ))}
        </select>
      ) : (
        <input
          value={category}
          onChange={event => updateForm({ ...safeForm, category: event.target.value })}
          placeholder="카테고리"
          style={inputStyle}
        />
      )}
      <ComboBox
        value={groupName}
        onChange={value => updateForm({ ...safeForm, groupName: value })}
        options={catOpts.groupNames}
        placeholder="중분류"
        inputStyle={inputStyle}
      />
      <ComboBox
        value={detailName}
        onChange={value => updateForm({ ...safeForm, detailName: value })}
        options={catOpts.detailNames}
        placeholder="상세 (선택)"
        inputStyle={inputStyle}
      />
      <button type="button" className="btn sm" onClick={handleCancel} disabled={busy}>
        취소
      </button>
      <button
        type="button"
        className="btn sm primary"
        onClick={handleSubmit}
        disabled={busy || !rawMenuName.trim() || !category || !groupName.trim()}
      >
        {busy ? '...' : submitLabel}
      </button>
    </div>
  );
}
