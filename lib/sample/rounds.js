import { incrementTestRound, formatTestRound } from '@/lib/note/evaluation';
import { sampleIngredientGroupName, sampleNamesText } from './store';

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
    recordType: source.recordType || current.recordType,
    ingredientGroupName:
      source.ingredientGroupName ||
      current.ingredientGroupName ||
      sampleIngredientGroupName(source),
    ingredientGroupCode: source.ingredientGroupCode || current.ingredientGroupCode,
    ingredientId: source.ingredientId ?? current.ingredientId ?? null,
    linkedProducts: Array.isArray(source.linkedProducts)
      ? source.linkedProducts
      : current.linkedProducts,
    testRound: incrementTestRound(source.testRound || current.testRound),
    parentId: source.id ?? source.parentId ?? current.parentId ?? null,
  };
}
