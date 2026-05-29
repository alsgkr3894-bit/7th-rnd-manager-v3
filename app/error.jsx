'use client';
import { useCallback, useEffect, useRef, useState } from 'react';
import styles from './error.module.css';

export default function ErrorPage({ error, reset }) {
  const [countdown, setCountdown] = useState(null);
  const timerRef = useRef(null);

  useEffect(() => {
    return () => { if (timerRef.current) clearInterval(timerRef.current); };
  }, []);

  const handleRetry = useCallback(() => {
    if (timerRef.current) return;
    let remaining = 5;
    setCountdown(remaining);
    timerRef.current = setInterval(() => {
      remaining--;
      if (remaining <= 0) {
        clearInterval(timerRef.current);
        timerRef.current = null;
        setCountdown(null);
        reset?.();
      } else {
        setCountdown(remaining);
      }
    }, 1000);
  }, [reset]);

  const digits = ['5', '0', '5'];
  const delays = [
    { enter: '.18s', float: '1.0s', duration: '4.8s' },
    { enter: '.32s', float: '1.1s', duration: '5.2s' },
    { enter: '.46s', float: '1.2s', duration: '4.5s' },
  ];

  return (
    <div className={styles.root}>
      <div className={`${styles.orb} ${styles.orb1}`} />
      <div className={`${styles.orb} ${styles.orb2}`} />
      <div className={`${styles.orb} ${styles.orb3}`} />
      <div className={styles.gridBg} />
      <div className={styles.scanlines} />

      <div className={styles.container}>
        <div className={styles.logo}>
          <div className={styles.logoBadge}>7th</div>
          <span className={styles.logoText}>R&amp;D Manager</span>
          <div className={styles.logoDivider} />
          <span className={styles.logoSub}>7번가 연구개발</span>
        </div>

        <div className={styles.errBadge}>
          <div className={styles.pulseDot} aria-hidden="true" />
          서버 연결 오류 감지됨
        </div>

        <div className={styles.errorNum} role="img" aria-label="505 오류">
          {digits.map((d, i) => (
            <span
              aria-hidden="true"
              key={i}
              className={styles.digitWrap}
              style={{
                animationDelay: `${delays[i].enter}, ${delays[i].float}`,
                animationDuration: `.75s, ${delays[i].duration}`,
              }}
            >
              <span className={styles.digitMain}>{d}</span>
              <span className={styles.digitGlitchA}>{d}</span>
              <span className={styles.digitGlitchB}>{d}</span>
            </span>
          ))}
        </div>

        <div className={styles.numLine} />

        <h1 className={styles.heading}>오류가 발생했어요</h1>
        <p className={styles.desc}>
          예기치 않은 오류가 발생했어요. 아래 버튼으로 다시 시도해 주세요.<br />
          문제가 지속되면 시스템 관리자에게 문의해 주세요.
        </p>
        {error?.message && (
          <p style={{ fontSize: 11, color: 'var(--text-4, #888)', fontFamily: 'monospace',
            background: 'rgba(0,0,0,.18)', borderRadius: 6, padding: '6px 12px', marginTop: 8,
            maxWidth: 480, wordBreak: 'break-all' }}>
            {error.message}
          </p>
        )}

        <div className={styles.actions}>
          <button
            className={`${styles.btn} ${styles.btnErr}`}
            onClick={handleRetry}
            disabled={countdown !== null}
            style={countdown !== null ? { opacity: .7, cursor: 'not-allowed' } : undefined}
          >
            <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.2" strokeLinecap="round" strokeLinejoin="round">
              <path d="M3 12a9 9 0 1 0 9-9 9.75 9.75 0 0 0-6.74 2.74L3 8"/>
              <path d="M3 3v5h5"/>
            </svg>
            다시 시도
            {countdown !== null && (
              <span className={styles.countdown}>{countdown}s</span>
            )}
          </button>
          <a href="/" className={`${styles.btn} ${styles.btnGhost}`}>
            <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.2" strokeLinecap="round" strokeLinejoin="round">
              <path d="M3 11.5 12 4l9 7.5"/><path d="M5 10v9a1 1 0 0 0 1 1h4v-6h4v6h4a1 1 0 0 0 1-1v-9"/>
            </svg>
            홈으로 돌아가기
          </a>
        </div>
      </div>
    </div>
  );
}
