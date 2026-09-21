'use client';
import { useState } from 'react';
import { showToast } from '@/components/Toast';
import { planServerRepush, runServerRepush } from '@/lib/db/server-repush';
import { formatNumber } from '@/lib/format';

function describePlan(plan) {
  const lines = [
    `이 PC의 로컬 데이터 ${formatNumber(plan.totalUpserts)}건을 서버로 다시 보냅니다.`,
    '서버는 내용이 같은 행은 건너뛰고, 다른 행만 이 PC의 값으로 바꿉니다.',
  ];
  if (plan.totalDeletes > 0) {
    const detail = plan.stores
      .filter(entry => entry.deleteKeys.length > 0)
      .map(entry => `${entry.storeName} ${formatNumber(entry.deleteKeys.length)}건`)
      .join(', ');
    lines.push(
      '',
      `서버에만 있는 행 ${formatNumber(plan.totalDeletes)}건은 서버에서 삭제합니다:`,
      detail
    );
  }
  const skipped = plan.stores.filter(entry => entry.deleteSkipped).map(entry => entry.storeName);
  if (skipped.length > 0) {
    lines.push(
      '',
      `이 PC에 비어 있는 store는 서버 행을 지우지 않고 그대로 둡니다: ${skipped.join(', ')}`
    );
  }
  lines.push('', '진행할까요?');
  return lines.join('\n');
}

export function ServerRepushCard({ disabled, onDone }) {
  const [running, setRunning] = useState(false);
  const [progress, setProgress] = useState(null);
  const [result, setResult] = useState(null);

  async function handleRepush() {
    if (running) return;
    setRunning(true);
    setProgress({ phase: 'plan' });
    setResult(null);
    try {
      const plan = await planServerRepush();
      if (!window.confirm(describePlan(plan))) return;
      const done = await runServerRepush(plan, { onProgress: setProgress });
      setResult(done);
      if (done.rejectedRows > 0) {
        showToast(
          `재전송 완료 · 서버가 ${formatNumber(done.rejectedRows)}건을 거절했습니다(아래 목록 확인)`,
          'warn'
        );
      } else {
        showToast(`서버로 ${formatNumber(done.sentRows)}건을 다시 보냈습니다`, 'ok');
      }
      if (typeof onDone === 'function') await onDone();
    } catch (error) {
      console.error('[settings/sync] 서버 재전송 실패', error);
      showToast(error?.message || '서버로 재전송하지 못했습니다', 'error');
    } finally {
      setRunning(false);
      setProgress(null);
    }
  }

  const planned = progress?.plannedRows || 0;
  const done = progress?.doneRows || 0;
  const pct = planned > 0 ? Math.min(100, Math.round((done / planned) * 100)) : 0;

  return (
    <section className="card" style={{ marginTop: 16 }} data-testid="server-repush-card">
      <div
        style={{
          display: 'flex',
          alignItems: 'center',
          justifyContent: 'space-between',
          gap: 10,
          flexWrap: 'wrap',
          marginBottom: 8,
        }}
      >
        <div>
          <div className="card-title" style={{ margin: 0 }}>
            이 PC의 데이터를 서버로 전체 재전송
          </div>
          <div className="card-sub">
            서버 사본이 이 PC보다 뒤처졌을 때 서버를 이 PC와 같게 맞춥니다
          </div>
        </div>
        <button className="btn" type="button" onClick={handleRepush} disabled={disabled || running}>
          {running
            ? progress?.phase === 'plan'
              ? '비교하는 중…'
              : '보내는 중…'
            : '서버로 전체 재전송'}
        </button>
      </div>
      <div style={{ fontSize: 12, color: 'var(--text-3)', lineHeight: 1.6 }}>
        평소에는 저장한 행만 서버로 갑니다. 복구·거절 등으로 서버에 옛 값이 남았을 때 이 버튼으로
        로컬의 모든 행을 다시 보내고, 서버에만 남은 행은 지웁니다. 이 PC의 데이터는 바뀌지 않습니다.
      </div>

      {running && progress?.phase === 'store' && (
        <div style={{ marginTop: 12 }}>
          <div
            style={{
              height: 8,
              borderRadius: 999,
              background: 'var(--surface-2)',
              overflow: 'hidden',
            }}
          >
            <div
              style={{
                width: `${pct}%`,
                height: '100%',
                background: 'var(--accent)',
                transition: 'width .2s',
              }}
            />
          </div>
          <div style={{ fontSize: 12, color: 'var(--text-3)', marginTop: 6 }}>
            {progress.storeName} · {formatNumber(done)} / {formatNumber(planned)}건
          </div>
        </div>
      )}

      {result && (
        <div style={{ fontSize: 12, color: 'var(--text-2)', marginTop: 10 }}>
          마지막 재전송 {result.finishedAt.slice(11, 19)} · 보냄 {formatNumber(result.sentRows)}건 ·
          서버에서 삭제 {formatNumber(result.deletedRows)}건
          {result.rejectedRows > 0 ? ` · 거절 ${formatNumber(result.rejectedRows)}건` : ''}
        </div>
      )}
    </section>
  );
}
