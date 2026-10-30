/**
 * lib/price/price-events.js — 단가 변경 알림 허브
 *
 * 단가 파일이 업로드/삭제되거나 식자재 단가·상태가 바뀌면 원가 계산에 의존하는 모든 화면
 * (레시피·전체요약·마진·보고서)이 즉시 재조회해야 한다. 화면 전환 시 remount를 기다리지 않도록 이 허브를
 * 통해 통지한다. 같은 브라우저의 다른 탭(예: 식자재관리 탭에서 바꾸고 메뉴마스터 탭을 열어 둔 경우)에도
 * BroadcastChannel로 알린다 — 데이터는 같은 IndexedDB를 쓰므로 받은 쪽은 다시 읽기만 하면 된다.
 */

const CHANNEL_NAME = 'rnd-price-change';

/**
 * 허브를 만든다(테스트에서 채널 구현을 바꿔 끼울 수 있게 분리).
 * @param {(new (name: string) => { postMessage: Function, onmessage: any })|null} ChannelCtor
 */
export function createPriceEventHub(ChannelCtor = null) {
  const listeners = new Set();
  let channel = null;
  let channelTried = false;

  function notifyLocal() {
    for (const fn of listeners) {
      try {
        fn();
      } catch (err) {
        console.warn('[price-events] listener 오류:', err);
      }
    }
  }

  function ensureChannel() {
    if (channelTried) return channel;
    channelTried = true;
    if (typeof ChannelCtor !== 'function') return null;
    try {
      channel = new ChannelCtor(CHANNEL_NAME);
      // 다른 탭이 보낸 알림 — 이 탭 구독자에게만 전달하고 다시 방송하지 않는다(무한 반복 방지)
      channel.onmessage = notifyLocal;
    } catch {
      channel = null;
    }
    return channel;
  }

  return {
    /** 단가 변경 구독. 반환된 함수를 호출하면 구독 해제. */
    on(fn) {
      if (typeof fn !== 'function') return () => {};
      ensureChannel();
      listeners.add(fn);
      return () => listeners.delete(fn);
    },
    /** 단가 변경 통지 — 이 탭 구독자 + 다른 탭에 전파 (개별 실패는 격리). */
    emit() {
      notifyLocal();
      try {
        ensureChannel()?.postMessage('changed');
      } catch (err) {
        console.warn('[price-events] 다른 탭 알림 실패:', err);
      }
    },
  };
}

const defaultHub = createPriceEventHub(
  typeof window !== 'undefined' && typeof BroadcastChannel === 'function' ? BroadcastChannel : null
);

export const onPriceUpload = defaultHub.on;
export const emitPriceUpload = defaultHub.emit;

// 파일 업로드와 식자재 수동 단가·포장수량 수정 모두 같은 원가 재계산 신호를 쓴다.
export const onPriceChange = onPriceUpload;
export const emitPriceChange = emitPriceUpload;
