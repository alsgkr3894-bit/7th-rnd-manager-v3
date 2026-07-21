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
