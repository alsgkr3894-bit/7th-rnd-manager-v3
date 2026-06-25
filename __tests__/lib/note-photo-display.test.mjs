import { readFileSync } from 'fs';
import { resolve } from 'path';

const notePhotoSources = [
  ['note write preview', 'app/note/_NotePhotoSection.jsx'],
  ['note list card', 'app/note/_NoteCard.jsx'],
  ['note idea group card', 'app/note/_NoteIdeaGroupCard.jsx'],
  ['journal note card', 'components/note/WebJournalCard.jsx'],
];

describe('note photo display', () => {
  test.each(notePhotoSources)('%s keeps photos uncropped', (_label, file) => {
    const source = readFileSync(resolve(file), 'utf8');
    expect(source).toContain("objectFit: 'contain'");
    expect(source).toContain("background: 'var(--surface-2)'");
    expect(source).not.toContain("objectFit: 'cover'");
  });

  test('note report print keeps photos uncropped', () => {
    const source = readFileSync(resolve('lib/note/report-print.js'), 'utf8');
    expect(source).toContain('object-fit: contain');
    expect(source).not.toContain('object-fit: cover');
  });
});
