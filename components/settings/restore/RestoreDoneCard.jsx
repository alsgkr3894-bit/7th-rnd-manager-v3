'use client';
import { Icon } from '@/components/icons';
import { MODULE_GROUPS } from '@/lib/db';

const chipStyle = active => ({
  display: 'inline-block',
  padding: '2px 10px',
  borderRadius: 99,
  fontSize: 12,
  fontWeight: 700,
  background: active ? 'var(--accent-soft)' : 'var(--surface-2)',
  color: active ? 'var(--accent-text)' : 'var(--text-3)',
});

/**
 * 복원 완료 결과 카드.
 *
 * @param {{ restoreDone: object, onReset: () => void }} props
 */
export function RestoreDoneCard({ restoreDone, onReset }) {
  return (
    <div
      className="card"
      style={{
        marginTop: 24,
        padding: '18px 20px',
        background:
          restoreDone.errors.length === 0 ? 'var(--positive-soft)' : 'var(--warn-soft)',
        border: `1px solid ${
          restoreDone.errors.length === 0
            ? 'color-mix(in oklab, var(--positive) 30%, transparent)'
            : 'color-mix(in oklab, var(--warn) 30%, transparent)'
        }`,
      }}
    >
      <div style={{ display: 'flex', gap: 12, alignItems: 'flex-start' }}>
        <Icon.check
          style={{
            width: 20,
            height: 20,
            flexShrink: 0,
            marginTop: 1,
            color: restoreDone.errors.length === 0 ? 'var(--positive)' : 'var(--warn)',
          }}
        />
        <div style={{ flex: 1 }}>
          <div style={{ fontWeight: 800, fontSize: 15 }}>
            {restoreDone.errors.length === 0 ? '복원 완료' : '복원 완료 (일부 실패)'}
          </div>
          <div style={{ fontSize: 13, color: 'var(--text-2)', marginTop: 4 }}>
            {restoreDone.imported}개 store 복원됨
            {restoreDone.skipped > 0 && ` · ${restoreDone.skipped}개 건너뜀`}
            {restoreDone.errors.length > 0 && ` · ${restoreDone.errors.length}개 실패`}
          </div>
          <div style={{ marginTop: 6, display: 'flex', gap: 6, flexWrap: 'wrap' }}>
            {restoreDone.modules.map(k => (
              <span key={k} style={chipStyle(true)}>
                {MODULE_GROUPS[k]?.label || k}
              </span>
            ))}
          </div>
          {restoreDone.backupSkipped && (
            <div style={{ fontSize: 12, color: 'var(--warn)', fontWeight: 600, marginTop: 8 }}>
              ⚠ 자동 백업 없이 복원했습니다 (복원 직전 상태는 백업되지 않음).
            </div>
          )}
          <div style={{ fontSize: 12, color: 'var(--text-3)', marginTop: 10 }}>
            변경된 데이터를 화면에 반영하려면 새로고침이 필요합니다.
          </div>
        </div>
      </div>
      <div style={{ display: 'flex', gap: 8, marginTop: 14, justifyContent: 'flex-end' }}>
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
