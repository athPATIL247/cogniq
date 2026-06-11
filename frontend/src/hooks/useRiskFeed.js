// filename: frontend/src/hooks/useRiskFeed.js
import { useState, useEffect, useCallback } from 'react';
import { useSocket } from './useSocket';

const MAX_EVENTS = 50;

export function useRiskFeed() {
  const { on, off, connected } = useSocket();
  const [events, setEvents] = useState([]);

  useEffect(() => {
    const handleNewEvent = (event) => {
      setEvents((prev) => {
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
