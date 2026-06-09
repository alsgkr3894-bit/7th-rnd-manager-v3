'use client';
import { useEffect, useRef, useState } from 'react';
import { usePathname } from 'next/navigation';

export default function ProgressBar() {
  const pathname = usePathname();
  const [pct,    setPct]    = useState(0);
  const [active, setActive] = useState(false);
  const timer  = useRef(null);
  const settleTimer = useRef(null);
  const cur    = useRef(0);
  const prev   = useRef(pathname);

  useEffect(() => {
    function start() {
      clearInterval(timer.current);
      cur.current = 10;
      setPct(10);
      setActive(true);
      clearTimeout(settleTimer.current);
      timer.current = setInterval(() => {
        cur.current = Math.min(cur.current + Math.random() * 14, 82);
        setPct(cur.current);
      }, 280);
    }
    function onLinkClick(e) {
      const a = e.target.closest('a[href]');
      if (!a) return;
      const href = a.getAttribute('href');
      if (!href || href.startsWith('#') || href.startsWith('http') || href.startsWith('mailto')) return;
      start();
    }
    document.addEventListener('click', onLinkClick);
    return () => {
      document.removeEventListener('click', onLinkClick);
      clearInterval(timer.current);
      clearTimeout(settleTimer.current);
    };
  }, []);

  useEffect(() => {
    if (pathname !== prev.current) {
      prev.current = pathname;
      clearInterval(timer.current);
      clearTimeout(settleTimer.current);
      setPct(100);
      settleTimer.current = setTimeout(() => { setActive(false); setPct(0); }, 360);
    }
  }, [pathname]);

  return (
    <div style={{ position:'fixed', top:0, left:0, right:0, height:3, zIndex:9999, pointerEvents:'none' }}>
      <div style={{
        height:'100%', width:`${pct}%`,
        background:'var(--accent)',
        borderRadius:'0 2px 2px 0',
        opacity: active || pct > 0 ? 1 : 0,
        transition: pct === 100 ? 'width 180ms ease, opacity 360ms 360ms ease'
                  : 'width 600ms ease',
        boxShadow: '0 0 10px var(--accent), 0 0 4px var(--accent)',
      }}/>
    </div>
  );
}
