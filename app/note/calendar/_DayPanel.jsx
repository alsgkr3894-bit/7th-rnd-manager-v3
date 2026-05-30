'use client';
import { Icon } from '@/components/icons';
import { STATUS_COLORS, STATUS_BORDER } from '@/lib/note/constants';
import { SCHEDULE_COLORS } from '@/lib/note/schedules';
import { WORK_LOG_TYPES } from '@/lib/work-log';

function isPast(key, today)  { return key < today; }
function isToday(key, today) { return key === today; }

export function DayPanel({ dateKey, today, notes, schedules, workLogs, viewMode, router, onClose, onAddSchedule, onEditSchedule, onAddNote }) {
  const [y, m, d] = dateKey.split('-').map(Number);
  const future = !isPast(dateKey, today) && !isToday(dateKey, today);
  const dow = new Date(y, m-1, d).getDay();
  const WNAMES = ['일','월','화','수','목','금','토'];

  const sortedSched = [...schedules].sort((a, b) => (a.time||'99:99').localeCompare(b.time||'99:99'));
  const sortedLogs  = [...workLogs].sort((a, b) => a.at.localeCompare(b.at));

  return (
    <>
      <div style={{ display:'flex', alignItems:'flex-start', gap:8, marginBottom:14 }}>
        <div style={{ flex:1 }}>
          <div style={{ fontSize:16, fontWeight:800, letterSpacing:'-0.02em' }}>
            {m}월 {d}일 ({WNAMES[dow]})
          </div>
          <div style={{ fontSize:11, color:'var(--text-3)', marginTop:3 }}>
            {isToday(dateKey, today) ? <span style={{ color:'var(--accent-text)', fontWeight:700 }}>오늘</span>
              : future ? <span style={{ color:'var(--text-3)' }}>예정일</span>
              : <span style={{ color:'var(--text-4)' }}>{`테스트 ${notes.length}건 · 일정 ${schedules.length}건`}</span>}
          </div>
        </div>
        <button className="btn sm ghost" style={{ padding:'4px 7px' }} onClick={onClose}>
          <Icon.close style={{ width:13, height:13 }}/>
        </button>
      </div>

      {/* 일정 목록 */}
      {viewMode !== 'notes' && (
        <div style={{ marginBottom: schedules.length ? 12 : 0 }}>
          <div style={{ display:'flex', justifyContent:'space-between', alignItems:'center', marginBottom:6 }}>
            <span style={{ fontSize:11, fontWeight:800, color:'var(--text-3)', textTransform:'uppercase', letterSpacing:'0.04em' }}>
              일정 {schedules.length > 0 ? `· ${schedules.length}` : ''}
            </span>
            <button className="btn sm ghost" style={{ fontSize:11, padding:'3px 8px' }} onClick={onAddSchedule}>
              + 추가
            </button>
          </div>
          {sortedSched.length > 0 ? (
            <div style={{ display:'flex', flexDirection:'column', gap:6 }}>
              {sortedSched.map(s => {
                const c = SCHEDULE_COLORS[s.type] || SCHEDULE_COLORS['기타'];
                return (
                  <button key={s.id} onClick={() => onEditSchedule(s)}
                    style={{
                      display:'flex', alignItems:'flex-start', gap:10, padding:'9px 11px',
                      borderRadius:10, border:'none', cursor:'pointer', font:'inherit',
                      background:'var(--surface-2)', textAlign:'left', width:'100%',
                      borderLeft:`3px solid ${c.border}`,
                    }}>
                    <div style={{ flex:1, minWidth:0 }}>
                      <div style={{ display:'flex', alignItems:'center', gap:6, marginBottom:3 }}>
                        <span style={{ fontSize:10, fontWeight:700, padding:'2px 7px', borderRadius:99,
                          background:c.bg, color:c.text }}>{s.type}</span>
                        {s.time && <span style={{ fontSize:11, color:'var(--text-3)', fontWeight:600 }}>{s.time}</span>}
                      </div>
                      <div style={{ fontSize:13, fontWeight:600, color:'var(--text-1)' }}>{s.title}</div>
                      {s.description && (
                        <div style={{ fontSize:11, color:'var(--text-3)', marginTop:3, lineHeight:1.4 }}>{s.description}</div>
                      )}
                    </div>
                    <Icon.chevRight style={{ width:13, height:13, color:'var(--text-4)', flexShrink:0, marginTop:2 }}/>
                  </button>
                );
              })}
            </div>
          ) : (
            <button className="btn sm ghost" style={{ width:'100%', textAlign:'left', fontSize:12, color:'var(--text-4)', justifyContent:'flex-start' }}
              onClick={onAddSchedule}>
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
            {sortedLogs.map(w => {
              const t = WORK_LOG_TYPES[w.type] || WORK_LOG_TYPES.OTHER;
              return (
                <div key={w.id} style={{ display:'flex', alignItems:'center', gap:8,
                  padding:'6px 10px', borderRadius:8, background:'var(--surface-2)' }}>
                  <span style={{ fontSize:13, flexShrink:0 }}>{t.icon}</span>
                  <div style={{ flex:1, minWidth:0 }}>
                    <span style={{ fontSize:11, fontWeight:700, color:t.color }}>{t.label}</span>
                    {w.summary && (
                      <span style={{ fontSize:11, color:'var(--text-3)', marginLeft:6 }}>
                        {w.summary}
                      </span>
                    )}
                  </div>
                  <span style={{ fontSize:10, color:'var(--text-4)', flexShrink:0 }}>
                    {w.at?.slice(11,16)}
                  </span>
                </div>
              );
            })}
          </div>
        </div>
      )}

      {/* 구분선 */}
      {viewMode === 'all' && schedules.length > 0 && notes.length > 0 && (
        <div style={{ height:1, background:'var(--divider)', margin:'8px 0 12px' }}/>
      )}

      {/* 노트 목록 */}
      {viewMode !== 'schedules' && (
        <div>
          <div style={{ display:'flex', justifyContent:'space-between', alignItems:'center', marginBottom:6 }}>
            <span style={{ fontSize:11, fontWeight:800, color:'var(--text-3)', textTransform:'uppercase', letterSpacing:'0.04em' }}>
              테스트 노트 {notes.length > 0 ? `· ${notes.length}` : ''}
            </span>
            <button className="btn sm ghost" style={{ fontSize:11, padding:'3px 8px' }} onClick={onAddNote}>
              + 추가
            </button>
          </div>
          {notes.length > 0 ? (
            <div style={{ display:'flex', flexDirection:'column', gap:6, maxHeight:320, overflowY:'auto' }}>
              {notes.map(n => {
                const sc = STATUS_COLORS[n.status] || STATUS_COLORS['아이디어'];
                const sb = STATUS_BORDER[n.status] || 'var(--border)';
                return (
                  <button key={n.id} onClick={() => router.push(`/note/${n.id}`)}
                    style={{
                      display:'flex', flexDirection:'column', gap:5, padding:'10px 12px',
                      borderRadius:10, border:'none', cursor:'pointer', font:'inherit',
                      background:'var(--surface-2)', textAlign:'left', width:'100%',
                      borderLeft:`3px solid ${sb}`,
                    }}>
                    <div style={{ display:'flex', alignItems:'center', gap:6 }}>
                      <span style={{ fontSize:10, fontWeight:700, padding:'2px 7px', borderRadius:99,
                        background:sc.bg, color:sc.color, flexShrink:0 }}>{n.status}</span>
                      {n.noteType && <span style={{ fontSize:10, color:'var(--text-4)' }}>{n.noteType}</span>}
                    </div>
                    <div style={{ fontSize:13, fontWeight:600, color:'var(--text-1)', lineHeight:1.35 }}>
                      {n.title || '(제목 없음)'}
                    </div>
                    {n.menuName && <div style={{ fontSize:11, color:'var(--text-3)' }}>{n.menuName}</div>}
                    {n.testContent && (
                      <div style={{ fontSize:11, color:'var(--text-3)', lineHeight:1.5,
                        overflow:'hidden', display:'-webkit-box', WebkitLineClamp:2, WebkitBoxOrient:'vertical' }}>
                        {n.testContent}
                      </div>
                    )}
                  </button>
                );
              })}
            </div>
          ) : (
            <button className="btn sm ghost" style={{ width:'100%', textAlign:'left', fontSize:12, color:'var(--text-4)', justifyContent:'flex-start' }}
              onClick={onAddNote}>
              + 테스트 노트 작성하기
            </button>
          )}
        </div>
      )}
    </>
  );
}
