import { useCallback, useEffect, useRef, useState } from 'react';
import { resizePhoto } from '@/lib/image/resize';

const IDLE = { done: 0, total: 0 };

/**
 * 여러 장의 사진 변환 — 진행 장수와 취소를 제공한다. 화면을 벗어나면 남은 변환을 취소한다.
 *
 *   const { progress, resize, cancel, reservedCount } = usePhotoResize();
 *   const { cancelled, left, settled } = await resize(files);
 */
export function usePhotoResize() {
  const [progress, setProgress] = useState(null);
  const controllersRef = useRef(new Set());
  const countRef = useRef(IDLE);
  // 아직 끝나지 않은 묶음의 장수 — 남은 자리를 계산할 때 뺀다
  const reservedRef = useRef(0);
  const leftRef = useRef(false);

  const publish = useCallback(next => {
    countRef.current = next;
    if (!leftRef.current) setProgress(next.total ? next : null);
  }, []);

  useEffect(() => {
    leftRef.current = false;
    const controllers = controllersRef.current;
    return () => {
      leftRef.current = true;
      controllers.forEach(controller => controller.abort());
    };
  }, []);

  const resize = useCallback(
    async files => {
      const controller = new AbortController();
      controllersRef.current.add(controller);
      reservedRef.current += files.length;
      publish({ ...countRef.current, total: countRef.current.total + files.length });
      const settled = await Promise.allSettled(
        files.map(file =>
          resizePhoto(file, { signal: controller.signal }).finally(() =>
            publish({ ...countRef.current, done: countRef.current.done + 1 })
          )
        )
      );
      controllersRef.current.delete(controller);
      reservedRef.current -= files.length;
      if (controllersRef.current.size === 0) publish(IDLE);
      return { cancelled: controller.signal.aborted, left: leftRef.current, settled };
    },
    [publish]
  );

  const cancel = useCallback(() => {
    controllersRef.current.forEach(controller => controller.abort());
  }, []);
  const reservedCount = useCallback(() => reservedRef.current, []);

  return { progress, resize, cancel, reservedCount };
}
