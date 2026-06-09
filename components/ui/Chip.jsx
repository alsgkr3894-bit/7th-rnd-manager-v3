'use client';
import {
  getChipBadgeStyle,
  getChipButtonStyle,
  normalizeChipActive,
  normalizeChipCount,
  normalizeChipDim,
  normalizeChipLabel,
  normalizeChipOnClick,
} from '@/lib/ui/chip';

/**
 * Chip — 필터/카테고리 토글 버튼
 *
 * @param {string}  label
 * @param {number}  [count]   - 우측 배지 (생략 시 미표시)
 * @param {boolean} active    - 활성 상태
 * @param {boolean} [dim]     - 비활성 강조 (multi-select에서 "전체" 활성 시 카테고리 dim 처리)
 * @param {string}  [color]   - 비활성 상태일 때 라벨 색상 (옵션)
 * @param {Function} onClick
 */
export function Chip({ label, count, active, dim, color, onClick }) {
  const text = normalizeChipLabel(label);
  const safeCount = normalizeChipCount(count);
  const isActive = normalizeChipActive(active);
  const isDim = normalizeChipDim(dim);
  const click = normalizeChipOnClick(onClick);

  return (
    <button
      onClick={click}
      className="chip"
      style={getChipButtonStyle({ active: isActive, dim: isDim, color })}
    >
      {text}
      {safeCount != null && (
        <span style={getChipBadgeStyle(isActive)}>{safeCount}</span>
      )}
    </button>
  );
}
