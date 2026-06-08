'use client';
import { Icon } from '@/components/icons';

function ymText(status) {
  if (!status) return '확인 중';
  if (status.never) return '이력 없음';
  return `${status.year}.${String(status.month).padStart(2, '0')}`;
}

function statusMeta(status) {
  if (!status) return { label: '확인 중', color: 'var(--text-3)', bg: 'var(--surface-2)', border: 'var(--border)' };
  if (status.never) return { label: '이력 없음', color: 'var(--negative)', bg: 'var(--negative-soft)', border: 'rgba(239,68,68,.25)' };
  if (status.stale) return { label: '업데이트 필요', color: 'var(--warn)', bg: 'var(--warn-soft)', border: 'rgba(245,158,11,.28)' };
  return { label: '최신', color: 'var(--positive)', bg: 'var(--positive-soft)', border: 'rgba(16,185,129,.25)' };
}

function backupMeta(reminder) {
  if (!reminder) return { label: '확인 중', detail: '확인 중', color: 'var(--text-3)', bg: 'var(--surface-2)', border: 'var(--border)' };
  if (reminder.never) return { label: '백업 필요', detail: '이력 없음', color: 'var(--negative)', bg: 'var(--negative-soft)', border: 'rgba(239,68,68,.25)' };
  if (reminder.stale) return { label: '백업 권장', detail: `${reminder.daysSince}일 전`, color: 'var(--warn)', bg: 'var(--warn-soft)', border: 'rgba(245,158,11,.28)' };
  return { label: '정상', detail: `${reminder.daysSince}일 전`, color: 'var(--positive)', bg: 'var(--positive-soft)', border: 'rgba(16,185,129,.25)' };
}

function targetText(target) {
  if (!target) return '지난달 기준';
  return `${target.year}.${String(target.month).padStart(2, '0')} 기준`;
}

export function DataFreshnessWidget({ freshness, backupReminder, isMain, router }) {
  const uploadRows = [
    { key: 'sales', label: '판매량', desc: '월별 메뉴 판매 데이터', href: '/menu-sales/upload', status: freshness?.sales },
    isMain ? { key: 'price', label: '제때 단가', desc: '식자재 단가 파일', href: '/jette/price-compare', status: freshness?.price } : null,
    isMain ? { key: 'shipment', label: '출고량', desc: '제때 제품 출고 파일', href: '/jette/shipment', status: freshness?.shipment } : null,
  ].filter(Boolean);
  const backup = backupMeta(backupReminder);
  const needsAttention = uploadRows.filter(row => statusMeta(row.status).label !== '최신').length
    + (backupReminder?.stale ? 1 : 0);

  return (
    <div className="card" style={{ display: 'flex', flexDirection: 'column', gap: 12 }}>
      <div className="card-header">
        <div>
          <div className="card-title">데이터 신선도</div>
          <div className="card-sub">
            {needsAttention > 0 ? `${needsAttention}개 항목 확인 필요` : '핵심 데이터 최신 상태'} · {targetText(freshness?.target)}
          </div>
        </div>
        <button className="link accent" onClick={() => router.push('/settings/backup')}>
          백업 <Icon.chevRight />
        </button>
      </div>

      <div style={{ display: 'grid', gap: 8 }}>
        {uploadRows.map(row => {
          const meta = statusMeta(row.status);
          return (
            <button key={row.key} className="widget-row"
              onClick={() => router.push(row.href)}
              style={{
                display: 'grid',
                gridTemplateColumns: '32px minmax(0, 1fr) auto',
                alignItems: 'center',
                gap: 10,
                width: '100%',
                padding: '10px 12px',
                border: '1px solid var(--border)',
                borderRadius: 8,
                background: 'var(--surface)',
                textAlign: 'left',
                cursor: 'pointer',
                font: 'inherit',
              }}
            >
              <span style={{
                width: 32,
                height: 32,
                display: 'grid',
                placeItems: 'center',
                borderRadius: 8,
                background: meta.bg,
                color: meta.color,
                border: `1px solid ${meta.border}`,
              }}>
                {row.status?.stale ? <Icon.alert style={{ width: 16, height: 16 }} /> : <Icon.check style={{ width: 16, height: 16 }} />}
              </span>
              <span style={{ minWidth: 0 }}>
                <span style={{ display: 'block', fontSize: 13, fontWeight: 700, color: 'var(--text-1)' }}>{row.label}</span>
                <span style={{ display: 'block', fontSize: 11, color: 'var(--text-3)', overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap' }}>
                  {row.desc} · 마지막 {ymText(row.status)}
                </span>
              </span>
              <span style={{
                padding: '4px 8px',
                borderRadius: 999,
                fontSize: 11,
                fontWeight: 800,
                color: meta.color,
                background: meta.bg,
                border: `1px solid ${meta.border}`,
              }}>
                {meta.label}
              </span>
            </button>
          );
        })}

        <button className="widget-row"
          onClick={() => router.push('/settings/backup')}
          style={{
            display: 'grid',
            gridTemplateColumns: '32px minmax(0, 1fr) auto',
            alignItems: 'center',
            gap: 10,
            width: '100%',
            padding: '10px 12px',
            border: '1px solid var(--border)',
            borderRadius: 8,
            background: 'var(--surface)',
            textAlign: 'left',
            cursor: 'pointer',
            font: 'inherit',
          }}
        >
          <span style={{
            width: 32,
            height: 32,
            display: 'grid',
            placeItems: 'center',
            borderRadius: 8,
            background: backup.bg,
            color: backup.color,
            border: `1px solid ${backup.border}`,
          }}>
            {backupReminder?.stale ? <Icon.alert style={{ width: 16, height: 16 }} /> : <Icon.download style={{ width: 16, height: 16 }} />}
          </span>
          <span style={{ minWidth: 0 }}>
            <span style={{ display: 'block', fontSize: 13, fontWeight: 700, color: 'var(--text-1)' }}>백업</span>
            <span style={{ display: 'block', fontSize: 11, color: 'var(--text-3)' }}>마지막 백업 · {backup.detail}</span>
          </span>
          <span style={{
            padding: '4px 8px',
            borderRadius: 999,
            fontSize: 11,
            fontWeight: 800,
            color: backup.color,
            background: backup.bg,
            border: `1px solid ${backup.border}`,
          }}>
            {backup.label}
          </span>
        </button>
      </div>
    </div>
  );
}
