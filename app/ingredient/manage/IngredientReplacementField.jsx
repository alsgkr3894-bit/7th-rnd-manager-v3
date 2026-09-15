'use client';
import { useMemo, useState } from 'react';
import { ComboBox } from '@/components/ui/ComboBox';
import {
  buildSubstituteOptions,
  findSubstituteByLabel,
  substituteOptionLabel,
  substituteRowLabel,
} from '@/lib/ingredient/substitute-options';
import { Field } from './IngredientFieldPrimitives';

/**
 * 단종 체크 시 나타나는 "대체 식자재" 필드 — 선택하면 저장 후 이 식자재를 쓰던
 * 레시피·세트/그룹·엣지·도우가 자동으로 재연결된다(replaceIngredientProductCode).
 * 비워두면 단종 처리만 하고 재연결은 하지 않는다.
 */
export function IngredientReplacementField({
  form,
  errors,
  sourceProductCode,
  candidates = [],
  preview,
  previewLoading,
  previewError,
  onSet,
}) {
  const [query, setQuery] = useState(form.replacementIngredientName || '');
  const options = useMemo(
    () => buildSubstituteOptions(candidates, sourceProductCode),
    [candidates, sourceProductCode]
  );
  const optionLabels = useMemo(() => options.map(substituteOptionLabel).filter(Boolean), [options]);

  function handleChange(value) {
    setQuery(value);
    const picked = findSubstituteByLabel(options, value);
    // 입력이 후보와 정확히 일치하지 않으면(타이핑 중 or 오타) 무조건 선택을 비운다.
    // ComboBox는 blur 시 입력값을 유효한 옵션으로 되돌리지 않으므로, "빈 문자열일 때만
    // 지우기"로 두면 예전에 고른 대체 식자재가 화면 텍스트와 다르게 그대로 저장에 실려간다
    // — 사용자가 의도하지 않은 식자재로 레시피가 재연결되는 사고로 이어진다.
    onSet('replacementProductCode', picked ? picked.productCode || '' : '');
    onSet('replacementIngredientName', picked ? substituteRowLabel(picked) : '');
  }

  const hasTarget = !!form.replacementProductCode;

  return (
    <Field
      label="대체 식자재"
      hint="선택하면 저장 후 이 식자재를 쓰던 레시피·세트/그룹·엣지/도우가 자동으로 재연결됩니다 (비워두면 단종 처리만 합니다)"
      error={errors.replacementProductCode}
      errorId="replacementProductCode-error"
    >
      {options.length > 0 ? (
        <ComboBox
          value={query}
          onChange={handleChange}
          options={optionLabels}
          inputClassName="form-input"
          placeholder="식자재명 또는 제품코드 검색"
          maxItems={8}
          style={{ width: '100%' }}
        />
      ) : (
        <div style={{ fontSize: 12, color: 'var(--text-3)' }}>
          연결할 수 있는 다른 식자재가 없습니다.
        </div>
      )}

      {hasTarget && (
        <div
          style={{
            marginTop: 8,
            padding: '8px 10px',
            borderRadius: 8,
            background: 'var(--warn-soft)',
            color: 'var(--text-2)',
            fontSize: 12,
            lineHeight: 1.6,
          }}
        >
          {previewLoading
            ? '영향 범위 확인 중…'
            : previewError
              ? `영향 범위를 확인하지 못했습니다: ${previewError}`
              : preview
                ? `저장하면 레시피 ${preview.menuRecipeCount}개 · 세트/그룹 ${preview.recipeGroupCount}개 · 엣지/도우 ${preview.edgeCount}개가 자동으로 재연결됩니다.`
                : null}
        </div>
      )}
    </Field>
  );
}
