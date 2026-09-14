'use client';
import { Icon } from '@/components/icons';

/**
 * "단종/숨김 식자재를 아직 참조하는 레시피" 배너 — 대체 연결 없이 단종 처리됐거나
 * 이 기능이 생기기 전에 이미 단종됐던 식자재가 여전히 레시피/세트그룹/엣지에 남아
 * 있으면 원가·알레르기·원산지가 갱신되지 않은 채로 방치된다. 행마다 대체 연결
 * 버튼을 눌러 기존 SubstituteLinkModal 흐름으로 재연결할 수 있다.
 */
export function DiscontinuedRefsBanner({
  refs = [],
  loading = false,
  onLinkSubstitute,
  isViewer = false,
}) {
  if (loading || refs.length === 0) return null;
  const visible = refs.slice(0, 10);

  return (
    <div
      className="info-banner"
      style={{
        marginBottom: 8,
        background: 'var(--warn-soft)',
        borderColor: 'var(--warn-soft)',
      }}
    >
      <div className="info-banner-ico" style={{ background: 'var(--warn)', color: '#fff' }}>
        <Icon.alert style={{ width: 16, height: 16 }} />
      </div>
      <div style={{ fontSize: 13, flex: 1 }}>
        <b>단종/숨김 식자재를 아직 참조하는 레시피 {refs.length}건</b> — 재연결 없이 남아 있어
        원가·알레르기·원산지가 최신 식자재로 갱신되지 않고 있어요.
        <div style={{ display: 'grid', gap: 6, marginTop: 8 }}>
          {visible.map(ref => (
            <div
              key={ref.productCode}
              style={{
                display: 'flex',
                alignItems: 'center',
                gap: 8,
                fontSize: 12.5,
                color: 'var(--text-2)',
              }}
            >
              <span style={{ flex: 1, minWidth: 0 }}>
                <b>{ref.ingredientName || ref.productCode}</b>
                <span style={{ color: 'var(--text-3)' }}> ({ref.productCode})</span> — 레시피{' '}
                {ref.menuRecipeCount}개 · 세트/그룹 {ref.recipeGroupCount}개 · 엣지/도우{' '}
                {ref.edgeCount}개
                {ref.sampleMenuNames.length > 0 && (
                  <span style={{ color: 'var(--text-3)' }}>
                    {' '}
                    ({ref.sampleMenuNames.join(', ')}
                    {ref.totalCount > ref.sampleMenuNames.length ? ' 외' : ''})
                  </span>
                )}
              </span>
              {ref.replacedByProductCode && (
                <span style={{ fontSize: 11, color: 'var(--text-3)', whiteSpace: 'nowrap' }}>
                  → {ref.replacedByProductCode}로 대체됨(새 레시피에서 재참조)
                </span>
              )}
              <button
                className="btn sm"
                style={{ flexShrink: 0 }}
                onClick={() => onLinkSubstitute?.(ref)}
                disabled={isViewer}
              >
                대체 연결
              </button>
            </div>
          ))}
          {refs.length > visible.length && (
            <div style={{ fontSize: 11, color: 'var(--text-3)' }}>
              외 {refs.length - visible.length}건 더 있어요
            </div>
          )}
        </div>
      </div>
    </div>
  );
}
