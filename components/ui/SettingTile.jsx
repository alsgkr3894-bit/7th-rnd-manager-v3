'use client';

/**
 * SettingTile — 설정 화면의 정보 표시 카드/타일.
 *
 * variant:
 *   - 'card' (기본): 흰 배경, 큰 카드. 페이지 상단 요약에 사용.
 *   - 'tile':        회색 배경, 작은 타일. 카드 내부 그리드에 사용.
 *
 * @param {string} label
 * @param {string|number} value
 * @param {string} [sub]   하단 보조 텍스트
 * @param {boolean} [num=false]   숫자 폰트 (num 클래스)
 * @param {boolean} [mono=false]  monospace 폰트 (IP/코드 표시용)
 * @param {'card'|'tile'} [variant='card']
 */
export function SettingTile({
  label,
  value,
  sub,
  num = false,
  mono = false,
  variant = 'card',
}) {
  const isTile = variant === 'tile';

  const wrapStyle = isTile
    ? {
        padding: '14px 16px',
        border: '1px solid var(--border)',
        borderRadius: 10,
        background: 'var(--surface-2)',
      }
    : { padding: '18px 22px' };

  const valueStyle = {
    fontSize: isTile ? 16 : 20,
    fontWeight: 700,
    marginBottom: 4,
    fontFamily: mono ? 'monospace' : undefined,
  };

  return (
    <div className={isTile ? '' : 'card'} style={wrapStyle}>
      <div style={{ fontSize: 12, color: 'var(--text-3)', marginBottom: 6 }}>{label}</div>
      <div className={num ? 'num' : ''} style={valueStyle}>{value}</div>
      {sub && (
        <div
          style={{
            fontSize: 11,
            color: 'var(--text-3)',
            overflow: 'hidden',
            textOverflow: 'ellipsis',
            whiteSpace: 'nowrap',
          }}
        >
          {sub}
        </div>
      )}
    </div>
  );
}
