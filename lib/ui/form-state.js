/**
 * 객체 상태용 단일 필드 패처 팩토리.
 * setState(객체)에 대해 `upd('key', value)` 형태의 갱신 함수를 만든다.
 *
 * @example
 *   const [opts, setOpts] = useState({...});
 *   const upd = makeFieldUpdater(setOpts);
 *   upd('showChart', true);  // setOpts(prev => ({ ...prev, showChart: true }))
 */
export function normalizeFieldKey(key) {
  if (typeof key === 'string' || typeof key === 'number' || typeof key === 'symbol') return key;
  return null;
}

export function normalizeObjectState(value) {
  return value && typeof value === 'object' && !Array.isArray(value) ? value : {};
}

export function makeFieldUpdater(setState) {
  const update = typeof setState === 'function' ? setState : null;
  return (key, value) => {
    const safeKey = normalizeFieldKey(key);
    if (!update || safeKey == null) return;
    update(prev => ({ ...normalizeObjectState(prev), [safeKey]: value }));
  };
}
