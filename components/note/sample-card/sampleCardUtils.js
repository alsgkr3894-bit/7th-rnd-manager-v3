import { sampleNamesText } from '@/lib/sample';
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
    tags,
    title: asDisplayText(rec.title),
    category: asDisplayText(rec.category),
    testDate: asDisplayText(rec.testDate),
    company: asDisplayText(rec.company),
    description: asDisplayText(rec.description),
    price: asDisplayText(rec.price).trim(),
  };
}
