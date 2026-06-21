'use client';
import { ACCOUNT_ROLES, ROLE_COLORS } from './_accountSettingsConstants';

const PERMISSIONS = [
  { name: '판매량 업로드', r: ['✓', '✓', '', '✓'] },
  { name: '단가 업로드·수정', r: ['✓', '✓', '', ''] },
  { name: '원가표·메뉴 편집', r: ['✓', '✓', '', ''] },
  { name: '보고서 생성', r: ['✓', '✓', '', ''] },
  { name: '보고서 조회', r: ['✓', '✓', '✓', '✓'] },
  { name: '메뉴개발노트 작성', r: ['✓', '✓', '', ''] },
  { name: '백업·복원 실행', r: ['✓', '', '', ''] },
  { name: '구성원 관리', r: ['✓', '', '', ''] },
];

const S_PERM_CHECK = {
  display: 'inline-flex',
  width: 24,
  height: 24,
  borderRadius: 6,
  background: 'var(--positive-soft)',
  color: 'var(--positive)',
  alignItems: 'center',
  justifyContent: 'center',
  fontWeight: 800,
};

export function AccountPermissionsMatrix() {
  return (
    <div className="card" style={{ marginTop: 16 }}>
      <h2 style={{ fontSize: 15, fontWeight: 700, marginBottom: 4 }}>역할별 권한 (정보)</h2>
      <p style={{ fontSize: 13, color: 'var(--text-3)', marginBottom: 16 }}>
        향후 멀티 사용자 환경 도입 시 기준이 되는 역할·권한 표입니다. 현재는 표시용입니다.
      </p>
      <div style={{ overflowX: 'auto' }}>
        <table className="data-table" style={{ width: '100%' }}>
          <thead>
            <tr>
              <th style={{ width: 180 }}>권한</th>
              {ACCOUNT_ROLES.map(r => (
                <th key={r} style={{ textAlign: 'center', width: 110 }}>
                  <span
                    className="chip"
                    style={{
                      background: ROLE_COLORS[r].bg,
                      color: ROLE_COLORS[r].color,
                      fontSize: 11,
                    }}
                  >
                    {r}
                  </span>
                </th>
              ))}
            </tr>
          </thead>
          <tbody>
            {PERMISSIONS.map(row => (
              <tr key={row.name}>
                <td style={{ fontWeight: 600 }}>{row.name}</td>
                {row.r.map((v, i) => (
                  <td key={i} style={{ textAlign: 'center' }}>
                    {v ? (
                      <span style={S_PERM_CHECK}>{v}</span>
                    ) : (
                      <span style={{ color: 'var(--text-4)' }}>—</span>
                    )}
                  </td>
                ))}
              </tr>
            ))}
          </tbody>
        </table>
      </div>
    </div>
  );
}
