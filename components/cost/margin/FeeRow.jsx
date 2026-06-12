import { Icon } from '@/components/icons';

/** 플랫폼 수수료 단일 항목 행. PlatformSettingsModal에서 사용. */
export function FeeRow({ f, onPatch, onSizeOverride, onDelete }) {
  const isFixed = f.type === 'fixed';

  return (
    <div
      style={{
        borderRadius: 6,
        border: '1px solid var(--border)',
        overflow: 'hidden',
        marginBottom: 4,
      }}
    >
      {/* 메인 행 */}
      <div
        style={{
          display: 'flex',
          alignItems: 'center',
          gap: 6,
          padding: '8px 10px',
          background: 'var(--surface-1,var(--surface))',
        }}
      >
        {/* 항목명 */}
        <input
          className="form-input"
          value={f.label}
          onChange={e => onPatch({ label: e.target.value })}
          placeholder="항목명"
          style={{ flex: 1, minWidth: 0, fontSize: 13 }}
        />

        {/* 타입 세그먼트 */}
        <div
          style={{
            display: 'flex',
            border: '1px solid var(--border)',
            borderRadius: 5,
            overflow: 'hidden',
            flexShrink: 0,
          }}
        >
          {[
            ['pct', '%'],
            ['fixed', '원'],
          ].map(([t, lbl]) => (
            <button
              key={t}
              type="button"
              onClick={() => onPatch({ type: t })}
              style={{
                padding: '5px 10px',
                fontSize: 12,
                fontWeight: 600,
                border: 'none',
                cursor: 'pointer',
                background: f.type === t ? 'var(--accent)' : 'transparent',
                color: f.type === t ? '#fff' : 'var(--text-3)',
              }}
            >
              {lbl}
            </button>
          ))}
        </div>

        {/* % 타입: 인라인 값 */}
        {!isFixed && (
          <div style={{ display: 'flex', alignItems: 'center', gap: 3, flexShrink: 0 }}>
            <input
              className="form-input"
              type="number"
              min="0"
              max="100"
              step="0.1"
              value={f.value}
              onChange={e => onPatch({ value: e.target.value })}
              placeholder="0"
              style={{ width: 64, textAlign: 'right', fontSize: 13 }}
            />
            <span style={{ fontSize: 12, color: 'var(--text-3)' }}>%</span>
          </div>
        )}

        {/* 삭제 */}
        <button
          type="button"
          className="btn sm"
          onClick={onDelete}
          style={{ color: 'var(--text-4)', flexShrink: 0 }}
        >
          <Icon.trash style={{ width: 12, height: 12 }} />
        </button>
      </div>

      {/* 원 타입: 사이즈별 금액 */}
      {isFixed && (
        <div
          style={{
            display: 'flex',
            gap: 12,
            padding: '8px 10px 10px',
            background: 'var(--surface-2)',
            alignItems: 'center',
            flexWrap: 'wrap',
          }}
        >
          {[
            { key: 'value', label: '공통', hint: '기본값', isBase: true },
            { key: 'L', label: 'L', hint: '비우면 공통' },
            { key: 'R', label: 'R', hint: '비우면 공통' },
          ].map(({ key, label, isBase }) => (
            <div key={key} style={{ display: 'flex', alignItems: 'center', gap: 5 }}>
              <span
                style={{
                  fontSize: 12,
                  fontWeight: 700,
                  color: isBase ? 'var(--text-2)' : 'var(--text-3)',
                  minWidth: 20,
                }}
              >
                {label}
              </span>
              <input
                className="form-input"
                type="number"
                min="0"
                value={isBase ? f.value : (f.sizeOverrides?.[key] ?? '')}
                onChange={e =>
                  isBase ? onPatch({ value: e.target.value }) : onSizeOverride(key, e.target.value)
                }
                placeholder={isBase ? '0' : '공통'}
                style={{ width: 76, textAlign: 'right', fontSize: 13 }}
              />
              <span style={{ fontSize: 11, color: 'var(--text-4)' }}>원</span>
            </div>
          ))}
          <span style={{ fontSize: 11, color: 'var(--text-4)', marginLeft: 4 }}>
            L·R 비우면 공통 적용
          </span>
        </div>
      )}
    </div>
  );
}
