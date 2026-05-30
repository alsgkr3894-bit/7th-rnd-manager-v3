'use client';
import { Suspense } from 'react';
import { NoteContent } from './_NoteContent';

export default function Page() {
  return (
    <Suspense fallback={<main className="main"><div style={{padding:48, textAlign:'center', color:'var(--text-3)'}}>로딩 중…</div></main>}>
      <NoteContent/>
    </Suspense>
  );
}
