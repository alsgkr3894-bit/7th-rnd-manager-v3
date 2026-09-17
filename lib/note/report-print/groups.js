// 메뉴개발노트 보고서의 메뉴(차수 체인) 그룹화·정렬·집계 로직
import { noteDisplayTitle } from '@/lib/note/display';
import { normalizeNoteStatus } from '@/lib/note/constants';
import { countNotesByStatus } from '@/lib/note/filter';
import {
  cleanText,
  compactDate,
  keyText,
  koreanDate,
  parseReportTempCost,
  timeValue,
} from './format';

function noteSortKey(note) {
  return cleanText(note?.testDate || note?.updatedAt || note?.createdAt);
}

function reportCategoryRank(value) {
  const category = cleanText(value).replace(/\s+/g, '');
  if (category === '피자') return 0;
  if (category === '사이드') return 1;
  if (category === '도우' || category.includes('도우') || category.includes('엣지')) return 2;
  if (category === '소스' || category.includes('소스')) return 3;
  return 100;
}

function compareReportCategories(a, b) {
  const ar = reportCategoryRank(a);
  const br = reportCategoryRank(b);
  if (ar !== br) return ar - br;
  return cleanText(a).localeCompare(cleanText(b), 'ko', { numeric: true });
}

function reportRoundNumber(note = {}) {
  // 회차는 명시적 testRound에서만 읽는다. 제목/메뉴명의 임의 숫자('마르게리따 2.0')를
  // 회차로 오인해 정렬이 뒤틀리던 문제를 막는다.
  const match = cleanText(note.testRound).match(/\d+/);
  return match ? Number(match[0]) : 0;
}

function compareReportRounds(a = {}, b = {}) {
  const ar = reportRoundNumber(a);
  const br = reportRoundNumber(b);
  if (ar && br && ar !== br) return ar - br;
  if (ar && !br) return -1;
  if (!ar && br) return 1;
  return (
    timeValue(a.testDate || a.createdAt || a.updatedAt) -
      timeValue(b.testDate || b.createdAt || b.updatedAt) ||
    keyText(a.id).localeCompare(keyText(b.id), 'ko', { numeric: true })
  );
}

function reportBaseTitle(note = {}) {
  const title = noteDisplayTitle(note, '');
  return (
    title
      .replace(/\s*[\-–—_/|]*\s*\(?\d+\s*(차|회차|차수|차 테스트|차시)\)?\s*$/u, '')
      .replace(/\s*\(?테스트\s*\d+\s*(차|회차|차수)?\)?\s*$/u, '')
      .trim() || title
  );
}

function findReportChainRoot(note, byId) {
  let current = note;
  const seen = new Set();
  while (current?.id != null) {
    const currentId = keyText(current.id);
    const parentId = keyText(current.parentId);
    if (!parentId || seen.has(parentId)) break;
    seen.add(currentId);
    const parent = byId.get(parentId);
    if (!parent) break;
    current = parent;
  }
  return current || note;
}

function reportGroupKey(note, byId, parentIds, index) {
  const id = keyText(note?.id);
  const parentId = keyText(note?.parentId);
  const root = findReportChainRoot(note, byId);
  const rootId = keyText(root?.id);
  const isChained = Boolean(parentId || parentIds.has(id) || (rootId && rootId !== id));
  return isChained ? `chain:${rootId || parentId || id || index}` : `note:${id || index}`;
}

function reportPeriodLabel(notes = []) {
  const dates = notes
    .map(note => compactDate(note?.testDate))
    .filter(Boolean)
    .sort();
  if (!dates.length) return '';
  return dates[0] === dates[dates.length - 1]
    ? koreanDate(dates[0])
    : `${koreanDate(dates[0])} ~ ${koreanDate(dates[dates.length - 1])}`;
}

export function buildReportMenuGroups(notes = []) {
  const list = Array.isArray(notes) ? notes.filter(Boolean) : [];
  const byId = new Map();
  const parentIds = new Set();
  list.forEach(note => {
    const id = keyText(note?.id);
    const parentId = keyText(note?.parentId);
    if (id) byId.set(id, note);
    if (parentId) parentIds.add(parentId);
  });

  const map = new Map();
  list.forEach((note, index) => {
    const key = reportGroupKey(note, byId, parentIds, index);
    if (!map.has(key)) map.set(key, { key, notes: [] });
    map.get(key).notes.push(note);
  });

  return [...map.values()]
    .map(group => {
      const ordered = [...group.notes].sort(compareReportRounds);
      const lastRoundNote = ordered[ordered.length - 1] || {};
      const representative = selectRepresentativeReportNote(ordered) || lastRoundNote;
      return {
        ...group,
        notes: ordered,
        title: reportBaseTitle(lastRoundNote) || reportBaseTitle(representative) || '제목 없음',
        category: cleanText(lastRoundNote.category || representative.category) || '미지정',
        menuCode: cleanText(lastRoundNote.menuCode || representative.menuCode),
        periodLabel: reportPeriodLabel(ordered),
        representative,
        lastRoundNote,
      };
    })
    .sort((a, b) => noteSortKey(b.lastRoundNote).localeCompare(noteSortKey(a.lastRoundNote), 'ko'));
}

function selectRepresentativeReportNote(notes = []) {
  for (let index = notes.length - 1; index >= 0; index -= 1) {
    if (normalizeNoteStatus(notes[index]?.status) === '출시') return notes[index];
  }
  return notes[notes.length - 1] || null;
}

function countBy(notes, key) {
  const counts = new Map();
  for (const note of notes) {
    const rawLabel = key === 'status' ? normalizeNoteStatus(note?.[key]) : note?.[key];
    const label = cleanText(rawLabel) || '미지정';
    counts.set(label, (counts.get(label) || 0) + 1);
  }
  return [...counts.entries()].sort((a, b) => {
    if (key === 'category') return compareReportCategories(a[0], b[0]);
    return b[1] - a[1] || a[0].localeCompare(b[0], 'ko');
  });
}

function countStatusRows(notes) {
  const counts = countNotesByStatus(notes);
  return Object.entries(counts)
    .filter(([label, count]) => label !== 'all' && count > 0)
    .sort((a, b) => b[1] - a[1] || a[0].localeCompare(b[0], 'ko'));
}

export function groupByCategory(notes) {
  const groups = new Map();
  for (const note of notes) {
    const category = cleanText(note?.category) || '미지정';
    if (!groups.has(category)) groups.set(category, []);
    groups.get(category).push(note);
  }
  return [...groups.entries()].sort((a, b) => compareReportCategories(a[0], b[0]));
}

export function buildMenuDevelopmentReportSummary(notes) {
  const safeNotes = Array.isArray(notes) ? notes : [];
  const titles = new Set(safeNotes.map(note => noteDisplayTitle(note, '')).filter(Boolean));
  const photoCount = safeNotes.reduce(
    (sum, note) =>
      sum + (Array.isArray(note?.photos) ? note.photos.filter(photo => photo?.data).length : 0),
    0
  );
  const tempCostCount = safeNotes.reduce((sum, note) => {
    const parsed = parseReportTempCost(note?.tempCostCalc);
    return sum + (parsed.rows.length > 0 ? 1 : 0);
  }, 0);

  return {
    total: safeNotes.length,
    menuCount: titles.size,
    photoCount,
    tempCostCount,
    statusCounts: countStatusRows(safeNotes),
    categoryCounts: countBy(safeNotes, 'category'),
  };
}
