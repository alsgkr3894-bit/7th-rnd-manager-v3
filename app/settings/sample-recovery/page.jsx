'use client';

import { useEffect, useMemo, useState } from 'react';
import { PageHeader } from '@/components/ui/PageHeader';
import { showToast } from '@/components/Toast';
import { downloadJson } from '@/lib/download';
import {
  initSharedDB,
  sharedGetAll as getAll,
  sharedRunTransaction as runTransaction,
} from '@/lib/db/shared';
import { SAMPLE_RECORD_LABEL } from '@/lib/sample/constants';
import { assertActiveAdmin } from '@/lib/auth/guard';
import {
  STORE_NAME,
  normalizeNames,
  parsePayloadFromHash,
  planRecovery,
  stamp,
  text,
} from './sampleRecoveryPlan';

function putRecoveredSamples(operations) {
  return runTransaction([STORE_NAME], 'readwrite', tx => {
    const store = tx.objectStore(STORE_NAME);
    for (const op of operations) {
      if (op.type === 'update') store.put(op.record);
      if (op.type === 'add') store.add(op.record);
    }
  });
}

export default function SampleRecoveryPage() {
  const [payload, setPayload] = useState(null);
  const [error, setError] = useState('');
  const [preview, setPreview] = useState(null);
  const [busy, setBusy] = useState(false);

  useEffect(() => {
    try {
      const parsed = parsePayloadFromHash();
      if (!parsed?.records?.length) {
        setError('복구 payload가 없거나 비어 있습니다.');
        return;
      }
      setPayload(parsed);
    } catch (err) {
      setError(err instanceof Error ? err.message : '복구 payload를 읽지 못했습니다.');
    }
  }, []);

  const candidates = useMemo(
    () => (Array.isArray(payload?.records) ? payload.records : []),
    [payload]
  );

  useEffect(() => {
    if (!candidates.length) return;
    let cancelled = false;
    initSharedDB()
      .then(async () => {
        const rows = await getAll(STORE_NAME);
        if (!cancelled) setPreview({ rows, ...planRecovery(rows, candidates) });
      })
      .catch(err =>
        setError(
          err instanceof Error ? err.message : `현재 ${SAMPLE_RECORD_LABEL}을 읽지 못했습니다.`
        )
      );
    return () => {
      cancelled = true;
    };
  }, [candidates]);

  async function applyRecovery() {
    if (!preview?.planned?.length) return;
    setBusy(true);
    try {
      await assertActiveAdmin('샘플 기록 복구');
      await initSharedDB();
      const beforeRows = await getAll(STORE_NAME);
      downloadJson(
        {
          version: 'sample-recovery-before-v1',
          exportedAt: new Date().toISOString(),
          store: STORE_NAME,
          rows: beforeRows,
          payloadMeta: {
            version: payload?.version,
            recoveredAt: payload?.recoveredAt,
          },
        },
        `sample-recovery-before_${stamp()}.json`
      );
      const plan = planRecovery(beforeRows, candidates);
      await putRecoveredSamples(plan.planned);
      const afterRows = await getAll(STORE_NAME);
      setPreview({ rows: afterRows, ...planRecovery(afterRows, candidates), applied: plan });
      showToast(`샘플 복구 적용 완료: ${plan.planned.length}건`, 'success');
    } catch (err) {
      const message = err instanceof Error ? err.message : '샘플 복구에 실패했습니다.';
      setError(message);
      showToast(message, 'error');
    } finally {
      setBusy(false);
    }
  }

  return (
    <main className="page settings-page">
      <PageHeader
        title={`${SAMPLE_RECORD_LABEL} 복구`}
        description={`현재 ${SAMPLE_RECORD_LABEL}을 먼저 백업한 뒤, 복구 후보를 빈 레코드에 병합합니다.`}
      />

      {error && (
        <section className="card" style={{ borderColor: 'var(--danger)', color: 'var(--danger)' }}>
          {error}
        </section>
      )}

      <section className="card">
        <div className="settings-row">
          <div>
            <strong>복구 후보</strong>
            <p className="muted">
              후보 {candidates.length}건 · 현재 {SAMPLE_RECORD_LABEL} {preview?.rows?.length ?? '-'}
              건
            </p>
          </div>
          <button
            className="btn primary"
            onClick={applyRecovery}
            disabled={busy || !preview?.planned?.length}
          >
            {busy ? '복구 중...' : `복구 적용 ${preview?.planned?.length ?? 0}건`}
          </button>
        </div>
      </section>

      {preview && (
        <section className="card">
          <h2>적용 예정</h2>
          <div className="table-wrap">
            <table className="data-table">
              <thead>
                <tr>
                  <th>처리</th>
                  <th>제목</th>
                  <th>샘플명</th>
                  <th>날짜</th>
                  <th>사유</th>
                </tr>
              </thead>
              <tbody>
                {preview.planned.map((item, index) => (
                  <tr key={`${item.type}-${index}`}>
                    <td>{item.type === 'update' ? '병합' : '추가'}</td>
                    <td>{item.record.title || '-'}</td>
                    <td>{normalizeNames(item.record).join(', ') || '-'}</td>
                    <td>{item.record.testDate || '-'}</td>
                    <td>{item.reason}</td>
                  </tr>
                ))}
                {preview.planned.length === 0 && (
                  <tr>
                    <td colSpan={5}>적용할 복구 후보가 없습니다.</td>
                  </tr>
                )}
              </tbody>
            </table>
          </div>
        </section>
      )}

      {preview?.skipped?.length > 0 && (
        <section className="card">
          <h2>건너뜀</h2>
          <ul>
            {preview.skipped.map((item, index) => (
              <li key={index}>
                {text(item.candidate?.title) ||
                  normalizeNames(item.candidate).join(', ') ||
                  '제목 없음'}{' '}
                · {item.reason}
              </li>
            ))}
          </ul>
        </section>
      )}
    </main>
  );
}
