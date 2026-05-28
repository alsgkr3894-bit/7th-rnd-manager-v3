'use client';
import { useEffect, useRef } from 'react';
import { useRouter } from 'next/navigation';
import styles from './not-found.module.css';

export default function NotFound() {
  const router = useRouter();
  const particlesRef = useRef(null);

  useEffect(() => {
    const wrap = particlesRef.current;
    if (!wrap) return;
    wrap.innerHTML = '';
    for (let i = 0; i < 22; i++) {
      const p = document.createElement('div');
      p.className = styles.particle;
      const sz = Math.random() * 90 + 10;
      p.style.cssText = [
        `width:${sz}px`, `height:${sz}px`,
        `left:${Math.random() * 100}%`,
        `bottom:${-sz}px`,
        `animation-duration:${Math.random() * 18 + 10}s`,
        `animation-delay:${Math.random() * -25}s`,
      ].join(';');
      wrap.appendChild(p);
    }
    return () => { wrap.innerHTML = ''; };
  }, []);

  return (
    <div className={styles.root}>
      <div className={`${styles.orb} ${styles.orb1}`} />
      <div className={`${styles.orb} ${styles.orb2}`} />
      <div className={`${styles.orb} ${styles.orb3}`} />
      <div className={styles.gridBg} />
      <div ref={particlesRef} className={styles.particles} />

      <div className={styles.container}>
        <div className={styles.logo}>
          <div className={styles.logoBadge}>7th</div>
          <span className={styles.logoText}>R&amp;D Manager</span>
          <div className={styles.logoDivider} />
          <span className={styles.logoSub}>7번가 연구개발</span>
        </div>

        <div className={styles.errorNum} role="img" aria-label="404 오류">
          <span aria-hidden="true" className={`${styles.digit} ${styles.digitOutline}`}>4</span>
          <span aria-hidden="true" className={`${styles.digit} ${styles.digitFill}`}>0</span>
          <span aria-hidden="true" className={`${styles.digit} ${styles.digitOutline} ${styles.digitLast}`}>4</span>
        </div>

        <div className={styles.numLine} />

        <h1 className={styles.heading}>페이지를 찾을 수 없어요</h1>
        <p className={styles.desc}>
          요청하신 페이지가 삭제되었거나 다른 곳으로 이동되었어요.<br />
          URL을 다시 확인하거나 홈으로 돌아가 보세요.
        </p>

        <div className={styles.actions}>
          <a href="/" className={`${styles.btn} ${styles.btnPrimary}`}>
            <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.2" strokeLinecap="round" strokeLinejoin="round">
              <path d="M3 11.5 12 4l9 7.5"/><path d="M5 10v9a1 1 0 0 0 1 1h4v-6h4v6h4a1 1 0 0 0 1-1v-9"/>
            </svg>
            홈으로 돌아가기
          </a>
          <button onClick={() => router.back()} className={`${styles.btn} ${styles.btnGhost}`}>
            <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.2" strokeLinecap="round" strokeLinejoin="round">
              <path d="m19 12H5M12 5l-7 7 7 7"/>
            </svg>
            이전 페이지
          </button>
        </div>
      </div>
    </div>
  );
}
