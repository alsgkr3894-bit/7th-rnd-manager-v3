'use client';

import { useCallback, useEffect, useRef, useState } from 'react';

export function useCalendarNavigation() {
  const [viewYear, setViewYear] = useState(() => new Date().getFullYear());
  const [viewMonth, setViewMonth] = useState(() => new Date().getMonth() + 1);
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

  const shiftMonth = useCallback(delta => {
    if (isAnimating.current) return;
    isAnimating.current = true;
    animationTimerRef.current = setTimeout(() => {
      isAnimating.current = false;
      animationTimerRef.current = null;
    }, 250);

    setMonthDir(delta);
    calKey.current += 1;
    setViewMonth(prev => {
      let month = prev + delta;
      if (month < 1) {
        setViewYear(year => year - 1);
        return 12;
      }
      if (month > 12) {
        setViewYear(year => year + 1);
        return 1;
      }
      return month;
    });
    setSelectedDay(null);
  }, []);

  const resetToToday = useCallback(() => {
    const now = new Date();
    setViewYear(now.getFullYear());
    setViewMonth(now.getMonth() + 1);
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
