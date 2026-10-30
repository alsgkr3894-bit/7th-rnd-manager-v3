// 자동완성 목록을 입력칸 기준으로 어디에 띄울지 계산하는 순수 함수 (FloatingSuggestionList에서 사용).

const GAP = 4;
const VIEWPORT_MARGIN = 8;
const MIN_HEIGHT = 80;

/**
 * @param {{ left: number, top: number, bottom: number, width: number }} anchorRect - getBoundingClientRect()
 * @param {{ width: number, height: number }} viewport
 * @param {{ maxHeight?: number, minBelow?: number }} [options]
 *   minBelow: 아래쪽 여유가 이 값보다 작고 위쪽이 더 넓을 때만 위로 띄운다
 * @returns {{ left: number, width: number, top?: number, bottom?: number, maxHeight: number, openUp: boolean }}
 */
export function floatingListPlacement(
  anchorRect,
  viewport,
  { maxHeight = 240, minBelow = 140 } = {}
) {
  const spaceBelow = viewport.height - anchorRect.bottom - GAP - VIEWPORT_MARGIN;
  const spaceAbove = anchorRect.top - GAP - VIEWPORT_MARGIN;
  const openUp = spaceBelow < Math.min(maxHeight, minBelow) && spaceAbove > spaceBelow;
  const room = openUp ? spaceAbove : spaceBelow;
  const height = Math.max(MIN_HEIGHT, Math.min(maxHeight, room));

  const width = Math.min(anchorRect.width, viewport.width - VIEWPORT_MARGIN * 2);
  const left = Math.max(
    VIEWPORT_MARGIN,
    Math.min(anchorRect.left, viewport.width - width - VIEWPORT_MARGIN)
  );

  return openUp
    ? {
        left,
        width,
        bottom: viewport.height - anchorRect.top + GAP,
        maxHeight: height,
        openUp: true,
      }
    : { left, width, top: anchorRect.bottom + GAP, maxHeight: height, openUp: false };
}

/** 렌더마다 재측정해도 값이 같으면 상태를 바꾸지 않기 위한 비교(소수점 흔들림은 무시). */
export function isSameFloatingPlacement(a, b) {
  if (!a || !b) return false;
  const near = (x, y) => Math.abs((x ?? 0) - (y ?? 0)) < 0.5;
  return (
    a.openUp === b.openUp &&
    near(a.left, b.left) &&
    near(a.width, b.width) &&
    near(a.top, b.top) &&
    near(a.bottom, b.bottom) &&
    near(a.maxHeight, b.maxHeight)
  );
}
