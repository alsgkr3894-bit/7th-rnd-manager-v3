'use client';
import { useEffect, useRef, useState } from 'react';
import { useRouter } from 'next/navigation';
import {
  PACKAGE_ITEMS,
  checkPeriodDataAvailability,
  applyAvailability,
  buildPackageItemHref,
  getMonthlyCloseTargetPeriod,
  saveCloseLog,
  getCloseLog,
  getCloseLogs,
  monthLabel,
  monthRangeLabel,
} from '@/lib/report/package-plan';

/**
 * MonthlyClosePackageModal — 월마감 패키지 생성 모달
 */
export function MonthlyClosePackageModal({ open, onClose }) {
  const router = useRouter();
  const now = new Date();
  const current = { year: now.getFullYear(), month: now.getMonth() + 1 };
  const [year, setYear] = useState(current.year);
  const [month, setMonth] = useState(current.month);
  const targetPeriod = getMonthlyCloseTargetPeriod({ year, month }) || current;
  const targetYear = targetPeriod.year;
  const targetMonth = targetPeriod.month;
  const [availability, setAvailability] = useState(null);
  const [loadingAvailability, setLoadingAvailability] = useState(false);
  const [selectedIds, setSelectedIds] = useState(PACKAGE_ITEMS.map(i => i.id));
  const [generating, setGenerating] = useState(false);
  const [done, setDone] = useState(false);
  const [existingLog, setExistingLog] = useState(null);
  const [recentLogs, setRecentLogs] = useState([]);
  const navTimerRef = useRef(null);

  useEffect(() => {
    return () => {
      if (navTimerRef.current) clearTimeout(navTimerRef.current);
    };
  }, []);

  useEffect(() => {
    if (!open) {
      setDone(false);
      setAvailability(null);
      return;
    }
    setLoadingAvailability(true);
    checkPeriodDataAvailability({ year: targetYear, month: targetMonth })
      .then(av => {
        setAvailability(av);
        setExistingLog(getCloseLog(targetYear, targetMonth));
      })
      .finally(() => setLoadingAvailability(false));
    setRecentLogs(getCloseLogs().slice(0, 5));
  }, [open, targetYear, targetMonth]);

  const items = availability ? applyAvailability(PACKAGE_ITEMS, availability) : PACKAGE_ITEMS;

  function toggle(id) {
    setSelectedIds(prev => (prev.includes(id) ? prev.filter(x => x !== id) : [...prev, id]));
  }

  async function handleGenerate() {
    const toGenerate = items.filter(i => selectedIds.includes(i.id));
    if (toGenerate.length === 0) return;

    setGenerating(true);
    try {
      // 순차적으로 각 화면 열기 (새 탭)
      // 브라우저 팝업 차단으로 첫 항목만 열리는 경우를 대비해 router.push로 마지막 항목으로 이동
      const navItem = toGenerate[toGenerate.length - 1];
      saveCloseLog(
        targetYear,
        targetMonth,
        toGenerate.map(i => i.id)
      );
      setDone(true);
      setExistingLog(getCloseLog(targetYear, targetMonth));

      navTimerRef.current = setTimeout(() => {
        router.push(buildPackageItemHref(navItem, { year: targetYear, month: targetMonth }));
        onClose?.();
      }, 800);
    } finally {
      setGenerating(false);
    }
  }

  if (!open) return null;

  const closeMonthLabel = `${year}년 ${month}월`;
  const targetMonthLabel = monthLabel({ year: targetYear, month: targetMonth });
  const targetRangeLabel = monthRangeLabel({ year: targetYear, month: targetMonth });
  const missingItems = items.filter(i => selectedIds.includes(i.id) && i.missing);

  return (
    <div
      style={{
        position: 'fixed',
        inset: 0,
        zIndex: 1000,
        background: 'rgba(0,0,0,0.4)',
        display: 'flex',
        alignItems: 'center',
        justifyContent: 'center',
        padding: 16,
      }}
      onClick={e => e.target === e.currentTarget && onClose?.()}
    >
      <div
        role="dialog"
        aria-modal="true"
        aria-labelledby="monthly-close-modal-title"
        style={{
          background: 'var(--surface)',
          borderRadius: 12,
          boxShadow: 'var(--shadow-lg)',
          width: '100%',
          maxWidth: 540,
          maxHeight: '90vh',
          overflowY: 'auto',
          display: 'flex',
          flexDirection: 'column',
        }}
      >
        {/* 헤더 */}
        <div
          style={{
            display: 'flex',
            alignItems: 'center',
            gap: 10,
            padding: '16px 20px',
            borderBottom: '1px solid var(--divider)',
          }}
        >
          <span style={{ fontSize: 20 }}>📦</span>
          <div style={{ flex: 1 }}>
            <div id="monthly-close-modal-title" style={{ fontWeight: 700, fontSize: 15 }}>
              월마감 패키지 생성
            </div>
            <div style={{ fontSize: 12, color: 'var(--text-3)' }}>
              선택 월의 전월 자료를 자동 집계합니다
            </div>
          </div>
          <button className="icon-btn" onClick={onClose} aria-label="닫기">
            ✕
          </button>
        </div>

        {/* 기준 월 선택 */}
        <div style={{ padding: '16px 20px', borderBottom: '1px solid var(--divider)' }}>
          <div style={{ fontSize: 12, fontWeight: 600, marginBottom: 8, color: 'var(--text-2)' }}>
            마감 실행 월
          </div>
          <div style={{ display: 'flex', gap: 8, alignItems: 'center' }}>
            <select
              value={year}
              onChange={e => setYear(Number(e.target.value))}
              style={{
                padding: '6px 10px',
                borderRadius: 6,
                border: '1px solid var(--divider)',
                background: 'var(--surface)',
                color: 'var(--text)',
                fontSize: 14,
              }}
            >
              {[current.year - 1, current.year, current.year + 1].map(y => (
                <option key={y} value={y}>
                  {y}년
                </option>
              ))}
            </select>
            <select
              value={month}
              onChange={e => setMonth(Number(e.target.value))}
              style={{
                padding: '6px 10px',
                borderRadius: 6,
                border: '1px solid var(--divider)',
                background: 'var(--surface)',
                color: 'var(--text)',
                fontSize: 14,
              }}
            >
              {Array.from({ length: 12 }, (_, i) => i + 1).map(m => (
                <option key={m} value={m}>
                  {m}월
                </option>
              ))}
            </select>
            <span style={{ fontSize: 13, color: 'var(--text-2)' }}>= {closeMonthLabel}</span>
          </div>
          <div
            style={{
              marginTop: 8,
              fontSize: 12,
              color: 'var(--text-2)',
              background: 'var(--surface-2)',
              border: '1px solid var(--divider)',
              borderRadius: 6,
              padding: '8px 10px',
            }}
          >
            집계 대상: <b>{targetMonthLabel}</b> ({targetRangeLabel}) 자동 합계
          </div>
          {existingLog && (
            <div style={{ marginTop: 8, fontSize: 12, color: 'var(--positive)' }}>
              ✅ 이미 {new Date(existingLog.completedAt).toLocaleDateString('ko-KR')}에 마감 처리됨
            </div>
          )}
        </div>

        {/* 항목 선택 */}
        <div style={{ padding: '16px 20px', flex: 1 }}>
          <div style={{ fontSize: 12, fontWeight: 600, marginBottom: 10, color: 'var(--text-2)' }}>
            생성할 항목 선택
          </div>
          {items.map(item => {
            const checked = selectedIds.includes(item.id);
            return (
              <label
                key={item.id}
                style={{
                  display: 'flex',
                  alignItems: 'center',
                  gap: 10,
                  padding: '8px 10px',
                  borderRadius: 6,
                  cursor: 'pointer',
                  marginBottom: 4,
                  background: checked ? 'var(--accent-soft)' : 'transparent',
                  opacity: item.missing && !checked ? 0.6 : 1,
                }}
              >
                <input
                  type="checkbox"
                  checked={checked}
                  onChange={() => toggle(item.id)}
                  style={{ width: 16, height: 16, accentColor: 'var(--accent)' }}
                />
                <span style={{ fontSize: 16, flexShrink: 0 }}>{item.icon}</span>
                <span style={{ fontSize: 13, flex: 1 }}>{item.label}</span>
                {item.missing && (
                  <span style={{ fontSize: 11, color: 'var(--warn)', fontWeight: 600 }}>
                    데이터 없음
                  </span>
                )}
                {!item.missing && availability && (
                  <span style={{ fontSize: 11, color: 'var(--positive)' }}>✓</span>
                )}
              </label>
            );
          })}

          {missingItems.length > 0 && (
            <div
              style={{
                marginTop: 10,
                padding: '8px 12px',
                background: 'var(--warn-soft)',
                borderRadius: 6,
                fontSize: 12,
                color: 'var(--warn)',
              }}
            >
              ⚠️ 선택 항목 중 {missingItems.length}개는 {targetMonthLabel} 데이터가 없어 불완전한
              출력이 될 수 있습니다
            </div>
          )}
        </div>

        {/* 이전 마감 기록 */}
        {recentLogs.length > 0 && (
          <div style={{ padding: '12px 20px', borderTop: '1px solid var(--divider)' }}>
            <div style={{ fontSize: 11, color: 'var(--text-3)', marginBottom: 6 }}>
              최근 마감 기록
            </div>
            {recentLogs.map(log => (
              <div
                key={`${log.year}-${log.month}`}
                style={{ fontSize: 12, color: 'var(--text-2)', marginBottom: 2 }}
              >
                {log.year}년 {log.month}월 — {log.completedItems.length}개 항목 ·{' '}
                {new Date(log.completedAt).toLocaleDateString('ko-KR')}
              </div>
            ))}
          </div>
        )}

        {/* 버튼 영역 */}
        <div
          style={{
            display: 'flex',
            gap: 8,
            justifyContent: 'flex-end',
            padding: '12px 20px',
            borderTop: '1px solid var(--divider)',
          }}
        >
          <button className="btn" onClick={onClose}>
            취소
          </button>
          <button
            className="btn primary"
            disabled={selectedIds.length === 0 || generating || done || loadingAvailability}
            onClick={handleGenerate}
          >
            {done ? '✅ 완료' : generating ? '생성 중…' : `${selectedIds.length}개 항목 생성 시작`}
          </button>
        </div>
      </div>
    </div>
  );
}
