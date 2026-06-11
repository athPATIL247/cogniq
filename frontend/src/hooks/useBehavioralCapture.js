// filename: frontend/src/hooks/useBehavioralCapture.js
import { useRef, useEffect, useCallback } from 'react';

export function useBehavioralCapture() {
  const captureRef = useRef(null);
  const sessionStartRef = useRef(Date.now());

  const keyDownTimestamps = useRef({});
  const dwellTimes = useRef([]);
  const flightTimes = useRef([]);
  const lastKeyUpTime = useRef(null);
  const keyDownCount = useRef(0);

  const mouseVelocitySamples = useRef([]);
  const lastMousePos = useRef(null);
  const lastMouseTime = useRef(null);

  const touchPressureSamples = useRef([]);
  const clickCount = useRef(0);

  const handleKeyDown = useCallback((e) => {
    keyDownTimestamps.current[e.code] = Date.now();
    keyDownCount.current += 1;
  }, []);

  const handleKeyUp = useCallback((e) => {
    const now = Date.now();
    const downTime = keyDownTimestamps.current[e.code];
    if (downTime) {
      dwellTimes.current.push(now - downTime);
      delete keyDownTimestamps.current[e.code];
    }
    if (lastKeyUpTime.current !== null) {
      flightTimes.current.push(now - lastKeyUpTime.current);
    }
    lastKeyUpTime.current = now;
  }, []);

  const handleMouseMove = useCallback((e) => {
    const now = Date.now();
    const pos = { x: e.clientX, y: e.clientY };
    if (lastMousePos.current && lastMouseTime.current) {
      const dx = pos.x - lastMousePos.current.x;
      const dy = pos.y - lastMousePos.current.y;
      const dt = (now - lastMouseTime.current) / 1000;
      if (dt > 0) {
        const velocity = Math.sqrt(dx * dx + dy * dy) / dt;
        const samples = mouseVelocitySamples.current;
        samples.push(velocity);
        if (samples.length > 20) samples.shift();
      }
    }
    lastMousePos.current = pos;
    lastMouseTime.current = now;
  }, []);

  const handleTouchMove = useCallback((e) => {
    const touch = e.touches[0];
    if (touch && touch.force !== undefined && touch.force > 0) {
      touchPressureSamples.current.push(touch.force);
    }
  }, []);

  const handleClick = useCallback(() => {
    clickCount.current += 1;
  }, []);

  useEffect(() => {
    const el = captureRef.current;
    if (!el) return;

    el.addEventListener('keydown', handleKeyDown);
    el.addEventListener('keyup', handleKeyUp);
    el.addEventListener('mousemove', handleMouseMove);
    el.addEventListener('touchmove', handleTouchMove, { passive: true });
    el.addEventListener('click', handleClick);

    return () => {
      el.removeEventListener('keydown', handleKeyDown);
      el.removeEventListener('keyup', handleKeyUp);
      el.removeEventListener('mousemove', handleMouseMove);
      el.removeEventListener('touchmove', handleTouchMove);
      el.removeEventListener('click', handleClick);
    };
  }, [handleKeyDown, handleKeyUp, handleMouseMove, handleTouchMove, handleClick]);

  const mean = (arr) => arr.length === 0 ? 0 : arr.reduce((a, b) => a + b, 0) / arr.length;
  const stdDev = (arr) => {
    if (arr.length < 2) return 0;
    const avg = mean(arr);
    const variance = arr.reduce((sum, v) => sum + (v - avg) ** 2, 0) / arr.length;
    return Math.sqrt(variance);
  };

  const getSnapshot = useCallback(() => {
    const now = Date.now();
    const sessionDurationMin = (now - sessionStartRef.current) / 60000;
    const totalActions = keyDownCount.current + clickCount.current;

    const avgDwellTime = mean(dwellTimes.current);
    const dwellStdDev = stdDev(dwellTimes.current);
    const avgFlightTime = mean(flightTimes.current);
    const flightStdDev = stdDev(flightTimes.current);
    const typingSpeedWpm = sessionDurationMin > 0
      ? keyDownCount.current / sessionDurationMin / 5
      : 0;
    const mouseVelocity = mean(mouseVelocitySamples.current);
    const swipePressure = mean(touchPressureSamples.current);
    const actionsPerMin = sessionDurationMin > 0 ? totalActions / sessionDurationMin : 0;

    return {
      avgDwellTime: Math.round(avgDwellTime),
      dwellStdDev: Math.round(dwellStdDev),
      avgFlightTime: Math.round(avgFlightTime),
      flightStdDev: Math.round(flightStdDev),
      typingSpeedWpm: Math.round(typingSpeedWpm * 10) / 10,
      sessionDurationMin: Math.round(sessionDurationMin * 100) / 100,
      actionsPerMin: Math.round(actionsPerMin * 10) / 10,
      mouseVelocity: Math.round(mouseVelocity),
      swipePressure: Math.round(swipePressure * 1000) / 1000,
      hourOfDay: new Date().getHours(),
    };
  }, []);

  return { captureRef, getSnapshot };
}
