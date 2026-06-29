'use client';
import { useEffect, useMemo, useRef, useState } from 'react';
import {
  CHANGE_TYPE_COLOR,
  CHANGE_TYPE_LABEL,
  clearChangeLogs,
  filterChangeLogs,
  getChangeLogs,
} from '@/lib/change-log';
import { getActiveBrandId } from '@/lib/active-brand';
import { useCurrentRole } from '@/hooks/useCurrentRole';

const TYPE_GROUPS = [
  { key: 'all', label: '전체' },
  { key: 'ingredient', label: '식자재' },
  { key: 'menu', label: '메뉴' },
  { key: 'upload', label: '업로드' },
  { key: 'backup', label: '백업' },
];

function matchGroup(type, group) {
  if (group === 'all') return true;
  if (group === 'ingredient') return type.startsWith('ingredient:');
  if (group === 'menu') return type.startsWith('menu-master:') || type.startsWith('recipe:');
  if (group === 'upload') return type.startsWith('upload:');
  if (group === 'backup') return type.startsWith('backup:');
  return false;
}

function formatRelative(iso) {
  try {
    const ms = Date.now() - new Date(iso).getTime();
    if (ms < 60_000) return '방금';
    if (ms < 3_600_000) return `${Math.floor(ms / 60_000)}분 전`;
    if (ms < 86_400_000) return `${Math.floor(ms / 3_600_000)}시간 전`;
    if (ms < 7 * 86_400_000) return `${Math.floor(ms / 86_400_000)}일 전`;
    return new Date(iso).toLocaleDateString('ko-KR');
  } catch {
    return iso;
  }
}

/**
 * ChangeHistoryPanel — 변경 이력 뷰어
 *
 * Props:
 *   compact: boolean — 축약 모드 (홈 위젯용)
 *   brandFilter: boolean — 현재 브랜드만 표시 (기본: true)
 */
export function ChangeHistoryPanel({ compact = false, brandFilter = true }) {
  const [brand, setBrand] = useState('main');
  const [entries, setEntries] = useState([]);
  const [group, setGroup] = useState('all');
  const [clearConfirm, setClearConfirm] = useState(false);
  const clearTimerRef = useRef(null);
  const { isAdmin, ready: roleReady } = useCurrentRole();
  const canClear = roleReady && isAdmin;

  useEffect(() => {
    const activeBrand = getActiveBrandId();
    const nextBrand = activeBrand || 'main';
    setBrand(nextBrand);
    setEntries(brandFilter ? filterChangeLogs({ brand: nextBrand }) : getChangeLogs());
  }, [brandFilter]);

  useEffect(() => {
    return () => {
      if (clearTimerRef.current) clearTimeout(clearTimerRef.current);
    };
  }, []);

  const filtered = useMemo(() => entries.filter(e => matchGroup(e.type, group)), [entries, group]);

  const displayed = compact ? filtered.slice(0, 8) : filtered;

  function handleClear() {
    if (!canClear) return;
    if (!clearConfirm) {
      setClearConfirm(true);
      if (clearTimerRef.current) clearTimeout(clearTimerRef.current);
      clearTimerRef.current = setTimeout(() => setClearConfirm(false), 3000);
      return;
    }
    clearChangeLogs(brandFilter ? { brand } : undefined);
    setEntries([]);
    setClearConfirm(false);
  }

  if (entries.length === 0) {
    return (
      <div style={{ padding: '20px 0', textAlign: 'center', color: 'var(--text-3)', fontSize: 13 }}>
        기록된 변경 이력이 없습니다
      </div>
    );
  }

  return (
    <div style={{ display: 'flex', flexDirection: 'column', gap: 10 }}>
      {/* 필터 탭 */}
      {!compact && (
        <div style={{ display: 'flex', gap: 6, flexWrap: 'wrap', alignItems: 'center' }}>
          {TYPE_GROUPS.map(g => {
            const count = entries.filter(e => matchGroup(e.type, g.key)).length;
            return (
              <button
                key={g.key}
                type="button"
                className={`chip${group === g.key ? ' active' : ''}`}
                onClick={() => setGroup(g.key)}
                style={{ fontSize: 12 }}
              >
                {g.label}
                {g.key !== 'all' && count > 0 && (
                  <span style={{ marginLeft: 4, color: 'var(--text-3)' }}>{count}</span>
                )}
              </button>
            );
          })}
          <div style={{ flex: 1 }} />
          <button
            type="button"
            className="btn ghost"
            style={{
              fontSize: 11,
              padding: '2px 8px',
              color: clearConfirm ? 'var(--negative)' : 'var(--text-3)',
              opacity: canClear ? 1 : 0.55,
            }}
            disabled={!canClear}
            title={
              !roleReady
                ? '권한 확인 중입니다'
                : !isAdmin
                  ? '관리자만 변경 이력을 초기화할 수 있습니다'
                  : undefined
            }
            onClick={handleClear}
          >
            {clearConfirm ? '한 번 더 누르면 삭제' : '이력 초기화'}
          </button>
        </div>
      )}

      {/* 목록 */}
      <div
        style={{
          border: '1px solid var(--divider)',
          borderRadius: 8,
          overflow: 'hidden',
          maxHeight: compact ? 280 : 500,
          overflowY: 'auto',
        }}
      >
        {displayed.length === 0 ? (
          <div
            style={{ padding: '16px', textAlign: 'center', color: 'var(--text-3)', fontSize: 13 }}
          >
            해당 분류의 이력이 없습니다
          </div>
        ) : (
          displayed.map((e, idx) => (
            <div
              key={e.id}
              style={{
                display: 'flex',
                alignItems: 'flex-start',
                gap: 10,
                padding: '8px 12px',
                borderTop: idx === 0 ? 'none' : '1px solid var(--divider)',
                fontSize: 13,
              }}
            >
              {/* 타입 dot */}
              <div
                style={{
                  width: 8,
                  height: 8,
                  borderRadius: '50%',
                  background: CHANGE_TYPE_COLOR[e.type] ?? 'var(--text-3)',
                  flexShrink: 0,
                  marginTop: 5,
                }}
              />
              <div style={{ flex: 1, minWidth: 0 }}>
                <div style={{ fontWeight: 500 }}>{e.label}</div>
                {e.detail && (
                  <div style={{ fontSize: 11, color: 'var(--text-3)', marginTop: 1 }}>
                    {e.detail}
                  </div>
                )}
                {e.reverseHint && (
                  <div style={{ fontSize: 11, color: 'var(--warn)', marginTop: 1 }}>
                    되돌리기: {e.reverseHint}
                  </div>
                )}
              </div>
              <div
                style={{
                  fontSize: 11,
                  color: 'var(--text-3)',
                  flexShrink: 0,
                  whiteSpace: 'nowrap',
                }}
              >
                {formatRelative(e.at)}
              </div>
            </div>
          ))
        )}
      </div>

      {compact && filtered.length > 8 && (
        <div style={{ fontSize: 11, color: 'var(--text-3)', textAlign: 'right' }}>
          +{filtered.length - 8}건 더 있습니다
        </div>
      )}
    </div>
  );
}
