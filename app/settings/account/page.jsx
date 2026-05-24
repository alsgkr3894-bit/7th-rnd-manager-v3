'use client';
import { useEffect, useState } from 'react';
import { Icon } from '@/components/icons';
import { PageHeader } from '@/components/ui/PageHeader';
import { showToast } from '@/components/Toast';
import { getProfile, setProfile, getInitial } from '@/lib/profile';
import { getLastLogin, getCachedIP, fetchClientIP } from '@/lib/session';
import { formatRelative } from '@/lib/format';
import { SettingTile } from '@/components/ui/SettingTile';

/**
 * 계정 관리 페이지
 *
 * v3는 단일 사용자 / 로컬 환경 — 인증·멀티 사용자 시스템 없음.
 * 디자인 기준이지만 다음 항목은 제외:
 *   - 마지막 로그인 / 접속 IP (인증 없음)
 *   - 비밀번호 변경 / 2FA (로그인 없음)
 *   - 구성원 목록 / 초대 / 역할 변경 (멀티 사용자 없음)
 *
 * 포함:
 *   - 내 프로필 카드 (편집 가능, localStorage 저장)
 *   - 단일 사용자 환경 안내
 *   - 역할별 권한 매트릭스 (정보 표시 / 향후 멀티 사용자 도입 시 기준)
 */

const ROLES = ['관리자', '에디터', '조회자', 'API'];

const ROLE_COLORS = {
  '관리자': { bg: 'var(--accent-soft)',   color: 'var(--accent-text)' },
  '에디터': { bg: 'var(--positive-soft)', color: 'var(--positive)' },
  '조회자': { bg: 'var(--surface-2)',     color: 'var(--text-2)' },
  'API':    { bg: '#F0EBFF',              color: '#6B3FCB' },
};

// 권한 매트릭스 (정보용)
const PERMISSIONS = [
  { name: '판매량 업로드',     r: ['✓', '✓', '',  '✓'] },
  { name: '단가 업로드·수정',  r: ['✓', '✓', '',  ''] },
  { name: '원가표·메뉴 편집',  r: ['✓', '✓', '',  ''] },
  { name: '보고서 생성',       r: ['✓', '✓', '',  ''] },
  { name: '보고서 조회',       r: ['✓', '✓', '✓', '✓'] },
  { name: '메뉴개발노트 작성', r: ['✓', '✓', '',  ''] },
  { name: '백업·복원 실행',    r: ['✓', '',  '',  ''] },
  { name: '구성원 관리',       r: ['✓', '',  '',  ''] },
];

