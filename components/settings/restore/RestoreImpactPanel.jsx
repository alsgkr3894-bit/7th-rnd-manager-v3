'use client';
import { formatNumber } from '@/lib/format';

const FIELD_LABEL_STYLE = { fontSize: 12, color: 'var(--text-3)' };

function SummaryPill({ label, value, tone = 'neutral' }) {
  const colors = {
    neutral: ['var(--surface-2)', 'var(--text-2)'],
    positive: ['var(--positive-soft)', 'var(--positive)'],
    warn: ['var(--warn-soft)', 'var(--warn)'],
    negative: ['var(--negative-soft)', 'var(--negative)'],
  };
  const [background, color] = colors[tone] || colors.neutral;
  return (
    <div
      style={{
        background,
        color,
        borderRadius: 8,
        padding: '8px 10px',
        minWidth: 110,
      }}
    >
      <div style={{ fontSize: 11, fontWeight: 700, opacity: 0.78 }}>{label}</div>
      <div className="num" style={{ fontSize: 16, fontWeight: 800, marginTop: 2 }}>
        {value}
      </div>
    </div>
  );
}

export function RestoreImpactPanel({
  impact,
  dangerRows,
  wipeRows,
  unchangedSelectedStores = [],
}) {
  if (!impact || impact.rows.length === 0) return null;
  const increaseRows = impact.rows.filter(row => row.diff > 0);
  const unchangedRows = impact.rows.filter(row => row.diff === 0);
  const changedRows = impact.rows.filter(row => row.diff !== 0);

  return (
    <div className="card" style={{ marginTop: 16 }}>
      <div style={{ display: 'flex', alignItems: 'center', gap: 10, marginBottom: 4 }}>
        <h2 style={{ fontSize: 15, fontWeight: 700 }}>4. 예상 변경 사항</h2>
        {dangerRows.length > 0 && (
          <span
            style={{
              fontSize: 11,
              fontWeight: 700,
              padding: '2px 8px',
              borderRadius: 99,
              background: 'var(--negative-soft)',
              color: 'var(--negative)',
            }}
          >
            ⚠ 데이터 감소 {dangerRows.length}개
          </span>
        )}
      </div>
      <p style={{ fontSize: 13, color: 'var(--text-3)', marginBottom: 12 }}>
        선택한 모듈의 현재 상태와 백업 시점 비교
      </p>

      <div style={{ display: 'flex', gap: 8, flexWrap: 'wrap', marginBottom: 12 }}>
        <SummaryPill label="복원 store" value={`${formatNumber(impact.storeCount)}개`} />
        <SummaryPill
          label="변경"
          value={`${formatNumber(changedRows.length)}개`}
          tone={changedRows.length > 0 ? 'positive' : 'neutral'}
        />
        <SummaryPill
          label="증가"
          value={`${formatNumber(increaseRows.length)}개`}
          tone={increaseRows.length > 0 ? 'positive' : 'neutral'}
        />
        <SummaryPill
          label="감소"
          value={`${formatNumber(dangerRows.length)}개`}
          tone={dangerRows.length > 0 ? 'warn' : 'neutral'}
        />
        <SummaryPill
          label="전체 삭제"
          value={`${formatNumber(wipeRows.length)}개`}
          tone={wipeRows.length > 0 ? 'negative' : 'neutral'}
        />
        <SummaryPill
          label="유지"
          value={`${formatNumber(unchangedRows.length + unchangedSelectedStores.length)}개`}
        />
      </div>

      <div
        style={{
          display: 'flex',
          gap: 24,
          padding: '8px 0',
          borderBottom: '1px solid var(--border)',
          marginBottom: 8,
        }}
      >
        <div>
          <div style={FIELD_LABEL_STYLE}>현재</div>
          <div className="num" style={{ fontWeight: 700, fontSize: 18 }}>
            {formatNumber(impact.totalNow)}건
          </div>
        </div>
        <div style={{ color: 'var(--text-4)', alignSelf: 'center', fontSize: 18 }}>→</div>
        <div>
          <div style={FIELD_LABEL_STYLE}>복원 후</div>
          <div className="num" style={{ fontWeight: 700, fontSize: 18 }}>
            {formatNumber(impact.totalAfter)}건
          </div>
        </div>
        <div>
          <div style={FIELD_LABEL_STYLE}>변동</div>
          <div
            className="num"
            style={{
              fontWeight: 700,
              fontSize: 18,
              color:
                impact.totalAfter > impact.totalNow
                  ? 'var(--accent-text)'
                  : impact.totalAfter < impact.totalNow
                    ? 'var(--negative)'
                    : 'var(--text-3)',
            }}
          >
            {impact.totalAfter - impact.totalNow > 0 ? '+' : ''}
            {formatNumber(impact.totalAfter - impact.totalNow)}건
          </div>
        </div>
      </div>

      <div style={{ maxHeight: 240, overflowY: 'auto' }}>
        <table className="data-table" style={{ width: '100%' }}>
          <thead>
            <tr>
              <th>store</th>
              <th style={{ textAlign: 'right', width: 90 }}>현재</th>
              <th style={{ textAlign: 'right', width: 90 }}>복원 후</th>
              <th style={{ textAlign: 'right', width: 90 }}>변동</th>
            </tr>
          </thead>
          <tbody>
            {impact.rows.map(row => {
              const isWipe = row.now > 0 && row.after === 0;
              const isDanger = row.now > 0 && row.after < row.now;
              return (
                <tr
                  key={row.name}
                  style={{
                    background: isWipe
                      ? 'color-mix(in oklab, var(--negative) 8%, transparent)'
                      : isDanger
                        ? 'color-mix(in oklab, var(--warn) 6%, transparent)'
                        : undefined,
                  }}
                >
                  <td style={{ display: 'flex', alignItems: 'center', gap: 6 }}>
                    {isWipe && (
                      <span
                        title="현재 데이터 전체 삭제"
                        style={{ color: 'var(--negative)', fontSize: 12, fontWeight: 700 }}
                      >
                        ⊗
                      </span>
                    )}
                    {!isWipe && isDanger && (
                      <span
                        title="현재보다 데이터 감소"
                        style={{ color: 'var(--warn)', fontSize: 12 }}
                      >
                        ↓
                      </span>
                    )}
                    <span
                      className="num"
                      style={{
                        fontSize: 12,
                        color: isWipe
                          ? 'var(--negative)'
                          : isDanger
                            ? 'var(--warn)'
                            : 'var(--text-3)',
                      }}
                    >
                      {row.name}
                    </span>
                  </td>
                  <td className="num" style={{ textAlign: 'right' }}>
                    {formatNumber(row.now)}
                  </td>
                  <td
                    className="num"
                    style={{
                      textAlign: 'right',
                      fontWeight: isWipe || isDanger ? 700 : undefined,
                    }}
                  >
                    {formatNumber(row.after)}
                  </td>
                  <td
                    className="num"
                    style={{
                      textAlign: 'right',
                      color:
                        row.diff > 0
                          ? 'var(--accent-text)'
                          : row.diff < 0
                            ? 'var(--negative)'
                            : 'var(--text-4)',
                    }}
                  >
                    {row.diff > 0 ? '+' : ''}
                    {formatNumber(row.diff)}
                  </td>
                </tr>
              );
            })}
          </tbody>
        </table>
      </div>

      {dangerRows.length > 0 && (
        <div
          style={{
            marginTop: 10,
            padding: '10px 14px',
            borderRadius: 8,
            background: wipeRows.length > 0 ? 'var(--negative-soft)' : 'var(--warn-soft)',
            fontSize: 13,
            lineHeight: 1.6,
            color: wipeRows.length > 0 ? 'var(--negative)' : 'var(--warn)',
          }}
        >
          {wipeRows.length > 0 && (
            <>
              <b>⊗ 전체 삭제 {wipeRows.length}개:</b>{' '}
              <span style={{ fontFamily: 'monospace', fontSize: 12 }}>
                {wipeRows.map(row => row.name).join(', ')}
              </span>
              <br />
            </>
          )}
          {dangerRows.length > wipeRows.length && (
            <>
              <b>↓ 데이터 감소 {dangerRows.length - wipeRows.length}개:</b>{' '}
              <span style={{ fontFamily: 'monospace', fontSize: 12 }}>
                {dangerRows
                  .filter(row => row.after > 0)
                  .map(row => row.name)
                  .join(', ')}
              </span>
            </>
          )}
        </div>
      )}
      {unchangedSelectedStores.length > 0 && (
        <div
          style={{
            marginTop: 10,
            padding: '10px 14px',
            borderRadius: 8,
            background: 'var(--surface-2)',
            fontSize: 13,
            lineHeight: 1.6,
            color: 'var(--text-2)',
          }}
        >
          <b>백업 파일에 없는 선택 store는 현재 데이터를 유지합니다.</b>{' '}
          <span style={{ fontFamily: 'monospace', fontSize: 12, color: 'var(--text-3)' }}>
            {unchangedSelectedStores.slice(0, 8).join(', ')}
            {unchangedSelectedStores.length > 8
              ? ` 외 ${unchangedSelectedStores.length - 8}개`
              : ''}
          </span>
        </div>
      )}
    </div>
  );
}
