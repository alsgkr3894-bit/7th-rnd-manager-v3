import { sampleIngredientGroupName, sampleNamesText, formatSamplePrice } from '@/lib/sample';
import { formatTestRound } from '@/lib/note/evaluation';
import { asDisplayText, asObjectArray } from '@/lib/ui/prop-guards';

export function buildSampleCardViewModel(sample = {}) {
  const rec = sample && typeof sample === 'object' ? sample : {};
  const photos = asObjectArray(rec.photos);
  const thumb = asDisplayText(photos[0]?.data);
  const tags =
    typeof rec.tags === 'string'
      ? rec.tags
          .split(',')
          .map(tag => tag.trim())
          .filter(Boolean)
      : [];

  return {
    rec,
    photos,
    thumb,
    names: sampleNamesText(rec),
    ingredientGroupName: sampleIngredientGroupName(rec),
    recordType: asDisplayText(rec.recordType || '샘플테스트'),
    tags,
    title: asDisplayText(rec.title),
    category: asDisplayText(rec.category),
    testDate: asDisplayText(rec.testDate),
    roundLabel: formatTestRound(rec.testRound),
    isChained: rec.parentId != null,
    company: asDisplayText(rec.company),
    description: asDisplayText(rec.description),
    // 뷰 공통 포맷터로 '12,000원' 형태로 통일(비숫자/빈값은 '—').
    price: formatSamplePrice(rec),
  };
}
