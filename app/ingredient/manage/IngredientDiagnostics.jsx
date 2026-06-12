import { Icon } from '@/components/icons';
import { rowLabel } from './_duplicate-diagnostics';

export function IngredientDiagnostics({
  brokenRefs,
  productCodeDupes,
  duplicateGroupCount,
  duplicateDiagnostics,
  dedupeConfirm,
  dedupeBusy,
  onDedupeConfirm,
  onDedupeCancel,
  onRepairProductCodeDuplicates,
}) {
  return (
    <>
      {brokenRefs.length > 0 && (
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
          <div style={{ fontSize: 13 }}>
            <b>복합 식자재 참조 오류 {brokenRefs.length}건</b> —{' '}
            {brokenRefs
              .slice(0, 3)
              .map(row => row.ingredientName)
              .join(', ')}
            {brokenRefs.length > 3 && ` 외 ${brokenRefs.length - 3}개`}가 존재하지 않는 코드를
            compositeOf로 참조합니다.
          </div>
        </div>
      )}

      {productCodeDupes?.hasDuplicates && (
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
          <div style={{ fontSize: 13, display: 'grid', gap: 8, flex: 1 }}>
            <div>
              <b>제품코드 중복 {productCodeDupes.groupCount}그룹</b> — 대표 식자재 1건에
              태그·알레르기·비어 있는 필드를 병합하고 나머지 행을 정리할 수 있습니다.
            </div>
            <div style={{ display: 'flex', flexWrap: 'wrap', gap: 6 }}>
              {productCodeDupes.groups.slice(0, 4).map(group => (
                <span
                  key={group.key}
                  className="chip"
                  title={`병합 대상: ${group.removeNames.filter(Boolean).join(', ') || '-'}`}
                >
                  {group.productCode} · 대표 {group.keepName || group.keepId} · 병합{' '}
                  {group.removeIds.length}개 · 영양값 {group.hasNutritionValue ? '연결' : '없음'}
                </span>
              ))}
            </div>
            {dedupeConfirm && (
              <div style={{ display: 'flex', gap: 6, alignItems: 'center', flexWrap: 'wrap' }}>
                <span style={{ fontSize: 12, color: 'var(--negative)', fontWeight: 700 }}>
                  최신 대표행만 남기고 {productCodeDupes.duplicateRows}개 중복 행을 정리할까요?
                </span>
                <button
                  className="btn sm"
                  style={{ background: 'var(--negative)', color: '#fff', border: 0 }}
                  onClick={onRepairProductCodeDuplicates}
                  disabled={dedupeBusy}
                >
                  {dedupeBusy ? '정리 중…' : '정리'}
                </button>
                <button className="btn sm" onClick={onDedupeCancel}>
                  취소
                </button>
              </div>
            )}
          </div>
          {!dedupeConfirm && (
            <button className="btn sm" onClick={onDedupeConfirm}>
              제품코드 중복 정리
            </button>
          )}
        </div>
      )}

      {duplicateGroupCount > 0 && (
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
          <div style={{ fontSize: 13, display: 'grid', gap: 6 }}>
            <div>
              <b>중복 가능성 {duplicateGroupCount}그룹</b> — 제품코드·제때코드·표시명 기준으로
              확인이 필요합니다.
            </div>
            <div style={{ display: 'flex', flexWrap: 'wrap', gap: 6 }}>
              {duplicateDiagnostics.flatMap(check =>
                check.groups.slice(0, 3).map(group => (
                  <span
                    key={`${check.key}:${group.value}`}
                    className="chip"
                    title={group.rows.map(rowLabel).join(', ')}
                  >
                    {check.label} {group.value} · {group.rows.length}개
                  </span>
                ))
              )}
            </div>
          </div>
        </div>
      )}
    </>
  );
}
