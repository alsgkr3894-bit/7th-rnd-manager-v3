'use client';
import { InfoCell } from './primitives';

export function SystemAppInfoCard({ appVersion, dbName, dbVersion, roleReady, isAdmin }) {
  return (
    <div className="card" style={{ marginTop: 16 }}>
      <h2 style={{ fontSize: 15, fontWeight: 700, marginBottom: 16 }}>앱 정보</h2>
      <div
        style={{
          display: 'grid',
          gridTemplateColumns: 'repeat(auto-fit,minmax(180px,1fr))',
          gap: 24,
        }}
      >
        <InfoCell label="앱 버전" value={appVersion} />
        <InfoCell label="DB 이름" value={dbName} mono />
        <InfoCell label="DB 버전" value={dbVersion} />
        <InfoCell label="환경" value="개발 (localhost)" />
        <InfoCell
          label="현재 권한"
          value={!roleReady ? '확인 중…' : isAdmin ? '관리자 (admin)' : '조회자 (viewer)'}
        />
      </div>
    </div>
  );
}
