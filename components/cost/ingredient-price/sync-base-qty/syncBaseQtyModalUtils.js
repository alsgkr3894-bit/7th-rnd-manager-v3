export function priceFileLabel(file) {
  if (!file) return '';
  const name = file.fileName || file.name || `파일 #${file.id}`;
  const date = file.updateDate || file.date;
  return date ? `${name} (${date})` : name;
}

export function syncSummaryItems(plan) {
  return [
    {
      key: 'changes',
      label: `${plan?.changes?.length || 0} 변경`,
      tone: 'accent',
    },
    {
      key: 'unchanged',
      label: `${plan?.unchanged || 0} 동일`,
      tone: 'positive',
    },
    {
      key: 'unmatched',
      label: `${plan?.unmatched || 0} 미매칭`,
      tone: 'muted',
    },
    {
      key: 'unsupported',
      label: `${plan?.unsupported || 0} 단위 미확정`,
      tone: 'warn',
    },
  ];
}

export function syncSummaryToneStyle(tone) {
  if (tone === 'positive') {
    return {
      background: 'color-mix(in srgb, var(--positive) 14%, transparent)',
      color: 'var(--positive)',
    };
  }
  if (tone === 'warn') {
    return {
      background: 'color-mix(in srgb, var(--warn) 14%, transparent)',
      color: 'var(--warn)',
    };
  }
  if (tone === 'muted') {
    return {
      background: 'color-mix(in srgb, var(--text-3) 14%, transparent)',
      color: 'var(--text-3)',
    };
  }
  return {
    background: 'color-mix(in srgb, var(--accent) 14%, transparent)',
    color: 'var(--accent)',
  };
}

export function syncApplyButtonLabel(plan, applying) {
  const count = plan?.changes?.length || 0;
  if (applying) return '저장 중…';
  return count > 0 ? `${count}개 기준수량 업데이트` : '변경 없음';
}
