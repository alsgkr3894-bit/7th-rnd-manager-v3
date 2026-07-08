'use client';
import { NoteFilterControls } from './_NoteFilterControls';
import { NotePresetBar } from './_NotePresetBar';
import { NoteListHeader } from './_NoteListHeader';
import { NoteListBody } from './_NoteListBody';
import { NoteListStates } from './_NoteListStates';
import { NotePageDialogs } from './_NotePageDialogs';
import { useNoteContentController } from '@/hooks/useNoteContentController';

export function NoteContent() {
  const { dialogsProps, headerProps, filterProps, presetProps, statesProps, bodyProps } =
    useNoteContentController();

  return (
    <main className="main page-enter">
      <NotePageDialogs {...dialogsProps} />
      <NoteListHeader {...headerProps} />

      <NoteFilterControls {...filterProps} />

      {/* 필터 프리셋 */}
      <NotePresetBar {...presetProps} />

      <NoteListStates {...statesProps} />

      <NoteListBody {...bodyProps} />
    </main>
  );
}
