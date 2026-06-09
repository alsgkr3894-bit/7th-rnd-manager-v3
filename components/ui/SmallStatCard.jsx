import {
  getSmallStatCardStyle,
  getSmallStatLabelStyle,
  getSmallStatUnitStyle,
  getSmallStatValueStyle,
  normalizeSmallStatLabel,
  normalizeSmallStatUnit,
  normalizeSmallStatValue,
} from '@/lib/ui/small-stat-card';

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
  const safeLabel = normalizeSmallStatLabel(label);
  const safeValue = normalizeSmallStatValue(value);
  const safeUnit = normalizeSmallStatUnit(unit);

  return (
    <div className="card" style={getSmallStatCardStyle()}>
      <div style={getSmallStatLabelStyle()}>{safeLabel}</div>
      <div style={getSmallStatValueStyle(valueColor)}>
        {safeValue}
        {safeUnit && <span style={getSmallStatUnitStyle()}>{safeUnit}</span>}
      </div>
    </div>
  );
}