export default function Page() {
  const [profile, setProfileState] = useState(null);
  const [editing, setEditing] = useState(false);
  const [form, setForm] = useState({ name: '', email: '', team: '', role: '' });

  // 세션 정보
  const [lastLogin, setLastLogin] = useState(null);
  const [ipEntry, setIpEntry]     = useState(null); // { ip, at } | null
  const [ipLoading, setIpLoading] = useState(true);

  useEffect(() => {
    const p = getProfile();
    setProfileState(p);
    setForm(p);

    setLastLogin(getLastLogin());

    // 캐시된 IP 먼저 즉시 표시 → 백그라운드에서 최신 IP fetch
    const cached = getCachedIP();
    if (cached) setIpEntry(cached);

    fetchClientIP().then(entry => {
      if (entry) setIpEntry(entry);
      setIpLoading(false);
    });
  }, []);

  function startEdit() {
    setForm({ ...profile });
    setEditing(true);
  }

  function cancelEdit() {
    setEditing(false);
    setForm({ ...profile });
  }

  function saveEdit() {
    if (!form.name?.trim()) {
      showToast('이름은 비울 수 없습니다.', 'err');
      return;
    }
    const next = setProfile({
      name:  form.name.trim(),
      email: form.email?.trim() || '',
      team:  form.team?.trim() || '',
      role:  form.role || '관리자',
    });
    setProfileState(next);
    setEditing(false);
    showToast('프로필이 저장되었습니다.', 'ok');
  }

  if (!profile) {
    return (
      <main className="main">
        <PageHeader breadcrumb={["설정 / 백업", "계정 관리"]} title="계정 관리" />
        <div style={{padding:24,color:'var(--text-3)'}}>로딩 중…</div>
      </main>
    );
  }

  return (
    <main className="main">
      <PageHeader
        breadcrumb={["설정 / 백업", "계정 관리"]}
        title="계정 관리"
        sub="내 프로필 정보와 역할별 권한 기준을 확인하세요"
      />

      {/* 단일 사용자 환경 안내 */}
      <div className="card" style={{
        marginTop:24,padding:'14px 18px',
        background:'var(--accent-soft)',
        borderColor:'var(--accent-soft)',
        display:'flex',gap:12,alignItems:'flex-start',
      }}>
        <Icon.alert style={{width:16,height:16,color:'var(--accent)',marginTop:2,flex:'0 0 16px'}}/>
        <div style={{fontSize:13,color:'var(--text-2)',lineHeight:1.6}}>
          <b style={{color:'var(--accent-text)'}}>현재 v3는 단일 사용자 / 로컬 환경입니다.</b>
          <br/>
          로그인·인증·멀티 사용자·접근 권한은 아직 구현되어 있지 않습니다.
          프로필 정보는 화면 표시용이며 이 브라우저에만 저장됩니다.
        </div>
      </div>

      {/* 내 프로필 */}
      <div className="card" style={{marginTop:16,padding:24,display:'flex',gap:24,alignItems:'flex-start'}}>
        {/* 아바타 */}
        <div style={{
          width:72,height:72,borderRadius:'50%',
          background:'var(--accent)',color:'#fff',
          display:'flex',alignItems:'center',justifyContent:'center',
          fontWeight:800,fontSize:28,flex:'0 0 72px',
        }}>
          {getInitial(profile.name)}
        </div>

        <div style={{flex:1,minWidth:0}}>
          {!editing ? (
            <>
              <div style={{fontSize:20,fontWeight:700,marginBottom:6}}>{profile.name}</div>
              <div style={{display:'flex',alignItems:'center',gap:10,fontSize:13,color:'var(--text-2)',flexWrap:'wrap'}}>
                {profile.team && <span>{profile.team}</span>}
                {profile.team && profile.email && <span style={{color:'var(--text-4)'}}>·</span>}
                {profile.email && <span style={{fontFamily:'monospace'}}>{profile.email}</span>}
                <span className="chip" style={{
                  background: ROLE_COLORS[profile.role]?.bg || 'var(--surface-2)',
                  color: ROLE_COLORS[profile.role]?.color || 'var(--text-2)',
                  marginLeft: 6,
                }}>
                  {profile.role}
                </span>
              </div>
              <div style={{display:'flex',gap:8,marginTop:16}}>
                <button className="btn sm" onClick={startEdit}>
                  <Icon.note style={{width:12,height:12}}/>
                  프로필 수정
                </button>
              </div>
            </>
          ) : (
            <div style={{display:'grid',gridTemplateColumns:'repeat(auto-fit,minmax(220px,1fr))',gap:12}}>
              <FormField label="이름" required>
                <input
                  className="input"
                  value={form.name}
                  onChange={e => setForm(f => ({ ...f, name: e.target.value }))}
                  placeholder="예: 이민학 주임"
                />
              </FormField>
              <FormField label="이메일">
                <input
                  className="input"
                  type="email"
                  value={form.email}
                  onChange={e => setForm(f => ({ ...f, email: e.target.value }))}
                  placeholder="예: rnd@7thpizza.com"
                />
              </FormField>
              <FormField label="팀">
                <input
                  className="input"
                  value={form.team}
                  onChange={e => setForm(f => ({ ...f, team: e.target.value }))}
                  placeholder="예: R&D팀"
                />
              </FormField>
              <FormField label="역할">
                <select
                  className="period-select"
                  value={form.role}
                  onChange={e => setForm(f => ({ ...f, role: e.target.value }))}
                  style={{width:'100%'}}
                >
                  {ROLES.map(r => <option key={r} value={r}>{r}</option>)}
                </select>
              </FormField>
              <div style={{gridColumn:'1 / -1',display:'flex',gap:8,justifyContent:'flex-end',marginTop:8}}>
                <button className="btn" onClick={cancelEdit}>취소</button>
                <button className="btn primary" onClick={saveEdit}>저장</button>
              </div>
            </div>
          )}
        </div>
      </div>

      {/* 세션 정보 — 마지막 로그인 / 접속 IP */}
      <div className="card" style={{marginTop:16}}>
        <h3 style={{fontSize:15,fontWeight:700,marginBottom:4}}>세션 정보</h3>
        <p style={{fontSize:13,color:'var(--text-3)',marginBottom:16}}>
          현재 브라우저 세션 기준 마지막 로그인 시각과 접속 IP입니다.
          IP는 외부 공개 API(<span style={{fontFamily:'monospace'}}>api.ipify.org</span>)로 조회합니다.
        </p>
        <div style={{display:'grid',gridTemplateColumns:'repeat(auto-fit,minmax(220px,1fr))',gap:16}}>
          <SettingTile variant="tile"
            label="마지막 로그인"
            value={lastLogin ? new Date(lastLogin).toLocaleString('ko-KR') : '기록 없음'}
            sub={lastLogin ? formatRelative(lastLogin) : '새 브라우저 세션이 시작되면 기록됩니다'}
          />
          <SettingTile variant="tile"
            label="접속 IP"
            value={
              ipEntry ? ipEntry.ip
              : ipLoading ? '조회 중…'
              : '외부 미연결'
            }
            sub={
              ipEntry ? `갱신: ${new Date(ipEntry.at).toLocaleString('ko-KR')}`
              : ipLoading ? '잠시만 기다려 주세요'
              : '외부 API 호출 실패 (오프라인 또는 차단)'
            }
            mono
          />
        </div>
      </div>

      {/* 역할별 권한 매트릭스 (정보 표시) */}
      <div className="card" style={{marginTop:16}}>
        <h3 style={{fontSize:15,fontWeight:700,marginBottom:4}}>역할별 권한 (정보)</h3>
        <p style={{fontSize:13,color:'var(--text-3)',marginBottom:16}}>
          향후 멀티 사용자 환경 도입 시 기준이 되는 역할·권한 표입니다. 현재는 표시용입니다.
        </p>
        <div style={{overflowX:'auto'}}>
          <table className="data-table" style={{width:'100%'}}>
            <thead>
              <tr>
                <th style={{width:180}}>권한</th>
                {ROLES.map(r => (
                  <th key={r} style={{textAlign:'center',width:110}}>
                    <span className="chip" style={{
                      background: ROLE_COLORS[r].bg,
                      color: ROLE_COLORS[r].color,
                      fontSize: 11,
                    }}>
                      {r}
                    </span>
                  </th>
                ))}
              </tr>
            </thead>
            <tbody>
              {PERMISSIONS.map(row => (
                <tr key={row.name}>
                  <td style={{fontWeight:600}}>{row.name}</td>
                  {row.r.map((v, i) => (
                    <td key={i} style={{textAlign:'center'}}>
                      {v ? (
                        <span style={{
                          display:'inline-flex',width:24,height:24,borderRadius:6,
                          background:'var(--positive-soft)',color:'var(--positive)',
                          alignItems:'center',justifyContent:'center',fontWeight:800,
                        }}>{v}</span>
                      ) : (
                        <span style={{color:'var(--text-4)'}}>—</span>
                      )}
                    </td>
                  ))}
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      </div>
    </main>
  );
}

/* ============================================================
   하위 컴포넌트
============================================================ */

function FormField({ label, required, children }) {
  return (
    <div>
      <label style={{display:'block',fontSize:12,color:'var(--text-3)',marginBottom:4,fontWeight:600}}>
        {label}
        {required && <span style={{color:'var(--negative)',marginLeft:3}}>*</span>}
      </label>
      {children}
    </div>
  );
}
