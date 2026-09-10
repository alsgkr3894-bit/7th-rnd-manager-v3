'use client';
import { useEffect, useMemo, useState } from 'react';
import { CollapsibleCard } from '@/app/note/_CollapsibleCard';
import { diffRecipeVersions, getRecipeVersionsForMenu } from '@/lib/menu-master/recipe-versions';

const CURRENT_ID = '__current__';

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

function formatSignedCost(value) {
  if (value == null) return '';
  const rounded = Math.round(value);
  return `${rounded > 0 ? '+' : ''}${rounded.toLocaleString()}원`;
}

function formatSignedRate(value) {
  if (value == null) return '';
  return `${value > 0 ? '+' : ''}${value.toFixed(1)}%p`;
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

function ChangedList({ items }) {
  if (!items || items.length === 0) return null;
  return (
    <div style={{ marginTop: 6 }}>
      <div style={{ fontSize: 11, fontWeight: 700, color: 'var(--text-3)', marginBottom: 3 }}>
        수량/단가 변경
      </div>
      <div style={{ display: 'flex', flexDirection: 'column', gap: 3 }}>
        {items.map(c => (
          <div key={c.key} style={{ fontSize: 12, display: 'flex', alignItems: 'center', gap: 6 }}>
            <span>
              {c.label}: 수량 {c.before.quantity ?? '-'} → {c.after.quantity ?? '-'} · 단가{' '}
              {c.before.unitPrice ?? '-'}원 → {c.after.unitPrice ?? '-'}원
              {c.subtotalDelta ? ` (소계 ${formatSignedCost(c.subtotalDelta)})` : ''}
            </span>
            {!c.quantityChanged && c.priceChanged && (
              <span
                className="chip"
                style={{ fontSize: 10, background: 'var(--accent-soft)', color: 'var(--accent)' }}
              >
                단가 변동
              </span>
            )}
          </div>
        ))}
      </div>
    </div>
  );
}

/**
 * 원가/레시피 변경 이력 — menu_recipe_versions 스냅샷을 목록으로 보여주고,
 * 목록의 아무 두 시점("현재 화면(미저장)" 포함)이나 기준/비교로 골라 비교한다.
 * 기본값은 "직전 저장 대비 최신 저장" — 방금 뭐가 바뀌었는지가 가장 흔한 질문이라서다.
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
  const [baseId, setBaseId] = useState(null);
  const [targetId, setTargetId] = useState(CURRENT_ID);

  useEffect(() => {
    if (!open || !menuCode) return;
    let alive = true;
    setLoading(true);
    getRecipeVersionsForMenu(menuCode)
      .then(rows => {
        if (!alive) return;
        setVersions(rows);
        setBaseId(rows[1]?.id ?? null);
        setTargetId(rows[0]?.id ?? CURRENT_ID);
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

  const entries = useMemo(() => {
    const current = {
      id: CURRENT_ID,
      at: null,
      isCurrent: true,
      totalCost: currentTotalCost,
      costRate: currentCostRate,
      components: currentComponents,
    };
    return [current, ...versions];
  }, [versions, currentComponents, currentTotalCost, currentCostRate]);

  const baseEntry = entries.find(e => e.id === baseId) || null;
  const targetEntry = entries.find(e => e.id === targetId) || null;
  const diff =
    baseEntry && targetEntry && baseEntry.id !== targetEntry.id
      ? diffRecipeVersions(baseEntry, targetEntry)
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
          {entries.slice(0, 21).map(e => {
            const isBase = baseId === e.id;
            const isTarget = targetId === e.id;
            return (
              <div
                key={e.id}
                style={{
                  display: 'flex',
                  alignItems: 'center',
                  gap: 8,
                  padding: '6px 8px',
                  borderRadius: 6,
                  background: isBase || isTarget ? 'var(--accent-soft)' : 'var(--surface-2)',
                  fontSize: 12,
                }}
              >
                <span style={{ color: 'var(--text-3)', flexShrink: 0 }}>
                  {e.isCurrent ? '현재 화면(미저장)' : formatAt(e.at)}
                </span>
                {e.id === versions[0]?.id && (
                  <span
                    className="chip"
                    style={{
                      fontSize: 10,
                      background: 'var(--positive-soft)',
                      color: 'var(--positive)',
                    }}
                  >
                    최신 저장
                  </span>
                )}
                <span style={{ flex: 1 }} />
                <span className="num">{formatCost(e.totalCost)}</span>
                <span className="num" style={{ color: 'var(--text-3)' }}>
                  {formatRate(e.costRate)}
                </span>
                <button
                  type="button"
                  className={'btn xs' + (isBase ? ' primary' : '')}
                  onClick={() => setBaseId(id => (id === e.id ? null : e.id))}
                  title="이 시점을 비교 기준으로"
                >
                  기준
                </button>
                <button
                  type="button"
                  className={'btn xs' + (isTarget ? ' primary' : '')}
                  onClick={() => setTargetId(id => (id === e.id ? null : e.id))}
                  title="이 시점을 비교 대상으로"
                >
                  비교
                </button>
              </div>
            );
          })}
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
            {baseEntry.isCurrent ? '현재 화면(미저장)' : formatAt(baseEntry.at)} 대비{' '}
            {targetEntry.isCurrent ? '현재 화면(미저장)' : formatAt(targetEntry.at)}
            {diff.costDelta != null && (
              <span
                style={{
                  marginLeft: 8,
                  color: diff.costDelta > 0 ? 'var(--negative)' : 'var(--positive)',
                  fontWeight: 800,
                }}
              >
                {formatSignedCost(diff.costDelta)}
              </span>
            )}
          </div>
          {diff.beforeCostRate != null && diff.afterCostRate != null && (
            <div style={{ fontSize: 12, color: 'var(--text-3)', marginBottom: 4 }}>
              원가율 {formatRate(diff.beforeCostRate)} → {formatRate(diff.afterCostRate)}
              {diff.costRateDelta != null && diff.costRateDelta !== 0 && (
                <span
                  style={{
                    marginLeft: 4,
                    color: diff.costRateDelta > 0 ? 'var(--negative)' : 'var(--positive)',
                    fontWeight: 700,
                  }}
                >
                  ({formatSignedRate(diff.costRateDelta)})
                </span>
              )}
            </div>
          )}
          {diff.added.length === 0 && diff.removed.length === 0 && diff.changed.length === 0 ? (
            <div style={{ fontSize: 12, color: 'var(--text-4)' }}>구성품 차이가 없습니다.</div>
          ) : (
            <>
              <DiffList title="추가된 구성품" items={diff.added} tone="add" />
              <DiffList title="삭제된 구성품" items={diff.removed} tone="remove" />
              <ChangedList items={diff.changed} />
            </>
          )}
        </div>
      )}
    </CollapsibleCard>
  );
}
