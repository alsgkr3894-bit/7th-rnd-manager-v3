'use client';

import { useMemo } from 'react';
import { buildRecipeImpactPreview } from '@/lib/menu-master/recipe-impact-preview';

function listLabel(values, fallback) {
  const list = Array.isArray(values) ? values.filter(Boolean) : [];
  if (!list.length) return fallback;
  const shown = list.slice(0, 4).join(', ');
  return list.length > 4 ? `${shown} 외 ${list.length - 4}개` : shown;
}

function PreviewStat({ label, value, tone }) {
  return (
    <span
      style={{
        display: 'inline-flex',
        alignItems: 'center',
        gap: 4,
        fontSize: 11,
        color: tone === 'warn' ? 'var(--warn)' : 'var(--text-3)',
      }}
    >
      {label}
      <b style={{ color: tone === 'warn' ? 'var(--warn)' : 'var(--text-1)' }}>{value}</b>
    </span>
  );
}

export function MenuRecipeImpactPreview({ components, allIngredients }) {
  const preview = useMemo(
    () => buildRecipeImpactPreview(components, allIngredients),
    [allIngredients, components]
  );

  if (!preview.componentCount) return null;

  const hasMissing =
    preview.missingOriginNames.length > 0 ||
    preview.missingAllergenNames.length > 0 ||
    preview.unmatchedNames.length > 0;

  return (
    <div
      style={{
        border: '1px solid var(--divider)',
        borderRadius: 6,
        background: 'var(--surface-2)',
        padding: '8px 10px',
        margin: '8px 0',
      }}
    >
      <div
        style={{
          display: 'flex',
          alignItems: 'center',
          justifyContent: 'space-between',
          gap: 8,
          flexWrap: 'wrap',
          marginBottom: 6,
        }}
      >
        <div style={{ fontSize: 12, fontWeight: 700, color: 'var(--text-2)' }}>
          원산지/알레르기 영향 미리보기
        </div>
        <div style={{ display: 'flex', alignItems: 'center', gap: 8, flexWrap: 'wrap' }}>
          <PreviewStat label="구성품" value={`${preview.componentCount}개`} />
          <PreviewStat
            label="원산지"
            value={`${preview.originRegisteredCount}/${preview.componentCount}`}
            tone={preview.missingOriginNames.length ? 'warn' : 'default'}
          />
          <PreviewStat
            label="알레르기"
            value={`${preview.allergenRegisteredCount}/${preview.componentCount}`}
            tone={preview.missingAllergenNames.length ? 'warn' : 'default'}
          />
        </div>
      </div>

      <div style={{ display: 'grid', gap: 3, fontSize: 11, color: 'var(--text-3)' }}>
        <div>
          출력 원산지:{' '}
          {listLabel(preview.originOutputLabels, hasMissing ? '등록된 값 없음' : '누락 없음')}
        </div>
        <div>
          출력 알레르기:{' '}
          {listLabel(preview.allergenOutputLabels, hasMissing ? '등록된 값 없음' : '누락 없음')}
        </div>
        {preview.unmatchedNames.length > 0 && (
          <div style={{ color: 'var(--warn)' }}>
            식자재 연결 확인: {listLabel(preview.unmatchedNames, '')}
          </div>
        )}
        {preview.missingOriginNames.length > 0 && (
          <div style={{ color: 'var(--warn)' }}>
            원산지 누락: {listLabel(preview.missingOriginNames, '')}
          </div>
        )}
        {preview.missingAllergenNames.length > 0 && (
          <div style={{ color: 'var(--warn)' }}>
            알레르기 누락: {listLabel(preview.missingAllergenNames, '')}
          </div>
        )}
      </div>
    </div>
  );
}
