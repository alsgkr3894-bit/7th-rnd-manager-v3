'use client';

import { useCallback, useEffect, useRef, useState } from 'react';

const INITIAL_YEAR = 2026;
const INITIAL_MONTH = 1;

export function shiftMonthYear({ year, month }, delta) {
  let nextMonth = month + delta;
  let nextYear = year;
  if (nextMonth < 1) {
    nextMonth = 12;
    nextYear -= 1;
  } else if (nextMonth > 12) {
    nextMonth = 1;
    nextYear += 1;
  }
  return { year: nextYear, month: nextMonth };
}

export function useCalendarNavigation() {
  const [view, setView] = useState({ year: INITIAL_YEAR, month: INITIAL_MONTH });
  const { year: viewYear, month: viewMonth } = view;
  const [selectedDay, setSelectedDay] = useState(null);
  const [panelClosing, setPanelClosing] = useState(false);
  const [monthDir, setMonthDir] = useState(0);
  const calKey = useRef(0);
  const isAnimating = useRef(false);
  const animationTimerRef = useRef(null);
  const panelTimerRef = useRef(null);

  useEffect(
    () => () => {
      if (animationTimerRef.current) clearTimeout(animationTimerRef.current);
      if (panelTimerRef.current) clearTimeout(panelTimerRef.current);
    },
    []
  );

  useEffect(() => {
    // 수정 화면에서 돌아오면(?month=&day=) 보던 달·날짜로 복원한다 — 전엔 항상 이번 달이었다
    const params = new URLSearchParams(window.location.search);
    const back = params.get('month') || '';
    const match = /^(\d{4})-(\d{2})$/.exec(back);
    if (match && Number(match[2]) >= 1 && Number(match[2]) <= 12) {
      setView({ year: Number(match[1]), month: Number(match[2]) });
      const day = params.get('day') || '';
      if (/^\d{4}-\d{2}-\d{2}$/.test(day) && day.startsWith(back)) setSelectedDay(day);
      return;
    }
    const now = new Date();
    setView({ year: now.getFullYear(), month: now.getMonth() + 1 });
  }, []);

  const shiftMonth = useCallback(delta => {
    if (isAnimating.current) return;
    isAnimating.current = true;
    animationTimerRef.current = setTimeout(() => {
      isAnimating.current = false;
      animationTimerRef.current = null;
    }, 250);

    setMonthDir(delta);
    calKey.current += 1;
    setView(prev => shiftMonthYear(prev, delta));
    setSelectedDay(null);
  }, []);

  const resetToToday = useCallback(() => {
    const now = new Date();
    setView({ year: now.getFullYear(), month: now.getMonth() + 1 });
    setSelectedDay(null);
  }, []);

  const closePanel = useCallback(() => {
    if (panelClosing) return;
    setPanelClosing(true);
    if (panelTimerRef.current) clearTimeout(panelTimerRef.current);
    panelTimerRef.current = setTimeout(() => {
      setSelectedDay(null);
      setPanelClosing(false);
      panelTimerRef.current = null;
    }, 180);
  }, [panelClosing]);

  return {
    viewYear,
    viewMonth,
    selectedDay,
    setSelectedDay,
    panelClosing,
    monthDir,
    calKey,
    shiftMonth,
    resetToToday,
    closePanel,
  };
}
