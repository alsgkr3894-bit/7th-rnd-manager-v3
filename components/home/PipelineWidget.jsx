'use client';
import { Icon } from '@/components/icons';
import { asDisplayText, asObjectArray, asStringArray, clampInteger } from '@/lib/ui/prop-guards';

const COL_CLASS = { idea: 's1', testing: 's2', reporting: 's3', released: 's4' };

/**
 * 신메뉴 파이프라인 — 4단계 미니 칸반 + 분기 출시 목표 진행바.
 *
 * @param {{ data: { columns, quarterGoal } | null, router }} props
 */
export function PipelineWidget({ data, router }) {
  if (!data) return null;
  const columns = asObjectArray(data.columns).map(col => ({
    ...col,
    key: asDisplayText(col.key),
    label: asDisplayText(col.label),
    count: clampInteger(col.count, { min: 0, fallback: 0 }),
    more: clampInteger(col.more, { min: 0, fallback: 0 }),
    dotColor: asDisplayText(col.dotColor, 'var(--border)'),
    items: asStringArray(col.items),
  }));
  const quarterGoal =
    data.quarterGoal && typeof data.quarterGoal === 'object' ? data.quarterGoal : {};
  const done = Number(quarterGoal.done);
  const target = Number(quarterGoal.target);
  const safeDone = Number.isFinite(done) ? Math.max(0, done) : 0;
  const safeTarget = Number.isFinite(target) ? Math.max(0, target) : 0;
  const pct = safeTarget > 0 ? Math.min(100, Math.round((safeDone / safeTarget) * 100)) : 0;
  const remain = Math.max(0, safeTarget - safeDone);

  return (
    <div className="card" style={{ display: 'flex', flexDirection: 'column' }}>
      <div className="card-header">
        <div>
          <div className="card-title">신메뉴 파이프라인</div>
          <div className="card-sub">단계별 진행 중인 개발 노트</div>
        </div>
        <button className="link accent" onClick={() => router?.push?.('/note')}>
          노트 <Icon.chevRight />
        </button>
      </div>

      <div className="pipeline">
        {columns.map((col, index) => (
          <div key={col.key || index} className={`pipe-col ${COL_CLASS[col.key] || ''}`}>
            <div className="pipe-head">
              <span className="pipe-dot" style={{ background: col.dotColor }} />
              {col.label}
              <span className="pipe-n">{col.count}</span>
            </div>
            <div className="pipe-items">
              {col.items.map((name, i) => (
                <div key={i} className="pipe-item" title={name}>
                  {name}
                </div>
              ))}
              {col.more > 0 && <div className="pipe-more">외 {col.more}건</div>}
            </div>
          </div>
        ))}
      </div>

      <div className="mini-foot">
        <div className="mf-top">
          <span>이번 분기 신메뉴 출시 목표</span>
          <b>
            {safeDone} / {safeTarget}건
          </b>
        </div>
        <div className="mini-bar">
          <div
            style={{
              width: `${pct}%`,
              background: 'linear-gradient(90deg, var(--accent), #FF7A4D)',
            }}
          />
        </div>
        <div className="mf-sub">
          완료 {safeDone}건 · 목표까지 {remain}건 남음
        </div>
      </div>
    </div>
  );
}
