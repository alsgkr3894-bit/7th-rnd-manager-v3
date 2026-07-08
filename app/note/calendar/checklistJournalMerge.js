import { checklistJournalContent } from './_calendar-utils';

export const CHECKLIST_JOURNAL_BLOCK_START = '[체크리스트 완료 항목]';
export const CHECKLIST_JOURNAL_BLOCK_END = '[체크리스트 완료 항목 끝]';

function asText(value) {
  if (value == null) return '';
  if (typeof value !== 'string' && typeof value !== 'number') return '';
  return String(value);
}

function escapeRegExp(value) {
  return String(value).replace(/[.*+?^${}()|[\]\\]/g, '\\$&');
}

const CHECKLIST_JOURNAL_BLOCK_RE = new RegExp(
  `${escapeRegExp(CHECKLIST_JOURNAL_BLOCK_START)}[\\s\\S]*?${escapeRegExp(
    CHECKLIST_JOURNAL_BLOCK_END
  )}\\n*`,
  'g'
);

export function buildChecklistJournalBlock(doneItems) {
  return [
    CHECKLIST_JOURNAL_BLOCK_START,
    checklistJournalContent(doneItems),
    CHECKLIST_JOURNAL_BLOCK_END,
  ].join('\n');
}

export function mergeChecklistJournalContent(existingContent, doneItems) {
  const bodyWithoutChecklist = asText(existingContent)
    .replace(CHECKLIST_JOURNAL_BLOCK_RE, '')
    .trim();
  const completed = (Array.isArray(doneItems) ? doneItems : []).filter(
    item => item.done && item.text
  );
  if (completed.length === 0) return bodyWithoutChecklist;
  const checklistBlock = buildChecklistJournalBlock(completed);
  return bodyWithoutChecklist ? `${bodyWithoutChecklist}\n\n${checklistBlock}` : checklistBlock;
}
