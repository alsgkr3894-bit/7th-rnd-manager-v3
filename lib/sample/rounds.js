import { incrementTestRound, formatTestRound } from '@/lib/note/evaluation';
import { sampleNamesText } from './store';

export function sampleRoundLabel(sample = {}) {
  return formatTestRound(sample.testRound);
}

export function sampleChainTitle(sample = {}) {
  return String(sample.title || sampleNamesText(sample) || '').trim();
}

export function buildNextSampleRoundDraft(source = {}, current = {}) {
  const title = sampleChainTitle(source) || current.title || '';
  return {
    ...current,
    brand: source.brand || current.brand,
    title,
    testRound: incrementTestRound(source.testRound || current.testRound),
    parentId: source.id ?? source.parentId ?? current.parentId ?? null,
  };
}
