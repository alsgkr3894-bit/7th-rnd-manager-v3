'use client';
import { useMemo, useState } from 'react';
import { buildPreviousRoundDraft, formatTestRound } from '@/lib/note/evaluation';
import { noteDisplayTitle } from '@/lib/note/display';
import { formatFullDate } from '@/lib/note/utils';

function noteSearchText(note) {
  return [
    note.menuCode,
    noteDisplayTitle(note, ''),
    note.category,
    note.noteType,
    note.tags,
    note.testRound,
  ]
    .filter(Boolean)
    .join(' ')
    .toLowerCase();
}

function noteMenuCode(note) {
  return String(note?.menuCode || '')
    .trim()
    .toUpperCase();
}

function noteRoundNumber(note) {
  const match = String(note?.testRound || note?.title || note?.menuName || '').match(/\d+/);
  return match ? Number(match[0]) : 0;
}

function noteTimeValue(note) {
  const value = note?.testDate || note?.updatedAt || note?.createdAt;
  const time = value ? new Date(value).getTime() : 0;
  return Number.isFinite(time) ? time : 0;
}

function compareLatestNote(a, b) {
  const roundDiff = noteRoundNumber(a) - noteRoundNumber(b);
  if (roundDiff) return roundDiff;
  return noteTimeValue(a) - noteTimeValue(b);
}

function menuKey(note) {
  const code = noteMenuCode(note);
  if (code) return `code:${code}`;
  return `name:${noteDisplayTitle(note, '').trim().toLowerCase()}`;
}

function buildMenuOptions(notes) {
  const map = new Map();
  for (const note of notes) {
    const key = menuKey(note);
    if (!key || key === 'name:') continue;
    const code = noteMenuCode(note);
    const title = noteDisplayTitle(note, '제목 없음');
    if (!map.has(key)) {
      map.set(key, {
        key,
        code,
        title,
        category: note.category,
        latest: note,
        notes: [],
      });
    }
    const menu = map.get(key);
    menu.notes.push(note);
    if (!menu.code && code) menu.code = code;
    if (!menu.title || menu.title === '제목 없음') menu.title = title;
    if (compareLatestNote(note, menu.latest) > 0) menu.latest = note;
  }
  return [...map.values()].sort((a, b) => noteTimeValue(b.latest) - noteTimeValue(a.latest));
}

function menuSearchText(menu) {
  return [
    menu.code,
    menu.title,
    menu.category,
    menu.latest?.testRound,
    ...menu.notes.map(noteSearchText),
  ]
    .filter(Boolean)
    .join(' ')
    .toLowerCase();
}

function menuLabel(menu) {
  const note = menu.latest || {};
  const code = menu.code ? `${menu.code} · ` : '';
  const title = noteDisplayTitle(note, '제목 없음');
  const round = note.testRound ? ` · ${formatTestRound(note.testRound)}` : '';
  const date = note.testDate ? ` · ${formatFullDate(note.testDate)}` : '';
  const count = menu.notes?.length ? ` · 누적 ${menu.notes.length}건` : '';
  return `${code}${title}${round}${date}${count}`;
}

export function NoteClonePreviousCard({ form, notes, setForm }) {
  const [query, setQuery] = useState('');
  const [selectedId, setSelectedId] = useState('');
  const sourceNotes = useMemo(
    () => (Array.isArray(notes) ? notes : []).filter(note => note?.id !== form?.id),
    [form?.id, notes]
  );
  const sourceMenus = useMemo(() => buildMenuOptions(sourceNotes), [sourceNotes]);
  const matches = useMemo(() => {
    const q = query.trim().toLowerCase();
    const rows = q ? sourceMenus.filter(menu => menuSearchText(menu).includes(q)) : sourceMenus;
    return rows.slice(0, 8);
  }, [query, sourceMenus]);
  const selectedMenu = sourceMenus.find(menu => menu.key === selectedId);
  const selected = selectedMenu?.latest;

  function applyClone() {
    if (!selected) return;
    setForm(current => buildPreviousRoundDraft(selected, current));
  }

  if (sourceMenus.length === 0) return null;

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
            기존 메뉴 테스트를 선택하면 이전 노트의 제목과 차수만 가져와 새 차수로 이어 작성합니다.
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
          placeholder="메뉴 코드, 제목, 태그, 차수로 기존 메뉴 검색"
        />
        <select
          className="form-input"
          value={selectedId}
          onChange={event => setSelectedId(event.target.value)}
        >
          <option value="">기존 메뉴 테스트 선택</option>
          {matches.map(menu => (
            <option key={menu.key} value={menu.key}>
              {menuLabel(menu)}
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
          {selectedMenu?.code && <b>{selectedMenu.code}</b>} 적용 시 제목과 연결 정보만 가져오고
          테스트 차수는 자동으로 증가합니다. 상세 내용, 평가, 태그, 원가, 사진은 새 차수에서 다시
          작성합니다.
        </div>
      )}
    </div>
  );
}
