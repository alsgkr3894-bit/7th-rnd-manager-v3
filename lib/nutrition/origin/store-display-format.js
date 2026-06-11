import { asDisplayText } from '@/lib/ui/prop-guards';

function uniqueDisplayTexts(values) {
  const seen = new Set();
  const out = [];
  for (const value of Array.isArray(values) ? values : []) {
    const text = asDisplayText(value);
    if (!text || seen.has(text)) continue;
    seen.add(text);
    out.push(text);
  }
  return out;
}

export function formatStoreDisplayItem(displayName, ingredientNames = []) {
  const itemName = asDisplayText(displayName);
  const names = uniqueDisplayTexts(ingredientNames);
  if (!itemName) return names.join(', ');
  if (!names.length) return itemName;
  return `${itemName}(${names.join(', ')})`;
}

export function formatStoreOriginCountry(displayName, country) {
  const itemName = asDisplayText(displayName);
  const origin = asDisplayText(country);
  if (!itemName) return origin;
  if (!origin) return itemName;
  return `${itemName}(${origin})`;
}
