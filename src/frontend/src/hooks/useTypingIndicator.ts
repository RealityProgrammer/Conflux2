import {useRef, useState} from "react";
import useSignalREvent from "./useSignalREvent.ts";
import {useUnmount} from "usehooks-ts";
import type {TypingUserEvent} from "../api/events.ts";

const TYPING_TIMEOUT_MS = 3000;

export type TypingUser = {
  id: string;
  displayName: string;
  avatarRevision: number | null;
}

interface UseTypingIndicatorResult {
  typingUsers: TypingUser[];
}

export default function useTypingIndicator(
  currentUserId: string
): UseTypingIndicatorResult {
  const [typingUsersMap, setTypingUsersMap] = useState<Map<string, TypingUser>>(new Map());
  const timersRef = useRef<Record<string, number>>({});

  useSignalREvent("UserTyping", (event: TypingUserEvent) => {
    if (event.userId === currentUserId) return;

    setTypingUsersMap((prev) => {
      const next = new Map(prev);
      next.set(event.userId, { id: event.userId, displayName: event.displayName, avatarRevision: event.avatarRevision });
      return next;
    });

    // refresh timeout for the typing user
    if (timersRef.current[event.userId]) {
      clearTimeout(timersRef.current[event.userId]);
    }

    timersRef.current[event.userId] = setTimeout(() => {
      setTypingUsersMap((prev) => {
        const next = new Map(prev);
        next.delete(event.userId);
        return next;
      });
      delete timersRef.current[event.userId];
    }, TYPING_TIMEOUT_MS);
  });

  useUnmount(() => {
      Object.values(timersRef.current).forEach(clearTimeout);
  });

  return { typingUsers: Array.from(typingUsersMap.values()) };
}