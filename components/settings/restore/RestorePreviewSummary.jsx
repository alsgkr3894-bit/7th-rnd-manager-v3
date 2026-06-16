'use client';
import { formatNumber } from '@/lib/format';

const FIELD_LABEL_STYLE = { fontSize: 12, color: 'var(--text-3)' };

export function RestorePreviewSummary({
  parsed,
  missingStores,
  unknownStores,
  backupTotalRows,
  backupAgeDays,
  source,
  sourceMismatch,
  targetBrand,
  storeSplit,
}) {
  return (
    <div className="card" style={{ marginTop: 16 }}>
      <h2 style={{ fontSize: 15, fontWeight: 700, marginBottom: 16 }}>2. 백업 파일 미리보기</h2>
      <div
        style={{
          display: 'flex',
          gap: 32,
          marginBottom: 16,
          padding: '8px 0',
          borderBottom: '1px solid var(--border)',
          flexWrap: 'wrap',
        }}
      >
        <div>
          <div style={FIELD_LABEL_STYLE}>파일</div>
          <div style={{ fontWeight: 600, fontSize: 13, fontFamily: 'monospace' }}>
            {parsed._fileName}
          </div>
        </div>
        <div>
          <div style={FIELD_LABEL_STYLE}>버전</div>
          <div style={{ fontWeight: 600, fontSize: 13 }}>{parsed.version || '미상'}</div>
        </div>
        {parsed.exportedAt && (
          <div>
            <div style={FIELD_LABEL_STYLE}>백업 시점</div>
            <div style={{ fontWeight: 600, fontSize: 13 }}>
              {new Date(parsed.exportedAt).toLocaleString('ko-KR')}
              {backupAgeDays !== null && backupAgeDays > 30 && (
                <span
                  style={{
                    marginLeft: 6,
                    fontSize: 11,
                    color: 'var(--warn)',
                    fontWeight: 700,
                  }}
                >
                  ({backupAgeDays}일 전)
                </span>
              )}
            </div>
          </div>
        )}
        <div>
          <div style={FIELD_LABEL_STYLE}>총 행</div>
          <div className="num" style={{ fontWeight: 700, fontSize: 18 }}>
            {formatNumber(backupTotalRows)}건
          </div>
        </div>
        <div>
          <div style={FIELD_LABEL_STYLE}>백업 브랜드</div>
          <div style={{ fontWeight: 600, fontSize: 13 }}>
            {source.hasSourceBrand
              ? `${source.sourceBrandName || source.sourceBrandId} (${source.sourceBrandId})`
              : '출처 정보 없음'}
          </div>
        </div>
        {targetBrand && (
          <div>
            <div style={FIELD_LABEL_STYLE}>복원 대상</div>
            <div style={{ fontWeight: 600, fontSize: 13 }}>
              {targetBrand.name} ({targetBrand.id})
            </div>
          </div>
        )}
      </div>

      {(!source.hasSourceBrand || sourceMismatch) && (
        <div
          style={{
            marginBottom: 10,
            padding: 12,
            background: 'var(--warn-soft)',
            border: '1px solid color-mix(in oklab, var(--warn) 30%, transparent)',
            borderRadius: 8,
            fontSize: 13,
            color: 'var(--text-1)',
            lineHeight: 1.6,
          }}
        >
          <b style={{ color: 'var(--warn)' }}>
            {sourceMismatch
              ? '백업 브랜드와 복원 대상 브랜드가 다릅니다.'
              : '백업 브랜드 출처를 확인할 수 없습니다.'}
          </b>{' '}
          {sourceMismatch
            ? `백업은 ${source.sourceBrandName || source.sourceBrandId}(${source.sourceBrandId}) 기준이고, 현재 복원 대상은 ${targetBrand?.name}(${targetBrand?.id})입니다.`
            : '이전 형식의 백업 파일일 수 있으니 현재 브랜드에 덮어써도 되는 파일인지 다시 확인하세요.'}
        </div>
      )}

      <div
        style={{
          marginBottom: 10,
          padding: '10px 12px',
          borderRadius: 8,
          background: 'var(--surface-2)',
          fontSize: 12,
          color: 'var(--text-2)',
          lineHeight: 1.5,
        }}
      >
        <b>복원 저장 위치:</b> 브랜드 데이터 store {formatNumber(storeSplit.brandScoped.length)}개는
        현재 선택 브랜드 DB에 들어가고, 개발노트/샘플/일정/작업일지 store{' '}
        {formatNumber(storeSplit.shared.length)}개는 공유 DB에 들어갑니다.
      </div>

      {missingStores.length > 0 && (
        <div
          style={{
            padding: 12,
            background: 'var(--warn-soft)',
            borderRadius: 8,
            fontSize: 13,
            color: 'var(--text-1)',
            lineHeight: 1.6,
          }}
        >
          <b style={{ color: 'var(--warn)' }}>일부 store가 현재 DB에 없습니다.</b>{' '}
          <span className="num" style={{ fontSize: 12 }}>
            {missingStores.slice(0, 5).join(', ')}
            {missingStores.length > 5 ? ` 외 ${missingStores.length - 5}개` : ''}
          </span>
          <br />
          전체 복원을 원하면 먼저 <b>시스템 설정 → 위험 영역 → &quot;DB 완전 재생성&quot;</b>을
          실행하세요.
        </div>
      )}
      {unknownStores.length > 0 && (
        <div
          style={{
            marginTop: 10,
            padding: 12,
            background: 'var(--surface-2)',
            borderRadius: 8,
            fontSize: 13,
            color: 'var(--text-1)',
            lineHeight: 1.6,
          }}
        >
          <b>알 수 없는 store는 복원에서 건너뜁니다.</b>{' '}
          <span className="num" style={FIELD_LABEL_STYLE}>
            {unknownStores.slice(0, 5).join(', ')}
            {unknownStores.length > 5 ? ` 외 ${unknownStores.length - 5}개` : ''}
          </span>
        </div>
      )}
    </div>
  );
}
