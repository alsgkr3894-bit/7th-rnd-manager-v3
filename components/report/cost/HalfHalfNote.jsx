import { buildHalfHalfNote } from '@/lib/cost/half-half';

/**
 * 원가 보고서 하프앤하프 행 아래 설명 — "오리지널 피자 중 최대·최소 원가를 반씩 합친 값"과
 * 사이즈별 근거(lib/cost/half-half.js). sizes는 { L: menu, R: menu } 형태이고, halfHalf가 붙은
 * 메뉴(buildCostReportData가 채움)만 문구에 들어간다.
 */
export function HalfHalfNote({ sizes }) {
  const note = buildHalfHalfNote(
    Object.fromEntries(
      Object.entries(sizes || {})
        .filter(([, menu]) => menu?.halfHalf)
        .map(([size, menu]) => [size, menu.halfHalf])
    )
  );
  if (!note) return null;
  return (
    <div
      className="cost-half-half-note"
      style={{
        fontSize: 10,
        fontWeight: 400,
        color: 'var(--text-3)',
        marginTop: 2,
        whiteSpace: 'normal',
      }}
    >
      {note}
    </div>
  );
}
