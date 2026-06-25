'use client';
import { useMemo, useState } from 'react';
import { buildPreviousRoundDraft, formatTestRound } from '@/lib/note/evaluation';
import { noteDisplayTitle } from '@/lib/note/display';
import { formatFullDate } from '@/lib/note/utils';

function noteSearchText(note) {
  return [noteDisplayTitle(note, ''), note.category, note.noteType, note.tags, note.testRound]
    .filter(Boolean)
    .join(' ')
    .toLowerCase();
}

function noteLabel(note) {
  const title = noteDisplayTitle(note, '제목 없음');
  const round = note.testRound ? ` · ${formatTestRound(note.testRound)}` : '';
  const date = note.testDate ? ` · ${formatFullDate(note.testDate)}` : '';
  return `${title}${round}${date}`;
}

export function NoteClonePreviousCard({ form, notes, setForm }) {
  const [query, setQuery] = useState('');
  const [selectedId, setSelectedId] = useState('');
  const sourceNotes = useMemo(
    () => (Array.isArray(notes) ? notes : []).filter(note => note?.id !== form?.id),
    [form?.id, notes]
  );
  const matches = useMemo(() => {
    const q = query.trim().toLowerCase();
    const rows = q ? sourceNotes.filter(note => noteSearchText(note).includes(q)) : sourceNotes;
    return rows.slice(0, 8);
  }, [query, sourceNotes]);
  const selected = sourceNotes.find(note => String(note.id) === String(selectedId));

  function applyClone() {
    if (!selected) return;
    setForm(current => buildPreviousRoundDraft(selected, current));
  }

  if (sourceNotes.length === 0) return null;

  return (
    <div className="card">
      <div
        style={{
          display: 'flex',
          justifyContent: 'space-between',
          gap: 12,
          alignItems: 'flex-start',
          marginBottom: 12,
        }}
      >
        <div>
          <div className="card-title">이전 차수 복제</div>
          <div style={{ fontSize: 12, color: 'var(--text-3)', marginTop: 3 }}>
            이전 노트의 제목과 차수만 가져와 새 차수로 이어 작성합니다.
          </div>
        </div>
        <button className="btn sm" type="button" onClick={applyClone} disabled={!selected}>
          복제 적용
        </button>
      </div>

      <div
        style={{
          display: 'grid',
          gridTemplateColumns: 'repeat(auto-fit, minmax(220px, 1fr))',
          gap: 10,
        }}
      >
        <input
          className="form-input"
          value={query}
          onChange={event => setQuery(event.target.value)}
          placeholder="제목, 태그, 차수로 이전 노트 검색"
        />
        <select
          className="form-input"
          value={selectedId}
          onChange={event => setSelectedId(event.target.value)}
        >
          <option value="">복제할 이전 노트 선택</option>
          {matches.map(note => (
            <option key={note.id} value={note.id}>
              {noteLabel(note)}
            </option>
          ))}
        </select>
      </div>

      {selected && (
        <div
          style={{
            marginTop: 10,
            fontSize: 12,
            color: 'var(--text-3)',
            background: 'var(--surface-2)',
            borderRadius: 8,
            padding: '8px 10px',
          }}
        >
          적용 시 제목과 연결 정보만 가져오고 테스트 차수는 자동으로 증가합니다. 상세 내용,
          평가, 태그, 원가, 사진은 새 차수에서 다시 작성합니다.
        </div>
      )}
    </div>
  );
}
