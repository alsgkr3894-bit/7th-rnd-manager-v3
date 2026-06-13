import { useEffect } from 'react';

function toRefList(refs) {
  return Array.isArray(refs) ? refs : [refs];
}

export function isOutsideClickTarget(target, refs) {
  if (!target) return false;
  return !toRefList(refs).some(ref => {
    const node = ref?.current;
    return node && typeof node.contains === 'function' && node.contains(target);
  });
}

export function useOutsideClick({
  refs,
  enabled = true,
  onOutside,
  eventName = 'mousedown',
  ownerDocument,
}) {
  useEffect(() => {
    if (!enabled || typeof onOutside !== 'function') return undefined;
    const doc = ownerDocument || document;
    const refList = toRefList(refs);

    function handleEvent(event) {
      if (isOutsideClickTarget(event.target, refList)) onOutside(event);
    }

    doc.addEventListener(eventName, handleEvent);
    return () => doc.removeEventListener(eventName, handleEvent);
  }, [enabled, eventName, onOutside, ownerDocument, refs]);
}
