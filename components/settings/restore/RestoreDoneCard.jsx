'use client';
import { Icon } from '@/components/icons';
import { RestoreModuleChip } from './RestoreModuleChip';

const SHARED_SKIP_STORE = '__shared_skipped__';

/**
 * 복원 완료 결과 카드.
 *
 * @param {{ restoreDone: object, onReset: () => void }} props
 */
export function RestoreDoneCard({ restoreDone, onReset }) {
  const restoreMessages = Array.isArray(restoreDone.errors) ? restoreDone.errors : [];
  const infoMessages = restoreMessages.filter(item => item?.store === SHARED_SKIP_STORE);
  const errors = restoreMessages.filter(item => item?.store !== SHARED_SKIP_STORE);
  const hasErrors = errors.length > 0;
  const hasInfo = infoMessages.length > 0;
  const visibleErrors = errors.slice(0, 6);
  const hiddenErrorCount = Math.max(0, errors.length - visibleErrors.length);

  return (
    <div
      className="card"
      style={{
        marginTop: 24,
        padding: '18px 20px',
        background: hasErrors ? 'var(--warn-soft)' : 'var(--positive-soft)',
        border: `1px solid ${
          hasErrors
            ? 'color-mix(in oklab, var(--warn) 30%, transparent)'
            : 'color-mix(in oklab, var(--positive) 30%, transparent)'
        }`,
      }}
    >
      <div style={{ display: 'flex', gap: 12, alignItems: 'flex-start' }}>
        {hasErrors ? (
          <Icon.alert
            style={{
              width: 20,
              height: 20,
              flexShrink: 0,
              marginTop: 1,
              color: 'var(--warn)',
            }}
          />
        ) : (
          <Icon.check
            style={{
              width: 20,
              height: 20,
              flexShrink: 0,
              marginTop: 1,
              color: 'var(--positive)',
            }}
          />
        )}
        <div style={{ flex: 1 }}>
          <div style={{ fontWeight: 800, fontSize: 15 }}>
            {hasErrors ? '복원 완료 (확인 필요)' : '복원 완료'}
          </div>
          <div style={{ fontSize: 13, color: 'var(--text-2)', marginTop: 4 }}>
            {restoreDone.imported}개 store 복원됨
            {restoreDone.skipped > 0 && ` · ${restoreDone.skipped}개 건너뜀`}
            {hasErrors && ` · ${errors.length}개 확인 필요`}
            {!hasErrors && hasInfo && ` · 보호 skip ${infoMessages.length}개`}
          </div>
          <div style={{ marginTop: 6, display: 'flex', gap: 6, flexWrap: 'wrap' }}>
            {restoreDone.modules.map(k => (
              <RestoreModuleChip key={k} moduleKey={k} />
            ))}
          </div>
          {restoreDone.backupSkipped && (
            <div style={{ fontSize: 12, color: 'var(--warn)', fontWeight: 600, marginTop: 8 }}>
              ⚠ 자동 백업 없이 복원했습니다 (복원 직전 상태는 백업되지 않음).
            </div>
          )}
          {hasErrors && (
            <div
              style={{
                marginTop: 12,
                padding: '12px 14px',
                borderRadius: 8,
                background: 'color-mix(in oklab, var(--warn) 12%, var(--surface))',
                border: '1px solid color-mix(in oklab, var(--warn) 26%, transparent)',
              }}
            >
              <div style={{ fontSize: 13, fontWeight: 800, color: 'var(--warn)' }}>
                복원 실패 store
              </div>
              <div style={{ marginTop: 8, display: 'grid', gap: 6 }}>
                {visibleErrors.map((item, index) => (
                  <div
                    key={`${item.store || 'unknown'}-${index}`}
                    style={{
                      display: 'grid',
                      gridTemplateColumns: 'minmax(120px, 180px) 1fr',
                      gap: 8,
                      alignItems: 'start',
                      fontSize: 12,
                    }}
                  >
                    <code
                      style={{
                        fontFamily: 'monospace',
                        color: 'var(--warn)',
                        fontWeight: 800,
                        wordBreak: 'break-all',
                      }}
                    >
                      {item.store || 'unknown'}
                    </code>
                    <span style={{ color: 'var(--text-2)', wordBreak: 'break-word' }}>
                      {item.error || item.message || '알 수 없는 오류'}
                    </span>
                  </div>
                ))}
                {hiddenErrorCount > 0 && (
                  <div style={{ fontSize: 12, color: 'var(--text-3)' }}>
                    외 {hiddenErrorCount}개 store는 개발자 콘솔 경고에서 확인할 수 있습니다.
                  </div>
                )}
              </div>
              <div style={{ marginTop: 10, fontSize: 12, color: 'var(--text-1)', lineHeight: 1.5 }}>
                전체 복원이 필요하면 현재 상태를 백업한 뒤{' '}
                <b>시스템 설정 → 위험 영역 → DB 완전 재생성</b>을 실행하고 같은 백업 파일을 다시
                복원하세요.
              </div>
            </div>
          )}
          {!hasErrors && hasInfo && (
            <div
              style={{
                marginTop: 12,
                padding: '12px 14px',
                borderRadius: 8,
                background: 'color-mix(in oklab, var(--positive) 10%, var(--surface))',
                border: '1px solid color-mix(in oklab, var(--positive) 22%, transparent)',
              }}
            >
              <div style={{ fontSize: 13, fontWeight: 800, color: 'var(--positive)' }}>
                보호를 위해 건너뛴 항목
              </div>
              <div style={{ marginTop: 8, display: 'grid', gap: 6 }}>
                {infoMessages.map((item, index) => (
                  <div
                    key={`${item.store || 'shared'}-${index}`}
                    style={{
                      display: 'grid',
                      gridTemplateColumns: 'minmax(120px, 180px) 1fr',
                      gap: 8,
                      alignItems: 'start',
                      fontSize: 12,
                    }}
                  >
                    <code
                      style={{
                        fontFamily: 'monospace',
                        color: 'var(--positive)',
                        fontWeight: 800,
                        wordBreak: 'break-all',
                      }}
                    >
                      {item.store || 'shared'}
                    </code>
                    <span style={{ color: 'var(--text-2)', wordBreak: 'break-word' }}>
                      {item.error || item.message || '공유 store 보호로 복원을 건너뛰었습니다.'}
                    </span>
                  </div>
                ))}
              </div>
            </div>
          )}
          <div style={{ fontSize: 12, color: 'var(--text-3)', marginTop: 10 }}>
            변경된 데이터를 화면에 반영하려면 새로고침이 필요합니다.
          </div>
        </div>
      </div>
      <div style={{ display: 'flex', gap: 8, marginTop: 14, justifyContent: 'flex-end' }}>
        {hasErrors && (
          <button className="btn" onClick={() => (window.location.href = '/settings/system')}>
            시스템 설정
          </button>
        )}
        <button className="btn" onClick={onReset}>
          다른 파일 복원
        </button>
        <button className="btn primary" onClick={() => window.location.reload()}>
          새로고침
        </button>
      </div>
    </div>
  );
}
