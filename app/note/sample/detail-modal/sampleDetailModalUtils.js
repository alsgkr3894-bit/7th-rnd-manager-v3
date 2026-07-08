import { sampleIngredientGroupName, sampleNamesText } from '@/lib/sample';
import { formatTestRound } from '@/lib/note/evaluation';
import {
  asDisplayText,
  asFiniteNumber,
  asObjectArray,
  clampInteger,
  noop,
} from '@/lib/ui/prop-guards';

export function buildSampleDetailModel(sample = {}) {
  const safeSample = sample && typeof sample === 'object' ? sample : {};
  const photos = asObjectArray(safeSample.photos).filter(photo => asDisplayText(photo.data));
  const tags = asDisplayText(safeSample.tags)
    .split(',')
    .map(tag => tag.trim())
    .filter(Boolean);
  const names = sampleNamesText(safeSample);
  const title = asDisplayText(safeSample.title, '제목 없음');
  const price = asFiniteNumber(safeSample.price);

  return {
    sample: safeSample,
    photos,
    tags,
    names,
    ingredientGroupName: sampleIngredientGroupName(safeSample),
    recordType: asDisplayText(safeSample.recordType || '샘플테스트'),
    title,
    category: asDisplayText(safeSample.category),
    testDate: asDisplayText(safeSample.testDate),
    roundLabel: formatTestRound(safeSample.testRound),
    isChained: safeSample.parentId != null,
    company: asDisplayText(safeSample.company),
    tester: asDisplayText(safeSample.tester),
    description: asDisplayText(safeSample.description),
    result: asDisplayText(safeSample.result),
    improvements: asDisplayText(safeSample.improvements),
    nextAction: asDisplayText(safeSample.nextAction),
    rating: clampInteger(safeSample.rating, { min: 0, max: 5, fallback: 0 }),
    price,
    priceLabel:
      price != null
        ? `${price.toLocaleString('ko-KR')}원 ${
            safeSample.priceTaxType === 'excl' ? '(부가세 별도)' : '(부가세 포함)'
          }`
        : '',
  };
}

export function normalizeSampleDetailActions({ onClose, onEdit, onNextRound, onDelete }) {
  return {
    closeModal: typeof onClose === 'function' ? onClose : noop,
    edit: typeof onEdit === 'function' ? onEdit : noop,
    nextRound: typeof onNextRound === 'function' ? onNextRound : noop,
    remove: typeof onDelete === 'function' ? onDelete : noop,
  };
}

export function getCurrentPhotoState(photos = [], photoIdx = 0) {
  const currentPhotoIdx = photos.length > 0 ? Math.min(photoIdx, photos.length - 1) : 0;
  return {
    currentPhotoIdx,
    currentPhoto: photos[currentPhotoIdx],
  };
}
