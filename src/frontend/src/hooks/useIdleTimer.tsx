import {useEffect, useRef, useState} from "react";
import {useSignalR} from "../contexts/SignalRContext.tsx";

const IDLE_TIMEOUT_MS = 5 * 60 * 1000;   // 5 minutes
const THROTTLE_MS = 1000;

export default function useIdleTimer() {
  const { invokeSafely } = useSignalR();

  const [isIdle, setIsIdle] = useState(false);

  const isIdleRef = useRef(false);
  const idleTimerRef = useRef<number | null>(null);
  const lastActivityTimeRef = useRef<number>(Date.now());

  const setIdleState = (nextIdle: boolean) => {
    if (isIdleRef.current === nextIdle) return; // Prevent duplicate invocations

    isIdleRef.current = nextIdle;
    setIsIdle(nextIdle);

    invokeSafely('SetAutoIdle', nextIdle);
  };

  const startIdleTimer = () => {
    if (idleTimerRef.current) {
      clearTimeout(idleTimerRef.current);
    }

    idleTimerRef.current = setTimeout(() => {
      console.log("invoke idle");
      setIdleState(true); // User went AFK
    }, IDLE_TIMEOUT_MS);
  };

  const handleActivity = () => {
    const now = Date.now();

    if (!isIdleRef.current && now - lastActivityTimeRef.current < THROTTLE_MS) {
      return;
    }
    lastActivityTimeRef.current = now;

    if (isIdleRef.current) {
      setIdleState(false);
    }

    // Reset countdown
    startIdleTimer();
  };

  useEffect(() => {
    const events = ['mousemove', 'keydown', 'click', 'scroll', 'touchstart'];

    const handleVisibilityChange = () => {
      if (document.hidden) {
        if (idleTimerRef.current) clearTimeout(idleTimerRef.current);
        setIdleState(true);
      } else {
        startIdleTimer();
      }
    };

    events.forEach((evt) => window.addEventListener(evt, handleActivity, { passive: true }));
    document.addEventListener('visibilitychange', handleVisibilityChange);

    startIdleTimer();

    return () => {
      events.forEach((evt) => window.removeEventListener(evt, handleActivity));
      document.removeEventListener('visibilitychange', handleVisibilityChange);
      if (idleTimerRef.current) {
        clearTimeout(idleTimerRef.current);
      }
    };
  }, [handleActivity, setIdleState, startIdleTimer]);

  return isIdle;
}