function normalizeCode(value) {
  return String(value || '')
    .trim()
    .toUpperCase();
}

/**
 * 입력한 접두어 다음의 코드 한 구간만 추천한다.
 * 예: S- + [S-PKL-001, S-SPG-002] => PKL, SPG
 */
export function getMenuCodeSegmentSuggestions(value, rows, excludeId, limit = 10) {
  const prefix = normalizeCode(value);
  if (!prefix || !prefix.endsWith('-')) return [];

  const seen = new Set();
  const suggestions = [];
  for (const row of rows || []) {
    if (excludeId != null && row?.id === excludeId) continue;
    const code = normalizeCode(row?.menuCode);
    if (!code.startsWith(prefix) || code === prefix) continue;

    const remainder = code.slice(prefix.length);
    const segment = remainder.split('-')[0];
    if (!segment || seen.has(segment)) continue;
    seen.add(segment);
    suggestions.push({
      segment,
      value: `${prefix}${segment}${remainder.includes('-') ? '-' : ''}`,
    });
  }

  return suggestions
    .sort((a, b) => a.segment.localeCompare(b.segment, 'ko', { numeric: true }))
    .slice(0, limit);
}
