'use client';
import { useMemo } from 'react';

/**
 * NoteHeatmapWidget — 최근 16주간 노트 작성 현황을 GitHub식 히트맵으로 표시.
 * @param {{ notes: Array<{ createdAt?: string }> }} props
 */
export function NoteHeatmapWidget({ notes }) {
  const HEATMAP_WEEKS = 16;
  const HEATMAP_DAYS  = HEATMAP_WEEKS * 7; // 112

  const DAYS  = HEATMAP_DAYS;
  const WEEKS = HEATMAP_WEEKS;

  const today = new Date();
  today.setHours(0, 0, 0, 0);
  const todayTs = today.getTime(); // stable primitive for useMemo dep

  // 날짜별 count 집계
  const { countMap, total } = useMemo(() => {
    const map = {};
    notes.forEach(note => {
      const d = note.createdAt ? new Date(note.createdAt) : null;
      if (!d) return;
      d.setHours(0, 0, 0, 0);
      const diff = Math.floor((todayTs - d.getTime()) / 86400000);
      if (diff >= 0 && diff < DAYS) {
        map[diff] = (map[diff] || 0) + 1;
      }
    });
    return { countMap: map, total: Object.values(map).reduce((s, v) => s + v, 0) };
  }, [notes, todayTs, DAYS]);

  // 16주 x 7일 그리드: col 0 = 가장 오래된 주, col 15 = 이번 주
  // row 0 = 일요일, row 6 = 토요일
  const todayDow = today.getDay(); // 0=일 ~ 6=토

  function getCount(weekIdx, dowIdx) {
    // weekIdx 0 = 가장 오래된 주, 15 = 이번 주
    // dowIdx 0 = 일요일
    const daysAgo = (WEEKS - 1 - weekIdx) * 7 + (todayDow - dowIdx);
    if (daysAgo < 0 || daysAgo >= DAYS) return -1; // 범위 밖 (미래)
    return countMap[daysAgo] || 0;
  }

  function lvClass(count) {
    if (count < 0) return 'lv-none';
    if (count === 0) return 'lv0';
    if (count === 1) return 'lv1';
    if (count === 2) return 'lv2';
    if (count === 3) return 'lv3';
    return 'lv4';
  }

  // JSX 내부에서 useMemo 호출 불가 (Rules of Hooks) → 컴포넌트 본체에서 미리 계산
  const heatmapCells = useMemo(() =>
    Array.from({ length: WEEKS }, (_, wi) =>
      Array.from({ length: 7 }, (_, di) => {
        const c = getCount(wi, di);
        return (
          <div key={`${wi}-${di}`}
            className={`heatmap-cell ${lvClass(c)}`}
            title={c >= 0 ? `${c}개` : ''}
            style={{ gridColumn: wi + 1, gridRow: di + 1, background: c < 0 ? 'transparent' : undefined }}
          />
        );
      })
    )
  , [countMap, todayDow]); // eslint-disable-line react-hooks/exhaustive-deps

  return (
    <div className="card" style={{ padding: '16px 20px' }}>
      <div style={{ display:'flex', justifyContent:'space-between', alignItems:'center', marginBottom: 10 }}>
        <div style={{ fontWeight: 700, fontSize: 14, color: 'var(--text-1)' }}>노트 작성 현황</div>
        <div style={{ fontSize: 12, color: 'var(--text-3)' }}>16주간 {total}개</div>
      </div>
      <div className="heatmap-wrap">
        <div style={{display:'flex',flexDirection:'column',gap:3,marginRight:4,justifyContent:'space-around',height:89}}>
          {['일','','화','','목','','토'].map((d,i) => (
            <div key={i} style={{fontSize:9,color:'var(--text-4)',lineHeight:1,textAlign:'right',width:10}}>{d}</div>
          ))}
        </div>
        <div style={{
          flex:1,
          display: 'grid',
          gridTemplateColumns: `repeat(${WEEKS}, 1fr)`,
          gridTemplateRows: 'repeat(7, 11px)',
          gridAutoFlow: 'column',
          gap: 3,
        }}>
          {heatmapCells}
        </div>
      </div>
    </div>
  );
}
