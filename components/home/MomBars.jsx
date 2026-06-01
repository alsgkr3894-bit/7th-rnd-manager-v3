'use client';

/**
 * 월 비교 미니 막대 — 최근 N개월 판매량. 마지막(이번 달) 막대만 accent 강조.
 *
 * @param {{ series:number[], labels:string[] }} props
 */
export function MomBars({ series = [], labels = [] }) {
  if (!series.length || series.every(v => !v)) return null;
  const max = Math.max(...series, 1);

  return (
    <div className="mom" aria-hidden="true">
      {series.map((v, i) => {
        const last = i === series.length - 1;
        const h = Math.max(4, Math.round((v / max) * 100));
        return (
          <div key={i} className="mom-col">
            <div className={`mom-bar ${last ? 'cur' : 'prev'}`} style={{ height: `${h}%` }} />
            <div className="mom-label">{labels[i] ?? ''}</div>
          </div>
        );
      })}
    </div>
  );
}
