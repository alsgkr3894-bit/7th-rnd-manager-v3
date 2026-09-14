/**
 * app/settings/sample-recovery/sampleRecoveryPlan.js
 * — 백업 payload와 현재 샘플 기록을 대조해 복구 계획을 세우는 순수 로직
 */
import { SAMPLE_RECORD_LABEL } from '@/lib/sample/constants';

export const STORE_NAME = 'sample_records';

export const TEXT_FIELDS = [
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

export function text(value) {
  return String(value ?? '').trim();
}

export function nonEmptyArray(value) {
  return Array.isArray(value) && value.some(item => text(item));
}

export function isBlankSample(row = {}) {
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

export function normalizeNames(record = {}) {
  if (Array.isArray(record.sampleNames)) {
    const names = record.sampleNames.map(text).filter(Boolean);
    if (names.length) return names;
  }
  const menuName = text(record.menuName);
  return menuName ? menuName.split(',').map(text).filter(Boolean) : [];
}

export function duplicateKey(record = {}) {
  return [text(record.title), normalizeNames(record).join('|'), text(record.testDate)]
    .join('::')
    .toLowerCase();
}

export function decodeBase64Url(value) {
  const normalized = String(value || '')
    .replace(/-/g, '+')
    .replace(/_/g, '/')
    .padEnd(Math.ceil(String(value || '').length / 4) * 4, '=');
  const binary = atob(normalized);
  const bytes = Uint8Array.from(binary, char => char.charCodeAt(0));
  return new TextDecoder().decode(bytes);
}

export function parsePayloadFromHash() {
  if (typeof window === 'undefined') return null;
  const params = new URLSearchParams(window.location.hash.slice(1));
  const raw = params.get('payload');
  if (!raw) return null;
  return JSON.parse(decodeBase64Url(raw));
}

export function stamp() {
  const d = new Date();
  const pad = n => String(n).padStart(2, '0');
  return `${d.getFullYear()}${pad(d.getMonth() + 1)}${pad(d.getDate())}_${pad(d.getHours())}${pad(d.getMinutes())}${pad(d.getSeconds())}`;
}

export function buildRecoveredRecord(candidate, existing, now) {
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

export function planRecovery(rows, candidates) {
  const now = new Date().toISOString();
  const currentKeys = new Set(
    rows
      .filter(row => !isBlankSample(row))
      .map(row => duplicateKey(row))
      .filter(Boolean)
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
      rows.find(
        row => row.createdAt === candidate.createdAt && isBlankSample(row) && !usedIds.has(row.id)
      );

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
