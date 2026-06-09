'use client';
import { useCallback, useMemo } from 'react';
import { asObjectArray } from '@/lib/ui/prop-guards';

const WEEKS = 16;
const DAYS = WEEKS * 7; // 112
const DOW_LABELS = ['일', '월', '화', '수', '목', '금', '토'];

/**
 * NoteHeatmapWidget — 최근 16주간 노트 작성 현황을 GitHub식 히트맵으로 표시.
 * 디자인: 카드 헤더 + 범례(적음~많음) + 요일 라벨 + 하단 통계(최다 요일·연속·주 평균).
 * @param {{ notes: Array<{ createdAt?: string }> }} props
 */
export function NoteHeatmapWidget({ notes }) {
  const today = new Date();
  today.setHours(0, 0, 0, 0);
  const todayTs = today.getTime();
  const todayDow = today.getDay(); // 0=일 ~ 6=토

  const { countMap, total, topDow, streak, weekAvg } = useMemo(() => {
    const map = {};
    asObjectArray(notes).forEach(note => {
      const d = note.createdAt ? new Date(note.createdAt) : null;
      if (!d) return;
      d.setHours(0, 0, 0, 0);
      const diff = Math.floor((todayTs - d.getTime()) / 86400000);
      if (diff >= 0 && diff < DAYS) map[diff] = (map[diff] || 0) + 1;
    });
    const tot = Object.values(map).reduce((s, v) => s + v, 0);

    // 요일별 합계 → 최다 작성 요일
    const dowTotals = Array(7).fill(0);
    for (const [diffStr, cnt] of Object.entries(map)) {
      const dow = (((todayDow - Number(diffStr)) % 7) + 7) % 7;
      dowTotals[dow] += cnt;
    }
    const maxDow = dowTotals.indexOf(Math.max(...dowTotals));
    const topDowLabel = tot > 0 ? `${DOW_LABELS[maxDow]}요일` : '–';

    // 연속 작성 (오늘부터 거슬러 1건 이상인 날의 연속 수)
    let st = 0;
    while (st < DAYS && (map[st] || 0) > 0) st++;

    return {
      countMap: map,
      total: tot,
      topDow: topDowLabel,
      streak: st,
      weekAvg: tot > 0 ? (tot / WEEKS).toFixed(1) : '0',
    };
  }, [notes, todayTs, todayDow]);

  function lvClass(count) {
    if (count <= 0) return 'lv0';
    if (count === 1) return 'lv1';
    if (count === 2) return 'lv2';
    if (count <= 4) return 'lv3';
    return 'lv4';
  }

  // weekIdx 0 = 가장 오래된 주, 15 = 이번 주 / dowIdx 0 = 일요일
  const getCount = useCallback(
    (weekIdx, dowIdx) => {
      const daysAgo = (WEEKS - 1 - weekIdx) * 7 + (todayDow - dowIdx);
      if (daysAgo < 0 || daysAgo >= DAYS) return -1; // 미래 (범위 밖)
      return countMap[daysAgo] || 0;
    },
    [countMap, todayDow]
  );

  const cells = useMemo(
    () =>
      Array.from({ length: WEEKS }, (_, wi) =>
        Array.from({ length: 7 }, (_, di) => {
          const c = getCount(wi, di);
          return (
            <div
              key={`${wi}-${di}`}
              className={`heatmap-cell ${c < 0 ? '' : lvClass(c)}`}
              title={c >= 0 ? `${c}건` : ''}
              style={{
                gridColumn: wi + 1,
                gridRow: di + 1,
                visibility: c < 0 ? 'hidden' : undefined,
              }}
            />
          );
        })
      ),
    [getCount]
  );

  return (
    <div className="card">
      <div className="card-header">
        <div>
          <div className="card-title">노트 작성 현황</div>
          <div className="card-sub">최근 16주 · 총 {total}건</div>
        </div>
        <div className="heatmap-legend">
          적음
          <span className="hl-cell heatmap-cell lv0" />
          <span className="hl-cell heatmap-cell lv1" />
          <span className="hl-cell heatmap-cell lv2" />
          <span className="hl-cell heatmap-cell lv3" />
          <span className="hl-cell heatmap-cell lv4" />
          많음
        </div>
      </div>

      <div className="heatmap-wrap">
        <div className="heatmap-dows">
          {['일', '', '화', '', '목', '', '토'].map((d, i) => (
            <div key={i}>{d}</div>
          ))}
        </div>
        <div className="heatmap-grid">{cells}</div>
      </div>

      <div className="heatmap-stats">
        <div>
          <div className="hs-l">최다 작성 요일</div>
          <div className="hs-v">{topDow}</div>
        </div>
        <div>
          <div className="hs-l">연속 작성</div>
          <div className="hs-v">
            {streak}일째{streak >= 3 ? ' 🔥' : ''}
          </div>
        </div>
        <div>
          <div className="hs-l">주 평균</div>
          <div className="hs-v">{weekAvg}건</div>
        </div>
      </div>
    </div>
  );
}
