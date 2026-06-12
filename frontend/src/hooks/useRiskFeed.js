// filename: frontend/src/hooks/useRiskFeed.js
import { useState, useEffect, useCallback } from 'react';
import { useSocket } from './useSocket';
import { getDashboardEvents } from '../services/api';

const MAX_EVENTS = 50;

export function useRiskFeed() {
  const { on, off, connected } = useSocket();
  const [events, setEvents] = useState([]);

  // Fetch historical events on mount
  useEffect(() => {
    async function loadHistory() {
      try {
        const res = await getDashboardEvents({ limit: MAX_EVENTS });
        if (res.success && Array.isArray(res.data)) {
          // Map backend fields to frontend expectations if necessary
          const formatted = res.data.map(e => ({
            ...e,
            receivedAt: e.timestamp,
          }));
          setEvents(formatted);
        }
      } catch (err) {
        console.error('Failed to load risk feed history:', err);
      }
    }
    loadHistory();
  }, []);

  useEffect(() => {
    const handleNewEvent = (event) => {
      setEvents((prev) => {
        // Prevent duplicate events if we already have it in history
        if (prev.some(e => e.id === event.id)) return prev;

        const enriched = {
          ...event,
          id: event.id ?? `${Date.now()}-${Math.random()}`,
          receivedAt: Date.now(),
        };
        const next = [enriched, ...prev];
        return next.slice(0, MAX_EVENTS);
      });
    };

    const unsub = on('risk:new_event', handleNewEvent);
    return () => {
      if (typeof unsub === 'function') unsub();
      else off('risk:new_event', handleNewEvent);
    };
  }, [on, off]);

  const clearEvents = useCallback(() => setEvents([]), []);

  return { events, clearEvents, connected };
}

export default useRiskFeed;
