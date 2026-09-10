'use client';
import { useEffect, useState } from 'react';
import { CollapsibleCard } from '@/app/note/_CollapsibleCard';
import { diffRecipeVersions, getRecipeVersionsForMenu } from '@/lib/menu-master/recipe-versions';

function formatAt(at) {
  const s = String(at || '');
  if (s.length < 16) return s || '-';
  return `${s.slice(0, 10)} ${s.slice(11, 16)}`;
}

function formatCost(value) {
  return value == null ? '—' : `${Math.round(value).toLocaleString()}원`;
}

function formatRate(value) {
  return value == null ? '—' : `${value.toFixed(1)}%`;
}

function DiffList({ title, items, tone }) {
  if (!items || items.length === 0) return null;
  return (
    <div style={{ marginTop: 6 }}>
      <div style={{ fontSize: 11, fontWeight: 700, color: 'var(--text-3)', marginBottom: 3 }}>
        {title}
      </div>
      <div style={{ display: 'flex', flexWrap: 'wrap', gap: 4 }}>
        {items.map((c, i) => (
          <span
            key={c.key || c.ingredientName || i}
            className="chip"
            style={{
              fontSize: 11,
              background: tone === 'add' ? 'var(--positive-soft)' : 'var(--negative-soft)',
              color: tone === 'add' ? 'var(--positive)' : 'var(--negative)',
            }}
          >
            {c.ingredientName || c.label}
          </span>
        ))}
      </div>
    </div>
  );
}

/**
 * 원가/레시피 변경 이력 — menu_recipe_versions 스냅샷을 목록으로 보여주고,
 * 선택한 과거 시점과 "현재 화면에 입력된 값"을 비교한다.
 * 저장 전 미리보기 용도이므로 currentComponents는 저장된 값이 아니라 화면 상태를 쓴다.
 */
export function MenuRecipeVersionHistory({
  menuCode,
  currentComponents,
  currentTotalCost,
  currentCostRate,
}) {
  const [open, setOpen] = useState(false);
  const [versions, setVersions] = useState([]);
  const [loading, setLoading] = useState(false);
  const [compareId, setCompareId] = useState(null);

  useEffect(() => {
    if (!open || !menuCode) return;
    let alive = true;
    setLoading(true);
    getRecipeVersionsForMenu(menuCode)
      .then(rows => {
        if (alive) setVersions(rows);
      })
      .catch(() => {
        if (alive) setVersions([]);
      })
      .finally(() => {
        if (alive) setLoading(false);
      });
    return () => {
      alive = false;
    };
  }, [open, menuCode]);

  const compareVersion = versions.find(v => v.id === compareId) || null;
  const diff = compareVersion
    ? diffRecipeVersions(compareVersion, {
        components: currentComponents,
        totalCost: currentTotalCost,
      })
    : null;

  return (
    <CollapsibleCard
      title="변경 이력"
      subtitle={
        versions.length > 0
          ? `저장될 때마다 자동 기록 · ${versions.length}건`
          : '저장하면 기록이 쌓입니다'
      }
      defaultOpen={false}
      open={open}
      onOpenChange={setOpen}
    >
      {loading && <div style={{ fontSize: 12, color: 'var(--text-4)' }}>불러오는 중…</div>}
      {!loading && versions.length === 0 && (
        <div style={{ fontSize: 12, color: 'var(--text-4)' }}>
          아직 저장 이력이 없습니다. 레시피를 저장하면 그 시점이 기록됩니다.
        </div>
      )}
      {!loading && versions.length > 0 && (
        <div style={{ display: 'flex', flexDirection: 'column', gap: 4 }}>
          {versions.slice(0, 20).map((v, i) => (
            <div
              key={v.id}
              style={{
                display: 'flex',
                alignItems: 'center',
                gap: 8,
                padding: '6px 8px',
                borderRadius: 6,
                background: compareId === v.id ? 'var(--accent-soft)' : 'var(--surface-2)',
                fontSize: 12,
              }}
            >
              <span style={{ color: 'var(--text-3)', flexShrink: 0 }}>{formatAt(v.at)}</span>
              {i === 0 && (
                <span
                  className="chip"
                  style={{
                    fontSize: 10,
                    background: 'var(--positive-soft)',
                    color: 'var(--positive)',
                  }}
                >
                  최신
                </span>
              )}
              <span style={{ flex: 1 }} />
              <span className="num">{formatCost(v.totalCost)}</span>
              <span className="num" style={{ color: 'var(--text-3)' }}>
                {formatRate(v.costRate)}
              </span>
              <button
                type="button"
                className="btn xs"
                onClick={() => setCompareId(id => (id === v.id ? null : v.id))}
              >
                {compareId === v.id ? '비교 해제' : '현재와 비교'}
              </button>
            </div>
          ))}
        </div>
      )}

      {diff && (
        <div
          style={{
            marginTop: 12,
            paddingTop: 12,
            borderTop: '1px dashed var(--divider)',
          }}
        >
          <div style={{ fontSize: 12, fontWeight: 700, marginBottom: 4 }}>
            {formatAt(compareVersion.at)} 대비 현재 화면
            {diff.costDelta != null && (
              <span
                style={{
                  marginLeft: 8,
                  color: diff.costDelta > 0 ? 'var(--negative)' : 'var(--positive)',
                  fontWeight: 800,
                }}
              >
                {diff.costDelta > 0 ? '+' : ''}
                {Math.round(diff.costDelta).toLocaleString()}원
              </span>
            )}
          </div>
          {diff.added.length === 0 && diff.removed.length === 0 && diff.changed.length === 0 ? (
            <div style={{ fontSize: 12, color: 'var(--text-4)' }}>구성품 차이가 없습니다.</div>
          ) : (
            <>
              <DiffList title="추가된 구성품" items={diff.added} tone="add" />
              <DiffList title="삭제된 구성품" items={diff.removed} tone="remove" />
              {diff.changed.length > 0 && (
                <div style={{ marginTop: 6 }}>
                  <div
                    style={{
                      fontSize: 11,
                      fontWeight: 700,
                      color: 'var(--text-3)',
                      marginBottom: 3,
                    }}
                  >
                    수량/단가 변경
                  </div>
                  <div style={{ display: 'flex', flexDirection: 'column', gap: 3 }}>
                    {diff.changed.map(c => (
                      <div key={c.key} style={{ fontSize: 12 }}>
                        {c.label}: {c.before.quantity ?? '-'} → {c.after.quantity ?? '-'}
                      </div>
                    ))}
                  </div>
                </div>
              )}
            </>
          )}
        </div>
      )}
    </CollapsibleCard>
  );
}
