export const DEFAULT_MODAL_FRAME_STYLE = {
  width: 'min(860px, 96vw)',
  zIndex: 200,
  padding: '22px 26px',
  maxHeight: '92vh',
};

export function normalizeModalStyleLength(value, fallback) {
  return typeof value === 'number' || typeof value === 'string' ? value : fallback;
}

export function normalizeModalFrameStyle({
  width = DEFAULT_MODAL_FRAME_STYLE.width,
  zIndex = DEFAULT_MODAL_FRAME_STYLE.zIndex,
  padding = DEFAULT_MODAL_FRAME_STYLE.padding,
  maxHeight = DEFAULT_MODAL_FRAME_STYLE.maxHeight,
} = {}) {
  return {
    width: normalizeModalStyleLength(width, DEFAULT_MODAL_FRAME_STYLE.width),
    zIndex: normalizeModalStyleLength(zIndex, DEFAULT_MODAL_FRAME_STYLE.zIndex),
    padding: normalizeModalStyleLength(padding, DEFAULT_MODAL_FRAME_STYLE.padding),
    maxHeight: normalizeModalStyleLength(maxHeight, DEFAULT_MODAL_FRAME_STYLE.maxHeight),
  };
}
