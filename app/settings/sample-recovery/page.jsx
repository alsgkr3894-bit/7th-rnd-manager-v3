'use client';

import { useEffect, useMemo, useState } from 'react';
import { PageHeader } from '@/components/ui/PageHeader';
import { showToast } from '@/components/Toast';
import { downloadJson } from '@/lib/download';
import { getAll, initDB, runTransaction } from '@/lib/db';

const STORE_NAME = 'sample_records';

const TEXT_FIELDS = [
  'title',
  'category',
  'testDate',
  'testRound',
  'company',
  'tester',
  'price',
  'priceTaxType',
  'description',
  'result',
  'improvements',
  'nextAction',
  'tags',
];

function text(value) {
  return String(value ?? '').trim();
}

function nonEmptyArray(value) {
  return Array.isArray(value) && value.some(item => text(item));
}

function isBlankSample(row = {}) {
  return !(
    text(row.title) ||
    text(row.menuName) ||
    text(row.category) ||
    text(row.testDate) ||
    text(row.description) ||
    text(row.result) ||
    nonEmptyArray(row.sampleNames)
  );
}

function normalizeNames(record = {}) {
  if (Array.isArray(record.sampleNames)) {
    const names = record.sampleNames.map(text).filter(Boolean);
    if (names.length) return names;
  }
  const menuName = text(record.menuName);
  return menuName ? menuName.split(',').map(text).filter(Boolean) : [];
}

function duplicateKey(record = {}) {
  return [text(record.title), normalizeNames(record).join('|'), text(record.testDate)]
    .join('::')
    .toLowerCase();
}

function decodeBase64Url(value) {
  const normalized = String(value || '')
    .replace(/-/g, '+')
    .replace(/_/g, '/')
    .padEnd(Math.ceil(String(value || '').length / 4) * 4, '=');
  const binary = atob(normalized);
  const bytes = Uint8Array.from(binary, char => char.charCodeAt(0));
  return new TextDecoder().decode(bytes);
}

function parsePayloadFromHash() {
  if (typeof window === 'undefined') return null;
  const params = new URLSearchParams(window.location.hash.slice(1));
  const raw = params.get('payload');
  if (!raw) return null;
  return JSON.parse(decodeBase64Url(raw));
}

function stamp() {
  const d = new Date();
  const pad = n => String(n).padStart(2, '0');
  return `${d.getFullYear()}${pad(d.getMonth() + 1)}${pad(d.getDate())}_${pad(d.getHours())}${pad(d.getMinutes())}${pad(d.getSeconds())}`;
}

function buildRecoveredRecord(candidate, existing, now) {
  const names = normalizeNames(candidate);
  const base = {
    brand: text(existing?.brand) || text(candidate.brand) || 'main',
    title: text(candidate.title),
    sampleNames: names,
    menuName: names.join(', '),
    category: text(candidate.category),
    testDate: text(candidate.testDate),
    testRound: text(candidate.testRound),
    company: text(candidate.company),
    tester: text(candidate.tester),
    rating: Number(existing?.rating) > 0 ? Number(existing.rating) : Number(candidate.rating) || 0,
    price: text(candidate.price),
    priceTaxType: candidate.priceTaxType === 'excl' ? 'excl' : 'incl',
    description: text(candidate.description),
    result: text(candidate.result),
    improvements: text(candidate.improvements),
    nextAction: text(candidate.nextAction),
    tags: text(candidate.tags),
    photos: Array.isArray(existing?.photos) && existing.photos.length ? existing.photos : [],
    parentId: existing?.parentId ?? candidate.parentId ?? null,
    linkedNoteId: existing?.linkedNoteId ?? candidate.linkedNoteId ?? null,
    linkedProducts: Array.isArray(candidate.linkedProducts) ? candidate.linkedProducts : [],
    createdAt: existing?.createdAt || candidate.createdAt || now,
    updatedAt: now,
  };

  for (const field of TEXT_FIELDS) {
    if (!text(base[field]) && text(existing?.[field])) base[field] = text(existing[field]);
  }

  if (existing?.id != null) return { ...existing, ...base, id: existing.id };
  return base;
}

function putRecoveredSamples(operations) {
  return runTransaction([STORE_NAME], 'readwrite', tx => {
    const store = tx.objectStore(STORE_NAME);
    for (const op of operations) {
      if (op.type === 'update') store.put(op.record);
      if (op.type === 'add') store.add(op.record);
    }
  });
}

function planRecovery(rows, candidates) {
  const now = new Date().toISOString();
  const currentKeys = new Set(
    rows.filter(row => !isBlankSample(row)).map(row => duplicateKey(row)).filter(Boolean)
  );
  const planned = [];
  const skipped = [];
  const usedIds = new Set();

  for (const candidate of candidates) {
    const key = duplicateKey(candidate);
    if (key && currentKeys.has(key)) {
      skipped.push({ candidate, reason: '이미 같은 제목/샘플명/날짜가 있습니다.' });
      continue;
    }

    const byCreatedAt =
      candidate.createdAt &&
      rows.find(row => row.createdAt === candidate.createdAt && isBlankSample(row) && !usedIds.has(row.id));

    if (byCreatedAt) {
      usedIds.add(byCreatedAt.id);
      planned.push({
        type: 'update',
        candidate,
        record: buildRecoveredRecord(candidate, byCreatedAt, now),
        reason: `빈 레코드 #${byCreatedAt.id}에 병합`,
      });
      if (key) currentKeys.add(key);
      continue;
    }

    planned.push({
      type: 'add',
      candidate,
      record: buildRecoveredRecord(candidate, null, now),
      reason: '기존 빈 레코드와 매칭되지 않아 새 항목으로 추가',
    });
    if (key) currentKeys.add(key);
  }

  return { planned, skipped };
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

  const candidates = useMemo(() => (Array.isArray(payload?.records) ? payload.records : []), [payload]);

  useEffect(() => {
    if (!candidates.length) return;
    let cancelled = false;
    initDB()
      .then(async () => {
        const rows = await getAll(STORE_NAME);
        if (!cancelled) setPreview({ rows, ...planRecovery(rows, candidates) });
      })
      .catch(err => setError(err instanceof Error ? err.message : '현재 샘플기록을 읽지 못했습니다.'));
    return () => {
      cancelled = true;
    };
  }, [candidates]);

  async function applyRecovery() {
    if (!preview?.planned?.length) return;
    setBusy(true);
    try {
      await initDB();
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
        title="샘플기록 복구"
        description="현재 샘플기록을 먼저 백업한 뒤, 복구 후보를 빈 레코드에 병합합니다."
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
              후보 {candidates.length}건 · 현재 샘플기록 {preview?.rows?.length ?? '-'}건
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
                {text(item.candidate?.title) || normalizeNames(item.candidate).join(', ') || '제목 없음'} ·{' '}
                {item.reason}
              </li>
            ))}
          </ul>
        </section>
      )}
    </main>
  );
}
