/**
 * 객체 상태용 단일 필드 패처 팩토리.
 * setState(객체)에 대해 `upd('key', value)` 형태의 갱신 함수를 만든다.
 *
 * @example
 *   const [opts, setOpts] = useState({...});
 *   const upd = makeFieldUpdater(setOpts);
 *   upd('showChart', true);  // setOpts(prev => ({ ...prev, showChart: true }))
 */
export function makeFieldUpdater(setState) {
  return (key, value) => setState(prev => ({ ...prev, [key]: value }));
}
