'use client';
import { useState, useEffect, useCallback, useRef } from 'react';
import { ModalFrame } from '@/components/ui/ModalFrame';
import { Icon } from '@/components/icons';
import { formatDate, formatRelative, formatPercent } from '@/lib/format';
import { getAllSnapshots, deleteSnapshot } from '@/lib/cost/margin/snapshots';

/**
 * 원가 마진 추이 스냅샷 목록 모달.
 * props: onClose
 */
export function MarginTrendModal({ onClose }) {
  const [snapshots, setSnapshots] = useState([]);
  const [loading, setLoading] = useState(true);
  const [deleting, setDeleting] = useState(null); // id being deleted
  const mountedRef = useRef(true);

  const load = useCallback(async () => {
    if (!mountedRef.current) return;
    setLoading(true);
    try {
      const data = await getAllSnapshots();
      if (mountedRef.current) setSnapshots(data);
    } catch (e) {
      if (mountedRef.current) console.error('[MarginTrendModal] 로드 실패', e);
    } finally {
      if (mountedRef.current) setLoading(false);
    }
  }, []);

  useEffect(() => {
    mountedRef.current = true;
    load();
    return () => {
      mountedRef.current = false;
    };
  }, [load]);

  async function handleDelete(id) {
    if (deleting != null) return;
    setDeleting(id);
    try {
      await deleteSnapshot(id);
      setSnapshots(prev => prev.filter(s => s.id !== id));
    } catch (e) {
      console.error('[MarginTrendModal] 삭제 실패', e);
    } finally {
      setDeleting(null);
    }
  }

  // Bar width — avgCostRate 0~100 기준
  function barWidth(rate) {
    if (rate == null || isNaN(rate)) return 0;
    return Math.min(100, Math.max(0, rate));
  }

  // Bar color — 원가율 기준
  function barColor(rate) {
    if (rate == null) return 'var(--text-3)';
    if (rate <= 30) return 'var(--positive)';
    if (rate <= 40) return 'var(--accent)';
    return 'var(--negative)';
  }

  return (
    <ModalFrame
      title="원가 마진 추이"
      subtitle="저장된 스냅샷을 시간순으로 표시합니다"
      onClose={onClose}
      width="min(720px, 96vw)"
    >
      {loading ? (
        <div style={{ padding: '24px 0' }}>
          {[1, 2, 3].map(i => (
            <div
              key={i}
              className="skeleton"
              style={{ height: 56, borderRadius: 8, marginBottom: 8 }}
            />
          ))}
        </div>
      ) : snapshots.length === 0 ? (
        <div className="empty-state">
          <div className="empty-icon-wrap">
            <Icon.chart style={{ width: 32, height: 32 }} />
          </div>
          <div style={{ fontWeight: 700, fontSize: 15 }}>저장된 스냅샷이 없어요</div>
          <div style={{ fontSize: 13, color: 'var(--text-3)' }}>
            마진표 화면에서 "추이 저장" 버튼을 눌러 현재 통계를 저장해보세요
          </div>
        </div>
      ) : (
        <div style={{ display: 'flex', flexDirection: 'column', gap: 8 }}>
          {snapshots.map(s => {
            const costRate = s.avgCostRate != null ? Number(s.avgCostRate) : null;
            const margin = s.avgMargin != null ? Number(s.avgMargin) : null;
            const bw = barWidth(costRate);
            const color = barColor(costRate);

            return (
              <div
                key={s.id}
                className="card"
                style={{ padding: '12px 16px', display: 'flex', flexDirection: 'column', gap: 6 }}
              >
                {/* Top row: label + date + delete */}
                <div style={{ display: 'flex', alignItems: 'center', gap: 8 }}>
                  <span
                    style={{
                      fontWeight: 600,
                      fontSize: 13,
                      flex: 1,
                      minWidth: 0,
                      overflow: 'hidden',
                      textOverflow: 'ellipsis',
                      whiteSpace: 'nowrap',
                    }}
                  >
                    {s.label || '(라벨 없음)'}
                  </span>
                  <span style={{ fontSize: 11, color: 'var(--text-3)', whiteSpace: 'nowrap' }}>
                    {formatDate(s.capturedAt)}
                  </span>
                  <span style={{ fontSize: 11, color: 'var(--text-3)', whiteSpace: 'nowrap' }}>
                    ({formatRelative(s.capturedAt)})
                  </span>
                  <button
                    className="btn"
                    style={{ padding: '3px 6px', flexShrink: 0 }}
                    onClick={() => handleDelete(s.id)}
                    disabled={deleting === s.id}
                    aria-label="스냅샷 삭제"
                  >
                    <Icon.trash style={{ width: 12, height: 12 }} />
                  </button>
                </div>

                {/* Stats row */}
                <div style={{ display: 'flex', gap: 16, fontSize: 12 }}>
                  <span>
                    <span style={{ color: 'var(--text-3)' }}>평균 원가율 </span>
                    <strong style={{ color }}>{formatPercent(costRate)}</strong>
                  </span>
                  <span>
                    <span style={{ color: 'var(--text-3)' }}>평균 마진율 </span>
                    <strong
                      style={{
                        color:
                          margin != null && margin >= 60 ? 'var(--positive)' : 'var(--negative)',
                      }}
                    >
                      {formatPercent(margin)}
                    </strong>
                  </span>
                  <span style={{ color: 'var(--text-3)' }}>
                    {s.menuCount != null ? `${s.menuCount}개 메뉴` : ''}
                    {s.source ? ` · ${s.source}` : ''}
                  </span>
                </div>

                {/* Inline bar — avgCostRate sparkline */}
                <div
                  style={{
                    height: 6,
                    borderRadius: 3,
                    background: 'var(--surface-2)',
                    overflow: 'hidden',
                  }}
                >
                  <div
                    style={{
                      height: '100%',
                      width: `${bw}%`,
                      background: color,
                      borderRadius: 3,
                      transition: 'width 0.4s ease',
                    }}
                  />
                </div>
              </div>
            );
          })}
        </div>
      )}

      {/* Legend */}
      {!loading && snapshots.length > 0 && (
        <div
          style={{
            marginTop: 12,
            fontSize: 11,
            color: 'var(--text-3)',
            display: 'flex',
            gap: 12,
            flexWrap: 'wrap',
          }}
        >
          <span>막대: 평균 원가율</span>
          <span style={{ color: 'var(--positive)' }}>● ≤30% 양호</span>
          <span style={{ color: 'var(--accent)' }}>● ≤40% 주의</span>
          <span style={{ color: 'var(--negative)' }}>● &gt;40% 위험</span>
        </div>
      )}
    </ModalFrame>
  );
}
