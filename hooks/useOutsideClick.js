import { useEffect } from 'react';

function toRefList(refs) {
  return Array.isArray(refs) ? refs : [refs];
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
      const target = event.target;
      const inside = refList.some(ref => {
        const node = ref?.current;
        return node && target && node.contains(target);
      });
      if (!inside) onOutside(event);
    }

    doc.addEventListener(eventName, handleEvent);
    return () => doc.removeEventListener(eventName, handleEvent);
  }, [enabled, eventName, onOutside, ownerDocument, refs]);
}
