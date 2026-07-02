import { useEffect, useState } from 'react';
import { DEFAULT_PROFILE, getProfile } from '@/lib/profile';

function formatSpacedDate(date) {
  return date.toLocaleDateString('ko-KR').slice(0, -1);
}

function formatCompactDate(date) {
  return date.toLocaleDateString('ko-KR').replace(/\. /g, '.').replace(/\.$/, '');
}

function formatIsoDate(date) {
  const y = date.getFullYear();
  const m = String(date.getMonth() + 1).padStart(2, '0');
  const d = String(date.getDate()).padStart(2, '0');
  return `${y}-${m}-${d}`;
}

const INITIAL_META = {
  profileName: DEFAULT_PROFILE.name,
  spacedDateLabel: '—',
  compactDateLabel: '—',
  isoDateLabel: '—',
};

export function useReportGeneratedMeta() {
  const [meta, setMeta] = useState(INITIAL_META);

  useEffect(() => {
    const now = new Date();
    setMeta({
      profileName: getProfile().name,
      spacedDateLabel: formatSpacedDate(now),
      compactDateLabel: formatCompactDate(now),
      isoDateLabel: formatIsoDate(now),
    });
  }, []);

  return meta;
}
