'use client';
import { Icon } from '@/components/icons';
import { STATUS_COLORS, STATUS_BORDER } from '@/lib/note/constants';
import { SCHEDULE_COLORS } from '@/lib/note/schedules';
import { WORK_LOG_TYPES } from '@/lib/work-log';
import { RATING_COLOR, sampleNamesText } from '@/lib/sample';
import { asDisplayText, asObjectArray, clampInteger } from '@/lib/ui/prop-guards';

function isPast(key, today)  { return key < today; }
function isToday(key, today) { return key === today; }
const noop = () => {};

export function DayPanel({ dateKey, today, notes, schedules, workLogs, samples = [], viewMode, router, onClose, onAddSchedule, onEditSchedule, onAddNote }) {
  const safeDateKey = asDisplayText(dateKey);
  const safeToday = asDisplayText(today);
  const safeNotes = asObjectArray(notes);
  const safeSchedules = asObjectArray(schedules);
  const safeWorkLogs = asObjectArray(workLogs);
  const safeSamples = asObjectArray(samples);
  const safeViewMode = asDisplayText(viewMode, 'all');
  const close = typeof onClose === 'function' ? onClose : noop;
  const addSchedule = typeof onAddSchedule === 'function' ? onAddSchedule : noop;
  const editSchedule = typeof onEditSchedule === 'function' ? onEditSchedule : noop;
  const addNote = typeof onAddNote === 'function' ? onAddNote : noop;
  const push = typeof router?.push === 'function' ? router.push.bind(router) : noop;
  const [y, m, d] = safeDateKey.split('-').map(Number);
  const hasValidDate = Number.isFinite(y) && Number.isFinite(m) && Number.isFinite(d);
  const future = safeDateKey && safeToday && !isPast(safeDateKey, safeToday) && !isToday(safeDateKey, safeToday);
  const dow = hasValidDate ? new Date(y, m-1, d).getDay() : 0;
  const WNAMES = ['일','월','화','수','목','금','토'];

  const sortedSched = [...safeSchedules].sort((a, b) =>
    asDisplayText(a.time, '99:99').localeCompare(asDisplayText(b.time, '99:99')),
  );
  const sortedLogs  = [...safeWorkLogs].sort((a, b) =>
    asDisplayText(a.at).localeCompare(asDisplayText(b.at)),
  );

  return (
    <>
      <div style={{ display:'flex', alignItems:'flex-start', gap:8, marginBottom:14 }}>
        <div style={{ flex:1 }}>
          <div style={{ fontSize:16, fontWeight:800, letterSpacing:'-0.02em' }}>
            {hasValidDate ? `${m}월 ${d}일 (${WNAMES[dow]})` : '날짜 없음'}
          </div>
          <div style={{ fontSize:11, color:'var(--text-3)', marginTop:3 }}>
            {safeDateKey && safeToday && isToday(safeDateKey, safeToday) ? <span style={{ color:'var(--accent-text)', fontWeight:700 }}>오늘</span>
              : future ? <span style={{ color:'var(--text-3)' }}>예정일</span>
              : <span style={{ color:'var(--text-4)' }}>{`테스트 ${safeNotes.length}건 · 일정 ${safeSchedules.length}건`}</span>}
          </div>
        </div>
        <button className="btn sm ghost xs" onClick={close}>
          <Icon.close style={{ width:13, height:13 }}/>
        </button>
      </div>

      {/* 일정 목록 */}
      {safeViewMode !== 'notes' && (
        <div style={{ marginBottom: safeSchedules.length ? 12 : 0 }}>
          <div style={{ display:'flex', justifyContent:'space-between', alignItems:'center', marginBottom:6 }}>
            <span style={{ fontSize:11, fontWeight:800, color:'var(--text-3)', textTransform:'uppercase', letterSpacing:'0.04em' }}>
              일정 {safeSchedules.length > 0 ? `· ${safeSchedules.length}` : ''}
            </span>
            <button className="btn sm ghost xs" onClick={addSchedule}>
              + 추가
            </button>
          </div>
          {sortedSched.length > 0 ? (
            <div style={{ display:'flex', flexDirection:'column', gap:6 }}>
              {sortedSched.map((s, i) => {
                const type = asDisplayText(s.type, '기타');
                const time = asDisplayText(s.time);
                const title = asDisplayText(s.title, '(제목 없음)');
                const description = asDisplayText(s.description);
                const c = SCHEDULE_COLORS[type] || SCHEDULE_COLORS['기타'];
                return (
                  <button key={asDisplayText(s.id, `schedule-${i}`)} onClick={() => editSchedule(s)}
                    style={{
                      display:'flex', alignItems:'flex-start', gap:10, padding:'9px 11px',
                      borderRadius:10, border:'none', cursor:'pointer', font:'inherit',
                      background:'var(--surface-2)', textAlign:'left', width:'100%',
                      borderLeft:`3px solid ${c.border}`,
                    }}>
                    <div style={{ flex:1, minWidth:0 }}>
                      <div style={{ display:'flex', alignItems:'center', gap:6, marginBottom:3 }}>
                        <span style={{ fontSize:10, fontWeight:700, padding:'2px 7px', borderRadius:99,
                          background:c.bg, color:c.text }}>{type}</span>
                        {time && <span style={{ fontSize:11, color:'var(--text-3)', fontWeight:600 }}>{time}</span>}
                      </div>
                      <div style={{ fontSize:13, fontWeight:600, color:'var(--text-1)' }}>{title}</div>
                      {description && (
                        <div style={{ fontSize:11, color:'var(--text-3)', marginTop:3, lineHeight:1.4 }}>{description}</div>
                      )}
                    </div>
                    <Icon.chevRight style={{ width:13, height:13, color:'var(--text-4)', flexShrink:0, marginTop:2 }}/>
                  </button>
                );
              })}
            </div>
          ) : (
            <button className="btn sm ghost" style={{ width:'100%', textAlign:'left', fontSize:12, color:'var(--text-4)', justifyContent:'flex-start' }}
              onClick={addSchedule}>
              + 일정 추가하기
            </button>
          )}
        </div>
      )}

      {/* 작업 자동일지 */}
      {sortedLogs.length > 0 && (
        <div style={{ marginBottom:12 }}>
          <div style={{ fontSize:11, fontWeight:800, color:'var(--text-4)', textTransform:'uppercase',
            letterSpacing:'0.04em', marginBottom:6 }}>자동 일지</div>
          <div style={{ display:'flex', flexDirection:'column', gap:4 }}>
            {sortedLogs.map((w, i) => {
              const type = asDisplayText(w.type);
              const summary = asDisplayText(w.summary);
              const at = asDisplayText(w.at);
              const t = WORK_LOG_TYPES[type] || WORK_LOG_TYPES.OTHER;
              return (
                <div key={asDisplayText(w.id, `work-${i}`)} style={{ display:'flex', alignItems:'center', gap:8,
                  padding:'6px 10px', borderRadius:8, background:'var(--surface-2)' }}>
                  <span style={{ fontSize:13, flexShrink:0 }}>{t.icon}</span>
                  <div style={{ flex:1, minWidth:0 }}>
                    <span style={{ fontSize:11, fontWeight:700, color:t.color }}>{t.label}</span>
                    {summary && (
                      <span style={{ fontSize:11, color:'var(--text-3)', marginLeft:6 }}>
                        {summary}
                      </span>
                    )}
                  </div>
                  <span style={{ fontSize:10, color:'var(--text-4)', flexShrink:0 }}>
                    {at.slice(11,16)}
                  </span>
                </div>
              );
            })}
          </div>
        </div>
      )}

      {/* 구분선 */}
      {safeViewMode === 'all' && safeSchedules.length > 0 && safeNotes.length > 0 && (
        <div style={{ height:1, background:'var(--divider)', margin:'8px 0 12px' }}/>
      )}

      {/* 노트 목록 */}
      {safeViewMode !== 'schedules' && (
        <div>
          <div style={{ display:'flex', justifyContent:'space-between', alignItems:'center', marginBottom:6 }}>
            <span style={{ fontSize:11, fontWeight:800, color:'var(--text-3)', textTransform:'uppercase', letterSpacing:'0.04em' }}>
              테스트 노트 {safeNotes.length > 0 ? `· ${safeNotes.length}` : ''}
            </span>
            <button className="btn sm ghost xs" onClick={addNote}>
              + 추가
            </button>
          </div>
          {safeNotes.length > 0 ? (
            <div style={{ display:'flex', flexDirection:'column', gap:6, maxHeight:320, overflowY:'auto' }}>
              {safeNotes.map((n, i) => {
                const noteId = asDisplayText(n.id);
                const status = asDisplayText(n.status, '아이디어');
                const noteType = asDisplayText(n.noteType);
                const title = asDisplayText(n.title, '(제목 없음)');
                const menuName = asDisplayText(n.menuName);
                const testContent = asDisplayText(n.testContent);
                const sc = STATUS_COLORS[status] || STATUS_COLORS['아이디어'];
                const sb = STATUS_BORDER[status] || 'var(--border)';
                return (
                  <button key={noteId || `note-${i}`} onClick={() => { if (noteId) push(`/note/${noteId}`); }}
                    style={{
                      display:'flex', flexDirection:'column', gap:5, padding:'10px 12px',
                      borderRadius:10, border:'none', cursor:'pointer', font:'inherit',
                      background:'var(--surface-2)', textAlign:'left', width:'100%',
                      borderLeft:`3px solid ${sb}`,
                    }}>
                    <div style={{ display:'flex', alignItems:'center', gap:6 }}>
                      <span style={{ fontSize:10, fontWeight:700, padding:'2px 7px', borderRadius:99,
                        background:sc.bg, color:sc.color, flexShrink:0 }}>{status}</span>
                      {noteType && <span style={{ fontSize:10, color:'var(--text-4)' }}>{noteType}</span>}
                    </div>
                    <div style={{ fontSize:13, fontWeight:600, color:'var(--text-1)', lineHeight:1.35 }}>
                      {title}
                    </div>
                    {menuName && <div style={{ fontSize:11, color:'var(--text-3)' }}>{menuName}</div>}
                    {testContent && (
                      <div style={{ fontSize:11, color:'var(--text-3)', lineHeight:1.5,
                        overflow:'hidden', display:'-webkit-box', WebkitLineClamp:2, WebkitBoxOrient:'vertical' }}>
                        {testContent}
                      </div>
                    )}
                  </button>
                );
              })}
            </div>
          ) : (
            <button className="btn sm ghost" style={{ width:'100%', textAlign:'left', fontSize:12, color:'var(--text-4)', justifyContent:'flex-start' }}
              onClick={addNote}>
              + 테스트 노트 작성하기
            </button>
          )}
        </div>
      )}

      {/* 샘플 수령 목록 */}
      {(safeViewMode === 'all' || safeViewMode === 'samples') && safeSamples.length > 0 && (
        <div style={{ marginTop:12 }}>
          <div style={{ fontSize:11, fontWeight:800, color:'var(--text-3)', textTransform:'uppercase',
            letterSpacing:'0.04em', marginBottom:6 }}>샘플 수령 · {safeSamples.length}</div>
          <div style={{ display:'flex', flexDirection:'column', gap:6 }}>
            {safeSamples.map((s, i) => {
              const sampleId = asDisplayText(s.id);
              const names = sampleNamesText(s);
              const title = asDisplayText(s.title) || names || '(제목 없음)';
              const company = asDisplayText(s.company);
              const rating = clampInteger(s.rating, { min: 0, max: 5, fallback: 0 });

              return (
                <button key={sampleId || `sample-${i}`} onClick={() => { if (sampleId) push(`/note/sample/${sampleId}`); }}
                  style={{
                    display:'flex', flexDirection:'column', gap:4, padding:'10px 12px',
                    borderRadius:10, border:'none', cursor:'pointer', font:'inherit',
                    background:'var(--surface-2)', textAlign:'left', width:'100%',
                    borderLeft:`3px solid ${RATING_COLOR?.[rating] || 'var(--positive)'}`,
                  }}>
                  <div style={{ fontSize:13, fontWeight:600, color:'var(--text-1)', lineHeight:1.35 }}>
                    {title}
                  </div>
                  {names && <div style={{ fontSize:11, color:'var(--text-3)' }}>{names}</div>}
                  {company && <div style={{ fontSize:11, color:'var(--text-4)' }}>{company}</div>}
                </button>
              );
            })}
          </div>
        </div>
      )}
    </>
  );
}
