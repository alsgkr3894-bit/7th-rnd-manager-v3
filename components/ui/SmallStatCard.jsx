/**
 * 숫자 1개를 강조해서 보여주는 소형 통계 카드.
 * nutrition·cost 등 여러 페이지에서 공유한다.
 *
 * @param {string}  label
 * @param {number}  value
 * @param {string}  [unit='개']
 * @param {string}  [valueColor] - 조건부 색상 (CSS 변수 문자열)
 */
export function SmallStatCard({ label, value, unit = '개', valueColor }) {
  return (
    <div className="card" style={{ padding: '12px 20px', flex: 1 }}>
      <div style={{ fontSize: 12, color: 'var(--text-3)' }}>{label}</div>
      <div style={{ fontSize: 22, fontWeight: 700, marginTop: 2, color: valueColor }}>
        {value}
        <span style={{ fontSize: 13, color: 'var(--text-3)', marginLeft: 4 }}>{unit}</span>
      </div>
    </div>
  );
}
