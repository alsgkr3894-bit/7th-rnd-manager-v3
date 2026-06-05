'use client';
import { Icon } from '@/components/icons';

const COL_CLASS = { idea: 's1', testing: 's2', reporting: 's3', released: 's4' };

/**
 * 신메뉴 파이프라인 — 4단계 미니 칸반 + 분기 출시 목표 진행바.
 *
 * @param {{ data: { columns, quarterGoal } | null, router }} props
 */
export function PipelineWidget({ data, router }) {
  if (!data) return null;
  const { columns, quarterGoal } = data;
  const pct = quarterGoal.target > 0
    ? Math.min(100, Math.round((quarterGoal.done / quarterGoal.target) * 100))
    : 0;
  const remain = Math.max(0, quarterGoal.target - quarterGoal.done);

  return (
    <div className="card" style={{ display: 'flex', flexDirection: 'column' }}>
      <div className="card-header">
        <div>
          <div className="card-title">신메뉴 파이프라인</div>
          <div className="card-sub">단계별 진행 중인 개발 노트</div>
        </div>
        <button className="link accent" onClick={() => router.push('/note')}>
          노트 <Icon.chevRight />
        </button>
      </div>

      <div className="pipeline">
        {columns.map(col => (
          <div key={col.key} className={`pipe-col ${COL_CLASS[col.key] || ''}`}>
            <div className="pipe-head">
              <span className="pipe-dot" style={{ background: col.dotColor }} />
              {col.label}
              <span className="pipe-n">{col.count}</span>
            </div>
            <div className="pipe-items">
              {col.items.map((name, i) => (
                <div key={i} className="pipe-item" title={name}>{name}</div>
              ))}
              {col.more > 0 && <div className="pipe-more">외 {col.more}건</div>}
            </div>
          </div>
        ))}
      </div>

      <div className="mini-foot">
        <div className="mf-top">
          <span>이번 분기 신메뉴 출시 목표</span>
          <b>{quarterGoal.done} / {quarterGoal.target}건</b>
        </div>
        <div className="mini-bar">
          <div style={{ width: `${pct}%`, background: 'linear-gradient(90deg, var(--accent), #FF7A4D)' }} />
        </div>
        <div className="mf-sub">완료 {quarterGoal.done}건 · 목표까지 {remain}건 남음</div>
      </div>
    </div>
  );
}
